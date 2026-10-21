import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { doctor, loadConfig, runDraft } from '../scripts/core.mjs';
import { validateConfig } from '../scripts/settings.mjs';
import { ids } from '../scripts/records.mjs';
import { preflight as geminiPreflight } from '../providers/gemini/adapter.mjs';
import { preflight as claudePreflight } from '../providers/claude/adapter.mjs';
import { classifyError } from '../providers/shared.mjs';

async function temporaryDirectory(t) {
  const path = await mkdtemp(join(process.cwd(), '.agent-council-test-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('doctor checks login without included-only confirmation but never requests a model answer', async () => {
  let preflightCalls = 0;
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async options => {
      preflightCalls += 1;
      assert.equal(options.includedOnly, false);
      return { ok: false, code: 'billing_unconfirmed', auth: 'existing_login', billing: 'unconfirmed' };
    },
  }]));

  const result = await doctor({ config: await loadConfig(), adapters, environment: {} });

  assert.equal(preflightCalls, ids.length);
  assert.deepEqual(result.providers.map(item => item.code), ids.map(() => 'billing_unconfirmed'));
  assert.deepEqual(result.providers.map(item => item.auth), ids.map(() => 'existing_login'));
});

test('doctor does not claim included billing for an unconfirmed account', async () => {
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async () => id === 'gemini'
      ? { ok: false, code: 'auth_failed' }
      : { ok: false, code: 'billing_unconfirmed', auth: 'existing_login', billing: 'unconfirmed' },
  }]));
  const result = await doctor({ config: await loadConfig(), adapters, environment: {} });
  const gemini = result.providers.find(item => item.provider === 'gemini');
  assert.equal(gemini.code, 'auth_failed');
  assert.equal(gemini.billing, 'unconfirmed');
  assert.equal(gemini.loginHint, 'agy를 실행한 뒤 안내에 따라 Google 계정으로 로그인');
});

test('legacy allow_existing_login policy is rejected', async () => {
  const config = await loadConfig();
  config.policy.on_unconfirmed_billing = 'allow_existing_login';
  assert.throws(() => validateConfig(config), error => error.code === 'invalid_config');
});

test('provider errors distinguish login, exhausted quota, throttling, model, and network failures', () => {
  const cases = [
    ['You are not logged into Antigravity', 'auth_failed'],
    ['You are not logged into Antigravity.\nFailed to load stored token from keyring, falling back to file: Access is denied.', 'credential_store_unavailable'],
    ['usage_limit_reached: you have reached your weekly plan limit', 'quota_exhausted'],
    ["You've reached your usage limit", 'quota_exhausted'],
    ['Extra usage is disabled after reaching your plan limit', 'quota_exhausted'],
    ['429 rate_limit_error: too many requests', 'rate_limited'],
    ['invalid model selection: model not found', 'model_unavailable'],
    ['Claude Code is not available on the Free plan', 'model_unavailable'],
    ['lookup play.googleapis.com: no such host', 'network_error'],
  ];
  for (const [message, expected] of cases)
    assert.equal(classifyError(message), expected);
});

test('Claude Free login is confirmed but Claude Code model calls are blocked', async t => {
  const home = await temporaryDirectory(t);
  const binDir = join(home, 'bin');
  await mkdir(binDir);
  await writeFile(join(binDir, process.platform === 'win32' ? 'claude.exe' : 'claude'), 'mock');
  const result = await claudePreflight({
    includedOnly: true,
    env: { USERPROFILE: home, PATH: binDir },
    cwd: home,
    runProcess: async ({ args }) => {
      if (args[0] === '--version') return { exitCode: 0, stdout: '1.0.0', stderr: '' };
      if (args[0] === '--help') return { exitCode: 0, stdout: '--safe-mode --restricted --tools --strict-mcp-config --permission-prompts', stderr: '' };
      if (args.includes('auth')) return { exitCode: 0, stdout: JSON.stringify({
        loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'free',
      }), stderr: '' };
      throw new Error('unexpected mock command');
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'free_plan_unsupported');
  assert.equal(result.auth, 'existing_login');
  assert.equal(result.billing, 'unconfirmed');
});

test('included model fallback runs once for quota or access failures, then stops', async t => {
  const root = await temporaryDirectory(t);
  const config = await loadConfig();
  config.providers.codex.freeFallbackModel = 'gpt-5.6-terra';
  const calls = [];
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async ({ includedOnly }) => ({
      ok: includedOnly && id === 'codex',
      code: includedOnly && id === 'codex' ? null : 'billing_unconfirmed',
      auth: 'existing_login',
      billing: includedOnly && id === 'codex' ? 'included_only' : 'unconfirmed',
    }),
    buildInvocation: ({ model }) => ({ command: 'mock', args: [model], input: 'prompt', env: {} }),
    parseResult: ({ stdout, exitCode, model }) => exitCode === 0
      ? { status: 'success', answer: `answer from ${model}`, actualModel: model }
      : { status: 'excluded', code: stdout, actualModel: null },
  }]))

  const result = await runDraft({
    request: { question: 'compare' }, runsDir: root, config, adapters,
    environment: {}, includedOnly: ['codex'],
    runProcess: async ({ args }) => {
      calls.push(args[0]);
      return calls.length === 1
        ? { exitCode: 1, stdout: 'quota_exhausted', stderr: '' }
        : { exitCode: 0, stdout: '', stderr: '' };
    },
  });

  const codex = result.providers.find(item => item.provider === 'codex');
  assert.deepEqual(calls, ['gpt-6.1-sol', 'gpt-5.6-terra']);
  assert.equal(codex.status, 'success');
  assert.equal(codex.requestedModel, 'gpt-6.1-sol');
  assert.equal(codex.actualModel, 'gpt-5.6-terra');
  assert.equal(codex.freeFallbackModel, 'gpt-5.6-terra');
  assert.equal(codex.fallbackReason, 'quota_exhausted');
});

