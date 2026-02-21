/**
 * Provider Template Types for OpenClaw
 * Predefined configurations for popular AI providers
 */

export interface ProviderTemplate {
  id: string;
  version: string;
  metadata: ProviderMetadata;
  connection: ConnectionConfig;
  models: ModelTemplate[];
  globalParameters?: ParameterDefinition[];
  validation: ValidationConfig;
}

export interface ProviderMetadata {
  name: string;
  description: string;
  icon: string;
  color: string;
  category: "cloud" | "local" | "enterprise" | "custom";
  tags: string[];
  docsUrl: string;
  apiKeyUrl: string;
}

export interface ConnectionConfig {
  type: "openai-compatible" | "anthropic" | "google" | "custom";
  baseUrl: string;
  auth: AuthConfig;
  endpoints: EndpointConfig;
}

export interface AuthConfig {
  type: "api-key" | "bearer-token" | "oauth";
  headerName?: string;
  headerPrefix?: string;
}

export interface EndpointConfig {
  models: string;
  chat: string;
  embeddings?: string;
}

export interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  contextWindow: number;
  maxTokens: number;
  pricing: PricingInfo;
  defaults?: ModelDefaults;
  parameters?: ParameterDefinition[];
}

export interface PricingInfo {
  input: number;
  output: number;
  currency?: string;
}

export interface ModelDefaults {
  temperature?: number;
  topP?: number;
  [key: string]: unknown;
}

export interface ParameterDefinition {
  key: string;
  label: string;
  type: "number" | "boolean" | "string" | "enum";
  min?: number;
  max?: number;
  step?: number;
  default: unknown;
  description?: string;
  options?: string[];
}

export interface ValidationConfig {
  testEndpoint: string;
  testMethod: "GET" | "POST";
  requiredFields: string[];
}
