/**
 * Provider Types
 * 
 * TypeScript type definitions for AI provider management in the OpenClaw UI.
 */

export type ProviderStatus = "configured" | "unconfigured" | "error" | "checking" | "disabled";

export type CredentialType = "api_key" | "oauth" | "token" | "none";

export interface Provider {
  id: string;
  name: string;
  description: string;
  icon?: string;
  status: ProviderStatus;
  credentialType: CredentialType;
  credentialCount: number;
  modelsCount: number;
  lastError?: string;
  supportedAuthMethods: CredentialType[];
  apiKeyUrl?: string;
  oauthUrl?: string;
  docsUrl?: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  providerId: string;
  description?: string;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  pricing?: {
    inputPer1k?: number;
    outputPer1k?: number;
  };
}

export interface ProviderCredential {
  id: string;
  providerId: string;
  profileName: string;
  type: CredentialType;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export interface ProviderConfiguration {
  providerId: string;
  profileName: string;
  credentialType: CredentialType;
  apiKey?: string;
  token?: string;
  oauthCode?: string;
  selectedModels: string[];
  testConnection: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  latency?: number;
  error?: string;
  modelsAvailable?: number;
}

export interface SaveProviderResponse {
  success: boolean;
  credentialId?: string;
  error?: string;
  testResult?: TestConnectionResult;
}

export interface ProvidersListResponse {
  providers: Provider[];
  total: number;
}

export interface ProviderModelsResponse {
  providerId: string;
  models: ProviderModel[];
}

// Brand colors for providers (consistent with existing components)
export const PROVIDER_BRANDS: Record<string, { color: string; bgColor: string }> = {
  openai: { color: "#10a37f", bgColor: "rgba(16, 163, 127, 0.15)" },
  anthropic: { color: "#cc785c", bgColor: "rgba(204, 120, 92, 0.15)" },
  google: { color: "#4285f4", bgColor: "rgba(66, 133, 244, 0.15)" },
  kimi: { color: "#6366f1", bgColor: "rgba(99, 102, 241, 0.15)" },
  glm: { color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.15)" },
  qwen: { color: "#7c3aed", bgColor: "rgba(124, 58, 237, 0.15)" },
  minimax: { color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.15)" },
  groq: { color: "#f97316", bgColor: "rgba(249, 115, 22, 0.15)" },
  cerebras: { color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.15)" },
  xai: { color: "#000000", bgColor: "rgba(128, 128, 128, 0.15)" },
  openrouter: { color: "#6366f1", bgColor: "rgba(99, 102, 241, 0.15)" },
  default: { color: "#6366f1", bgColor: "rgba(99, 102, 241, 0.15)" },
};

// Provider letter abbreviations for icons
export const PROVIDER_LETTERS: Record<string, string> = {
  openai: "O",
  anthropic: "A",
  google: "G",
  kimi: "K",
  glm: "GL",
  qwen: "Q",
  minimax: "M",
  groq: "Gr",
  cerebras: "C",
  xai: "X",
  openrouter: "OR",
};

export function getProviderBrand(providerId: string): { color: string; bgColor: string } {
  return PROVIDER_BRANDS[providerId] || PROVIDER_BRANDS.default;
}

export function getProviderLetter(providerId: string): string {
  return PROVIDER_LETTERS[providerId] || providerId.charAt(0).toUpperCase();
}

export function getStatusLabel(status: ProviderStatus): string {
  switch (status) {
    case "configured":
      return "Configured";
    case "unconfigured":
      return "Not Configured";
    case "error":
      return "Error";
    case "checking":
      return "Checking...";
    case "disabled":
      return "Disabled";
    default:
      return "Unknown";
  }
}

export function getCredentialTypeLabel(type: CredentialType): string {
  switch (type) {
    case "api_key":
      return "API Key";
    case "oauth":
      return "OAuth";
    case "token":
      return "Token";
    case "none":
      return "None";
    default:
      return type;
  }
}
