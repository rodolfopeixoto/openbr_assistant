import type { AgentBinding, AgentsConfig } from "./types.agents.js";
import type { ApprovalsConfig } from "./types.approvals.js";
import type { AuthConfig } from "./types.auth.js";
import type { DiagnosticsConfig, LoggingConfig, SessionConfig, WebConfig } from "./types.base.js";
import type { BrowserConfig } from "./types.browser.js";
import type { ChannelsConfig } from "./types.channels.js";
import type { CronConfig } from "./types.cron.js";
import type {
  CanvasHostConfig,
  DiscoveryConfig,
  GatewayConfig,
  TalkConfig,
} from "./types.gateway.js";
import type { HooksConfig } from "./types.hooks.js";
import type {
  AudioConfig,
  BroadcastConfig,
  CommandsConfig,
  MessagesConfig,
} from "./types.messages.js";
import type { ModelsConfig } from "./types.models.js";
import type { NodeHostConfig } from "./types.node-host.js";
import type { PluginsConfig } from "./types.plugins.js";
import type { SkillsConfig } from "./types.skills.js";
import type { ToolsConfig } from "./types.tools.js";

export type OpenClawConfig = {
  meta?: {
    /** Last OpenClaw version that wrote this config. */
    lastTouchedVersion?: string;
    /** ISO timestamp when this config was last written. */
    lastTouchedAt?: string;
  };
  auth?: AuthConfig;
  env?: {
    /** Opt-in: import missing secrets from a login shell environment (exec `$SHELL -l -c 'env -0'`). */
    shellEnv?: {
      enabled?: boolean;
      /** Timeout for the login shell exec (ms). Default: 15000. */
      timeoutMs?: number;
    };
    /** Inline env vars to apply when not already present in the process env. */
    vars?: Record<string, string>;
    /** Sugar: allow env vars directly under env (string values only). */
    [key: string]:
      | string
      | Record<string, string>
      | { enabled?: boolean; timeoutMs?: number }
      | undefined;
  };
  wizard?: {
    lastRunAt?: string;
    lastRunVersion?: string;
    lastRunCommit?: string;
    lastRunCommand?: string;
    lastRunMode?: "local" | "remote";
  };
  diagnostics?: DiagnosticsConfig;
  logging?: LoggingConfig;
  update?: {
    /** Update channel for git + npm installs ("stable", "beta", or "dev"). */
    channel?: "stable" | "beta" | "dev";
    /** Check for updates on gateway start (npm installs only). */
    checkOnStart?: boolean;
  };
  browser?: BrowserConfig;
  ui?: {
    /** Accent color for OpenClaw UI chrome (hex). */
    seamColor?: string;
    assistant?: {
      /** Assistant display name for UI surfaces. */
      name?: string;
      /** Assistant avatar (emoji, short text, or image URL/data URI). */
      avatar?: string;
    };
  };
  skills?: SkillsConfig;
  plugins?: PluginsConfig;
  models?: ModelsConfig;
  nodeHost?: NodeHostConfig;
  agents?: AgentsConfig;
  tools?: ToolsConfig;
  bindings?: AgentBinding[];
  broadcast?: BroadcastConfig;
  audio?: AudioConfig;
  messages?: MessagesConfig;
  commands?: CommandsConfig;
  approvals?: ApprovalsConfig;
  session?: SessionConfig;
  web?: WebConfig;
  channels?: ChannelsConfig;
  cron?: CronConfig;
  hooks?: HooksConfig;
  discovery?: DiscoveryConfig;
  canvasHost?: CanvasHostConfig;
  talk?: TalkConfig;
  gateway?: GatewayConfig;
  mcpServers?: Array<{
    id: string;
    name: string;
    description?: string;
    url: string;
    transport: "stdio" | "http" | "websocket";
    category?: string;
    enabled: boolean;
    auth?: {
      type: "bearer" | "api-key" | "basic";
      token?: string;
      apiKey?: string;
      username?: string;
      password?: string;
    };
    env?: Record<string, string>;
  }>;
  opencode?: OpenCodeConfig;
};

// OpenCode AI Coding Assistant Configuration
export type OpenCodeConfig = {
  enabled: boolean;
  version?: string;

  // Container Runtime Configuration
  container: {
    runtime: "docker" | "podman" | "container" | "auto";
    image: string;
    resources: {
      memory: number; // MB
      cpus: number; // Cores
      timeout: number; // Minutes
    };
    network: {
      enabled: boolean;
      ports?: number[];
    };
    security: {
      readOnly: boolean;
      dropCapabilities: boolean;
      seccompProfile: "default" | "strict" | "custom";
    };
  };

  // Workspace Configuration
  workspace: {
    basePath: string;
    allowedProjects: {
      mode: "all" | "whitelist";
      whitelist: string[];
    };
    protectedPatterns: string[];
  };

  // Security Configuration
  security: {
    approvalMode: "always" | "on-miss" | "auto";
    autoApproveSafe: boolean;
    commands: {
      allowlist: {
        enabled: boolean;
        commands: string[];
      };
      blocklist: {
        enabled: boolean;
        commands: string[];
      };
    };
    paths: {
      whitelist: string[];
      blacklist: string[];
    };
  };

  // Notifications
  notifications: {
    desktop: boolean;
    mobile: boolean;
    email: boolean;
  };

  // Audit Logging
  audit: {
    enabled: boolean;
    retentionDays: number;
    logLevel: "debug" | "info" | "warn" | "error";
  };
};

export type ConfigValidationIssue = {
  path: string;
  message: string;
};

export type LegacyConfigIssue = {
  path: string;
  message: string;
};

export type ConfigFileSnapshot = {
  path: string;
  exists: boolean;
  raw: string | null;
  parsed: unknown;
  valid: boolean;
  config: OpenClawConfig;
  hash?: string;
  issues: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
  legacyIssues: LegacyConfigIssue[];
};
