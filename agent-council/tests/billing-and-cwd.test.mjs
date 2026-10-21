import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { doctor, loadConfig, runDraft } from '../scripts/core.mjs';
import { validateConfig } from '../scripts/settings.mjs';
import { ids } from '../scripts/records.mjs';
import { preflight as geminiPreflight } from '../providers/gemini/adapter.mjs';

async function temporaryDirectory(t) {
  const path = await mkdtemp(join(process.cwd(), '.agent-council-test-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('doctor starts no provider CLI without per-invocation included-only confirmation', async () => {
  let preflightCalls = 0;
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async () => { preflightCalls += 1; throw new Error('must not run'); },
  }]));

  const result = await doctor({ config: await loadConfig(), adapters, environment: {} });

  assert.equal(preflightCalls, 0);
  assert.deepEqual(result.providers.map(item => item.code), ids.map(() => 'billing_unconfirmed'));
  assert.deepEqual(result.providers.map(item => item.auth), ids.map(() => null));
});

test('legacy allow_existing_login policy is rejected', async () => {
  const config = await loadConfig();
  config.policy.on_unconfirmed_billing = 'allow_existing_login';
  assert.throws(() => validateConfig(config), error => error.code === 'invalid_config');
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
      assert.equal(id, 'codex');
      preflightCwd = options.cwd;
      assert.equal(options.includedOnly, true);
      return { ok: true, auth: 'existing_login', billing: 'included_only', cliVersion: '1.0.0' };
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
  assert.ok(result.providers.filter(item => item.provider !== 'codex').every(item => item.code === 'billing_unconfirmed'));
});

test('Antigravity stays uncalled unless useG1Credits is explicitly false', async t => {
  const home = await temporaryDirectory(t);
  const configDir = join(home, '.gemini', 'antigravity-cli');
  await mkdir(configDir, { recursive: true });
  const settingsPath = join(configDir, 'settings.json');
  let processCalls = 0;

  for (const settings of [{ useG1Credits: true }, {}]) {
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

test('Antigravity can preflight only after its local credit fallback is explicitly off', async t => {
  const home = await temporaryDirectory(t);
  const configDir = join(home, '.gemini', 'antigravity-cli');
  const binDir = join(home, 'bin');
  await mkdir(configDir, { recursive: true });
  await mkdir(binDir);
  await writeFile(join(configDir, 'settings.json'), JSON.stringify({ useG1Credits: false }));
  await writeFile(join(binDir, 'agy.exe'), 'mock');
  const calls = [];
  const model = 'gemini-3.8-flash-medium';

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
  assert.deepEqual(calls.map(args => args[0]), ['--version', '--help', 'models']);
});
