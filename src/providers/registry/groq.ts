/**
 * Groq Provider Template
 * Access fast inference models via Groq API
 */

import type { ProviderTemplate } from "./types.js";

export const GROQ_PROVIDER: ProviderTemplate = {
  id: "groq",
  version: "1.0.0",

  metadata: {
    name: "Groq",
    description: "Ultra-fast inference for open source models",
    icon: "groq-logo",
    color: "#F55036",
    category: "cloud",
    tags: ["fast", "open-source", "inference", "llama", "mixtral"],
    docsUrl: "https://console.groq.com/docs",
    apiKeyUrl: "https://console.groq.com/keys",
  },

  connection: {
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    auth: {
      type: "api-key",
      headerName: "Authorization",
      headerPrefix: "Bearer ",
    },
    endpoints: {
      models: "/v1/models",
      chat: "/v1/chat/completions",
    },
  },

  models: [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B",
      description: "Meta's most capable model, versatile for all tasks",
      capabilities: ["chat", "function-calling", "json-mode"],
      contextWindow: 128000,
      maxTokens: 32768,
      pricing: {
        input: 0.00059,
        output: 0.00079,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
    },
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B Instant",
      description: "Lightning-fast model for quick tasks",
      capabilities: ["chat", "function-calling"],
      contextWindow: 128000,
      maxTokens: 8192,
      pricing: {
        input: 0.00005,
        output: 0.00008,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
    },
    {
      id: "mixtral-8x7b-32768",
      name: "Mixtral 8x7B",
      description: "Mistral AI's sparse mixture of experts model",
      capabilities: ["chat", "function-calling", "json-mode"],
      contextWindow: 32768,
      maxTokens: 32768,
      pricing: {
        input: 0.00024,
        output: 0.00024,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
    },
    {
      id: "gemma2-9b-it",
      name: "Gemma 2 9B IT",
      description: "Google's efficient instruction-tuned model",
      capabilities: ["chat"],
      contextWindow: 8192,
      maxTokens: 8192,
      pricing: {
        input: 0.0002,
        output: 0.0002,
        currency: "USD",
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
    },
    {
      id: "qwen-2.5-32b",
      name: "Qwen 2.5 32B",
      description: "Alibaba's powerful multilingual model",
      capabilities: ["chat", "function-calling", "json-mode"],
      contextWindow: 128000,
      maxTokens: 8192,
      pricing: {
        input: 0.00079,
        output: 0.00079,
        currency: "USD",
      },
      defaults: {
        temperature: 0.6,
        topP: 0.95,
      },
    },
    {
      id: "deepseek-r1-distill-llama-70b",
      name: "DeepSeek R1 Distill Llama 70B",
      description: "Reasoning-focused model distilled into Llama 70B",
      capabilities: ["chat", "reasoning"],
      contextWindow: 128000,
      maxTokens: 32768,
      pricing: {
        input: 0.00075,
        output: 0.00099,
        currency: "USD",
      },
      defaults: {
        temperature: 0.6,
        topP: 0.95,
      },
    },
    {
      id: "deepseek-r1-distill-qwen-32b",
      name: "DeepSeek R1 Distill Qwen 32B",
      description: "Reasoning-focused model distilled into Qwen 32B",
      capabilities: ["chat", "reasoning"],
      contextWindow: 128000,
      maxTokens: 16384,
      pricing: {
        input: 0.00069,
        output: 0.00069,
        currency: "USD",
      },
      defaults: {
        temperature: 0.6,
        topP: 0.95,
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
  ],

  validation: {
    testEndpoint: "/v1/models",
    testMethod: "GET",
    requiredFields: ["apiKey"],
  },
};
