import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { collect, loadConfig, runDraft } from '../scripts/core.mjs';
import { ids } from '../scripts/records.mjs';
import { draftPrompt, validateRequest } from '../scripts/settings.mjs';

test('a question-only prompt preserves the original and requests just three sections', () => {
  const question = '2 더하기 2는 뭐야?\n 원문 띄어쓰기 유지!';
  const request = validateRequest({ question });
  const prompt = draftPrompt(request);
  const format = prompt.split('\n\n답변 형식:\n')[1];
  assert.equal(request.question, question);
  assert.deepEqual(request, { question, facts: [], constraints: [], unknowns: [], context: '' });
  assert.ok(prompt.includes(JSON.stringify(request, null, 2)));
  assert.deepEqual(format.match(/^\d+\. .+$/gm), ['1. 현재 조건의 권장안 한 가지', '2. 핵심 근거', '3. 출처']);
  assert.match(format, /출처가 없으면 없음/);
  assert.doesNotMatch(format, /가장 강한 반론|다른 선택지가|결론을 바꿀/);
});

test('all three drafts receive the same original input without caller analysis or peer answers', async t => {
  const root = await mkdtemp(join(process.cwd(), '.agent-council-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const question = 'B와 C를 비교해줘.\n"B가 편하다"는 내 의견이야.';
  const supplied = {
    question, facts: ['이용자 100명'], constraints: ['예산 10단위'],
    unknowns: ['실제 성능은?'], context: '사용자가 제공한 원자료: B=1, C=2',
  };
  const prompts = {};
  const adapters = Object.fromEntries(ids.map(id => [id, {
    preflight: async () => ({ ok: true, auth: 'existing_login', billing: 'included_only' }),
    buildInvocation: ({ prompt }) => {
      prompts[id] = prompt;
      return { command: 'mock', args: [], input: prompt, env: {} };
    },
    parseResult: ({ model }) => ({ status: 'success', answer: `peer-answer-${id}`, actualModel: model }),
  }]));
  const result = await runDraft({
    request: { ...supplied, analysis: 'caller-analysis-do-not-forward', recommendation: 'caller-recommendation' },
    runsDir: root, config: await loadConfig(), adapters, environment: {}, includedOnly: ids,
    runProcess: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
  });
  assert.equal(result.providers.filter(item => item.status === 'success').length, 3);
  const expected = draftPrompt(supplied);
  for (const id of ids) {
    assert.equal(prompts[id], expected);
    assert.doesNotMatch(prompts[id], /caller-analysis-do-not-forward|caller-recommendation|peer-answer-/);
  }
  const saved = await collect(result.runDir);
  assert.deepEqual(saved.request.request, supplied);
});
