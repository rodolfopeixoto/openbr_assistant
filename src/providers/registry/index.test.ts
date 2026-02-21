/**
 * Provider Template Tests
 * Validates template structure and data integrity
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ProviderTemplate, ModelTemplate } from "./types.js";
import { ProviderRegistryError } from "../types.js";
import {
  NVIDIA_PROVIDER,
  OPENAI_PROVIDER,
  ANTHROPIC_PROVIDER,
  GROQ_PROVIDER,
  PROVIDER_TEMPLATE_MAP,
  getProviderTemplate,
  listProviderTemplates,
  hasProviderTemplate,
} from "./index.js";

describe("Provider Templates", () => {
  describe("Registry Functions", () => {
    it("should list all templates", () => {
      const templates = listProviderTemplates();
      expect(templates).toHaveLength(4);
      const ids = templates.map((t) => t.id);
      ids.sort();
      expect(ids).toEqual(["anthropic", "groq", "nvidia", "openai"]);
    });

    it("should provide template map", () => {
      expect(Object.keys(PROVIDER_TEMPLATE_MAP)).toHaveLength(4);
      expect(PROVIDER_TEMPLATE_MAP.nvidia).toBeDefined();
      expect(PROVIDER_TEMPLATE_MAP.openai).toBeDefined();
      expect(PROVIDER_TEMPLATE_MAP.anthropic).toBeDefined();
      expect(PROVIDER_TEMPLATE_MAP.groq).toBeDefined();
    });

    it("should get template by ID", () => {
      expect(getProviderTemplate("nvidia")).toBe(NVIDIA_PROVIDER);
      expect(getProviderTemplate("openai")).toBe(OPENAI_PROVIDER);
      expect(getProviderTemplate("anthropic")).toBe(ANTHROPIC_PROVIDER);
      expect(getProviderTemplate("groq")).toBe(GROQ_PROVIDER);
      expect(getProviderTemplate("nonexistent")).toBeUndefined();
    });

    it("should check if template exists", () => {
      expect(hasProviderTemplate("nvidia")).toBe(true);
      expect(hasProviderTemplate("openai")).toBe(true);
      expect(hasProviderTemplate("anthropic")).toBe(true);
      expect(hasProviderTemplate("groq")).toBe(true);
      expect(hasProviderTemplate("nonexistent")).toBe(false);
    });
  });

  describe("Template Structure Validation", () => {
    const validateTemplate = (template: ProviderTemplate) => {
      // Required top-level fields
      expect(template).toHaveProperty("id");
      expect(template).toHaveProperty("version");
      expect(template).toHaveProperty("metadata");
      expect(template).toHaveProperty("connection");
      expect(template).toHaveProperty("models");
      expect(template).toHaveProperty("validation");

      // ID should be non-empty string
      expect(typeof template.id).toBe("string");
      expect(template.id.length).toBeGreaterThan(0);

      // Version should be non-empty string
      expect(typeof template.version).toBe("string");
      expect(template.version.length).toBeGreaterThan(0);

      // Metadata validation
      expect(template.metadata).toHaveProperty("name");
      expect(template.metadata).toHaveProperty("description");
      expect(template.metadata).toHaveProperty("icon");
      expect(template.metadata).toHaveProperty("color");
      expect(template.metadata).toHaveProperty("category");
      expect(template.metadata).toHaveProperty("tags");
      expect(template.metadata).toHaveProperty("docsUrl");
      expect(template.metadata).toHaveProperty("apiKeyUrl");

      expect(typeof template.metadata.name).toBe("string");
      expect(typeof template.metadata.description).toBe("string");
      expect(typeof template.metadata.icon).toBe("string");
      expect(typeof template.metadata.color).toBe("string");
      expect(typeof template.metadata.docsUrl).toBe("string");
      expect(typeof template.metadata.apiKeyUrl).toBe("string");
      expect(Array.isArray(template.metadata.tags)).toBe(true);

      // Connection validation
      expect(template.connection).toHaveProperty("type");
      expect(template.connection).toHaveProperty("baseUrl");
      expect(template.connection).toHaveProperty("auth");
      expect(template.connection).toHaveProperty("endpoints");

      expect(typeof template.connection.baseUrl).toBe("string");
      expect(template.connection.baseUrl.startsWith("http")).toBe(true);

      expect(template.connection.auth).toHaveProperty("type");
      expect(template.connection.endpoints).toHaveProperty("models");
      expect(template.connection.endpoints).toHaveProperty("chat");

      // Models validation
      expect(Array.isArray(template.models)).toBe(true);
      expect(template.models.length).toBeGreaterThan(0);

      // Validation config
      expect(template.validation).toHaveProperty("testEndpoint");
      expect(template.validation).toHaveProperty("testMethod");
      expect(template.validation).toHaveProperty("requiredFields");
      expect(Array.isArray(template.validation.requiredFields)).toBe(true);
    };

    const validateModel = (model: ModelTemplate, _providerId: string) => {
      expect(model).toHaveProperty("id");
      expect(model).toHaveProperty("name");
      expect(model).toHaveProperty("description");
      expect(model).toHaveProperty("capabilities");
      expect(model).toHaveProperty("contextWindow");
      expect(model).toHaveProperty("maxTokens");
      expect(model).toHaveProperty("pricing");

      expect(typeof model.id).toBe("string");
      expect(typeof model.name).toBe("string");
      expect(typeof model.description).toBe("string");
      expect(Array.isArray(model.capabilities)).toBe(true);
      expect(typeof model.contextWindow).toBe("number");
      expect(typeof model.maxTokens).toBe("number");
      expect(model.contextWindow).toBeGreaterThan(0);
      expect(model.maxTokens).toBeGreaterThan(0);

      expect(model.pricing).toHaveProperty("input");
      expect(model.pricing).toHaveProperty("output");
      expect(typeof model.pricing.input).toBe("number");
      expect(typeof model.pricing.output).toBe("number");
      expect(model.pricing.input).toBeGreaterThanOrEqual(0);
      expect(model.pricing.output).toBeGreaterThanOrEqual(0);
    };

    it("should validate NVIDIA template structure", () => {
      validateTemplate(NVIDIA_PROVIDER);
      NVIDIA_PROVIDER.models.forEach((model) => validateModel(model, "nvidia"));
    });

    it("should validate OpenAI template structure", () => {
      validateTemplate(OPENAI_PROVIDER);
      OPENAI_PROVIDER.models.forEach((model) => validateModel(model, "openai"));
    });

    it("should validate Anthropic template structure", () => {
      validateTemplate(ANTHROPIC_PROVIDER);
      ANTHROPIC_PROVIDER.models.forEach((model) => validateModel(model, "anthropic"));
    });

    it("should validate Groq template structure", () => {
      validateTemplate(GROQ_PROVIDER);
      GROQ_PROVIDER.models.forEach((model) => validateModel(model, "groq"));
    });
  });

  describe("NVIDIA Template", () => {
    it("should have correct metadata", () => {
      expect(NVIDIA_PROVIDER.id).toBe("nvidia");
      expect(NVIDIA_PROVIDER.metadata.name).toBe("NVIDIA API Catalog");
      expect(NVIDIA_PROVIDER.metadata.color).toBe("#76B900");
      expect(NVIDIA_PROVIDER.metadata.category).toBe("cloud");
      expect(NVIDIA_PROVIDER.connection.baseUrl).toBe("https://integrate.api.nvidia.com/v1");
    });

    it("should include required NVIDIA models", () => {
      const modelIds = NVIDIA_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("z-ai/glm5");
      expect(modelIds).toContain("moonshotai/kimi-k2.5");
      expect(modelIds).toContain("qwen/qwen3-coder-480b-a35b-instruct");
    });

    it("should have correct model configurations", () => {
      const glm5 = NVIDIA_PROVIDER.models.find((m) => m.id === "z-ai/glm5");
      expect(glm5).toBeDefined();
      expect(glm5!.contextWindow).toBe(256000);
      expect(glm5!.maxTokens).toBe(16384);
      expect(glm5!.capabilities).toContain("chat");
      expect(glm5!.capabilities).toContain("vision");

      const kimi = NVIDIA_PROVIDER.models.find((m) => m.id === "moonshotai/kimi-k2.5");
      expect(kimi).toBeDefined();
      expect(kimi!.contextWindow).toBe(256000);

      const qwen = NVIDIA_PROVIDER.models.find(
        (m) => m.id === "qwen/qwen3-coder-480b-a35b-instruct",
      );
      expect(qwen).toBeDefined();
      expect(qwen!.contextWindow).toBe(131072);
    });
  });

  describe("OpenAI Template", () => {
    it("should have correct metadata", () => {
      expect(OPENAI_PROVIDER.id).toBe("openai");
      expect(OPENAI_PROVIDER.metadata.name).toBe("OpenAI");
      expect(OPENAI_PROVIDER.metadata.color).toBe("#10A37F");
      expect(OPENAI_PROVIDER.connection.baseUrl).toBe("https://api.openai.com/v1");
    });

    it("should include GPT-4o models", () => {
      const modelIds = OPENAI_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("gpt-4o");
      expect(modelIds).toContain("gpt-4o-mini");
    });

    it("should include reasoning models", () => {
      const modelIds = OPENAI_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("o1-preview");
      expect(modelIds).toContain("o3-mini");
    });

    it("should include embedding models", () => {
      const modelIds = OPENAI_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("text-embedding-3-large");
      expect(modelIds).toContain("text-embedding-3-small");
    });
  });

  describe("Anthropic Template", () => {
    it("should have correct metadata", () => {
      expect(ANTHROPIC_PROVIDER.id).toBe("anthropic");
      expect(ANTHROPIC_PROVIDER.metadata.name).toBe("Anthropic");
      expect(ANTHROPIC_PROVIDER.metadata.color).toBe("#D97757");
      expect(ANTHROPIC_PROVIDER.connection.baseUrl).toBe("https://api.anthropic.com");
    });

    it("should include Claude 3.5 models", () => {
      const modelIds = ANTHROPIC_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("claude-3-5-sonnet-20241022");
      expect(modelIds).toContain("claude-3-5-haiku-20241022");
    });

    it("should include Claude 3 models", () => {
      const modelIds = ANTHROPIC_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("claude-3-opus-20240229");
      expect(modelIds).toContain("claude-3-sonnet-20240229");
      expect(modelIds).toContain("claude-3-haiku-20240307");
    });

    it("should have extended thinking parameters for Sonnet", () => {
      const sonnet = ANTHROPIC_PROVIDER.models.find((m) => m.id === "claude-3-5-sonnet-20241022");
      expect(sonnet).toBeDefined();
      expect(sonnet!.capabilities).toContain("extended-thinking");
      expect(sonnet!.parameters).toBeDefined();
      expect(sonnet!.parameters!.length).toBeGreaterThan(0);
    });
  });

  describe("Groq Template", () => {
    it("should have correct metadata", () => {
      expect(GROQ_PROVIDER.id).toBe("groq");
      expect(GROQ_PROVIDER.metadata.name).toBe("Groq");
      expect(GROQ_PROVIDER.metadata.color).toBe("#F55036");
      expect(GROQ_PROVIDER.connection.baseUrl).toBe("https://api.groq.com/openai/v1");
    });

    it("should include Llama models", () => {
      const modelIds = GROQ_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("llama-3.3-70b-versatile");
      expect(modelIds).toContain("llama-3.1-8b-instant");
    });

    it("should include Mixtral model", () => {
      const modelIds = GROQ_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("mixtral-8x7b-32768");
    });

    it("should include Gemma model", () => {
      const modelIds = GROQ_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("gemma2-9b-it");
    });

    it("should include Qwen model", () => {
      const modelIds = GROQ_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("qwen-2.5-32b");
    });

    it("should include DeepSeek R1 models", () => {
      const modelIds = GROQ_PROVIDER.models.map((m) => m.id);
      expect(modelIds).toContain("deepseek-r1-distill-llama-70b");
      expect(modelIds).toContain("deepseek-r1-distill-qwen-32b");
    });
  });

  describe("Global Parameters", () => {
    it("should have global parameters in NVIDIA", () => {
      expect(NVIDIA_PROVIDER.globalParameters).toBeDefined();
      expect(NVIDIA_PROVIDER.globalParameters!.length).toBeGreaterThan(0);
    });

    it("should have global parameters in OpenAI", () => {
      expect(OPENAI_PROVIDER.globalParameters).toBeDefined();
      expect(OPENAI_PROVIDER.globalParameters!.length).toBeGreaterThan(0);
    });

    it("should have global parameters in Anthropic", () => {
      expect(ANTHROPIC_PROVIDER.globalParameters).toBeDefined();
      expect(ANTHROPIC_PROVIDER.globalParameters!.length).toBeGreaterThan(0);
    });

    it("should have global parameters in Groq", () => {
      expect(GROQ_PROVIDER.globalParameters).toBeDefined();
      expect(GROQ_PROVIDER.globalParameters!.length).toBeGreaterThan(0);
    });
  });

  describe("Validation Configuration", () => {
    it("should have correct validation for all providers", () => {
      const providers = [NVIDIA_PROVIDER, OPENAI_PROVIDER, ANTHROPIC_PROVIDER, GROQ_PROVIDER];

      providers.forEach((provider) => {
        expect(provider.validation.testEndpoint).toBe("/v1/models");
        expect(provider.validation.testMethod).toBe("GET");
        expect(provider.validation.requiredFields).toContain("apiKey");
      });
    });
  });

  describe("API Key URLs", () => {
    it("should have valid API key URLs", () => {
      expect(NVIDIA_PROVIDER.metadata.apiKeyUrl).toBe("https://build.nvidia.com/");
      expect(OPENAI_PROVIDER.metadata.apiKeyUrl).toBe("https://platform.openai.com/api-keys");
      expect(ANTHROPIC_PROVIDER.metadata.apiKeyUrl).toBe(
        "https://console.anthropic.com/settings/keys",
      );
      expect(GROQ_PROVIDER.metadata.apiKeyUrl).toBe("https://console.groq.com/keys");
    });
  });
});

describe("Configured Providers", () => {
  const TEST_STORAGE_PATH = "/tmp/openclaw-test-providers";

  beforeEach(async () => {
    const { resetConfiguredProviders, initializeConfiguredProviders } = await import("./index.js");
    resetConfiguredProviders();
    // Clean up storage file to ensure test isolation
    try {
      await fs.unlink(path.join(TEST_STORAGE_PATH, "providers.json"));
    } catch {
      // File may not exist, that's fine
    }
    await initializeConfiguredProviders(TEST_STORAGE_PATH);
  });

  afterEach(async () => {
    const { resetConfiguredProviders } = await import("./index.js");
    resetConfiguredProviders();
  });

  describe("CRUD Operations", () => {
    it("should create and retrieve a provider", async () => {
      const { createConfiguredProvider, getConfiguredProvider } = await import("./index.js");

      const request = {
        templateId: "openai",
        name: "My OpenAI",
        description: "Test provider",
        config: { apiKey: "test-key" },
      };

      const provider = await createConfiguredProvider(request);
      expect(provider.id).toBeDefined();
      expect(provider.name).toBe("My OpenAI");

      const retrieved = getConfiguredProvider(provider.id);
      expect(retrieved.id).toBe(provider.id);
    });

    it("should list providers with filters", async () => {
      const { createConfiguredProvider, getConfiguredProviders } = await import("./index.js");

      await createConfiguredProvider({
        templateId: "openai",
        name: "Provider 1",
        config: { apiKey: "key1" },
      });

      await createConfiguredProvider({
        templateId: "anthropic",
        name: "Provider 2",
        config: { apiKey: "key2" },
      });

      const all = getConfiguredProviders();
      expect(all).toHaveLength(2);

      const openaiOnly = getConfiguredProviders({ templateId: "openai" });
      expect(openaiOnly).toHaveLength(1);
    });

    it("should update a provider", async () => {
      const { createConfiguredProvider, updateConfiguredProvider, getConfiguredProvider } =
        await import("./index.js");

      const provider = await createConfiguredProvider({
        templateId: "openai",
        name: "Original Name",
        config: { apiKey: "key" },
      });

      const updated = await updateConfiguredProvider(provider.id, {
        name: "Updated Name",
      });

      expect(updated.name).toBe("Updated Name");

      const retrieved = getConfiguredProvider(provider.id);
      expect(retrieved.name).toBe("Updated Name");
    });

    it("should delete a provider", async () => {
      const { createConfiguredProvider, deleteConfiguredProvider, getConfiguredProviders } =
        await import("./index.js");

      const provider = await createConfiguredProvider({
        templateId: "openai",
        name: "To Delete",
        config: { apiKey: "key" },
      });

      await deleteConfiguredProvider(provider.id);

      const remaining = getConfiguredProviders();
      expect(remaining).toHaveLength(0);
    });
  });

  describe("Default Provider", () => {
    it("should set first provider as default", async () => {
      const { createConfiguredProvider, getDefaultConfiguredProvider } = await import("./index.js");

      const provider = await createConfiguredProvider({
        templateId: "openai",
        name: "Default",
        config: { apiKey: "key" },
      });

      const defaultProvider = getDefaultConfiguredProvider();
      expect(defaultProvider?.id).toBe(provider.id);
    });

    it("should switch default provider", async () => {
      const { createConfiguredProvider, updateConfiguredProvider } = await import("./index.js");

      const provider1 = await createConfiguredProvider({
        templateId: "openai",
        name: "Provider 1",
        config: { apiKey: "key1" },
      });

      const provider2 = await createConfiguredProvider({
        templateId: "anthropic",
        name: "Provider 2",
        config: { apiKey: "key2" },
      });

      expect(provider1.isDefault).toBe(true);
      expect(provider2.isDefault).toBe(false);

      await updateConfiguredProvider(provider2.id, { isDefault: true });

      const { getConfiguredProvider } = await import("./index.js");
      const updated1 = getConfiguredProvider(provider1.id);
      const updated2 = getConfiguredProvider(provider2.id);

      expect(updated1.isDefault).toBe(false);
      expect(updated2.isDefault).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should throw on non-existent template", async () => {
      const { createConfiguredProvider } = await import("./index.js");

      await expect(
        createConfiguredProvider({
          templateId: "non-existent",
          name: "Test",
          config: { apiKey: "key" },
        }),
      ).rejects.toThrow(ProviderRegistryError);
    });

    it("should throw on missing required config", async () => {
      const { createConfiguredProvider } = await import("./index.js");

      await expect(
        createConfiguredProvider({
          templateId: "openai",
          name: "Test",
          config: {},
        }),
      ).rejects.toThrow(ProviderRegistryError);
    });

    it("should throw on non-existent provider", async () => {
      const { getConfiguredProvider } = await import("./index.js");

      expect(() => getConfiguredProvider("non-existent")).toThrow(ProviderRegistryError);
    });
  });
});
