import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { finalize } from '../scripts/core.mjs';
import { maxFinalDocumentBytes } from '../scripts/records.mjs';

async function pendingRun(t) {
  const path = await mkdtemp(join(process.cwd(), '.agent-council-test-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  await writeFile(join(path, 'status.json'), JSON.stringify({ schemaVersion: 1, phase: 'review_complete' }));
  return path;
}

test('finalize CLI preserves six near-limit responses and synthesis verbatim', async t => {
  const runDir = await pendingRun(t);
  const responses = Array.from({ length: 6 }, (_, index) => String.fromCharCode(65 + index).repeat(2 * 1024 * 1024 - 1024));
  const final = '## 종합\n권장안: 테스트\n\n' + responses.join('\n\n');
  assert.ok(Buffer.byteLength(final) > 1024 * 1024);
  assert.ok(Buffer.byteLength(final) < maxFinalDocumentBytes);
  await writeFile(join(runDir, 'input-final.md'), final);
  await writeFile(join(runDir, 'input-verification.md'), '합성 크기 검증');
  const cli = fileURLToPath(new URL('../scripts/council.mjs', import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, [cli, 'finalize', '--run', runDir,
    '--verification', join(runDir, 'input-verification.md'), '--final', join(runDir, 'input-final.md')]);
  assert.equal(JSON.parse(stdout).phase, 'finalized');
  assert.equal(await readFile(join(runDir, 'final.md'), 'utf8'), final);
});

test('finalize still rejects oversized final or verification documents without changing phase', async t => {
  const runDir = await pendingRun(t);
  for (const docs of [
    { verification: 'v', final: 'x'.repeat(maxFinalDocumentBytes + 1) },
    { verification: 'v'.repeat(1024 * 1024 + 1), final: 'x' },
  ]) {
    await assert.rejects(finalize({ runDir, ...docs }), error => error.code === 'invalid_document');
    assert.equal(JSON.parse(await readFile(join(runDir, 'status.json'), 'utf8')).phase, 'review_complete');
  }
});