test('unconfirmed billing never tries the configured free model fallback', async t => {
  const root = await temporaryDirectory(t);
  const config = await loadConfig();
  let modelCalls = 0;
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async () => ({ ok: false, code: 'billing_unconfirmed', auth: 'existing_login', billing: 'unconfirmed' }),
    buildInvocation: () => { modelCalls += 1; throw new Error('must not invoke'); },
    parseResult: () => { throw new Error('must not parse'); },
  }]));
  const result = await runDraft({ request: { question: 'compare' }, runsDir: root, config, adapters, environment: {} });
  assert.equal(modelCalls, 0);
  assert.ok(result.providers.every(item => item.code === 'billing_unconfirmed'));
});

test('a failed free model fallback is not retried', async t => {
  const root = await temporaryDirectory(t);
  const config = await loadConfig();
  let modelCalls = 0;
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async ({ includedOnly }) => ({
      ok: includedOnly && id === 'codex',
      code: includedOnly && id === 'codex' ? null : 'billing_unconfirmed',
      auth: 'existing_login',
      billing: includedOnly && id === 'codex' ? 'included_only' : 'unconfirmed',
    }),
    buildInvocation: ({ model }) => ({ command: 'mock', args: [model], input: 'prompt', env: {} }),
    parseResult: ({ stdout }) => ({ status: 'excluded', code: stdout, actualModel: null }),
  }]));
  const result = await runDraft({
    request: { question: 'compare' }, runsDir: root, config, adapters,
    environment: {}, includedOnly: ['codex'],
    runProcess: async ({ args }) => {
      modelCalls += 1;
      return { exitCode: 1, stdout: 'quota_exhausted', stderr: '' };
    },
  });
  const codex = result.providers.find(item => item.provider === 'codex');
  assert.equal(modelCalls, 2);
  assert.equal(codex.status, 'excluded');
  assert.equal(codex.code, 'quota_exhausted');
  assert.equal(codex.fallbackReason, 'quota_exhausted');
  assert.match(codex.actionHint, /무료 포함 대체 모델.*한도도 소진/);
});

test('a model preflight failure checks the configured free model before use', async t => {
  const root = await temporaryDirectory(t);
  const config = await loadConfig();
  const preflightModels = [];
  const invocationModels = [];
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async ({ config: candidateConfig, includedOnly }) => {
      const model = candidateConfig.providers[id].model;
      preflightModels.push([id, model]);
      if (id !== 'codex' || !includedOnly)
        return { ok: false, code: 'billing_unconfirmed', auth: 'existing_login', billing: 'unconfirmed' };
      return model === config.providers.codex.model
        ? { ok: false, code: 'model_unavailable', auth: 'existing_login', billing: 'included_only' }
        : { ok: true, code: null, auth: 'existing_login', billing: 'included_only' };
    },
    buildInvocation: ({ model }) => {
      invocationModels.push(model);
      return { command: 'mock', args: [model], input: 'prompt', env: {} };
    },
    parseResult: ({ model }) => ({ status: 'success', answer: 'free model answer', actualModel: model }),
  }]));
  const result = await runDraft({
    request: { question: 'compare' }, runsDir: root, config, adapters,
    environment: {}, includedOnly: ['codex'],
    runProcess: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
  });
  const codex = result.providers.find(item => item.provider === 'codex');
  assert.deepEqual(preflightModels.filter(([id]) => id === 'codex').map(([, model]) => model),
    ['gpt-6.1-sol', 'gpt-5.6-terra']);
  assert.deepEqual(invocationModels, ['gpt-5.6-terra']);
  assert.equal(codex.status, 'success');
  assert.equal(codex.fallbackReason, 'model_unavailable');
});

