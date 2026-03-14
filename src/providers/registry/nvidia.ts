/**
 * NVIDIA API Catalog Provider Template
 * Access production-grade models via NVIDIA API
 */

import type { ProviderTemplate } from "./types.js";

export const NVIDIA_PROVIDER: ProviderTemplate = {
  id: "nvidia",
  version: "1.0.0",

  metadata: {
    name: "NVIDIA API Catalog",
    description: "Access production-grade models via NVIDIA API",
    icon: "nvidia-logo",
    color: "#76B900",
    category: "cloud",
    tags: ["enterprise", "vision", "multimodal"],
    docsUrl: "https://docs.nvidia.com/nim/",
    apiKeyUrl: "https://build.nvidia.com/",
  },

  connection: {
    type: "openai-compatible",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    auth: {
      type: "api-key",
      headerName: "Authorization",
      headerPrefix: "Bearer ",
    },
    endpoints: {
      models: "/v1/models",
      chat: "/v1/chat/completions",
      embeddings: "/v1/embeddings",
    },
  },

  models: [
    {
      id: "z-ai/glm5",
      name: "GLM5",
      description: "Excels in agentic coding and browser use with 256K context",
      capabilities: ["chat", "vision", "function-calling"],
      contextWindow: 256000,
      maxTokens: 16384,
      pricing: {
        input: 0.002,
        output: 0.006,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
      parameters: [
        {
          key: "chat_template_kwargs.enable_thinking",
          label: "Enable Thinking",
          type: "boolean",
          default: true,
          description: "Enable reasoning mode for better problem-solving",
        },
        {
          key: "chat_template_kwargs.clear_thinking",
          label: "Clear Thinking",
          type: "boolean",
          default: false,
          description: "Remove thinking tokens from output",
        },
      ],
    },
    {
      id: "moonshotai/kimi-k2.5",
      name: "Kimi K2.5",
      description: "Advanced reasoning model with long context",
      capabilities: ["chat"],
      contextWindow: 256000,
      maxTokens: 16384,
      pricing: {
        input: 0.003,
        output: 0.009,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
      parameters: [
        {
          key: "chat_template_kwargs.thinking",
          label: "Thinking Mode",
          type: "boolean",
          default: true,
          description: "Enable thinking mode for enhanced reasoning",
        },
      ],
    },
    {
      id: "qwen/qwen3-coder-480b-a35b-instruct",
      name: "Qwen3 Coder",
      description: "Specialized for coding and technical tasks",
      capabilities: ["chat", "code"],
      contextWindow: 131072,
      maxTokens: 8192,
      pricing: {
        input: 0.001,
        output: 0.003,
        currency: "USD",
      },
      defaults: {
        temperature: 0.7,
        topP: 1.0,
      },
    },
  ],

  globalParameters: [
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      min: 0,
      max: 2,
      step: 0.1,
      default: 1.0,
      description: "Controls randomness: 0 = deterministic, 2 = very random",
    },
    {
      key: "topP",
      label: "Top P",
      type: "number",
      min: 0,
      max: 1,
      step: 0.1,
      default: 1.0,
      description: "Nucleus sampling threshold",
    },
  ],

  validation: {
    testEndpoint: "/v1/models",
    testMethod: "GET",
    requiredFields: ["apiKey"],
  },
};
