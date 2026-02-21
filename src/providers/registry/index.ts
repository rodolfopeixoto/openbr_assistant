/**
 * Provider Registry Index
 * Central export for all provider templates
 */

export type {
  ProviderTemplate,
  ProviderMetadata,
  ConnectionConfig,
  AuthConfig,
  EndpointConfig,
  ModelTemplate,
  PricingInfo,
  ModelDefaults,
  ParameterDefinition,
  ValidationConfig,
} from "./types.js";

// Export error types and codes from providers/types
export { ProviderRegistryError, ProviderErrorCode } from "../types.js";

export type {
  ConfiguredProvider,
  CreateProviderRequest,
  UpdateProviderRequest,
  TestConnectionRequest,
  TestConnectionResponse,
  ProviderListFilters,
  ProviderRegistryEvent,
  ProviderRegistryListener,
} from "../types.js";

export { NVIDIA_PROVIDER } from "./nvidia.js";
export { OPENAI_PROVIDER } from "./openai.js";
export { ANTHROPIC_PROVIDER } from "./anthropic.js";
export { GROQ_PROVIDER } from "./groq.js";

import type { ProviderTemplate } from "./types.js";
import { ANTHROPIC_PROVIDER } from "./anthropic.js";
import { GROQ_PROVIDER } from "./groq.js";
import { NVIDIA_PROVIDER } from "./nvidia.js";
import { OPENAI_PROVIDER } from "./openai.js";

/**
 * All registered provider templates
 */
export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  NVIDIA_PROVIDER,
  OPENAI_PROVIDER,
  ANTHROPIC_PROVIDER,
  GROQ_PROVIDER,
];

/**
 * Map of provider IDs to templates
 */
export const PROVIDER_TEMPLATE_MAP: Record<string, ProviderTemplate> = {
  [NVIDIA_PROVIDER.id]: NVIDIA_PROVIDER,
  [OPENAI_PROVIDER.id]: OPENAI_PROVIDER,
  [ANTHROPIC_PROVIDER.id]: ANTHROPIC_PROVIDER,
  [GROQ_PROVIDER.id]: GROQ_PROVIDER,
};

/**
 * Get a provider template by ID
 */
export function getProviderTemplate(id: string): ProviderTemplate | undefined {
  return PROVIDER_TEMPLATE_MAP[id];
}

/**
 * List all provider templates
 */
export function listProviderTemplates(): ProviderTemplate[] {
  return PROVIDER_TEMPLATES;
}

/**
 * Check if a provider template exists
 */
export function hasProviderTemplate(id: string): boolean {
  return id in PROVIDER_TEMPLATE_MAP;
}

// ============================================================================
// Configured Provider Management
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";
import {
  type ConfiguredProvider,
  type CreateProviderRequest,
  type ProviderListFilters,
  ProviderRegistryError,
  ProviderErrorCode,
  type TestConnectionRequest,
  type TestConnectionResponse,
  type UpdateProviderRequest,
  type ProviderRegistryEvent,
  type ProviderRegistryListener,
} from "../types.js";

// Provider registry state
interface ConfiguredProviderState {
  providers: Map<string, ConfiguredProvider>;
  listeners: Set<ProviderRegistryListener>;
  initialized: boolean;
  storagePath: string;
}

// Singleton state
let configuredProviderState: ConfiguredProviderState | null = null;

/**
 * Initialize configured provider storage
 */
export async function initializeConfiguredProviders(storagePath: string): Promise<void> {
  if (configuredProviderState?.initialized) {
    return;
  }

  await fs.mkdir(storagePath, { recursive: true });

  configuredProviderState = {
    providers: new Map(),
    listeners: new Set(),
    initialized: false,
    storagePath,
  };

  await loadConfiguredProviders();
  configuredProviderState.initialized = true;
}

/**
 * Get storage file path
 */
function getProvidersFilePath(): string {
  if (!configuredProviderState) {
    throw new ProviderRegistryError(
      ProviderErrorCode.UNKNOWN_ERROR,
      "Configured providers not initialized",
    );
  }
  return path.join(configuredProviderState.storagePath, "providers.json");
}

/**
 * Load configured providers from storage
 */
