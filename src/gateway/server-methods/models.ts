import type { AuthProfileStore } from "../../agents/auth-profiles/types.js";
import type { GatewayRequestHandlers } from "./types.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateModelsListParams,
} from "../protocol/index.js";

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

  // NEW: Get configured providers (only those with credentials)
  "models.configured": async ({ respond }) => {
    try {
      const { loadAuthProfileStore } = await import("../../agents/auth-profiles/store.js");
      const store = loadAuthProfileStore();
      const configuredProviders = buildConfiguredProvidersList(store);
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

      respond(true, { provider: providerId, model: modelId }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};

// Helper function to build configured providers list
function buildConfiguredProvidersList(store: AuthProfileStore) {
  const providers = [];

  for (const [profileId, credential] of Object.entries(store.profiles)) {
    const providerId = credential.provider;
    const config = PROVIDER_CONFIGS[providerId];

    if (!config) {
      continue;
    }

    // Determine credential status
    const hasValidCredential =
      credential.type === "oauth" ||
      (credential.type === "api_key" && credential.key) ||
      (credential.type === "token" && credential.token);

    providers.push({
      id: providerId,
      name: config.name,
      profileId,
      status: hasValidCredential ? "configured" : "unconfigured",
      models: [], // Will be populated by frontend
    });
  }

  return providers;
}
