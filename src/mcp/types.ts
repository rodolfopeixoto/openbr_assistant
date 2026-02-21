/**
 * MCP (Model Context Protocol) Types
 *
 * Types for MCP client and server integration.
 */

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  url: string;
  transport: "stdio" | "http" | "websocket";
  auth?: MCPAuthConfig;
  enabled: boolean;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  connected: boolean;
  lastError?: string;
}

export interface MCPAuthConfig {
  type: "bearer" | "api-key" | "basic";
  token?: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPClientConfig {
  servers: MCPServerConfig[];
  timeout?: number;
  maxRetries?: number;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  transport: "stdio" | "http" | "websocket";
  url: string;
  auth?: MCPAuthConfig;
  enabled: boolean;
  env?: Record<string, string>;
}

export interface MCPToolCall {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
}

export interface MCPConnectionStatus {
  connected: boolean;
  serverId: string;
  lastConnected?: Date;
  lastError?: string;
  latency?: number;
}

export interface MCPInspectorEvent {
  timestamp: Date;
  direction: "sent" | "received";
  type: "request" | "response" | "notification" | "error";
  content: unknown;
  serverId: string;
}
