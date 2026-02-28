import type { OpenClawConfig } from "../../config/config.js";
import type { GatewayRequestHandlers } from "./types.js";
import { loadConfig, writeConfigFile } from "../../config/config.js";
import { buildDashboardResponse } from "../../config/feature-registry.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

// Feature definitions with their configuration requirements
const FEATURE_DEFINITIONS: Record<
  string,
  {
    name: string;
    description: string;
    category: "speech" | "channels" | "ai" | "integrations" | "tools";
    configurable: boolean;
    configPath: string[];
    configFields?: Array<{
      key: string;
      label: string;
      type: "text" | "password" | "select" | "toggle";
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
      required?: boolean;
    }>;
  }
> = {
  voice_recorder: {
    name: "Voice Recorder",
    description: "Record and transcribe speech directly in the chat",
    category: "speech",
    configurable: true,
    configPath: ["talk", "speech", "provider"],
    configFields: [
      {
        key: "provider",
        label: "Speech Provider",
        type: "select",
        options: [
          { value: "webspeech", label: "Web Speech API (Free)" },
          { value: "openai", label: "OpenAI Whisper (Paid)" },
          { value: "deepgram", label: "Deepgram Nova-3 (Paid)" },
        ],
      },
    ],
  },
  tts: {
    name: "Text-to-Speech",
    description: "Convert AI responses to voice",
    category: "speech",
    configurable: true,
    configPath: ["talk", "tts", "enabled"],
    configFields: [
      {
        key: "enabled",
        label: "Enable TTS",
        type: "toggle",
      },
      {
        key: "provider",
        label: "TTS Provider",
        type: "select",
        options: [
          { value: "edge", label: "Microsoft Edge (Free)" },
          { value: "openai", label: "OpenAI TTS (Paid)" },
          { value: "elevenlabs", label: "ElevenLabs (Paid)" },
        ],
      },
      {
        key: "voice",
        label: "Voice",
        type: "select",
        options: [
          { value: "alloy", label: "Alloy" },
          { value: "echo", label: "Echo" },
          { value: "fable", label: "Fable" },
          { value: "onyx", label: "Onyx" },
          { value: "nova", label: "Nova" },
          { value: "shimmer", label: "Shimmer" },
        ],
      },
    ],
  },
  wake_word: {
    name: "Wake Word Detection",
    description: "Activate with voice commands like 'clawd' or 'openclaw'",
    category: "speech",
    configurable: true,
    configPath: ["talk", "voicewake", "enabled"],
    configFields: [
      {
        key: "enabled",
        label: "Enable Wake Word",
        type: "toggle",
      },
      {
        key: "sensitivity",
        label: "Sensitivity",
        type: "select",
        options: [
          { value: "0.5", label: "Low" },
          { value: "0.7", label: "Medium" },
          { value: "0.9", label: "High" },
        ],
      },
    ],
  },
  whatsapp: {
    name: "WhatsApp",
    description: "Send and receive messages via WhatsApp Web",
    category: "channels",
    configurable: true,
    configPath: ["channels", "whatsapp", "enabled"],
    configFields: [
      {
        key: "enabled",
        label: "Enable WhatsApp",
        type: "toggle",
      },
    ],
  },
  telegram: {
    name: "Telegram",
    description: "Connect to Telegram Bot API",
    category: "channels",
    configurable: true,
    configPath: ["channels", "telegram", "botToken"],
    configFields: [
      {
        key: "botToken",
        label: "Bot Token",
        type: "password",
        placeholder: "Enter your Telegram bot token",
        required: true,
      },
      {
        key: "enabled",
        label: "Enable Telegram",
        type: "toggle",
      },
    ],
  },
  discord: {
    name: "Discord",
    description: "Connect to Discord servers",
    category: "channels",
    configurable: true,
    configPath: ["channels", "discord", "token"],
    configFields: [
      {
        key: "token",
        label: "Bot Token",
        type: "password",
        placeholder: "Enter your Discord bot token",
        required: true,
      },
      {
        key: "enabled",
        label: "Enable Discord",
        type: "toggle",
      },
    ],
  },
  slack: {
    name: "Slack",
    description: "Integrate with Slack workspaces",
    category: "channels",
    configurable: true,
    configPath: ["channels", "slack", "botToken"],
    configFields: [
      {
        key: "botToken",
        label: "Bot Token",
        type: "password",
        placeholder: "Enter your Slack bot token",
        required: true,
      },
      {
        key: "enabled",
        label: "Enable Slack",
        type: "toggle",
      },
    ],
  },
  news: {
    name: "News & Intelligence",
    description: "AI-powered news aggregation and analysis",
    category: "integrations",
    configurable: true,
    configPath: ["news", "enabled"],
    configFields: [
      {
        key: "enabled",
        label: "Enable News",
        type: "toggle",
      },
      {
        key: "sources",
        label: "News Sources",
        type: "select",
        options: [
          { value: "hackernews", label: "Hacker News" },
          { value: "devto", label: "Dev.to" },
          { value: "rss", label: "RSS Feeds" },
        ],
      },
    ],
  },
  browser: {
    name: "Browser Automation",
    description: "Control Chrome/Chromium browser",
    category: "tools",
    configurable: false,
    configPath: ["browser", "enabled"],
  },
  web_search: {
    name: "Web Search",
    description: "Search the web using Brave Search API",
    category: "tools",
    configurable: true,
    configPath: ["tools", "brave", "apiKey"],
    configFields: [
      {
        key: "apiKey",
        label: "Brave API Key",
        type: "password",
        placeholder: "Enter your Brave Search API key",
        required: true,
      },
      {
        key: "enabled",
        label: "Enable Web Search",
        type: "toggle",
      },
    ],
  },
};

