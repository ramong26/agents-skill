import { mkdir, readFile, writeFile, rename, realpath, open, unlink } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ids = ['codex', 'claude', 'gemini'];
// Six responses can total 12 MiB; leave room for synthesis and formatting.
export const maxFinalDocumentBytes = 16 * 1024 * 1024;
export const failure = (code, message = code) => Object.assign(new Error(message), { code });
export async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch { throw failure('invalid_record'); }
}
export async function writeJson(path, value) {
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(temp, path);
}
export async function withRunLock(runDir, action) {
  const path = join(runDir, '.mutation-lock');
  let lock;
  try { lock = await open(path, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw failure('run_busy'); throw error; }
  try { return await action(); }
  finally { await lock.close(); await unlink(path); }
}
const within = (parent, child) => { const rel = relative(parent, child); return !rel || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)); };
export async function createRun(runsDir) {
  if (typeof runsDir !== 'string' || !runsDir.trim()) throw failure('runs_dir_required');
  const root = resolve(runsDir);
  if (within(skillDir, root)) throw failure('unsafe_runs_dir');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const actual = await realpath(root);
  if (within(await realpath(skillDir), actual)) throw failure('unsafe_runs_dir');
  const runDir = join(actual, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
  await mkdir(runDir, { mode: 0o700 });
  await mkdir(join(runDir, 'drafts'));
  return runDir;
}

export function redact(text, env = {}) {
  let result = String(text);
  for (const [key, value] of Object.entries(env)) {
    if (/(?:API_KEY|TOKEN|SECRET|PASSWORD|COOKIE)$/i.test(key) && typeof value === 'string' && value.length >= 8)
      result = result.split(value).join('[REDACTED]');
  }
  return result.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{30,})\b/g, '[REDACTED]');
}

export async function collect(runDir) {
  const status = await readJson(join(runDir, 'status.json'));
  if (status.schemaVersion !== 1) throw failure('invalid_record');
  const result = { runDir: resolve(runDir), status, request: await readJson(join(runDir, 'request.json')), drafts: {}, reviews: {} };
  for (const [stage, directory] of [['drafts', 'drafts'], ['reviews', 'reviews']]) {
    for (const id of ids) {
      try { result[stage][id] = JSON.parse(await readFile(join(runDir, directory, `${id}.json`), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw failure('invalid_record'); }
    }
  }
  for (const name of ['verification', 'final']) {
    try { result[name] = await readFile(join(runDir, `${name}.md`), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return result;
}
