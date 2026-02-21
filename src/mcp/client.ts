/**
 * MCP Client
 *
 * Client for connecting to MCP (Model Context Protocol) servers.
 * Supports stdio, HTTP, and WebSocket transports.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  MCPServer,
  MCPServerConfig,
  MCPRequest,
  MCPResponse,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPToolCall,
  MCPToolResult,
  MCPConnectionStatus,
  MCPInspectorEvent,
} from "./types.js";

export class MCPClient {
  private servers: Map<string, MCPServer> = new Map();
  private connections: Map<string, WebSocket | null> = new Map();
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private eventListeners: Set<(event: MCPInspectorEvent) => void> = new Set();
  private config: { timeout: number; maxRetries: number };

  constructor(config?: { timeout?: number; maxRetries?: number }) {
    this.config = {
      timeout: config?.timeout ?? 30000,
      maxRetries: config?.maxRetries ?? 3,
    };
  }

  /**
   * Add an MCP server
   */
  addServer(config: MCPServerConfig): MCPServer {
    const server: MCPServer = {
      ...config,
      tools: [],
      resources: [],
      prompts: [],
      connected: false,
    };

    this.servers.set(config.id, server);
    return server;
  }

  /**
   * Remove an MCP server
   */
  removeServer(serverId: string): void {
    this.disconnect(serverId);
    this.servers.delete(serverId);
  }

  /**
   * Get a server by ID
   */
  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId);
  }

  /**
   * List all servers
   */
  listServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (server.connected) {
      return;
    }

    try {
      switch (server.transport) {
        case "websocket":
          await this.connectWebSocket(server);
          break;
        case "http":
          await this.connectHttp(server);
          break;
        case "stdio":
          await this.connectStdio(server);
          break;
        default:
          throw new Error(`Unsupported transport: ${server.transport}`);
      }

      // Fetch server capabilities
      await this.fetchCapabilities(server);

      server.connected = true;
      server.lastError = undefined;
    } catch (error) {
      server.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  disconnect(serverId: string): void {
    const connection = this.connections.get(serverId);
    if (connection) {
      if (connection instanceof WebSocket) {
        connection.close();
      }
      this.connections.delete(serverId);
    }

    const server = this.servers.get(serverId);
    if (server) {
      server.connected = false;
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<MCPToolResult> {
    const server = this.servers.get(serverId);
    if (!server) {
      return {
        success: false,
        error: `Server ${serverId} not found`,
        executionTime: 0,
      };
    }

    if (!server.connected) {
      await this.connect(serverId);
    }

    const startTime = Date.now();

    try {
      const response = await this.sendRequest(serverId, "tools/call", {
        name: toolName,
        arguments: args,
      });

      return {
        success: true,
        result: response.result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * List tools from a server
   */
  async listTools(serverId: string): Promise<MCPTool[]> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (!server.connected) {
      await this.connect(serverId);
    }

    const response = await this.sendRequest(serverId, "tools/list", {});
    return (response.result as { tools: MCPTool[] }).tools || [];
  }

  /**
   * List resources from a server
   */
  async listResources(serverId: string): Promise<MCPResource[]> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (!server.connected) {
      await this.connect(serverId);
    }

    const response = await this.sendRequest(serverId, "resources/list", {});
    return (response.result as { resources: MCPResource[] }).resources || [];
  }

  /**
   * List prompts from a server
   */
  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (!server.connected) {
      await this.connect(serverId);
    }

    const response = await this.sendRequest(serverId, "prompts/list", {});
    return (response.result as { prompts: MCPPrompt[] }).prompts || [];
  }

  /**
   * Get connection status
   */
  getConnectionStatus(serverId: string): MCPConnectionStatus {
    const server = this.servers.get(serverId);
    return {
      connected: server?.connected ?? false,
      serverId,
      lastError: server?.lastError,
    };
  }

  /**
   * Enable a server
   */
  enableServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.enabled = true;
    }
  }

  /**
   * Disable a server
   */
  disableServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.enabled = false;
      this.disconnect(serverId);
    }
  }

  /**
   * Subscribe to inspector events
   */
  onInspectorEvent(callback: (event: MCPInspectorEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  // Private methods

  private async connectWebSocket(server: MCPServer): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(server.url);

      ws.onopen = () => {
        this.connections.set(server.id, ws);
        resolve();
      };

      ws.onerror = (error) => {
        reject(new Error(`WebSocket error: ${error}`));
      };

      ws.onclose = () => {
        this.connections.delete(server.id);
        server.connected = false;
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data) as MCPResponse;
          this.handleResponse(server.id, response);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
    });
  }

  private async connectHttp(server: MCPServer): Promise<void> {
    // For HTTP, we don't maintain a persistent connection
    // Just verify the server is accessible
    const response = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(server.auth?.type === "bearer" && { Authorization: `Bearer ${server.auth.token}` }),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: uuidv4(),
        method: "initialize",
        params: {},
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
  }

  private async connectStdio(server: MCPServer): Promise<void> {
    // TODO: Implement stdio transport using child_process
    throw new Error("Stdio transport not yet implemented");
  }

  private async sendRequest(
    serverId: string,
    method: string,
    params: Record<string, unknown>,
  ): Promise<MCPResponse> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const id = uuidv4();
    const request: MCPRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    // Emit inspector event
    this.emitInspectorEvent({
      timestamp: new Date(),
      direction: "sent",
      type: "request",
      content: request,
      serverId,
    });

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(String(id));
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Store pending request
      this.pendingRequests.set(String(id), {
        resolve: (response: MCPResponse) => {
          clearTimeout(timeout);

          // Emit inspector event
          this.emitInspectorEvent({
            timestamp: new Date(),
            direction: "received",
            type: response.error ? "error" : "response",
            content: response,
            serverId,
          });

          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        },
        reject: (error: Error) => {
          clearTimeout(timeout);

          // Emit inspector event
          this.emitInspectorEvent({
            timestamp: new Date(),
            direction: "received",
            type: "error",
            content: { error: error.message },
            serverId,
          });

          reject(error);
        },
      });

      // Send request based on transport
      if (server.transport === "websocket") {
        const ws = this.connections.get(serverId);
        if (ws instanceof WebSocket) {
          ws.send(JSON.stringify(request));
        } else {
          reject(new Error("WebSocket not connected"));
        }
      } else if (server.transport === "http") {
        this.sendHttpRequest(server, request)
          .then((response) => {
            const pending = this.pendingRequests.get(String(id));
            if (pending) {
              pending.resolve(response);
              this.pendingRequests.delete(String(id));
            }
          })
          .catch((error) => {
            const pending = this.pendingRequests.get(String(id));
            if (pending) {
              pending.reject(error);
              this.pendingRequests.delete(String(id));
            }
          });
      }
    });
  }

  private async sendHttpRequest(server: MCPServer, request: MCPRequest): Promise<MCPResponse> {
    const response = await fetch(server.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(server.auth?.type === "bearer" && { Authorization: `Bearer ${server.auth.token}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<MCPResponse>;
  }

  private handleResponse(serverId: string, response: MCPResponse): void {
    const pending = this.pendingRequests.get(String(response.id));
    if (pending) {
      if (response.error) {
        pending.reject(new Error(response.error.message));
      } else {
        pending.resolve(response);
      }
      this.pendingRequests.delete(String(response.id));
    }
  }

  private async fetchCapabilities(server: MCPServer): Promise<void> {
    try {
      // Fetch tools
      const toolsResponse = await this.sendRequest(server.id, "tools/list", {});
      server.tools = (toolsResponse.result as { tools: MCPTool[] }).tools || [];

      // Fetch resources
      const resourcesResponse = await this.sendRequest(server.id, "resources/list", {});
      server.resources = (resourcesResponse.result as { resources: MCPResource[] }).resources || [];

      // Fetch prompts
      const promptsResponse = await this.sendRequest(server.id, "prompts/list", {});
      server.prompts = (promptsResponse.result as { prompts: MCPPrompt[] }).prompts || [];
    } catch (error) {
      console.warn(`Failed to fetch capabilities for server ${server.id}:`, error);
    }
  }

  private emitInspectorEvent(event: MCPInspectorEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in inspector event listener:", error);
      }
    }
  }
}

// Singleton instance
export const mcpClient = new MCPClient();
