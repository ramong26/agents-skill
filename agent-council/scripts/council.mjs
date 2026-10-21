import { readFile, stat } from 'node:fs/promises';
import { runDraft, runReview, collect, finalize, doctor, loadConfig } from './core.mjs';
import { failure } from './records.mjs';

const commands = {
  doctor: { required: [], optional: ['config'] },
  draft: { required: ['request', 'runs-dir'], optional: ['config'] },
  review: { required: ['run', 'request'], optional: [] },
  collect: { required: ['run'], optional: [] },
  finalize: { required: ['run', 'verification', 'final'], optional: [] },
};
async function textFile(path) {
  if ((await stat(path)).size > 1024 * 1024) throw failure('input_too_large');
  return readFile(path, 'utf8');
}
async function jsonFile(path) {
  try { return JSON.parse(await textFile(path)); }
  catch { throw failure('invalid_request_file'); }
}
function parse(argv) {
  const [command, ...args] = argv;
  if (!commands[command] || args.length % 2) throw failure('invalid_arguments');
  const { required, optional } = commands[command], options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].startsWith('--') ? args[i].slice(2) : '';
    if (![...required, ...optional].includes(key) || options[key] || !args[i + 1] || args[i + 1].startsWith('--'))
      throw failure('invalid_arguments');
    options[key] = args[i + 1];
  }
  if (required.some(key => !options[key])) throw failure('invalid_arguments');
  return { command, options };
}

const abort = new AbortController();
const cancel = () => abort.abort();
process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
try {
  if (process.argv.length === 3 && ['--help', '-h'].includes(process.argv[2])) {
    console.log('Usage: node council.mjs doctor [--config FILE]\n' +
      '  draft --request FILE --runs-dir DIR [--config FILE]\n' +
      '  review --run DIR --request FILE\n  collect --run DIR\n' +
      '  finalize --run DIR --verification FILE --final FILE');
  } else {
    if (process.env.AGENT_COUNCIL_ACTIVE) throw failure('recursive_run');
    const { command, options: o } = parse(process.argv.slice(2));
    const shared = { signal: abort.signal, onProgress: event => process.stderr.write(JSON.stringify(event) + '\n') };
    let result;
    if (command === 'doctor') result = await doctor({ ...shared, config: await loadConfig(o.config) });
    if (command === 'draft') result = await runDraft({ ...shared, request: await jsonFile(o.request), runsDir: o['runs-dir'], config: await loadConfig(o.config) });
    if (command === 'review') result = await runReview({ ...shared, runDir: o.run, request: await jsonFile(o.request) });
    if (command === 'collect') result = await collect(o.run);
    if (command === 'finalize') result = await finalize({ runDir: o.run, verification: await textFile(o.verification), final: await textFile(o.final) });
    console.log(JSON.stringify(result, null, 2));
    if (abort.signal.aborted) process.exitCode = 130;
  }
} catch (error) {
  const code = typeof error.code === 'string' && /^[a-z_]{1,64}$/.test(error.code) ? error.code : 'runner_error';
  console.log(JSON.stringify({ error: code }));
  process.exitCode = abort.signal.aborted ? 130 : 1;
} finally {
  process.off('SIGINT', cancel); process.off('SIGTERM', cancel);
}
