/**
 * MCP Stdio Transport
 * Support for stdio-based MCP servers
 */

import { spawn, type ChildProcess } from "child_process";
import type { MCPServer } from "./types.js";

export interface StdioConnection {
  process: ChildProcess;
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
}

export class MCPStdioTransport {
  private connections: Map<string, StdioConnection> = new Map();
  private messageHandlers: Map<string, (message: unknown) => void> = new Map();

  /**
   * Connect to an MCP server via stdio
   */
  async connect(server: MCPServer): Promise<StdioConnection> {
    if (this.connections.has(server.id)) {
      throw new Error(`Already connected to server ${server.id}`);
    }

    // Parse command from server configuration
    // Format: "command arg1 arg2" or ["command", "arg1", "arg2"]
    const commandParts = this.parseCommand(server);

    if (commandParts.length === 0) {
      throw new Error("No command specified for stdio server");
    }

    const [command, ...args] = commandParts;

    // Spawn the process
    const childProcess = spawn(command, args, {
      env: {
        ...process.env,
        ...server.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const connection: StdioConnection = {
      process: childProcess,
      stdin: childProcess.stdin,
      stdout: childProcess.stdout,
      stderr: childProcess.stderr,
    };

    this.connections.set(server.id, connection);

    // Set up message handling
    this.setupMessageHandling(server.id, connection);

    // Handle process exit
    childProcess.on("exit", (code) => {
      console.log(`MCP server ${server.id} exited with code ${code}`);
      this.connections.delete(server.id);
    });

    // Handle errors
    childProcess.on("error", (error) => {
      console.error(`MCP server ${server.id} error:`, error);
      this.disconnect(server.id);
    });

    return connection;
  }

  /**
   * Disconnect from an MCP server
   */
  disconnect(serverId: string): void {
    const connection = this.connections.get(serverId);
    if (connection) {
      connection.process.kill();
      this.connections.delete(serverId);
      this.messageHandlers.delete(serverId);
    }
  }

  /**
   * Send a message to the server
   */
  async sendMessage(serverId: string, message: unknown): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`Not connected to server ${serverId}`);
    }

    const messageStr = JSON.stringify(message);
    connection.stdin.write(messageStr + "\n");
  }

  /**
   * Register a message handler
   */
  onMessage(serverId: string, handler: (message: unknown) => void): void {
    this.messageHandlers.set(serverId, handler);
  }

  /**
   * Check if connected to a server
   */
  isConnected(serverId: string): boolean {
    return this.connections.has(serverId);
  }

  /**
   * Get server logs from stderr
   */
  getLogs(_serverId: string): string {
    // In a real implementation, this would buffer stderr output
    return "";
  }

  /**
   * Parse command from server configuration
   */
  private parseCommand(server: MCPServer): string[] {
    // Command could be specified in different ways:
    // 1. In the server URL: "node ./server.js"
    // 2. In server configuration
    // 3. As an array in metadata

    if (typeof server.url === "string") {
      return server.url.split(" ").filter(Boolean);
    }

    return [];
  }

  /**
   * Set up message handling from stdout
   */
  private setupMessageHandling(serverId: string, connection: StdioConnection): void {
    let buffer = "";

    connection.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();

      // Process complete lines (JSON-RPC messages are newline-delimited)
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            const handler = this.messageHandlers.get(serverId);
            if (handler) {
              handler(message);
            }
          } catch (error) {
            console.error(`Failed to parse message from ${serverId}:`, error);
          }
        }
      }
    });

    // Log stderr for debugging
    connection.stderr.on("data", (data: Buffer) => {
      console.error(`[${serverId} stderr]:`, data.toString());
    });
  }
}

// Singleton instance
export const mcpStdioTransport = new MCPStdioTransport();
