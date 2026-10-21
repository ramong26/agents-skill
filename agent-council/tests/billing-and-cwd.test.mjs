import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { doctor, loadConfig, runDraft } from '../scripts/core.mjs';
import { validateConfig } from '../scripts/settings.mjs';
import { ids } from '../scripts/records.mjs';
import { preflight as geminiPreflight } from '../providers/gemini/adapter.mjs';
import { preflight as codexPreflight, parseResult as parseCodex } from '../providers/codex/adapter.mjs';
import { preflight as claudePreflight, parseResult as parseClaude } from '../providers/claude/adapter.mjs';
import { classifyError } from '../providers/shared.mjs';

async function temporaryDirectory(t) {
  const path = await mkdtemp(join(process.cwd(), '.agent-council-test-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('doctor checks enabled logins without a billing confirmation or model request', async () => {
  const calls = [];
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async () => {
      calls.push(id);
      return { ok: true, auth: 'existing_login', billing: 'unconfirmed' };
    },
  }]));
  const result = await doctor({ config: await loadConfig(), adapters, environment: {} });
  assert.deepEqual(calls.sort(), ['claude', 'codex', 'gemini']);
  for (const item of result.providers) {
    assert.equal(item.ok, true);
    assert.equal(item.code, null);
    assert.equal(item.billing, 'unconfirmed');
    assert.equal(item.usageHint, null);
    assert.equal(item.loginHint, null);
  }
});

test('auth status parsing failures do not request re-login', async () => {
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async () => ({ ok: false, code: 'auth_unconfirmed' }),
  }]));
  const result = await doctor({ config: await loadConfig(), adapters, environment: {} });
  for (const item of result.providers) {
    assert.equal(item.code, 'auth_unconfirmed');
    assert.equal(item.loginHint, null);
  }
});

test('default config uses existing login and stops on errors without model fallback', async () => {
  const config = await loadConfig();
  assert.equal(config.providers.gemini.enabled, true);
  assert.equal(config.policy.on_unconfirmed_billing, 'use_existing_login');
  assert.equal(config.policy.model_fallback, false);
  config.policy.on_unconfirmed_billing = 'skip';
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

test('both official adapters accept existing login without a billing assertion', async t => {
  const home = await temporaryDirectory(t);
  const binDir = join(home, 'bin');
  await mkdir(binDir);
  for (const name of ['codex', 'claude']) await writeFile(join(binDir, name + (process.platform === 'win32' ? '.exe' : '')), 'mock');
  for (const [name, preflight] of [['codex', codexPreflight], ['claude', claudePreflight]]) {
    const result = await preflight({
      env: { USERPROFILE: home, PATH: binDir }, cwd: home,
      runProcess: async ({ args }) => {
        if (args[0] === '--version') return { exitCode: 0, stdout: '1.0.0', stderr: '' };
        if (args.includes('--help')) return { exitCode: 0, stdout: '--ignore-user-config --ignore-rules --ephemeral --json --safe-mode --restricted --tools --strict-mcp-config --permission-prompts', stderr: '' };
        return { exitCode: 0, stdout: name === 'codex' ? 'Logged in using ChatGPT' : JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'pro' }), stderr: '' };
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.auth, 'existing_login');
    assert.equal(result.billing, 'unconfirmed');
  }
});

test('draft runs logged-in providers without any included-only option and never invokes disabled AGY', async t => {
  const root = await temporaryDirectory(t);
  const calls = [];
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async () => ({ ok: true, auth: 'existing_login', billing: 'unconfirmed' }),
    buildInvocation: ({ prompt }) => { calls.push(id); return { command: 'mock', args: [], input: prompt, env: {} }; },
    parseResult: ({ model }) => ({ status: 'success', answer: 'answer', actualModel: model }),
  }]));
  const config = await loadConfig();
  config.providers.gemini.enabled = false;
  const result = await runDraft({ request: { question: '2+2?' }, runsDir: root, config, adapters, environment: {}, runProcess: async () => ({ exitCode: 0, stdout: '', stderr: '' }) });
  assert.deepEqual(calls.sort(), ['claude', 'codex']);
  assert.equal(result.providers.filter(item => item.status === 'success').length, 2);
  assert.equal(result.providers.find(item => item.provider === 'gemini').code, 'provider_disabled');
});

