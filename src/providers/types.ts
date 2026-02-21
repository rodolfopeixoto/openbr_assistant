/**
 * Provider registry types for generic model provider feature
 * Extends the existing provider registry with configuration management
 */

import type { ProviderTemplate as BaseProviderTemplate, ModelTemplate } from "./registry/types.js";

// Re-export the base template type
export type ProviderTemplate = BaseProviderTemplate;

// Re-export model template
export type { ModelTemplate };

// Provider status
export type ProviderStatus =
  | "unconfigured"
  | "configured"
  | "testing"
  | "connected"
  | "error"
  | "disabled";

// Configured provider instance
export interface ConfiguredProvider {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  isDefault: boolean;

  // Configuration values
  config: Record<string, unknown>;

  // Connection settings
  baseUrl?: string;

  // Status
  status: ProviderStatus;
  lastTestedAt?: string;
  lastError?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Test connection request
export interface TestConnectionRequest {
  templateId: string;
  config: Record<string, unknown>;
  baseUrl?: string;
}

// Test connection response
export interface TestConnectionResponse {
  success: boolean;
  status: ProviderStatus;
  message?: string;
  latency?: number;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Create provider request
export interface CreateProviderRequest {
  templateId: string;
  name: string;
  description?: string;
  config: Record<string, unknown>;
  baseUrl?: string;
  isDefault?: boolean;
}

// Update provider request
export interface UpdateProviderRequest {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  baseUrl?: string;
  isEnabled?: boolean;
  isDefault?: boolean;
}

// Provider list filters
export interface ProviderListFilters {
  status?: ProviderStatus;
  templateId?: string;
  enabledOnly?: boolean;
}

// Provider registry events
export type ProviderRegistryEvent =
  | { type: "provider.created"; providerId: string }
  | { type: "provider.updated"; providerId: string }
  | { type: "provider.deleted"; providerId: string }
  | { type: "provider.tested"; providerId: string; success: boolean }
  | { type: "template.loaded"; templateId: string }
  | { type: "template.unloaded"; templateId: string };

// Provider registry error codes
export enum ProviderErrorCode {
  TEMPLATE_NOT_FOUND = "TEMPLATE_NOT_FOUND",
  PROVIDER_NOT_FOUND = "PROVIDER_NOT_FOUND",
  INVALID_CONFIG = "INVALID_CONFIG",
  CONNECTION_FAILED = "CONNECTION_FAILED",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  RATE_LIMITED = "RATE_LIMITED",
  TIMEOUT = "TIMEOUT",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  DUPLICATE_ID = "DUPLICATE_ID",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

// Provider registry error
export class ProviderRegistryError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ProviderRegistryError";
  }
}

// Provider registry configuration
export interface ProviderRegistryConfig {
  storagePath: string;
  templatesPath?: string;
  autoLoadDefaults?: boolean;
}

// Event listener type
export type ProviderRegistryListener = (event: ProviderRegistryEvent) => void;

// Provider registry state
export interface ProviderRegistryState {
  templates: Map<string, ProviderTemplate>;
  providers: Map<string, ConfiguredProvider>;
  listeners: Set<ProviderRegistryListener>;
  initialized: boolean;
}
