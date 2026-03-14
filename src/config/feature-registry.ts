// Feature Registry - Centralized feature definitions
// Spec B1: Centralized Features Dashboard

export type FeatureStatus = "enabled" | "disabled" | "needs_config" | "unavailable";

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  handler: "toggle" | "config" | "view";
}

export interface DashboardFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  status: FeatureStatus;
  configurable: boolean;
  hasConfigModal: boolean;
  configRoute?: string;
  icon: string;
  tags: string[];
  requires: string[];
  quickActions: QuickAction[];
  isNew?: boolean;
}

export interface FeatureCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  features: DashboardFeature[];
}

export interface FeaturesDashboardResponse {
  categories: FeatureCategory[];
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    needsConfig: number;
    unavailable: number;
  };
}

// Feature Registry Definition
export const FEATURE_REGISTRY: Record<string, Omit<DashboardFeature, "status">> = {
  // Speech & Voice
  voice_recorder: {
    id: "voice_recorder",
    name: "Voice Recorder",
    description: "Record and process voice input",
    category: "speech",
    configurable: true,
    hasConfigModal: true,
    icon: "mic",
    tags: ["audio", "input"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "config", label: "Configure", icon: "settings", handler: "config" },
    ],
  },
  tts: {
    id: "tts",
    name: "Text-to-Speech",
    description: "Convert text to spoken audio",
    category: "speech",
    configurable: true,
    hasConfigModal: true,
    icon: "volume",
    tags: ["audio", "output"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "config", label: "Configure", icon: "settings", handler: "config" },
    ],
  },
  wake_word: {
    id: "wake_word",
    name: "Wake Word Detection",
    description: "Detect voice activation commands",
    category: "speech",
    configurable: true,
    hasConfigModal: true,
    icon: "radio",
    tags: ["audio", "voice"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "config", label: "Configure", icon: "settings", handler: "config" },
    ],
  },

  // Channels
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    description: "WhatsApp messaging integration",
    category: "channels",
    configurable: true,
    hasConfigModal: false,
    configRoute: "channels",
    icon: "messageCircle",
    tags: ["messaging", "mobile"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    description: "Telegram bot integration",
    category: "channels",
    configurable: true,
    hasConfigModal: false,
    configRoute: "channels",
    icon: "send",
    tags: ["messaging", "bot"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
  },
  discord: {
    id: "discord",
    name: "Discord",
    description: "Discord bot integration",
    category: "channels",
    configurable: true,
    hasConfigModal: false,
    configRoute: "channels",
    icon: "hash",
    tags: ["messaging", "community"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
  },
  slack: {
    id: "slack",
    name: "Slack",
    description: "Slack workspace integration",
    category: "channels",
    configurable: true,
    hasConfigModal: false,
    configRoute: "channels",
    icon: "slack",
    tags: ["messaging", "workspace"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
  },

  // AI & Models
  model_routing: {
    id: "model_routing",
    name: "Model Routing",
    description: "Intelligent model selection and routing",
    category: "ai",
    configurable: true,
    hasConfigModal: false,
    configRoute: "model-routing",
    icon: "route",
    tags: ["ai", "routing"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
    isNew: true,
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    description: "Local Ollama model support",
    category: "ai",
    configurable: true,
    hasConfigModal: false,
    configRoute: "ollama",
    icon: "server",
    tags: ["ai", "local"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
    isNew: true,
  },

  // Memory
  memory_management: {
    id: "memory_management",
    name: "Memory Management",
    description: "Persistent session memory and context",
    category: "memory",
    configurable: true,
    hasConfigModal: false,
    configRoute: "memory",
    icon: "database",
    tags: ["memory", "context"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
    isNew: true,
  },

  // Tools
  browser: {
    id: "browser",
    name: "Browser",
    description: "Web browser automation",
    category: "tools",
    configurable: true,
    hasConfigModal: true,
    icon: "globe",
    tags: ["automation", "web"],
    requires: [],
    quickActions: [{ id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" }],
  },
  web_search: {
    id: "web_search",
    name: "Web Search",
    description: "Search the web for information",
    category: "tools",
    configurable: true,
    hasConfigModal: true,
    icon: "search",
    tags: ["search", "web"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "config", label: "Configure", icon: "settings", handler: "config" },
    ],
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    description: "OpenCode AI integration",
    category: "tools",
    configurable: true,
    hasConfigModal: false,
    configRoute: "opencode",
    icon: "code",
    tags: ["ai", "coding"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
  },
  mcp: {
    id: "mcp",
    name: "MCP Protocol",
    description: "Model Context Protocol support",
    category: "tools",
    configurable: true,
    hasConfigModal: false,
    configRoute: "mcp",
    icon: "plug",
    tags: ["protocol", "integration"],
    requires: [],
    quickActions: [{ id: "view", label: "View", icon: "externalLink", handler: "view" }],
  },

  // Security
  security_scanning: {
    id: "security_scanning",
    name: "Security Scanning",
    description: "Vulnerability and security scanning",
    category: "security",
    configurable: true,
    hasConfigModal: false,
    configRoute: "security",
    icon: "shield",
    tags: ["security", "scanning"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
    isNew: true,
  },

  // System
  cache_management: {
    id: "cache_management",
    name: "Cache Management",
    description: "Token and response caching",
    category: "system",
    configurable: true,
    hasConfigModal: false,
    configRoute: "cache",
    icon: "database",
    tags: ["cache", "performance"],
    requires: [],
    quickActions: [{ id: "view", label: "View", icon: "externalLink", handler: "view" }],
    isNew: true,
  },
  rate_limits: {
    id: "rate_limits",
    name: "Rate Limits",
    description: "API rate limiting controls",
    category: "system",
    configurable: true,
    hasConfigModal: false,
    configRoute: "rate-limits",
    icon: "gauge",
    tags: ["limits", "api"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
    isNew: true,
  },
  budget_controls: {
    id: "budget_controls",
    name: "Budget Controls",
    description: "Cost and budget management",
    category: "system",
    configurable: true,
    hasConfigModal: false,
    configRoute: "budget",
    icon: "wallet",
    tags: ["budget", "cost"],
    requires: [],
    quickActions: [
      { id: "toggle", label: "Enable/Disable", icon: "power", handler: "toggle" },
      { id: "view", label: "View", icon: "externalLink", handler: "view" },
    ],
    isNew: true,
  },
};

// Category definitions
export const FEATURE_CATEGORIES: Omit<FeatureCategory, "features">[] = [
  {
    id: "speech",
    name: "Speech & Voice",
    icon: "mic",
    description: "Voice recognition, text-to-speech, and wake word detection",
  },
  {
    id: "channels",
    name: "Channels",
    icon: "messageSquare",
    description: "Messaging platforms and communication channels",
  },
  {
    id: "ai",
    name: "AI & Models",
    icon: "brain",
    description: "AI providers, model routing, and local models",
  },
  {
    id: "memory",
    name: "Memory & Context",
    icon: "database",
    description: "Session memory, context management, and storage",
  },
  {
    id: "tools",
    name: "Tools",
    icon: "tool",
    description: "External tools, browsers, and integrations",
  },
  {
    id: "security",
    name: "Security",
    icon: "shield",
    description: "Vulnerability scanning and security controls",
  },
  {
    id: "system",
    name: "System",
    icon: "settings",
    description: "Cache, rate limits, and system settings",
  },
];

// Helper function to get feature status from config
export function getFeatureStatus(featureId: string, config: Record<string, any>): FeatureStatus {
  const feature = FEATURE_REGISTRY[featureId];
  if (!feature) {
    return "unavailable";
  }

  // Check if feature is explicitly enabled/disabled
  const featureConfig = config.features?.[featureId];
  if (featureConfig?.enabled === false) {
    return "disabled";
  }
  if (featureConfig?.enabled === true) {
    return "enabled";
  }

  // Check if needs configuration
  if (feature.requires.length > 0) {
    const allRequirements = feature.requires.every(
      (req) => config.features?.[req]?.enabled !== false,
    );
    if (!allRequirements) {
      return "needs_config";
    }
  }

  // Default to disabled if not configured
  return "disabled";
}

// Build complete dashboard response
export function buildDashboardResponse(config: Record<string, any>): FeaturesDashboardResponse {
  const categories: FeatureCategory[] = FEATURE_CATEGORIES.map((cat) => {
    const features = Object.values(FEATURE_REGISTRY)
      .filter((f) => f.category === cat.id)
      .map((f) => ({
        ...f,
        status: getFeatureStatus(f.id, config),
      }));

    return {
      ...cat,
      features,
    };
  });

  const allFeatures = categories.flatMap((c) => c.features);

  return {
    categories,
    summary: {
      total: allFeatures.length,
      enabled: allFeatures.filter((f) => f.status === "enabled").length,
      disabled: allFeatures.filter((f) => f.status === "disabled").length,
      needsConfig: allFeatures.filter((f) => f.status === "needs_config").length,
      unavailable: allFeatures.filter((f) => f.status === "unavailable").length,
    },
  };
}
