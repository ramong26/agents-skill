import {
  billingDecision,
  classifyError,
  failure,
  inspectCli,
  invocation,
  parseObject,
  parseEvents,
  researchSummary,
  reportedModel,
} from "../shared.mjs";

export const id = "claude";

// Claude CLI의 지원 옵션과 기존 OAuth 로그인을 확인하고 비용 정책에 따라 참여 여부를 판단한다.
export async function preflight(options) {
  const inspected = await inspectCli(id, options, [
    "--safe-mode",
    "--restricted",
    "--tools",
    "--allowedTools",
    "--verbose",
    "--strict-mcp-config",
    "--permission-prompts",
  ]);
  if (!inspected.ok) return inspected;
  const status = await inspected.run([
    "--safe-mode",
    "auth",
    "status",
    "--json",
  ]);
  if (status.code)
    return { ok: false, code: status.code, cliVersion: inspected.cliVersion };
  let auth;
  try {
    auth = parseObject(status.stdout);
  } catch {
    return {
      ok: false,
      code: "auth_unconfirmed",
      cliVersion: inspected.cliVersion,
    };
  }
  if (status.exitCode !== 0 || auth.loggedIn !== true)
    return { ok: false, code: "auth_failed", cliVersion: inspected.cliVersion };
  if (auth.authMethod !== "claude.ai" && auth.authMethod !== "oauth")
    return {
      ok: false,
      code: "auth_policy_conflict",
      cliVersion: inspected.cliVersion,
    };
  // A subscription identifier is not proof that extra usage credits are disabled.
  return billingDecision(options.config, inspected.cliVersion);
}

// 지정 모델·추론 강도를 설정하고 도구·MCP를 제한한 Claude 비대화형 실행 명령을 구성한다.
export function buildInvocation({ model, effort, prompt, env }) {
  const args = [
    "--print",
    "--safe-mode",
    "--restricted",
    "--tools",
    "WebSearch,WebFetch",
    "--allowedTools",
    "WebSearch,WebFetch",
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    "--permission-mode",
    "dontAsk",
    "--permission-prompts",
    "none",
    "--no-session-persistence",
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    model,
  ];
  if (effort) args.push("--effort", effort);
  return invocation(id, args, prompt, env);
}

// Claude 결과 JSON에서 최종 답변과 보고된 모델을 추출하고 오류·빈 답변·모델 불일치 결과를 제외한다.
export function parseResult({ stdout = "", stderr = "", exitCode, model }) {
  if (exitCode !== 0) return failure(classifyError(stderr || stdout));
  let events;
  try {
    events = parseEvents(stdout);
  } catch {
    return failure("parse_error");
  }
  const result = events.at(-1);
  if (result.type !== 'result') return failure('incomplete_output');
  if (
    result.is_error ||
    result.error ||
    (result.subtype && result.subtype !== "success")
  )
    return failure(
      classifyError(result.error ?? result.result ?? result.subtype),
    );
  if (
    result.type !== "result" ||
    result.subtype !== "success" ||
    result.is_error !== false
  )
    return failure("parse_error");
  const respondingModels = events.flatMap(event => [event.message?.model,
    event.type === 'system' && event.subtype === 'init' ? event.model : null]).concat(result.model)
    .filter(value => typeof value === 'string' && value.trim());
  const usageModels = Object.keys(result.modelUsage ?? {});
  // Web tools can bill an internal helper; aggregate usage is not a main-model fallback.
  const actualModel = reportedModel(respondingModels.length ? respondingModels
    : usageModels.length === 1 ? usageModels : [], model);
  if (actualModel && model && actualModel !== model)
    return failure("model_mismatch", actualModel);
  const calls = new Map();
  for (const event of events) {
    for (const block of Array.isArray(event.message?.content) ? event.message.content : []) {
      if (block.type === 'tool_use') {
        if (!['WebSearch', 'WebFetch'].includes(block.name) || !block.id)
          return failure('unexpected_tool_use', actualModel);
        calls.set(block.id, { completed: false, failed: false });
      } else if (block.type === 'tool_result') {
        const call = calls.get(block.tool_use_id);
        if (!call) return failure('unexpected_tool_use', actualModel);
        call.failed = block.is_error === true;
        call.completed = !call.failed;
      } else if (typeof block.type === 'string' && block.type.includes('tool')) {
        return failure('unexpected_tool_use', actualModel);
      }
    }
  }
  for (const denial of result.permission_denials ?? []) {
    if (!['WebSearch', 'WebFetch'].includes(denial.tool_name)) return failure('unexpected_tool_use', actualModel);
    calls.set(denial.tool_use_id, { completed: false, failed: true });
  }
  if (typeof result.result !== "string" || !result.result.trim())
    return failure("empty_answer", actualModel);
  return { status: "success", answer: result.result.trim(), actualModel, research: researchSummary([...calls.values()]) };
}
