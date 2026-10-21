import {
  existingLoginDecision,
  classifyError,
  failure,
  inspectCli,
  invocation,
  parseObject,
  reportedModel,
} from "../shared.mjs";

export const id = "claude";

// 기존 OAuth 로그인으로 바로 실행하고 실제 요청 오류를 처리한다.
export async function preflight(options) {
  const inspected = await inspectCli(id, options, [
    "--safe-mode",
    "--restricted",
    "--tools",
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
  if (typeof auth.subscriptionType === "string" && auth.subscriptionType.toLowerCase() === "free")
    return {
      ok: false,
      code: "free_plan_unsupported",
      cliVersion: inspected.cliVersion,
      auth: "existing_login",
      billing: "unconfirmed",
    };
  return existingLoginDecision(
    inspected.cliVersion,
    "existing_login",
    options.includedOnly === true ? "included_only" : "unconfirmed",
  );
}

// 지정 모델·추론 강도를 설정하고 도구·MCP를 제한한 Claude 비대화형 실행 명령을 구성한다.
export function buildInvocation({ model, effort, prompt, env }) {
  const args = [
    "--print",
    "--safe-mode",
    "--restricted",
    "--tools",
    "",
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    "--permission-mode",
    "dontAsk",
    "--permission-prompts",
    "none",
    "--no-session-persistence",
    "--output-format",
    "json",
    "--model",
    model,
  ];
  if (effort) args.push("--effort", effort);
  return invocation(id, args, prompt, env);
}

// Claude 결과 JSON에서 최종 답변과 보고된 모델을 추출하고 오류·빈 답변·모델 불일치 결과를 제외한다.
export function parseResult({ stdout = "", stderr = "", exitCode, model }) {
  if (exitCode !== 0) return failure(classifyError(stderr + "\n" + stdout));
  let result;
  try {
    result = parseObject(stdout);
  } catch {
    return failure("parse_error");
  }
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
  const actualModel = reportedModel(
    [result.model, ...Object.keys(result.modelUsage ?? {})],
    model,
  );
  if (actualModel && model && actualModel !== model)
    return failure("model_mismatch", actualModel);
  if (typeof result.result !== "string" || !result.result.trim())
    return failure("empty_answer", actualModel);
  return { status: "success", answer: result.result.trim(), actualModel };
}
