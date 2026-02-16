import type { GatewayRequestHandlers } from "./types.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateModelsListParams,
} from "../protocol/index.js";

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

// Default providers configuration
const DEFAULT_PROVIDERS: ModelProvider[] = [
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

// In-memory storage for session model selections
const sessionModelSelections = new Map<string, { provider: string; model: string }>();

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

  "models.providers": async ({ respond }) => {
    try {
      // In the future, this will check actual API key configuration
      // For now, return default providers with status based on config
      respond(true, { providers: DEFAULT_PROVIDERS });
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to load model providers: ${error}`),
      );
    }
  },

  "models.select": async ({ params, respond }) => {
    try {
      const { sessionKey, providerId, modelId } = params as {
        sessionKey: string;
        providerId: string;
        modelId: string;
      };

      if (!sessionKey || !providerId || !modelId) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "missing required parameters"),
        );
        return;
      }

      // Validate that the provider and model exist
      const provider = DEFAULT_PROVIDERS.find((p) => p.id === providerId);
      if (!provider) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `unknown provider: ${providerId}`),
        );
        return;
      }

      const model = provider.models.find((m) => m.id === modelId);
      if (!model) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `unknown model: ${modelId} for provider ${providerId}`,
          ),
        );
        return;
      }

      // Check if provider is configured
      if (provider.status === "unconfigured") {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `provider ${providerId} is not configured. Please configure API key first.`,
          ),
        );
        return;
      }

      // Store the selection
      sessionModelSelections.set(sessionKey, { provider: providerId, model: modelId });

      respond(true, {
        success: true,
        sessionKey,
        provider: providerId,
        model: modelId,
      });
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to select model: ${error}`),
      );
    }
  },

  "models.current": async ({ params, respond }) => {
    try {
      const { sessionKey } = params as { sessionKey: string };

      if (!sessionKey) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing sessionKey"));
        return;
      }

      const selection = sessionModelSelections.get(sessionKey);

      if (!selection) {
        // Return default model (OpenAI GPT-4 Turbo)
        respond(true, {
          sessionKey,
          provider: "openai",
          model: "gpt-4-turbo",
          isDefault: true,
        });
        return;
      }

      respond(true, {
        sessionKey,
        provider: selection.provider,
        model: selection.model,
        isDefault: false,
      });
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to get current model: ${error}`),
      );
    }
  },
};

// Helper function to get the selected model for a session
export function getSessionModel(sessionKey: string): { provider: string; model: string } {
  return sessionModelSelections.get(sessionKey) || { provider: "openai", model: "gpt-4-turbo" };
}
