import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { join } from 'node:path';

export function runProcess({ command, args = [], input = '', cwd, env = process.env,
  timeoutMs = 150000, maxBytes = 2 * 1024 * 1024, signal }) {
  const started = performance.now();
  if (signal?.aborted) return Promise.resolve({ exitCode: null, stdout: '', stderr: '', code: 'cancelled', durationMs: 0 });
  return new Promise(resolve => {
    let stdout = [], stderr = [], bytes = 0, code = null, ending = false, cleanup = Promise.resolve();
    const child = spawn(command, args, { cwd, env, shell: false, windowsHide: true,
      detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    const stop = reason => {
      if (code) return;
      code = reason;
      if (!child.pid) return;
      if (process.platform === 'win32') {
        cleanup = new Promise(done => {
          const killer = spawn(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
          killer.once('error', () => { child.kill(); done(); });
          killer.once('close', exitCode => { if (exitCode !== 0) child.kill(); done(); });
        });
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }
    };
    const append = (chunks, data) => {
      const remaining = Math.max(0, maxBytes - bytes);
      if (remaining) chunks.push(data.subarray(0, remaining));
      bytes += data.length;
      if (bytes > maxBytes) stop('output_limit');
    };
    child.stdout.on('data', data => append(stdout, data));
    child.stderr.on('data', data => append(stderr, data));
    const abort = () => stop('cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => stop('timeout'), timeoutMs);
    const finish = async exitCode => {
      if (ending) return;
      ending = true;
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      await cleanup;
      resolve({ exitCode, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'),
        code, durationMs: Math.round(performance.now() - started) });
    };
    child.once('error', error => { code ??= error.code === 'ENOENT' ? 'cli_missing' : 'execution_error'; });
    child.once('close', finish);
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    if (signal?.aborted) abort();
  });
}
