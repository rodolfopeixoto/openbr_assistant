/**
 * OpenAI Provider Template
 * Access GPT models via OpenAI API
 */

import type { ProviderTemplate } from "./types.js";

export const OPENAI_PROVIDER: ProviderTemplate = {
  id: "openai",
  version: "1.0.0",

  metadata: {
    name: "OpenAI",
    description: "Access GPT-4, GPT-3.5, and other OpenAI models",
    icon: "openai-logo",
    color: "#10A37F",
    category: "cloud",
    tags: ["chat", "vision", "multimodal", "enterprise"],
    docsUrl: "https://platform.openai.com/docs",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },

  connection: {
    type: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
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
      id: "gpt-4o",
      name: "GPT-4o",
      description: "Most capable multimodal model, fast and affordable",
      capabilities: ["chat", "vision", "function-calling", "json-mode"],
      contextWindow: 128000,
      maxTokens: 16384,
      pricing: {
        input: 0.0025,
        output: 0.01,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      description: "Fast, affordable small model for focused tasks",
      capabilities: ["chat", "vision", "function-calling", "json-mode"],
      contextWindow: 128000,
      maxTokens: 16384,
      pricing: {
        input: 0.00015,
        output: 0.0006,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      description: "High-intelligence model with knowledge cutoff April 2024",
      capabilities: ["chat", "vision", "function-calling", "json-mode"],
      contextWindow: 128000,
      maxTokens: 4096,
      pricing: {
        input: 0.01,
        output: 0.03,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
    },
    {
      id: "o1-preview",
      name: "o1 Preview",
      description: "Reasoning model for complex tasks",
      capabilities: ["chat", "reasoning"],
      contextWindow: 128000,
      maxTokens: 32768,
      pricing: {
        input: 0.015,
        output: 0.06,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
      },
      parameters: [
        {
          key: "reasoning_effort",
          label: "Reasoning Effort",
          type: "enum",
          default: "medium",
          description: "Level of reasoning effort (low, medium, high)",
          options: ["low", "medium", "high"],
        },
      ],
    },
    {
      id: "o3-mini",
      name: "o3 Mini",
      description: "Fast reasoning model for efficient complex tasks",
      capabilities: ["chat", "reasoning"],
      contextWindow: 200000,
      maxTokens: 100000,
      pricing: {
        input: 0.0011,
        output: 0.0044,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
      },
      parameters: [
        {
          key: "reasoning_effort",
          label: "Reasoning Effort",
          type: "enum",
          default: "medium",
          description: "Level of reasoning effort (low, medium, high)",
          options: ["low", "medium", "high"],
        },
      ],
    },
    {
      id: "text-embedding-3-large",
      name: "Text Embedding 3 Large",
      description: "Most capable embedding model for English and non-English tasks",
      capabilities: ["embeddings"],
      contextWindow: 8192,
      maxTokens: 8192,
      pricing: {
        input: 0.00013,
        output: 0,
        currency: "USD",
      },
      defaults: {},
    },
    {
      id: "text-embedding-3-small",
      name: "Text Embedding 3 Small",
      description: "Fast embedding model with better performance than Ada v2",
      capabilities: ["embeddings"],
      contextWindow: 8192,
      maxTokens: 8192,
      pricing: {
        input: 0.00002,
        output: 0,
        currency: "USD",
      },
      defaults: {},
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
    {
      key: "presence_penalty",
      label: "Presence Penalty",
      type: "number",
      min: -2,
      max: 2,
      step: 0.1,
      default: 0,
      description: "Penalize new tokens based on presence in text",
    },
    {
      key: "frequency_penalty",
      label: "Frequency Penalty",
      type: "number",
      min: -2,
      max: 2,
      step: 0.1,
      default: 0,
      description: "Penalize new tokens based on frequency in text",
    },
  ],

  validation: {
    testEndpoint: "/v1/models",
    testMethod: "GET",
    requiredFields: ["apiKey"],
  },
};