test('draft checks login from caller repository but runs the model in an isolated folder', async t => {
  const root = await temporaryDirectory(t);
  const config = await loadConfig();
  const callerCwd = 'C:\\scratch\\other-repository';
  let preflightCwd;
  let invocationCwd;
  let processCwd;
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async options => {
      preflightCwd = options.cwd;
      assert.equal(options.includedOnly, id === 'codex');
      return {
        ok: id === 'codex',
        code: id === 'codex' ? null : 'billing_unconfirmed',
        auth: 'existing_login',
        billing: id === 'codex' ? 'included_only' : 'unconfirmed',
        cliVersion: '1.0.0',
      };
    },
    buildInvocation: options => {
      assert.equal(id, 'codex');
      invocationCwd = options.cwd;
      return { command: 'mock-codex', args: [], input: 'prompt', env: {} };
    },
    parseResult: ({ model }) => ({ status: 'success', answer: '2 + 2 = 4', actualModel: model }),
  }]));

  const result = await runDraft({
    request: { question: '2 + 2?' },
    runsDir: root,
    config,
    adapters,
    environment: {},
    includedOnly: ['codex'],
    callerCwd,
    runProcess: async options => {
      processCwd = options.cwd;
      return { exitCode: 0, stdout: '', stderr: '' };
    },
  });

  assert.equal(preflightCwd, callerCwd);
  assert.equal(invocationCwd, processCwd);
  assert.notEqual(processCwd, callerCwd);
  assert.match(processCwd, /work[\\/]draft[\\/]codex$/);
  assert.equal(result.providers.find(item => item.provider === 'codex').status, 'success');
  assert.ok(result.providers.filter(item => item.provider !== 'codex').every(item =>
    item.code === 'billing_unconfirmed' && item.auth === 'existing_login'));
});

test('Antigravity blocks explicit or malformed personal-credit fallback settings', async t => {
  const home = await temporaryDirectory(t);
  const configDir = join(home, '.gemini', 'antigravity-cli');
  await mkdir(configDir, { recursive: true });
  const settingsPath = join(configDir, 'settings.json');
  let processCalls = 0;

  for (const settings of [{ useG1Credits: true }, { useG1Credits: 'false' }]) {
    await writeFile(settingsPath, JSON.stringify(settings));
    const result = await geminiPreflight({
      includedOnly: true,
      config: { providers: { gemini: { model: 'gemini-3.8-flash-medium' } } },
      env: { USERPROFILE: home, PATH: '' },
      cwd: home,
      runProcess: async () => { processCalls += 1; throw new Error('must not run'); },
    });

    assert.equal(result.code, 'billing_unconfirmed');
    assert.equal(result.billing, 'unconfirmed');
  }
  assert.equal(processCalls, 0);
});

test('Antigravity accepts its documented default or explicit off personal-credit setting', async t => {
  const home = await temporaryDirectory(t);
  const configDir = join(home, '.gemini', 'antigravity-cli');
  const binDir = join(home, 'bin');
  await mkdir(configDir, { recursive: true });
  await mkdir(binDir);
  await writeFile(join(binDir, process.platform === 'win32' ? 'agy.exe' : 'agy'), 'mock');
  const calls = [];
  const model = 'gemini-3.8-flash-medium';

  for (const settings of [{ useG1Credits: false }, {}]) {
    await writeFile(join(configDir, 'settings.json'), JSON.stringify(settings));
    const result = await geminiPreflight({
      includedOnly: true,
      config: { providers: { gemini: { model } } },
      env: { USERPROFILE: home, PATH: binDir },
      cwd: home,
      runProcess: async options => {
        calls.push(options.args);
        if (options.args[0] === '--version') return { exitCode: 0, stdout: '1.0.0', stderr: '' };
        if (options.args[0] === '--help') return { exitCode: 0, stdout: '--input-format --output-format --model --sandbox', stderr: '' };
        if (options.args[0] === 'models') return { exitCode: 0, stdout: model, stderr: '' };
        throw new Error('unexpected mock command');
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.billing, 'included_only');
  }
  assert.deepEqual(calls.map(args => args[0]), ['--version', '--help', 'models', '--version', '--help', 'models']);
});

test('keyring denial preserves an unconfirmed login and does not ask for login', async t => {
  const home = await temporaryDirectory(t);
  const binDir = join(home, 'bin');
  await mkdir(binDir);
  await writeFile(join(binDir, process.platform === 'win32' ? 'agy.exe' : 'agy'), 'mock');
  const config = await loadConfig();
  config.providers.codex.enabled = false;
  config.providers.claude.enabled = false;
  const result = await doctor({
    config, adapters: { gemini: { preflight: geminiPreflight } },
    environment: { USERPROFILE: home, PATH: binDir }, cwd: home,
    runProcess: async ({ args }) => {
      if (args[0] === '--version') return { exitCode: 0, stdout: '1.4.4', stderr: '' };
      if (args[0] === '--help') return { exitCode: 0, stdout: '--input-format --output-format --model --sandbox', stderr: '' };
      return { exitCode: 1, stdout: '', stderr: 'You are not logged into Antigravity.\nFailed to load stored token from keyring: Access is denied.' };
    },
  });
  const gemini = result.providers.find(item => item.provider === 'gemini');
  assert.equal(gemini.code, 'credential_store_unavailable');
  assert.equal(gemini.auth, 'unconfirmed');
  assert.equal(gemini.loginHint, null);
  assert.match(gemini.actionHint, /일반 사용자 터미널/);
});
