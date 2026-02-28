import type { IconName } from "./icons.js";

export const TAB_GROUPS = [
  { label: "Chat", tabs: ["chat"] },
  {
    label: "Control",
    tabs: ["overview", "features", "channels", "instances", "sessions", "cron"],
  },
  { label: "Intelligence", tabs: ["news"] },
  { label: "Agent", tabs: ["skills", "nodes", "opencode", "mcp"] },
  { label: "AI", tabs: ["models", "modelRouting", "ollama"] },
  { label: "System", tabs: ["containers", "security", "rateLimits", "analytics", "budget", "metrics", "cache"] },
  { label: "Settings", tabs: ["config", "env", "workspace", "compliance", "debug", "logs"] },
] as const;

export type Tab =
  | "overview"
  | "channels"
  | "instances"
  | "sessions"
  | "cron"
  | "skills"
  | "nodes"
  | "chat"
  | "models"
  | "config"
  | "env"
  | "workspace"
  | "compliance"
  | "debug"
  | "logs"
  | "news"
  | "features"
  | "containers"
  | "security"
  | "opencode"
  | "mcp"
  | "modelRouting"
  | "ollama"
  | "rateLimits"
  | "analytics"
  | "budget"
  | "metrics"
  | "cache";

const TAB_PATHS: Record<Tab, string> = {
  overview: "/overview",
  channels: "/channels",
  instances: "/instances",
  sessions: "/sessions",
  cron: "/cron",
  skills: "/skills",
  nodes: "/nodes",
  chat: "/chat",
  models: "/models",
  config: "/config",
  env: "/env",
  workspace: "/workspace",
  compliance: "/compliance",
  debug: "/debug",
  logs: "/logs",
  news: "/news",
  features: "/features",
  containers: "/containers",
  security: "/security",
  opencode: "/opencode",
  mcp: "/mcp",
  modelRouting: "/model-routing",
  ollama: "/ollama",
  rateLimits: "/rate-limits",
  analytics: "/analytics",
  budget: "/budget",
  metrics: "/metrics",
  cache: "/cache",
};

const PATH_TO_TAB = new Map(Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as Tab]));

