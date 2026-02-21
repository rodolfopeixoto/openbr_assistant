/**
 * Provider API Service
 * 
 * HTTP client for provider management backend API.
 */

import type { 
  Provider, 
  ProviderModel, 
  ProviderConfiguration, 
  TestConnectionResult,
  SaveProviderResponse,
  ProvidersListResponse,
  ProviderModelsResponse 
} from "../types/providers.js";

const API_BASE = "/api/v1/providers";

export class ProviderAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "ProviderAPIError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ProviderAPIError(
      errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData
    );
  }
  return response.json() as Promise<T>;
}

export class ProviderAPI {
  private baseUrl: string;

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all available providers
   */
  async getProviders(): Promise<Provider[]> {
    const response = await fetch(`${this.baseUrl}`);
    const data = await handleResponse<ProvidersListResponse>(response);
    return data.providers;
  }

  /**
   * Get a specific provider by ID
   */
  async getProvider(providerId: string): Promise<Provider> {
    const response = await fetch(`${this.baseUrl}/${providerId}`);
    return handleResponse<Provider>(response);
  }

  /**
   * Get available models for a provider
   */
  async getProviderModels(providerId: string): Promise<ProviderModel[]> {
    const response = await fetch(`${this.baseUrl}/${providerId}/models`);
    const data = await handleResponse<ProviderModelsResponse>(response);
    return data.models;
  }

  /**
   * Test connection to a provider
   */
  async testConnection(
    providerId: string, 
    config: ProviderConfiguration
  ): Promise<TestConnectionResult> {
    const response = await fetch(`${this.baseUrl}/${providerId}/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
    return handleResponse<TestConnectionResult>(response);
  }

  /**
   * Save provider configuration
   */
  async saveConfiguration(
    providerId: string, 
    config: ProviderConfiguration
  ): Promise<SaveProviderResponse> {
    const response = await fetch(`${this.baseUrl}/${providerId}/configure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
    return handleResponse<SaveProviderResponse>(response);
  }

  /**
   * Update provider configuration
   */
  async updateConfiguration(
    providerId: string,
    credentialId: string,
    config: Partial<ProviderConfiguration>
  ): Promise<SaveProviderResponse> {
    const response = await fetch(`${this.baseUrl}/${providerId}/credentials/${credentialId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
    return handleResponse<SaveProviderResponse>(response);
  }

  /**
   * Delete a provider credential
   */
  async deleteCredential(providerId: string, credentialId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${providerId}/credentials/${credentialId}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ProviderAPIError(
        errorData?.message || `Failed to delete credential: ${response.statusText}`,
        response.status,
        errorData
      );
    }
  }

  /**
   * Get all credentials for a provider
   */
  async getCredentials(providerId: string): Promise<unknown[]> {
    const response = await fetch(`${this.baseUrl}/${providerId}/credentials`);
    return handleResponse<unknown[]>(response);
  }

  /**
   * Start OAuth flow for a provider
   */
  async startOAuthFlow(providerId: string, redirectUri: string): Promise<{
    authUrl: string;
    state: string;
    verifier: string;
  }> {
    const response = await fetch(`${this.baseUrl}/${providerId}/oauth/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ redirectUri }),
    });
    return handleResponse(response);
  }

  /**
   * Complete OAuth flow
   */
  async completeOAuthFlow(
    providerId: string,
    code: string,
    state: string,
    verifier: string
  ): Promise<SaveProviderResponse> {
    const response = await fetch(`${this.baseUrl}/${providerId}/oauth/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, state, verifier }),
    });
    return handleResponse<SaveProviderResponse>(response);
  }
}

// Export singleton instance
export const providerAPI = new ProviderAPI();

// Export factory for testing
export function createProviderAPI(baseUrl?: string): ProviderAPI {
  return new ProviderAPI(baseUrl);
}
