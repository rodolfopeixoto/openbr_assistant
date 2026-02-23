/**
 * Provider API Service Tests
 * 
 * Tests for the provider-api service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProviderAPI, ProviderAPIError, createProviderAPI } from "./provider-api.js";
import type { Provider, ProviderConfiguration } from "../types/providers.js";

describe("ProviderAPI", () => {
  let api: ProviderAPI;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = createProviderAPI("/api/v1/providers");
    fetchMock = vi.fn();
    (window as unknown as { fetch: typeof fetch }).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getProviders", () => {
    it("returns list of providers", async () => {
      const mockProviders: Provider[] = [
        {
          id: "openai",
          name: "OpenAI",
          description: "OpenAI API",
          status: "configured",
          credentialType: "api_key",
          credentialCount: 1,
          modelsCount: 5,
          supportedAuthMethods: ["api_key"],
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ providers: mockProviders, total: 1 }),
      });

      const result = await api.getProviders();

      expect(result).toEqual(mockProviders);
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/providers");
    });

    it("throws ProviderAPIError on failure", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ message: "Server error" }),
      });

      await expect(api.getProviders()).rejects.toThrow(ProviderAPIError);
      await expect(api.getProviders()).rejects.toThrow("Server error");
    });
  });

  describe("getProvider", () => {
    it("returns a single provider", async () => {
      const mockProvider: Provider = {
        id: "openai",
        name: "OpenAI",
        description: "OpenAI API",
        status: "configured",
        credentialType: "api_key",
        credentialCount: 1,
        modelsCount: 5,
        supportedAuthMethods: ["api_key"],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProvider,
      });

      const result = await api.getProvider("openai");

      expect(result).toEqual(mockProvider);
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/providers/openai");
    });
  });

  describe("getProviderModels", () => {
    it("returns models for a provider", async () => {
      const mockModels = [
        { id: "gpt-4", name: "GPT-4", providerId: "openai" },
        { id: "gpt-3.5", name: "GPT-3.5", providerId: "openai" },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ providerId: "openai", models: mockModels }),
      });

      const result = await api.getProviderModels("openai");

      expect(result).toEqual(mockModels);
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/providers/openai/models");
    });
  });

  describe("testConnection", () => {
    it("tests connection with credentials", async () => {
      const config: ProviderConfiguration = {
        providerId: "openai",
        profileName: "default",
        credentialType: "api_key",
        apiKey: "sk-test",
        selectedModels: [],
        testConnection: true,
      };

      const mockResult = {
        success: true,
        latency: 150,
        modelsAvailable: 5,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await api.testConnection("openai", config);

      expect(result).toEqual(mockResult);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/providers/openai/test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        }
      );
    });

    it("returns error on failed connection test", async () => {
      const config: ProviderConfiguration = {
        providerId: "openai",
        profileName: "default",
        credentialType: "api_key",
        apiKey: "invalid",
        selectedModels: [],
        testConnection: true,
      };

      const mockResult = {
        success: false,
        error: "Invalid API key",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await api.testConnection("openai", config);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });
  });

  describe("saveConfiguration", () => {
    it("saves provider configuration", async () => {
      const config: ProviderConfiguration = {
        providerId: "openai",
        profileName: "work",
        credentialType: "api_key",
        apiKey: "sk-test",
        selectedModels: ["gpt-4"],
        testConnection: true,
      };

      const mockResponse = {
        success: true,
        credentialId: "cred-123",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.saveConfiguration("openai", config);

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/providers/openai/configure",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        }
      );
    });

    it("returns error on save failure", async () => {
      const config: ProviderConfiguration = {
        providerId: "openai",
        profileName: "work",
        credentialType: "api_key",
        apiKey: "sk-test",
        selectedModels: [],
        testConnection: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "Invalid configuration" }),
      });

      await expect(api.saveConfiguration("openai", config)).rejects.toThrow(
        "Invalid configuration"
      );
    });
  });

  describe("updateConfiguration", () => {
    it("updates existing configuration", async () => {
      const updates = {
        selectedModels: ["gpt-4", "gpt-3.5"],
      };

      const mockResponse = {
        success: true,
        credentialId: "cred-123",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateConfiguration("openai", "cred-123", updates);

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/providers/openai/credentials/cred-123",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
    });
  });

  describe("deleteCredential", () => {
    it("deletes a credential", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
      });

      await api.deleteCredential("openai", "cred-123");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/providers/openai/credentials/cred-123",
        { method: "DELETE" }
      );
    });

    it("throws error on delete failure", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Credential not found" }),
      });

      await expect(api.deleteCredential("openai", "cred-123")).rejects.toThrow(
        "Credential not found"
      );
    });
  });

  describe("getCredentials", () => {
    it("returns credentials for a provider", async () => {
      const mockCredentials = [
        { id: "cred-1", profileName: "default" },
        { id: "cred-2", profileName: "work" },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCredentials,
      });

      const result = await api.getCredentials("openai");

      expect(result).toEqual(mockCredentials);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/providers/openai/credentials"
      );
    });
  });

  describe("startOAuthFlow", () => {
    it("initiates OAuth flow", async () => {
      const mockResponse = {
        authUrl: "https://accounts.google.com/oauth/authorize?state=xyz",
        state: "xyz",
        verifier: "abc123",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.startOAuthFlow("google", "http://localhost:3000/callback");

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/providers/google/oauth/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ redirectUri: "http://localhost:3000/callback" }),
        }
      );
    });
  });

  describe("completeOAuthFlow", () => {
    it("completes OAuth flow with code", async () => {
      const mockResponse = {
        success: true,
        credentialId: "oauth-cred-123",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.completeOAuthFlow("google", "auth-code", "xyz", "abc123");

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/providers/google/oauth/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "auth-code", state: "xyz", verifier: "abc123" }),
        }
      );
    });
  });

  describe("ProviderAPIError", () => {
    it("creates error with status code and response", () => {
      const response = { message: "Error details" };
      const error = new ProviderAPIError("Request failed", 400, response);

      expect(error.message).toBe("Request failed");
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual(response);
      expect(error.name).toBe("ProviderAPIError");
    });
  });

  describe("handleResponse", () => {
    it("parses successful JSON response", async () => {
      const mockData = { id: "test" };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.getProvider("test");
      expect(result).toEqual(mockData);
    });

    it("uses statusText when no error message in response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      await expect(api.getProvider("test")).rejects.toThrow("HTTP 500: Internal Server Error");
    });
  });
});

describe("createProviderAPI", () => {
  it("creates API instance with custom base URL", () => {
    const customApi = createProviderAPI("https://custom.api.com/providers");
    expect(customApi).toBeInstanceOf(ProviderAPI);
  });
});
