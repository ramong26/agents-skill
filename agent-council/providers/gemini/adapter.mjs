import {
  existsSync,
  readFileSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import {
  billingDecision,
  classifyError,
  failure,
  inspectCli,
  invocation,
  parseObject,
  reportedModel,
} from "../shared.mjs";

export const id = "gemini";

function globalDirectory(env) {
  return join(
    env.GEMINI_CLI_HOME || env.USERPROFILE || env.HOME || homedir(),
    ".gemini",
  );
}

function systemSettings(env, defaults = false) {
  const systemPath =
    env.GEMINI_CLI_SYSTEM_SETTINGS_PATH ||
    (process.platform === "win32"
      ? join(
          env.ProgramData || "C:\\ProgramData",
          "gemini-cli",
          "settings.json",
        )
      : process.platform === "darwin"
        ? "/Library/Application Support/GeminiCli/settings.json"
        : "/etc/gemini-cli/settings.json");
  const path = defaults
    ? env.GEMINI_CLI_SYSTEM_DEFAULTS_PATH ||
      join(dirname(systemPath), "system-defaults.json")
    : systemPath;
  if (!existsSync(path)) return {};
  return parseObject(readFileSync(path, "utf8"));
}

function isolationAllowed(settings) {
  return (
    (!settings.tools?.core ||
      (Array.isArray(settings.tools.core) &&
        settings.tools.core.length === 0)) &&
    settings.hooksConfig?.enabled !== true &&
    settings.skills?.enabled !== true &&
    settings.admin?.mcp?.enabled !== true &&
    settings.admin?.extensions?.enabled !== true &&
    settings.advanced?.ignoreLocalEnv !== false &&
    !settings.modelConfigs &&
    settings.experimental?.dynamicModelConfiguration !== false
  );
}

// Gemini CLI 버전, 기존 Google 로그인 설정과 캐시 존재, 상속 설정을 검사해 참여 여부를 판단한다.
export async function preflight(options) {
  const inspected = await inspectCli(id, options, [
    "--prompt",
    "--model",
    "--output-format",
    "--approval-mode",
    "--extensions",
    "--skip-trust",
  ]);
  if (!inspected.ok) return inspected;
  const [major, minor] = inspected.cliVersion.split(".").map(Number);
  if (major === 0 && minor < 65)
    return {
      ok: false,
      code: "unsupported_cli",
      cliVersion: inspected.cliVersion,
    };
  const env = options.env || {};
  const directory = globalDirectory(env);
  let user;
  try {
    if (
      !existsSync(join(directory, "settings.json")) ||
      !statSync(join(directory, "oauth_creds.json")).isFile()
    )
      return {
        ok: false,
        code: "auth_missing",
        cliVersion: inspected.cliVersion,
      };
    user = parseObject(readFileSync(join(directory, "settings.json"), "utf8"));
  } catch {
    return {
      ok: false,
      code: "auth_missing",
      cliVersion: inspected.cliVersion,
    };
  }
  if (user.security?.auth?.selectedType !== "oauth-personal")
    return {
      ok: false,
      code: "auth_policy_conflict",
      cliVersion: inspected.cliVersion,
    };
  // Deep-merged aliases/overrides can rewrite an explicit model before fallback handling.
  if (user.modelConfigs)
    return {
      ok: false,
      code: "isolation_unconfirmed",
      cliVersion: inspected.cliVersion,
    };
  let system;
  try {
    system = systemSettings(env);
    if (systemSettings(env, true).modelConfigs)
      return {
        ok: false,
        code: "isolation_unconfirmed",
        cliVersion: inspected.cliVersion,
      };
  } catch {
    return {
      ok: false,
      code: "isolation_unconfirmed",
      cliVersion: inspected.cliVersion,
    };
  }
  if (
    system.security?.auth?.enforcedType &&
    system.security.auth.enforcedType !== "oauth-personal"
  )
    return {
      ok: false,
      code: "auth_policy_conflict",
      cliVersion: inspected.cliVersion,
    };
  if (!isolationAllowed(system))
    return {
      ok: false,
      code: "isolation_unconfirmed",
      cliVersion: inspected.cliVersion,
    };
  // Presence is not token validity; NO_BROWSER + headless fails rather than authenticating.
  return billingDecision(
    options.config,
    inspected.cliVersion,
    "existing_login_configured",
  );
}

// 실행 전용 작업 폴더에 도구·모델 대체 제한 설정을 만들고 브라우저 인증을 막는 Gemini 명령을 구성한다.
export function buildInvocation({ model, prompt, cwd, env }) {
  const directory = join(cwd, ".gemini");
  // Only the generated per-provider workspace is writable; never replace an existing file.
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const singleModel = [
    {
      model,
      isLastResort: true,
      maxAttempts: 1,
      actions: {
        terminal: "silent",
        transient: "silent",
        not_found: "silent",
        unknown: "silent",
      },
      stateTransitions: {
        terminal: "terminal",
        transient: "terminal",
        not_found: "terminal",
        unknown: "terminal",
      },
    },
  ];
  writeFileSync(
    join(directory, "settings.json"),
    JSON.stringify({
      tools: { core: [] },
      hooksConfig: { enabled: false },
      skills: { enabled: false },
      admin: { mcp: { enabled: false }, extensions: { enabled: false } },
      security: {
        auth: {
          selectedType: "oauth-personal",
          enforcedType: "oauth-personal",
        },
      },
      context: { loadMemoryFromIncludeDirectories: false },
      experimental: { dynamicModelConfiguration: true },
      modelConfigs: {
        modelChains: Object.fromEntries(
          ["lite", "default", "preview", "auto-default", "auto-preview"].map(
            (name) => [name, singleModel],
          ),
        ),
      },
      advanced: { ignoreLocalEnv: true, autoConfigureMemory: false },
      telemetry: { enabled: false, logPrompts: false },
    }),
    { flag: "wx", mode: 0o600 },
  );
  const child = invocation(
    id,
    [
      "--prompt",
      "Answer the question provided on stdin using only that supplied context.",
      "--model",
      model,
      "--output-format",
      "json",
      "--approval-mode",
      "plan",
      "--extensions",
      "none",
      "--skip-trust",
    ],
    prompt,
    env,
  );
  child.env.NO_BROWSER = "true";
  // CLI loads settings before parsing --skip-trust; trust only this generated cwd.
  child.env.GEMINI_CLI_TRUST_WORKSPACE = "true";
  child.env.CI = "true";
  child.env.GEMINI_WRITE_SYSTEM_MD = "false";
  // Prevent a home .env file from injecting another auth route after sanitization.
  for (const key of [
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "GOOGLE_GENAI_USE_VERTEXAI",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_CLOUD_ACCESS_TOKEN",
    "GOOGLE_GENAI_USE_GCA",
    "GOOGLE_GEMINI_BASE_URL",
    "GOOGLE_VERTEX_BASE_URL",
    "GEMINI_CLI_AUTH_OVERRIDE",
  ])
    child.env[key] = "";
  return child;
}

// Gemini 결과 JSON에서 최종 답변과 보고된 모델을 추출하고 오류·빈 답변·모델 불일치 결과를 제외한다.
export function parseResult({ stdout = "", stderr = "", exitCode, model }) {
  if (exitCode !== 0) return failure(classifyError(stderr || stdout));
  let result;
  try {
    result = parseObject(stdout);
  } catch {
    return failure("parse_error");
  }
  if (result.error) return failure(classifyError(result.error));
  const actualModel = reportedModel(
    [result.model, ...Object.keys(result.stats?.models ?? {})],
    model,
  );
  if (actualModel && model && actualModel !== model)
    return failure("model_mismatch", actualModel);
  if (typeof result.response !== "string" || !result.response.trim())
    return failure("empty_answer", actualModel);
  return { status: "success", answer: result.response.trim(), actualModel };
}
