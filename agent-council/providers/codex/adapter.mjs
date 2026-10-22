import {
  billingDecision,
  classifyError,
  failure,
  inspectCli,
  invocation,
  reportedModel,
  researchSummary,
} from "../shared.mjs";

export const id = "codex";

// Codex CLI의 지원 옵션과 기존 ChatGPT 로그인을 확인하고 비용 정책에 따라 참여 여부를 판단한다.
export async function preflight(options) {
  const inspected = await inspectCli(id, options, [
    "--ignore-user-config",
    "--ignore-rules",
    "--ephemeral",
    "--json",
  ]);
  if (!inspected.ok) return inspected;
  const status = await inspected.run(["login", "status"]);
  if (status.code)
    return { ok: false, code: status.code, cliVersion: inspected.cliVersion };
  const text = `${status.stdout}\n${status.stderr}`;
  if (status.exitCode !== 0 || !/logged in using chatgpt/i.test(text)) {
    return {
      ok: false,
      code: /api.?key/i.test(text) ? "auth_policy_conflict" : "auth_failed",
      cliVersion: inspected.cliVersion,
    };
  }
  // Login status does not establish whether account usage credits can be consumed.
  return billingDecision(options.config, inspected.cliVersion);
}

// 지정 모델·추론 강도와 도구 제한을 적용한 Codex 실행 명령 및 표준 입력을 구성한다.
export function buildInvocation({ model, effort, prompt, cwd, env }) {
  const args = [
    "exec",
    "--ignore-user-config",
    "--ignore-rules",
    "--ephemeral",
    "--skip-git-repo-check",
    "--json",
    "--color",
    "never",
    "--model",
    model,
    "--sandbox",
    "read-only",
    "-C",
    cwd,
    "-c",
    'approval_policy="never"',
    "-c",
    'web_search="live"',
    "-c",
    "project_doc_max_bytes=0",
  ];
  for (const feature of [
    "shell_tool",
    "unified_exec",
    "multi_agent",
    "apps",
    "plugins",
    "hooks",
    "memories",
    "code_mode",
    "browser_use",
    "computer_use",
    "image_generation",
  ])
    args.push("--disable", feature);
  if (effort)
    args.push("-c", `model_reasoning_effort=${JSON.stringify(effort)}`);
  args.push("-");
  return invocation(id, args, prompt, env);
}

// 공개 웹 도구만 수집하며 다른 도구·모델 불일치·불완전 결과는 제외한다.
export function parseResult({ stdout = "", stderr = "", exitCode, model }) {
  if (exitCode !== 0) return failure(classifyError(stderr || stdout));
  let events;
  try {
    events = stdout
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch {
    return failure("parse_error");
  }
  if (
    events.some(
      (event) => !event || typeof event !== "object" || Array.isArray(event),
    )
  )
    return failure("parse_error");
  const error = events.find((event) =>
    ["error", "turn.failed"].includes(event.type),
  );
  if (error) return failure(classifyError(error));
  const actualModel = reportedModel(
    events.flatMap((event) => [event.model, event.item?.model]),
    model,
  );
  if (actualModel && model && actualModel !== model)
    return failure("model_mismatch", actualModel);
  if (
    events.some((event) =>
      event.item && !["agent_message", "reasoning", "web_search", "todo_list", "error"].includes(event.item.type),
    )
  )
    return failure("unexpected_tool_use", actualModel);
  if (!events.some((event) => event.type === "turn.completed"))
    return failure("incomplete_output", actualModel);
  const messages = events.filter(
    (event) =>
      event.type === "item.completed" &&
      event.item?.type === "agent_message" &&
      event.item.phase !== "commentary",
  );
  const answer = messages.at(-1)?.item?.text;
  if (typeof answer !== "string" || !answer.trim())
    return failure("empty_answer", actualModel);
  const calls = new Map();
  for (const event of events.filter(event => event.item?.type === 'web_search')) {
    const item = event.item;
    const identified = ['search', 'open_page', 'find_in_page'].includes(item.action?.type);
    // CLI 0.163 emits a known placeholder before the completed action is available.
    const pending = event.type === 'item.started' && item.action?.type === 'other';
    if (!item.id || (!identified && !pending))
      return failure('unexpected_tool_use', actualModel);
    calls.set(item.id, { completed: event.type === 'item.completed' && !item.error && item.status !== 'failed',
      failed: Boolean(item.error || item.status === 'failed'), identified });
  }
  if ([...calls.values()].some(call => !call.identified)) return failure('unexpected_tool_use', actualModel);
  return { status: "success", answer: answer.trim(), actualModel, research: researchSummary([...calls.values()]) };
}
