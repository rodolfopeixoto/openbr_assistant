/**
 * MCP (Model Context Protocol) Module
 *
 * Provides integration with MCP servers and Inspector UI.
 */

// Types
export type {
  MCPServer,
  MCPServerConfig,
  MCPAuthConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPPromptArgument,
  JSONSchema,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPClientConfig,
  MCPToolCall,
  MCPToolResult,
  MCPConnectionStatus,
  MCPInspectorEvent,
} from "./types.js";

// Client
export { MCPClient, mcpClient } from "./client.js";