export function normalizeBasePath(basePath: string): string {
  if (!basePath) return "";
  let base = basePath.trim();
  if (!base.startsWith("/")) base = `/${base}`;
  if (base === "/") return "";
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  let normalized = path.trim();
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function pathForTab(tab: Tab, basePath = ""): string {
  const base = normalizeBasePath(basePath);
  const path = TAB_PATHS[tab];
  return base ? `${base}${path}` : path;
}

export function tabFromPath(pathname: string, basePath = ""): Tab | null {
  const base = normalizeBasePath(basePath);
  let path = pathname || "/";
  if (base) {
    if (path === base) {
      path = "/";
    } else if (path.startsWith(`${base}/`)) {
      path = path.slice(base.length);
    }
  }
  let normalized = normalizePath(path).toLowerCase();
  if (normalized.endsWith("/index.html")) normalized = "/";
  if (normalized === "/") return "chat";
  return PATH_TO_TAB.get(normalized) ?? null;
}

export function inferBasePathFromPathname(pathname: string): string {
  let normalized = normalizePath(pathname);
  if (normalized.endsWith("/index.html")) {
    normalized = normalizePath(normalized.slice(0, -"/index.html".length));
  }
  if (normalized === "/") return "";
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  for (let i = 0; i < segments.length; i++) {
    const candidate = `/${segments.slice(i).join("/")}`.toLowerCase();
    if (PATH_TO_TAB.has(candidate)) {
      const prefix = segments.slice(0, i);
      return prefix.length ? `/${prefix.join("/")}` : "";
    }
  }
  return `/${segments.join("/")}`;
}

export function iconForTab(tab: Tab): IconName {
  switch (tab) {
    case "chat":
      return "messageSquare";
    case "overview":
      return "barChart";
    case "channels":
      return "link";
    case "instances":
      return "radio";
    case "sessions":
      return "fileText";
    case "cron":
      return "loader";
    case "skills":
      return "zap";
    case "nodes":
      return "monitor";
    case "models":
      return "brain";
    case "config":
      return "settings";
    case "env":
      return "key";
    case "workspace":
      return "folder";
    case "compliance":
      return "shield";
    case "debug":
      return "bug";
    case "logs":
      return "scrollText";
    case "news":
      return "globe";
    case "features":
      return "layers";
    case "containers":
      return "package";
    case "security":
      return "lock";
    case "opencode":
      return "code";
    case "mcp":
      return "puzzle";
    case "modelRouting":
      return "gitBranch";
    case "ollama":
      return "cpu";
    case "rateLimits":
      return "alertCircle";
    case "analytics":
      return "barChart";
    case "budget":
      return "star";
    case "metrics":
      return "barChart";
    case "cache":
      return "database";
    default:
      return "folder";
  }
}

export function titleForTab(tab: Tab) {
  switch (tab) {
    case "overview":
      return "Overview";
    case "channels":
      return "Channels";
    case "instances":
      return "Instances";
    case "sessions":
      return "Sessions";
    case "cron":
      return "Cron Jobs";
    case "skills":
      return "Skills";
    case "nodes":
      return "Nodes";
    case "chat":
      return "Chat";
    case "models":
      return "Models";
    case "config":
      return "Config";
    case "env":
      return "Environment";
    case "workspace":
      return "Workspace";
    case "compliance":
      return "Compliance";
    case "debug":
      return "Debug";
    case "logs":
      return "Logs";
    case "news":
      return "News";
    case "features":
      return "Features";
    case "containers":
      return "Containers";
    case "security":
      return "Security";
    case "opencode":
      return "OpenCode";
    case "mcp":
      return "MCP";
    case "modelRouting":
      return "Model Routing";
    case "ollama":
      return "Local LLM";
    case "rateLimits":
      return "Rate Limits";
    case "analytics":
      return "Analytics";
    case "budget":
      return "Budget";
    case "metrics":
      return "Metrics";
    case "cache":
      return "Cache";
    default:
      return "Control";
  }
}

export function subtitleForTab(tab: Tab) {
  switch (tab) {
    case "overview":
      return "Gateway status, entry points, and a fast health read.";
    case "channels":
      return "Manage channels and settings.";
    case "instances":
      return "Presence beacons from connected clients and nodes.";
    case "sessions":
      return "Inspect active sessions and adjust per-session defaults.";
    case "cron":
      return "Schedule wakeups and recurring agent runs.";
    case "skills":
      return "Manage skill availability and API key injection.";
    case "nodes":
      return "Paired devices, capabilities, and command exposure.";
    case "chat":
      return "Direct gateway chat session for quick interventions.";
    case "models":
      return "Configure AI model providers and manage credentials.";
    case "config":
      return "Edit ~/.openclaw/openclaw.json safely.";
    case "env":
      return "Manage environment variables securely with encryption.";
    case "workspace":
      return "Edit agent workspace files like SOUL.md and AGENTS.md.";
    case "compliance":
      return "Monitor GDPR, SOC2, HIPAA compliance status.";
    case "debug":
      return "Gateway snapshots, events, and manual RPC calls.";
    case "logs":
      return "Live tail of the gateway file logs.";
    case "news":
      return "News and intelligence aggregation.";
    case "features":
      return "Feature management and configuration.";
    case "containers":
      return "Container management and orchestration.";
    case "security":
      return "Security settings and audit logs.";
    case "opencode":
      return "AI-powered code assistance.";
    case "mcp":
      return "Model Context Protocol servers.";
    case "modelRouting":
      return "Intelligent model routing and tier management.";
    case "ollama":
      return "Direct llama.cpp with Llama 3.2:3b - lightweight local inference";
    case "rateLimits":
      return "Rate limiting and throttling controls.";
    case "analytics":
      return "Unified budget tracking and usage metrics.";
    case "budget":
      return "Budget management and cost controls.";
    case "metrics":
      return "Usage metrics and analytics.";
    case "cache":
      return "Cache management and configuration.";
    default:
      return "";
  }
}