async function loadConfiguredProviders(): Promise<void> {
  if (!configuredProviderState) {
    return;
  }

  try {
    const content = await fs.readFile(getProvidersFilePath(), "utf-8");
    const providers = JSON.parse(content) as ConfiguredProvider[];

    for (const provider of providers) {
      configuredProviderState.providers.set(provider.id, provider);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Save configured providers to storage
 */
async function saveConfiguredProviders(): Promise<void> {
  if (!configuredProviderState) {
    return;
  }

  const providers = Array.from(configuredProviderState.providers.values());
  await fs.writeFile(getProvidersFilePath(), JSON.stringify(providers, null, 2), "utf-8");
}

/**
 * Emit an event to all listeners
 */
function emitEvent(event: ProviderRegistryEvent): void {
  if (!configuredProviderState) {
    return;
  }

  for (const listener of configuredProviderState.listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Provider registry listener error:", error);
    }
  }
}

/**
 * Subscribe to registry events
 */
export function onProviderEvent(listener: ProviderRegistryListener): () => void {
  if (!configuredProviderState) {
    throw new ProviderRegistryError(
      ProviderErrorCode.UNKNOWN_ERROR,
      "Configured providers not initialized",
    );
  }

  configuredProviderState.listeners.add(listener);
  return () => {
    configuredProviderState?.listeners.delete(listener);
  };
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(filters?: ProviderListFilters): ConfiguredProvider[] {
  if (!configuredProviderState?.initialized) {
    throw new ProviderRegistryError(
      ProviderErrorCode.UNKNOWN_ERROR,
      "Configured providers not initialized",
    );
  }

  let providers = Array.from(configuredProviderState.providers.values());

  if (filters) {
    if (filters.status) {
      providers = providers.filter((p) => p.status === filters.status);
    }
    if (filters.templateId) {
      providers = providers.filter((p) => p.templateId === filters.templateId);
    }
    if (filters.enabledOnly) {
      providers = providers.filter((p) => p.isEnabled);
    }
  }

  return providers;
}

/**
 * Get a specific configured provider
 */
export function getConfiguredProvider(id: string): ConfiguredProvider {
  if (!configuredProviderState?.initialized) {
    throw new ProviderRegistryError(
      ProviderErrorCode.UNKNOWN_ERROR,
      "Configured providers not initialized",
    );
  }

  const provider = configuredProviderState.providers.get(id);
  if (!provider) {
    throw new ProviderRegistryError(
      ProviderErrorCode.PROVIDER_NOT_FOUND,
      `Provider not found: ${id}`,
    );
  }
  return provider;
}

/**
 * Check if a configured provider exists
 */
export function hasConfiguredProvider(id: string): boolean {
  if (!configuredProviderState?.initialized) {
    return false;
  }
  return configuredProviderState.providers.has(id);
}

/**
 * Validate provider configuration against template
 */
function validateProviderConfig(template: ProviderTemplate, config: Record<string, unknown>): void {
  const errors: string[] = [];

  for (const field of template.validation.requiredFields) {
    if (config[field] === undefined || config[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    throw new ProviderRegistryError(
      ProviderErrorCode.INVALID_CONFIG,
      `Configuration validation failed: ${errors.join(", ")}`,
      { errors },
    );
  }
}

/**
 * Create a new configured provider
 */
export async function createConfiguredProvider(
  request: CreateProviderRequest,
): Promise<ConfiguredProvider> {
  if (!configuredProviderState?.initialized) {
    throw new ProviderRegistryError(
      ProviderErrorCode.UNKNOWN_ERROR,
      "Configured providers not initialized",
    );
  }

  const template = getProviderTemplate(request.templateId);
  if (!template) {
    throw new ProviderRegistryError(
      ProviderErrorCode.TEMPLATE_NOT_FOUND,
      `Template not found: ${request.templateId}`,
    );
  }

  validateProviderConfig(template, request.config);

  const providerId = `${request.templateId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  if (request.isDefault || configuredProviderState.providers.size === 0) {
    for (const provider of configuredProviderState.providers.values()) {
      if (provider.isDefault) {
        provider.isDefault = false;
        provider.updatedAt = new Date().toISOString();
      }
    }
  }

  const now = new Date().toISOString();
  const provider: ConfiguredProvider = {
    id: providerId,
    templateId: request.templateId,
    name: request.name,
    description: request.description,
    isEnabled: true,
    isDefault: request.isDefault ?? configuredProviderState.providers.size === 0,
    config: request.config,
    baseUrl: request.baseUrl ?? template.connection.baseUrl,
    status: "configured",
    createdAt: now,
    updatedAt: now,
  };

  configuredProviderState.providers.set(providerId, provider);
  await saveConfiguredProviders();

  emitEvent({ type: "provider.created", providerId });

  return provider;
}

/**
 * Update a configured provider
 */
export async function updateConfiguredProvider(
  id: string,
  request: UpdateProviderRequest,
): Promise<ConfiguredProvider> {
  if (!configuredProviderState?.initialized) {
    throw new ProviderRegistryError(
      ProviderErrorCode.UNKNOWN_ERROR,
      "Configured providers not initialized",
    );
  }

  const provider = getConfiguredProvider(id);
  const template = getProviderTemplate(provider.templateId);

  if (request.name !== undefined) {
    provider.name = request.name;
  }

  if (request.description !== undefined) {
    provider.description = request.description;
  }

  if (request.config !== undefined) {
    if (template) {
      validateProviderConfig(template, request.config);
    }
    provider.config = request.config;
  }

  if (request.baseUrl !== undefined) {
    provider.baseUrl = request.baseUrl;
  }

  if (request.isEnabled !== undefined) {
    provider.isEnabled = request.isEnabled;
  }

  if (request.isDefault === true && !provider.isDefault) {
    for (const otherProvider of configuredProviderState.providers.values()) {
      if (otherProvider.id !== id && otherProvider.isDefault) {
        otherProvider.isDefault = false;
        otherProvider.updatedAt = new Date().toISOString();
      }
    }
    provider.isDefault = true;
  } else if (request.isDefault === false) {
    provider.isDefault = false;
  }

  provider.updatedAt = new Date().toISOString();
  await saveConfiguredProviders();

  emitEvent({ type: "provider.updated", providerId: id });

  return provider;
}

/**
 * Delete a configured provider
 */
export async function deleteConfiguredProvider(id: string): Promise<void> {
  if (!configuredProviderState?.initialized) {
    throw new ProviderRegistryError(
      ProviderErrorCode.UNKNOWN_ERROR,
      "Configured providers not initialized",
    );
  }

  if (!configuredProviderState.providers.has(id)) {
    throw new ProviderRegistryError(
      ProviderErrorCode.PROVIDER_NOT_FOUND,
      `Provider not found: ${id}`,
    );
  }

  configuredProviderState.providers.delete(id);
  await saveConfiguredProviders();

  emitEvent({ type: "provider.deleted", providerId: id });
}

/**
 * Test provider connection
 */
export async function testProviderConnection(
  request: TestConnectionRequest,
): Promise<TestConnectionResponse> {
  const template = getProviderTemplate(request.templateId);
  if (!template) {
    return {
      success: false,
      status: "error",
      message: `Template not found: ${request.templateId}`,
      error: {
        code: ProviderErrorCode.TEMPLATE_NOT_FOUND,
        message: `Template not found: ${request.templateId}`,
      },
    };
  }

  try {
    validateProviderConfig(template, request.config);
  } catch (error) {
    if (error instanceof ProviderRegistryError) {
      return {
        success: false,
        status: "error",
        message: error.message,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }
    throw error;
  }

  const startTime = Date.now();
  const baseUrl = request.baseUrl ?? template.connection.baseUrl;

  try {
    const testEndpoint = template.validation.testEndpoint;
    const url = new URL(testEndpoint, baseUrl);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const apiKey =
      (request.config.apiKey as string | undefined) ?? (request.config.token as string | undefined);
    if (apiKey && template.connection.auth) {
      const auth = template.connection.auth;
      if (auth.headerName) {
        const prefix = auth.headerPrefix ?? "";
        headers[auth.headerName] = `${prefix}${apiKey}`;
      }
    }

    const response = await fetch(url.toString(), {
      method: template.validation.testMethod,
      headers,
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        status: "connected",
        message: "Connection successful",
        latency,
      };
    } else {
      const errorText = await response.text();
      let errorCode = ProviderErrorCode.CONNECTION_FAILED;

      if (response.status === 401 || response.status === 403) {
        errorCode = ProviderErrorCode.AUTHENTICATION_FAILED;
      } else if (response.status === 429) {
        errorCode = ProviderErrorCode.RATE_LIMITED;
      }

      return {
        success: false,
        status: "error",
        message: `Connection failed: ${response.status} ${response.statusText}`,
        latency,
        error: {
          code: errorCode,
          message: errorText || response.statusText,
          details: { statusCode: response.status },
        },
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      status: "error",
      message: `Connection test failed: ${errorMessage}`,
      latency,
      error: {
        code: ProviderErrorCode.CONNECTION_FAILED,
        message: errorMessage,
      },
    };
  }
}

/**
 * Get the default configured provider
 */
export function getDefaultConfiguredProvider(): ConfiguredProvider | null {
  if (!configuredProviderState?.initialized) {
    return null;
  }

  for (const provider of configuredProviderState.providers.values()) {
    if (provider.isDefault && provider.isEnabled) {
      return provider;
    }
  }
  return null;
}

/**
 * Reset configured providers (for testing)
 */
export function resetConfiguredProviders(): void {
  configuredProviderState = null;
}
