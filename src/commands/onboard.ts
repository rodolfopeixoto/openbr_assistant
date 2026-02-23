import * as crypto from "node:crypto";
import type { RuntimeEnv } from "../runtime.js";
import type { OnboardOptions } from "./onboard-types.js";
import { formatCliCommand } from "../cli/command-format.js";
import { readConfigFileSnapshot } from "../config/config.js";
import { assertSupportedRuntime } from "../infra/runtime-guard.js";
import { defaultRuntime } from "../runtime.js";
import { resolveUserPath } from "../utils.js";
import { DEFAULT_WORKSPACE, handleReset } from "./onboard-helpers.js";
import { runInteractiveOnboarding } from "./onboard-interactive.js";
import { runNonInteractiveOnboarding } from "./onboard-non-interactive.js";

export async function onboardCommand(opts: OnboardOptions, runtime: RuntimeEnv = defaultRuntime) {
  assertSupportedRuntime(runtime);
  const authChoice = opts.authChoice === "oauth" ? ("setup-token" as const) : opts.authChoice;
  const normalizedAuthChoice =
    authChoice === "claude-cli"
      ? ("setup-token" as const)
      : authChoice === "codex-cli"
        ? ("openai-codex" as const)
        : authChoice;
  if (opts.nonInteractive && (authChoice === "claude-cli" || authChoice === "codex-cli")) {
    runtime.error(
      [
        `Auth choice "${authChoice}" is deprecated.`,
        'Use "--auth-choice token" (Anthropic setup-token) or "--auth-choice openai-codex".',
      ].join("\n"),
    );
    runtime.exit(1);
    return;
  }
  if (authChoice === "claude-cli") {
    runtime.log('Auth choice "claude-cli" is deprecated; using setup-token flow instead.');
  }
  if (authChoice === "codex-cli") {
    runtime.log('Auth choice "codex-cli" is deprecated; using OpenAI Codex OAuth instead.');
  }
  const flow = opts.flow === "manual" ? ("advanced" as const) : opts.flow;
  const normalizedOpts =
    normalizedAuthChoice === opts.authChoice && flow === opts.flow
      ? opts
      : { ...opts, authChoice: normalizedAuthChoice, flow };

  if (normalizedOpts.nonInteractive && normalizedOpts.acceptRisk !== true) {
    runtime.error(
      [
        "Non-interactive onboarding requires explicit risk acknowledgement.",
        "Read: https://docs.openclaw.ai/security",
        `Re-run with: ${formatCliCommand("openclaw onboard --non-interactive --accept-risk ...")}`,
      ].join("\n"),
    );
    runtime.exit(1);
    return;
  }

  if (normalizedOpts.reset) {
    const snapshot = await readConfigFileSnapshot();
    const baseConfig = snapshot.valid ? snapshot.config : {};
    const workspaceDefault =
      normalizedOpts.workspace ?? baseConfig.agents?.defaults?.workspace ?? DEFAULT_WORKSPACE;
    await handleReset("full", resolveUserPath(workspaceDefault), runtime);
  }

  if (process.platform === "win32") {
    runtime.log(
      [
        "Windows detected.",
        "WSL2 is strongly recommended; native Windows is untested and more problematic.",
        "Guide: https://docs.openclaw.ai/windows",
      ].join("\n"),
    );
  }

  if (normalizedOpts.nonInteractive) {
    await runNonInteractiveOnboarding(normalizedOpts, runtime);
  } else {
    await runInteractiveOnboarding(normalizedOpts, runtime);
  }

  // After onboarding completes, start wizard if requested
  if (normalizedOpts.wizard) {
    runtime.log("🎨 Starting GUI wizard...");
    await startOnboardingWizard(normalizedOpts, runtime);
  }
}

async function startOnboardingWizard(opts: OnboardOptions, runtime: RuntimeEnv) {
  try {
    // Generate a temporary token for the wizard
    const token = crypto.randomBytes(32).toString("hex");

    // Get gateway port from config
    const snapshot = await readConfigFileSnapshot();
    const gatewayPort = snapshot.valid ? (snapshot.config.gateway?.port ?? 18789) : 18789;

    // Start gateway if not running
    runtime.log(`🚀 Starting gateway on port ${gatewayPort}...`);
    // TODO: Start gateway process

    // Build URL with token
    const url = `http://127.0.0.1:${gatewayPort}/ui/onboarding?token=${token}`;

    runtime.log(`🌐 Opening dashboard: ${url}`);

    // Open browser
    if (opts.openDashboard !== false) {
      const { exec } = await import("node:child_process");
      const platform = process.platform;
      const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
      exec(`${cmd} "${url}"`);
      runtime.log("✅ Browser opened! Complete the setup in the GUI.");
    } else {
      runtime.log(`🔗 Please open: ${url}`);
    }
  } catch (err) {
    runtime.error(`Failed to start wizard: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export type { OnboardOptions } from "./onboard-types.js";
