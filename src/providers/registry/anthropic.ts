/**
 * Anthropic Provider Template
 * Access Claude models via Anthropic API
 */

import type { ProviderTemplate } from "./types.js";

export const ANTHROPIC_PROVIDER: ProviderTemplate = {
  id: "anthropic",
  version: "1.0.0",

  metadata: {
    name: "Anthropic",
    description: "Access Claude models via Anthropic API",
    icon: "anthropic-logo",
    color: "#D97757",
    category: "cloud",
    tags: ["chat", "vision", "multimodal", "enterprise", "claude"],
    docsUrl: "https://docs.anthropic.com/claude/reference",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
  },

  connection: {
    type: "anthropic",
    baseUrl: "https://api.anthropic.com",
    auth: {
      type: "api-key",
      headerName: "x-api-key",
      headerPrefix: "",
    },
    endpoints: {
      models: "/v1/models",
      chat: "/v1/messages",
    },
  },

  models: [
    {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      description: "Most intelligent model with extended thinking",
      capabilities: ["chat", "vision", "function-calling", "extended-thinking"],
      contextWindow: 200000,
      maxTokens: 8192,
      pricing: {
        input: 0.003,
        output: 0.015,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 0.9,
      },
      parameters: [
        {
          key: "thinking.enabled",
          label: "Enable Extended Thinking",
          type: "boolean",
          default: false,
          description: "Enable extended thinking for complex reasoning",
        },
        {
          key: "thinking.budget_tokens",
          label: "Thinking Budget",
          type: "number",
          min: 1024,
          max: 64000,
          step: 1024,
          default: 4096,
          description: "Token budget for extended thinking",
        },
      ],
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      description: "Fastest model for daily tasks",
      capabilities: ["chat", "vision"],
      contextWindow: 200000,
      maxTokens: 8192,
      pricing: {
        input: 0.0008,
        output: 0.004,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 0.9,
      },
    },
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      description: "Most powerful model for highly complex tasks",
      capabilities: ["chat", "vision", "function-calling"],
      contextWindow: 200000,
      maxTokens: 4096,
      pricing: {
        input: 0.015,
        output: 0.075,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 0.9,
      },
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      description: "Balanced model for most tasks",
      capabilities: ["chat", "vision", "function-calling"],
      contextWindow: 200000,
      maxTokens: 4096,
      pricing: {
        input: 0.003,
        output: 0.015,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 0.9,
      },
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      description: "Fastest model for lightweight actions",
      capabilities: ["chat", "vision"],
      contextWindow: 200000,
      maxTokens: 4096,
      pricing: {
        input: 0.00025,
        output: 0.00125,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 0.9,
      },
    },
  ],

  globalParameters: [
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      min: 0,
      max: 1,
      step: 0.1,
      default: 1.0,
      description: "Controls randomness: 0 = deterministic, 1 = very random",
    },
    {
      key: "topP",
      label: "Top P",
      type: "number",
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.9,
      description: "Nucleus sampling threshold",
    },
    {
      key: "topK",
      label: "Top K",
      type: "number",
      min: 1,
      max: 100,
      step: 1,
      default: 0,
      description: "Top-k sampling (0 = disabled)",
    },
  ],

  validation: {
    testEndpoint: "/v1/models",
    testMethod: "GET",
    requiredFields: ["apiKey"],
  },
};