test('runtime errors stop only that provider once and give hints only for actual quota or logout', async t => {
  const root = await temporaryDirectory(t);
  for (const code of ['quota_exhausted', 'rate_limited', 'model_unavailable', 'auth_failed', 'auth_unconfirmed', 'network_error']) {
    const calls = [];
    const adapters = Object.fromEntries(ids.map(id => [id, {
      preflight: async () => ({ ok: true, auth: 'existing_login', billing: 'unconfirmed' }),
      buildInvocation: () => { calls.push(id); return { command: 'mock', args: [], input: '', env: {} }; },
      parseResult: ({ model }) => id === 'codex' ? { status: 'excluded', code } : { status: 'success', answer: 'retained', actualModel: model },
    }]));
    const result = await runDraft({ request: { question: 'compare' }, runsDir: root, config: await loadConfig(), adapters, environment: {}, runProcess: async () => ({ exitCode: 0, stdout: '', stderr: '' }) });
    assert.equal(calls.filter(id => id === 'codex').length, 1);
    const codex = result.providers.find(item => item.provider === 'codex');
    assert.equal(codex.code, code);
    assert.equal(codex.loginHint, code === 'auth_failed' ? 'codex login' : null);
    assert.equal(Boolean(codex.usageHint), code === 'quota_exhausted');
    assert.equal(result.providers.find(item => item.provider === 'claude').answer, 'retained', JSON.stringify(result.providers));
  }
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
      assert.equal(options.includedOnly, false);
      return {
        ok: id === 'codex',
        code: id === 'codex' ? null : 'auth_failed',
        auth: 'existing_login',
        billing: 'unconfirmed',
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
  assert.ok(result.providers.filter(item => item.provider === 'claude').every(item =>
    item.code === 'auth_failed' && item.auth === 'existing_login'));
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

    assert.equal(result.code, 'credit_fallback_enabled');
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
    assert.equal(result.billing, 'unconfirmed');
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
  config.providers.gemini.enabled = true;
  for (const exitCode of [0, 1]) {
    const result = await doctor({
      config, adapters: { gemini: { preflight: geminiPreflight } },
      environment: { USERPROFILE: home, PATH: binDir }, cwd: home,
      runProcess: async ({ args }) => {
        if (args[0] === '--version') return { exitCode: 0, stdout: '1.4.4', stderr: '' };
        if (args[0] === '--help') return { exitCode: 0, stdout: '--input-format --output-format --model --sandbox', stderr: '' };
        return { exitCode, stdout: '', stderr: 'You are not logged into Antigravity.\nFailed to load stored token from keyring: Access is denied.' };
      },
    });
    const gemini = result.providers.find(item => item.provider === 'gemini');
    assert.equal(gemini.code, 'credential_store_unavailable');
    assert.equal(gemini.auth, 'unconfirmed');
    assert.equal(gemini.loginHint, null);
    assert.match(gemini.actionHint, /일반 사용자 터미널/);
  }
});


test('startup warnings do not hide quota errors on stdout', () => {
  for (const parseResult of [parseCodex, parseClaude]) {
    const result = parseResult({ exitCode: 1, stderr: 'startup warning', stdout: '{"error":"usage_limit_reached"}' });
    assert.equal(result.code, 'quota_exhausted');
  }
});

test('Codex status connection and credential-store failures are not mislabeled as logout', async t => {
  const home = await temporaryDirectory(t);
  const binDir = join(home, 'bin');
  await mkdir(binDir);
  await writeFile(join(binDir, process.platform === 'win32' ? 'codex.exe' : 'codex'), 'mock');
  for (const [stderr, expected] of [
    ['network error: ENOTFOUND', 'network_error'],
    ['Not logged in. Failed to load token from keyring: Access is denied.', 'credential_store_unavailable'],
  ]) {
    const result = await codexPreflight({
      env: { USERPROFILE: home, PATH: binDir }, cwd: home,
      runProcess: async ({ args }) => {
        if (args[0] === '--version') return { exitCode: 0, stdout: '1.0.0', stderr: '' };
        if (args.includes('--help')) return { exitCode: 0, stdout: '--ignore-user-config --ignore-rules --ephemeral --json', stderr: '' };
        return { exitCode: 1, stdout: '', stderr };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, expected);
  }
});
