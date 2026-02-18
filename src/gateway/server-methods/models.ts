import type { AuthProfileStore } from "../../agents/auth-profiles/types.js";
import type { GatewayRequestHandlers } from "./types.js";
import { updateSessionStoreEntry } from "../../config/sessions/store.js";
import { applyModelOverrideToSessionEntry } from "../../sessions/model-overrides.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateModelsListParams,
} from "../protocol/index.js";
import { loadSessionEntry } from "../session-utils.js";

// In-memory cache for current model selections (sessionKey -> {provider, model})
const currentModelCache = new Map<string, { provider: string; model: string }>();

// Provider configurations for building dynamic provider list
const PROVIDER_CONFIGS: Record<string, { name: string; requiresCredential: boolean }> = {
  openai: { name: "OpenAI", requiresCredential: true },
  anthropic: { name: "Anthropic", requiresCredential: true },
  google: { name: "Google", requiresCredential: true },
  kimi: { name: "Kimi", requiresCredential: true },
  minimax: { name: "Minimax", requiresCredential: true },
  groq: { name: "Groq", requiresCredential: true },
  cerebras: { name: "Cerebras", requiresCredential: true },
  xai: { name: "XAI", requiresCredential: true },
  openrouter: { name: "OpenRouter", requiresCredential: true },
  "google-antigravity": { name: "Google Antigravity", requiresCredential: true },
  "openai-codex": { name: "OpenAI Codex", requiresCredential: true },
};

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  provider: string;
  features: ("vision" | "tools" | "json")[];
  costPer1kTokens?: {
    input: number;
    output: number;
  };
  contextWindow: number;
  maxTokens?: number;
}

export interface ModelProvider {
  id: string;
  name: string;
  icon: string;
  status: "configured" | "unconfigured" | "error";
  baseUrl?: string;
  models: ModelInfo[];
}

// Default providers configuration (for reference)
const _DEFAULT_PROVIDERS: ModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    status: "configured",
    baseUrl: "https://api.openai.com/v1",
    models: [
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "Most capable GPT-4 model",
        provider: "openai",
        features: ["vision", "tools", "json"],
        costPer1kTokens: { input: 10, output: 30 },
        contextWindow: 128000,
        maxTokens: 4096,
      },
      {
        id: "gpt-4-vision-preview",
        name: "GPT-4 Vision",
        description: "GPT-4 with image understanding",
        provider: "openai",
        features: ["vision", "tools"],
        costPer1kTokens: { input: 10, output: 30 },
        contextWindow: 128000,
        maxTokens: 4096,
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Fast and cost-effective",
        provider: "openai",
        features: ["tools", "json"],
        costPer1kTokens: { input: 0.5, output: 1.5 },
        contextWindow: 16385,
        maxTokens: 4096,
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🧠",
    status: "configured",
    baseUrl: "https://api.anthropic.com",
    models: [
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        description: "Most intelligent Claude model",
        provider: "anthropic",
        features: ["vision", "tools"],
        costPer1kTokens: { input: 15, output: 75 },
        contextWindow: 200000,
        maxTokens: 4096,
      },
      {
        id: "claude-3-sonnet-20240229",
        name: "Claude 3 Sonnet",
        description: "Balanced performance and speed",
        provider: "anthropic",
        features: ["vision", "tools"],
        costPer1kTokens: { input: 3, output: 15 },
        contextWindow: 200000,
        maxTokens: 4096,
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        description: "Fastest Claude model",
        provider: "anthropic",
        features: ["vision"],
        costPer1kTokens: { input: 0.25, output: 1.25 },
        contextWindow: 200000,
        maxTokens: 4096,
      },
    ],
  },
  {
    id: "google",
    name: "Google",
    icon: "🔍",
    status: "configured",
    baseUrl: "https://generativelanguage.googleapis.com",
    models: [
      {
        id: "gemini-pro",
        name: "Gemini Pro",
        description: "Google's most capable model",
        provider: "google",
        features: ["vision", "tools"],
        costPer1kTokens: { input: 0.5, output: 1.5 },
        contextWindow: 128000,
        maxTokens: 8192,
      },
    ],
  },
  {
    id: "kimi",
    name: "Moonshot (Kimi)",
    icon: "🌙",
    status: "unconfigured",
    baseUrl: "https://api.moonshot.cn/v1",
    models: [
      {
        id: "kimi-k2",
        name: "Kimi K2",
        description: "Advanced Chinese language model",
        provider: "kimi",
        features: ["vision"],
        contextWindow: 128000,
        maxTokens: 8192,
      },
    ],
  },
  {
    id: "glm",
    name: "GLM-5 (Zhipu)",
    icon: "🔬",
    status: "unconfigured",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      {
        id: "glm-5",
        name: "GLM-5",
        description: "General Language Model 5",
        provider: "glm",
        features: ["tools"],
        contextWindow: 128000,
        maxTokens: 8192,
      },
    ],
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    icon: "🌐",
    status: "unconfigured",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    models: [
      {
        id: "qwen-max",
        name: "Qwen Max",
        description: "Alibaba's most capable model",
        provider: "qwen",
        features: ["vision", "tools"],
        contextWindow: 128000,
        maxTokens: 8192,
      },
    ],
  },
];

