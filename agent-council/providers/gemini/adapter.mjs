import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  existingLoginDecision,
  classifyError,
  failure,
  inspectCli,
  invocation,
  parseObject,
  reportedModel,
  researchSummary,
} from "../shared.mjs";

export const id = "gemini";

function settingsPath(env) {
  return join(
    env.USERPROFILE || env.HOME || homedir(),
    ".gemini",
    "antigravity-cli",
    "settings.json",
  );
}

function readSettings(env) {
  const path = settingsPath(env);
  if (!existsSync(path)) return {};
  return parseObject(readFileSync(path, "utf8"));
}

function isolationAllowed(settings) {
  if (
    settings.allowNonWorkspaceAccess !== undefined &&
    settings.allowNonWorkspaceAccess !== false
  )
    return false;
  if (
    settings.toolPermission !== undefined &&
    !["request-review", "strict"].includes(settings.toolPermission)
  )
    return false;
  if (
    settings.artifactReviewPolicy !== undefined &&
    !["asks-for-review", "agent-decides"].includes(
      settings.artifactReviewPolicy,
    )
  )
    return false;

  const permissions = settings.permissions;
  if (permissions === undefined) return true;
  if (
    !permissions ||
    typeof permissions !== "object" ||
    Array.isArray(permissions)
  )
    return false;
  for (const key of ["allow", "ask", "deny"]) {
    const entries = permissions[key];
    if (
      entries !== undefined &&
      (!Array.isArray(entries) ||
        entries.some((entry) => typeof entry !== "string"))
    )
      return false;
  }
  return !permissions.allow?.length;
}

// AGY account auth uses the OS keyring; the token itself is never read here.
export async function preflight(options) {
  const effort = options.config?.providers?.gemini?.effort;
  if (effort && !["low", "medium", "high"].includes(effort))
    return { ok: false, code: "unsupported_cli" };
  const requiredFlags = [
    "--input-format",
    "--output-format",
    "--model",
    "--sandbox",
  ];
  if (effort) requiredFlags.push("--effort");
  let settings;
  try {
    settings = readSettings(options.env || {});
  } catch {
    return { ok: false, code: "isolation_unconfirmed" };
  }
  // Current Antigravity CLI settings document false as the default for this option.
  if (
    settings.useG1Credits !== undefined &&
    settings.useG1Credits !== false
  )
    return { ok: false, code: "credit_fallback_enabled", billing: "unconfirmed" };
  if (
    settings.modelProvider !== undefined &&
    settings.modelProvider !== null &&
    settings.modelProvider !== ""
  )
    return {
      ok: false,
      code: "auth_policy_conflict",
    };
  if (!isolationAllowed(settings))
    return { ok: false, code: "isolation_unconfirmed" };

  const inspected = await inspectCli(id, options, requiredFlags);
  if (!inspected.ok) return inspected;

  const modelCheck = await inspected.run(["models"], 30000);
  const modelOutput = `${modelCheck.stdout ?? ""}\n${modelCheck.stderr ?? ""}`;
  if (modelCheck.code)
    return {
      ok: false,
      code: modelCheck.code,
      cliVersion: inspected.cliVersion,
    };
  if (
    modelCheck.exitCode !== 0 ||
    /please sign in|not logged into antigravity|authentication required/i.test(modelOutput)
  ) {
    const code = classifyError(modelOutput);
    return {
      ok: false,
      code,
      auth: code === "credential_store_unavailable" ? "unconfirmed" : null,
      cliVersion: inspected.cliVersion,
    };
  }
  const model = options.config?.providers?.gemini?.model;
  if (!model || !modelOutput.includes(model))
    return {
      ok: false,
      code: "model_unavailable",
      cliVersion: inspected.cliVersion,
    };

  // The models command confirms keyring-backed account access without generating a response.
  return existingLoginDecision(
    inspected.cliVersion,
    "existing_login",
    options.includedOnly === true ? "included_only" : "unconfirmed",
  );
}

// AGY requires stream-json on both sides; stdin carries one explicit user event.
export function buildInvocation({ model, effort, prompt, env }) {
  const args = [
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--model",
    model,
    "--sandbox",
  ];
  if (effort) args.push("--effort", effort);
  const input =
    JSON.stringify({ event: "user", message: { content: prompt } }) + "\n";
  return invocation(id, args, input, env);
}

// Only a successful terminal result is an answer; progress and tool events are not.
export function parseResult({ stdout = "", stderr = "", exitCode, model }) {
  if (exitCode !== 0) return failure(classifyError(stderr + "\n" + stdout));

  let events;
  try {
    events = stdout
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => parseObject(line));
  } catch {
    return failure("parse_error");
  }
  const results = events.filter((event) => event.event === "result");
  if (results.length !== 1) return failure("incomplete_output");
  const result = results[0].result;
  if (!result || typeof result !== "object" || Array.isArray(result))
    return failure("parse_error");

  const actualModel = reportedModel(
    events.flatMap((event) => [
      event.model,
      event.init?.model,
      event.init?.selectedModel,
      event.result?.model,
      event.result?.metadata?.model,
      event.step_update?.model,
    ]),
    model,
  );
  if (actualModel && model && actualModel !== model)
    return failure("model_mismatch", actualModel);
  const calls = new Map();
  for (const event of events) {
    if (event.event !== 'step_update') continue;
    const step = event.step_update;
    if (step?.subagent_info || step?.tool_call) return failure('unexpected_tool_use', actualModel);
    if (!step?.tool_info && !step?.tool_name && !/tool|command|file|mcp|permission|subagent/i.test(step?.step_type || '')) continue;
    const names = [step.tool_name, step.tool_info?.name].filter(name => name !== undefined);
    if (step.step_type !== 'tool' || !Number.isInteger(step.step_index) || step.step_index < 0 ||
        !['ACTIVE', 'DONE'].includes(step.state) || !names.length ||
        names.some(name => !['search_web', 'read_url_content'].includes(name) || name !== names[0]))
      return failure('unexpected_tool_use', actualModel);
    const previous = calls.get(step.step_index);
    if (previous && previous.name !== names[0]) return failure('unexpected_tool_use', actualModel);
    const failed = Boolean(step.tool_info?.error);
    calls.set(step.step_index, { name: names[0], failed,
      completed: step.state === 'DONE' && Boolean(step.tool_info) && !failed });
  }
  if (result.denied_actions !== undefined && !Array.isArray(result.denied_actions)) return failure('parse_error', actualModel);
  for (const denial of result.denied_actions ?? []) {
    const deniedCalls = [...calls.values()].filter(call => call.name === 'read_url_content');
    if (denial?.action !== 'read_url' || !deniedCalls.length) return failure('unexpected_tool_use', actualModel);
    for (const call of deniedCalls) { call.failed = true; call.completed = false; }
  }
  // Some headless denials are reported only on stderr, without a call-specific error.
  if (/soft[- ]denied|auto[- ]denied|tool required.*permission/i.test(stderr))
    for (const call of calls.values()) call.completed = false;
  if (result.status !== "SUCCESS")
    return failure(classifyError(result.error || result.status), actualModel);
  if (typeof result.response !== "string" || !result.response.trim())
    return failure("empty_answer", actualModel);
  return {
    status: "success",
    answer: result.response.trim(),
    actualModel,
    research: researchSummary([...calls.values()]),
  };
}