// Helper to get value from nested config path
function getConfigValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

// Helper to set value in nested config path
function setConfigValue(obj: unknown, path: string[], value: unknown): void {
  let current: unknown = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current && typeof current === "object" && !Array.isArray(current)) {
      const next = (current as Record<string, unknown>)[key];
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        (current as Record<string, unknown>)[key] = {};
      }
      current = (current as Record<string, unknown>)[key];
    } else {
      return;
    }
  }
  const lastKey = path[path.length - 1];
  if (current && typeof current === "object" && !Array.isArray(current)) {
    (current as Record<string, unknown>)[lastKey] = value;
  }
}

// Determine feature status based on config
function getFeatureStatus(
  featureId: string,
  cfg: OpenClawConfig,
): "enabled" | "disabled" | "needs_config" | "unavailable" {
  const definition = FEATURE_DEFINITIONS[featureId];
  if (!definition) {
    return "unavailable";
  }

  const configValue = getConfigValue(cfg, definition.configPath);

  // Check if the feature has required config fields
  if (definition.configFields) {
    const requiredFields = definition.configFields.filter((f) => f.required);
    for (const field of requiredFields) {
      const fieldPath = [...definition.configPath.slice(0, -1), field.key];
      const fieldValue = getConfigValue(cfg, fieldPath);
      if (!fieldValue || (typeof fieldValue === "string" && fieldValue.length === 0)) {
        return "needs_config";
      }
    }
  }

  // Check if enabled via toggle or has config value
  if (configValue === true || configValue === "true") {
    return "enabled";
  }

  // If the last path key is "enabled" and it's undefined/null/false
  const lastKey = definition.configPath[definition.configPath.length - 1];
  if (lastKey === "enabled") {
    return configValue === false ? "disabled" : "needs_config";
  }

  // If has a config value (like token), it's enabled
  return configValue && typeof configValue === "string" && configValue.length > 0
    ? "enabled"
    : "needs_config";
}

// Get current config values for a feature
function getFeatureConfig(featureId: string, cfg: OpenClawConfig): Record<string, unknown> {
  const definition = FEATURE_DEFINITIONS[featureId];
  if (!definition || !definition.configFields) {
    return {};
  }

  const config: Record<string, unknown> = {};
  for (const field of definition.configFields) {
    const fieldPath = [...definition.configPath.slice(0, -1), field.key];
    config[field.key] = getConfigValue(cfg, fieldPath);
  }
  return config;
}

export const featuresHandlers: GatewayRequestHandlers = {
  "features.list": ({ respond }) => {
    try {
      const cfg = loadConfig();
      const features = Object.entries(FEATURE_DEFINITIONS).map(([id, definition]) => {
        const status = getFeatureStatus(id, cfg);
        const config = getFeatureConfig(id, cfg);
        return {
          id,
          name: definition.name,
          description: definition.description,
          icon: id,
          status,
          configurable: definition.configurable,
          category: definition.category,
          configFields: definition.configFields,
          config,
        };
      });

      respond(true, { features });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to load features: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "features.toggle": async ({ params, respond }) => {
    try {
      const { id, enabled } = params as { id: string; enabled: boolean };
      const definition = FEATURE_DEFINITIONS[id];

      if (!definition) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, `unknown feature: ${id}`));
        return;
      }

      if (!definition.configurable) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `feature ${id} is not configurable`),
        );
        return;
      }

      const cfg = loadConfig();

      // Set the enabled flag
      const enabledPath = [...definition.configPath.slice(0, -1), "enabled"];
      setConfigValue(cfg, enabledPath, enabled);

      await writeConfigFile(cfg);

      respond(true, { id, enabled, status: enabled ? "enabled" : "disabled" });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to toggle feature: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "features.configure": async ({ params, respond }) => {
    try {
      const { id, config } = params as { id: string; config: Record<string, unknown> };
      const definition = FEATURE_DEFINITIONS[id];

      if (!definition) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, `unknown feature: ${id}`));
        return;
      }

      if (!definition.configurable) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `feature ${id} is not configurable`),
        );
        return;
      }

      const cfg = loadConfig();

      // Update config values
      for (const [key, value] of Object.entries(config)) {
        const fieldPath = [...definition.configPath.slice(0, -1), key];
        setConfigValue(cfg, fieldPath, value);
      }

      // If we set configuration, also enable the feature
      const enabledPath = [...definition.configPath.slice(0, -1), "enabled"];
      setConfigValue(cfg, enabledPath, true);

      await writeConfigFile(cfg);

      const newStatus = getFeatureStatus(id, cfg);

      respond(true, { id, config, status: newStatus });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to configure feature: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "features.status": ({ params, respond }) => {
    try {
      const { id } = params as { id: string };
      const definition = FEATURE_DEFINITIONS[id];

      if (!definition) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, `unknown feature: ${id}`));
        return;
      }

      const cfg = loadConfig();
      const status = getFeatureStatus(id, cfg);

      respond(true, { id, status });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to get feature status: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "features.dashboard": ({ respond }) => {
    try {
      console.log("[Features Backend] Loading dashboard...");
      const cfg = loadConfig();
      console.log("[Features Backend] Config loaded, building dashboard...");
      const dashboard = buildDashboardResponse(cfg);
      console.log("[Features Backend] Dashboard built:", {
        categories: dashboard.categories.length,
        totalFeatures: dashboard.summary.total,
      });

      respond(true, dashboard);
    } catch (err) {
      console.error("[Features Backend] Error building dashboard:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to load dashboard: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};