// In-memory storage for session model selections (legacy - use currentModelCache instead)
const _sessionModelSelections = new Map<string, { provider: string; model: string }>();

export const modelsHandlers: GatewayRequestHandlers = {
  "models.list": async ({ params, respond, context }) => {
    if (!validateModelsListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid models.list params: ${formatValidationErrors(validateModelsListParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const models = await context.loadGatewayModelCatalog();
      respond(true, { models }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  // Get all available providers (configured and unconfigured)
  "models.providers": async ({ respond }) => {
    try {
      const { loadAuthProfileStore } = await import("../../agents/auth-profiles/store.js");
      const { loadConfig } = await import("../../config/config.js");
      const store = loadAuthProfileStore();
      const cfg = loadConfig();

      // Build list of all available providers with their configuration status
      const providers = buildAllProvidersList(store, cfg);
      respond(true, { providers }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  // NEW: Get configured providers (only those with credentials)
  "models.configured": async ({ respond }) => {
    try {
      const { loadAuthProfileStore } = await import("../../agents/auth-profiles/store.js");
      const { loadConfig } = await import("../../config/config.js");
      const store = loadAuthProfileStore();
      const cfg = loadConfig();
      const configuredProviders = buildConfiguredProvidersList(store, cfg);
      respond(true, { providers: configuredProviders }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  // NEW: Get current model selection
  "models.current": async ({ params, respond }) => {
    const { sessionKey } = params as { sessionKey?: string };

    if (!sessionKey) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "sessionKey is required"));
      return;
    }

    try {
      // Check in-memory cache first
      const cached = currentModelCache.get(sessionKey);
      if (cached) {
        respond(true, { provider: cached.provider, model: cached.model }, undefined);
        return;
      }

      // Check auth store (persistent)
      const { loadAuthProfileStore } = await import("../../agents/auth-profiles/store.js");
      const store = loadAuthProfileStore();
      const persisted = store.selectedModels?.[sessionKey];

      if (persisted) {
        currentModelCache.set(sessionKey, {
          provider: persisted.provider,
          model: persisted.model,
        });
        respond(true, { provider: persisted.provider, model: persisted.model }, undefined);
        return;
      }

      // Return null if no selection found
      respond(true, { provider: null, model: null }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  // NEW: Select a model
  "models.select": async ({ params, respond }) => {
    const { sessionKey, providerId, modelId } = params as {
      sessionKey?: string;
      providerId?: string;
      modelId?: string;
    };

    if (!sessionKey || !providerId || !modelId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "sessionKey, providerId, and modelId are required"),
      );
      return;
    }

    try {
      // Update in-memory cache
      currentModelCache.set(sessionKey, { provider: providerId, model: modelId });

      // Persist to auth store
      const { updateAuthProfileStoreWithLock } =
        await import("../../agents/auth-profiles/store.js");
      const { loadAuthProfileStore } = await import("../../agents/auth-profiles/store.js");
      const store = loadAuthProfileStore();

      // Add selectedModels if doesn't exist
      if (!store.selectedModels) {
        store.selectedModels = {};
      }

      // Update the store
      store.selectedModels[sessionKey] = {
        provider: providerId,
        model: modelId,
        selectedAt: Date.now(),
      };

      // Persist with lock
      await updateAuthProfileStoreWithLock({
        updater: (_store: AuthProfileStore) => {
          if (!_store.selectedModels) {
            _store.selectedModels = {};
          }
          _store.selectedModels[sessionKey] = {
            provider: providerId,
            model: modelId,
            selectedAt: Date.now(),
          };
          return true; // Should save
        },
      });

      // Also update session entry's providerOverride and modelOverride for consistency
      const sessionData = loadSessionEntry(sessionKey);
      if (sessionData.entry) {
        await updateSessionStoreEntry({
          storePath: sessionData.storePath,
          sessionKey: sessionData.canonicalKey,
          update: async (entry) => {
            applyModelOverrideToSessionEntry({
              entry,
              selection: { provider: providerId, model: modelId },
            });
            return entry;
          },
        });
      }

      respond(true, { provider: providerId, model: modelId }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};

// Default models for each provider
const DEFAULT_MODELS: Record<
  string,
  Array<{ id: string; name: string; features: string[]; contextWindow?: number }>
> = {
  openai: [
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      features: ["vision", "tools", "json"],
      contextWindow: 128000,
    },
    {
      id: "gpt-4-vision-preview",
      name: "GPT-4 Vision",
      features: ["vision", "tools"],
      contextWindow: 128000,
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      features: ["tools", "json"],
      contextWindow: 16385,
    },
  ],
  anthropic: [
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      features: ["vision", "tools"],
      contextWindow: 200000,
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      features: ["vision", "tools"],
      contextWindow: 200000,
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      features: ["vision"],
      contextWindow: 200000,
    },
  ],
  google: [
    { id: "gemini-pro", name: "Gemini Pro", features: ["vision", "tools"], contextWindow: 128000 },
  ],
  kimi: [{ id: "kimi-k2", name: "Kimi K2", features: ["vision"], contextWindow: 128000 }],
  glm: [{ id: "glm-5", name: "GLM-5", features: ["tools"], contextWindow: 128000 }],
  qwen: [
    { id: "qwen-max", name: "Qwen Max", features: ["vision", "tools"], contextWindow: 128000 },
  ],
  groq: [
    {
      id: "llama-3.1-405b",
      name: "Llama 3.1 405B",
      features: ["vision", "tools"],
      contextWindow: 128000,
    },
  ],
  cerebras: [
    {
      id: "cerebras-llama-3.1-70b",
      name: "Llama 3.1 70B",
      features: ["tools"],
      contextWindow: 128000,
    },
  ],
  xai: [
    { id: "grok-beta", name: "Grok Beta", features: ["vision", "tools"], contextWindow: 128000 },
  ],
  openrouter: [
    {
      id: "openai/gpt-4-turbo",
      name: "GPT-4 Turbo (OpenRouter)",
      features: ["vision", "tools", "json"],
      contextWindow: 128000,
    },
  ],
  "google-antigravity": [
    {
      id: "gemini-3-pro-high",
      name: "Gemini 3 Pro High",
      features: ["vision", "tools"],
      contextWindow: 128000,
    },
  ],
  "openai-codex": [
    {
      id: "gpt-5.1-codex-mini",
      name: "GPT-5.1 Codex Mini",
      features: ["vision", "tools", "json"],
      contextWindow: 128000,
    },
    {
      id: "gpt-5.1",
      name: "GPT-5.1",
      features: ["vision", "tools", "json"],
      contextWindow: 128000,
    },
  ],
};

// Provider icons mapping (matching UI expectations)
const PROVIDER_ICONS: Record<string, string> = {
  openai: "O",
  anthropic: "A",
  google: "G",
  kimi: "K",
  glm: "GL",
  qwen: "Q",
  minimax: "M",
  groq: "Gr",
  cerebras: "C",
  xai: "X",
  openrouter: "OR",
  "google-antigravity": "G",
  "openai-codex": "O",
};

// Helper function to build ALL providers list (configured + available to configure)
function buildAllProvidersList(
  store: AuthProfileStore,
  cfg?: { auth?: { profiles?: Record<string, { provider?: string; mode?: string }> } },
) {
  const providers: Array<{
    id: string;
    name: string;
    icon: string;
    status: "configured" | "unconfigured";
    models: Array<{ id: string; name: string; features: string[]; contextWindow?: number }>;
  }> = [];
  const addedProviders = new Set<string>();

  // First, add all providers from PROVIDER_CONFIGS (available providers)
  for (const [providerId, config] of Object.entries(PROVIDER_CONFIGS)) {
    // Check if this provider is configured
    let isConfigured = false;

    // Check auth profiles from config
    if (cfg?.auth?.profiles) {
      for (const [, profile] of Object.entries(cfg.auth.profiles)) {
        if (profile.provider === providerId) {
          isConfigured =
            profile.mode === "oauth" || profile.mode === "api_key" || profile.mode === "token";
          break;
        }
      }
    }

    // Check auth store profiles
    if (!isConfigured) {
      for (const [, credential] of Object.entries(store.profiles)) {
        if (credential.provider === providerId) {
          const hasValidCredential =
            credential.type === "oauth" ||
            (credential.type === "api_key" && (credential as { key?: string }).key) ||
            (credential.type === "token" && (credential as { token?: string }).token);
          if (hasValidCredential) {
            isConfigured = true;
            break;
          }
        }
      }
    }

    providers.push({
      id: providerId,
      name: config.name,
      icon: PROVIDER_ICONS[providerId] || providerId.charAt(0).toUpperCase(),
      status: isConfigured ? "configured" : "unconfigured",
      models: DEFAULT_MODELS[providerId] || [],
    });
    addedProviders.add(providerId);
  }

  // Add any custom providers from auth that are not in PROVIDER_CONFIGS
  if (cfg?.auth?.profiles) {
    for (const [, profile] of Object.entries(cfg.auth.profiles)) {
      if (!profile.provider || addedProviders.has(profile.provider)) {
        continue;
      }

      const providerId = profile.provider;
      const hasValidCredential =
        profile.mode === "oauth" || profile.mode === "api_key" || profile.mode === "token";

      // Format provider name (e.g., "openai-codex" -> "OpenAI Codex")
      const formattedName = providerId
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      providers.push({
        id: providerId,
        name: formattedName,
        icon: PROVIDER_ICONS[providerId] || providerId.charAt(0).toUpperCase(),
        status: hasValidCredential ? "configured" : "unconfigured",
        models: DEFAULT_MODELS[providerId] || [],
      });
      addedProviders.add(providerId);
    }
  }

  // Add any custom providers from auth store
  for (const [, credential] of Object.entries(store.profiles)) {
    if (!credential.provider || addedProviders.has(credential.provider)) {
      continue;
    }

    const providerId = credential.provider;
    const hasValidCredential =
      credential.type === "oauth" ||
      (credential.type === "api_key" && (credential as { key?: string }).key) ||
      (credential.type === "token" && (credential as { token?: string }).token);

    // Format provider name
    const formattedName = providerId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    providers.push({
      id: providerId,
      name: formattedName,
      icon: PROVIDER_ICONS[providerId] || providerId.charAt(0).toUpperCase(),
      status: hasValidCredential ? "configured" : "unconfigured",
      models: DEFAULT_MODELS[providerId] || [],
    });
    addedProviders.add(providerId);
  }

  return providers;
}

// Helper function to build configured providers list
function buildConfiguredProvidersList(
  store: AuthProfileStore,
  cfg?: { auth?: { profiles?: Record<string, { provider?: string; mode?: string }> } },
) {
  const providers: Array<{
    id: string;
    name: string;
    icon: string;
    status: "configured" | "unconfigured";
    models: Array<{ id: string; name: string; features: string[]; contextWindow?: number }>;
  }> = [];
  const addedProviders = new Set<string>();

  // First, check auth profiles from config (clawdbot.json auth.profiles)
  if (cfg?.auth?.profiles) {
    for (const [, profile] of Object.entries(cfg.auth.profiles)) {
      if (!profile.provider) {
        continue;
      }

      const providerId = profile.provider;
      const config = PROVIDER_CONFIGS[providerId];

      if (!config) {
        continue;
      }

      // Avoid duplicates
      if (addedProviders.has(providerId)) {
        continue;
      }
      addedProviders.add(providerId);

      // Determine credential status based on mode
      const hasValidCredential =
        profile.mode === "oauth" || profile.mode === "api_key" || profile.mode === "token";

      providers.push({
        id: providerId,
        name: config.name,
        icon: PROVIDER_ICONS[providerId] || providerId.charAt(0).toUpperCase(),
        status: hasValidCredential ? "configured" : "unconfigured",
        models: DEFAULT_MODELS[providerId] || [],
      });
    }
  }

  // Then, check auth store profiles
  for (const [, credential] of Object.entries(store.profiles)) {
    const providerId = credential.provider;
    const config = PROVIDER_CONFIGS[providerId];

    if (!config) {
      continue;
    }

    // Avoid duplicates
    if (addedProviders.has(providerId)) {
      continue;
    }
    addedProviders.add(providerId);

    // Determine credential status
    const hasValidCredential =
      credential.type === "oauth" ||
      (credential.type === "api_key" && (credential as { key?: string }).key) ||
      (credential.type === "token" && (credential as { token?: string }).token);

    providers.push({
      id: providerId,
      name: config.name,
      icon: PROVIDER_ICONS[providerId] || providerId.charAt(0).toUpperCase(),
      status: hasValidCredential ? "configured" : "unconfigured",
      models: DEFAULT_MODELS[providerId] || [],
    });
  }

  return providers;
}
