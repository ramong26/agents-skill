import { readFileSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve, sep } from "node:path";

const executables = { codex: "codex", claude: "claude", gemini: "agy" };
const packages = {
  codex: "@openai/codex",
  claude: "@anthropic-ai/claude-code",
};
const authKeys = {
  codex:
    /^(OPENAI_API_KEY|CODEX_API_KEY|OPENAI_BASE_URL|OPENAI_API_BASE|CODEX_MODEL_PROVIDER|CODEX_CA_CERTIFICATE|CODEX_CONNECTORS_BASE_URL)$/i,
  claude:
    /^(ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|ANTHROPIC_BASE_URL|CLAUDE_CODE_OAUTH_TOKEN|CLAUDE_CODE_USE_BEDROCK|CLAUDE_CODE_USE_VERTEX|CLAUDE_CODE_USE_FOUNDRY|ANTHROPIC_FOUNDRY_API_KEY)$/i,
  gemini:
    /^(GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENAI_USE_VERTEXAI|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_GEMINI_BASE_URL|GOOGLE_VERTEX_BASE_URL|GEMINI_CLI_AUTH_OVERRIDE|GOOGLE_CLOUD_ACCESS_TOKEN|GOOGLE_GENAI_USE_GCA|AGY_ADC_AUTH)$/i,
};

export function hasAuthConflict(id, env = {}) {
  return Object.entries(env).some(
    ([key, value]) =>
      authKeys[id].test(key) && value !== undefined && value !== "",
  );
}

export function childEnvironment(env = {}) {
  return Object.fromEntries(
    Object.entries(env).filter(
      ([key]) =>
        !/API_?KEY|AUTH_TOKEN|ACCESS_TOKEN|BEARER_TOKEN|NODE_OPTIONS|NODE_PATH|LD_PRELOAD|DYLD_INSERT_LIBRARIES/i.test(
          key,
        ) && !Object.values(authKeys).some((pattern) => pattern.test(key)),
    ),
  );
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function resolveCli(id, env = process.env, platform = process.platform) {
  const executable = executables[id] || id;
  const path =
    Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ??
    "";
  const dirs = path
    .split(platform === "win32" ? ";" : delimiter)
    .filter(Boolean);
  for (const rawDir of dirs) {
    const dir = rawDir.replace(/^"|"$/g, "");
    const native = join(dir, executable + (platform === "win32" ? ".exe" : ""));
    if (isFile(native)) return { command: native, prefix: [] };
    if (
      platform !== "win32" ||
      ![".cmd", ".ps1"].some((ext) => isFile(join(dir, executable + ext))) ||
      !packages[id]
    )
      continue;
    const pkgDir = join(dir, "node_modules", packages[id]);
    try {
      const pkg = JSON.parse(
        readFileSync(join(pkgDir, "package.json"), "utf8"),
      );
      const bin =
        typeof pkg.bin === "string"
          ? pkg.bin
          : (pkg.bin?.[executable] ?? pkg.bin?.[id]);
      if (typeof bin !== "string" || isAbsolute(bin)) continue;
      const entry = resolve(pkgDir, bin);
      if (entry.startsWith(resolve(pkgDir) + sep) && isFile(entry))
        return { command: process.execPath, prefix: [entry] };
    } catch {
      /* Unknown shims are not interpreted or executed through a shell. */
    }
  }
  if (id === "gemini" && platform === "win32") {
    const installDirs = [
      env.LOCALAPPDATA && join(env.LOCALAPPDATA, "agy", "bin"),
      env.USERPROFILE &&
        join(env.USERPROFILE, "AppData", "Local", "agy", "bin"),
    ].filter(Boolean);
    for (const dir of new Set(installDirs)) {
      const candidate = join(dir, "agy.exe");
      if (isFile(candidate)) return { command: candidate, prefix: [] };
    }
  }
  return null;
}

export function invocation(id, args, prompt, env) {
  const cli = resolveCli(id, env);
  if (!cli)
    throw Object.assign(new Error("CLI unavailable"), { code: "cli_missing" });
  return {
    command: cli.command,
    args: [...cli.prefix, ...args],
    input: prompt,
    env: childEnvironment(env),
  };
}

export function classifyError(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  if (
    /unauthori[sz]ed|authentication|not logged|sign.?in|login required|expired token|invalid.*token|\b401\b/i.test(
      text,
    )
  )
    return "auth_failed";
  if (
    /credit|quota|usage.limit|insufficient.balance|hit your limit|limit.*(?:reached|exceeded|exhausted)/i.test(
      text,
    )
  )
    return "quota_exhausted";
  if (/rate.limit|too many requests|\b429\b/i.test(text)) return "rate_limited";
  if (
    /invalid model selection|unknown model|not recognized as (?:a )?known model|model.*(unavailable|unsupported|not found|not exist|access|permission)|unsupported.*model/i.test(
      text,
    )
  )
    return "model_unavailable";
  return "execution_error";
}

export function failure(code, actualModel = null) {
  return { status: "excluded", code, actualModel };
}

export function parseObject(stdout) {
  const parsed = JSON.parse(stdout);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Expected object");
  return parsed;
}

export function reportedModel(models, requested) {
  const unique = [
    ...new Set(
      models.filter((model) => typeof model === "string" && model.trim()),
    ),
  ];
  return (
    unique.find((model) => requested && model !== requested) ??
    unique[0] ??
    null
  );
}

export async function inspectCli(
  id,
  { env = {}, cwd, runProcess, signal },
  requiredFlags,
) {
  if (hasAuthConflict(id, env))
    return { ok: false, code: "auth_policy_conflict" };
  const cli = resolveCli(id, env);
  if (!cli) return { ok: false, code: "cli_missing" };
  const run = (args, timeoutMs = 10000) =>
    runProcess({
      command: cli.command,
      args: [...cli.prefix, ...args],
      cwd,
      env: childEnvironment(env),
      signal,
      timeoutMs,
      maxBytes: 131072,
    });
  const version = await run(["--version"]);
  if (version.code || version.exitCode !== 0)
    return { ok: false, code: version.code ?? "execution_error" };
  const cliVersion = version.stdout?.match(
    /\b\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?\b/,
  )?.[0];
  if (!cliVersion) return { ok: false, code: "unsupported_cli" };
  const help = await run(id === "codex" ? ["exec", "--help"] : ["--help"]);
  if (help.code || help.exitCode !== 0)
    return { ok: false, code: help.code ?? "execution_error", cliVersion };
  const helpText = `${help.stdout ?? ""}\n${help.stderr ?? ""}`;
  if (requiredFlags.some((flag) => !helpText.includes(flag)))
    return { ok: false, code: "unsupported_cli", cliVersion };
  return { ok: true, cliVersion, run };
}

export const unconfirmedBilling = (cliVersion) => ({
  ok: false,
  code: "billing_unconfirmed",
  cliVersion,
  auth: null,
  billing: "unconfirmed",
});

export function billingDecision(
  cliVersion,
  auth = null,
  billingStatus = "unconfirmed",
) {
  if (billingStatus === "included_only")
    return { ok: true, cliVersion, auth, billing: billingStatus };
  return { ...unconfirmedBilling(cliVersion), auth };
}
