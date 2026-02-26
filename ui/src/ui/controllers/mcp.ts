import type { AppViewState } from "../app-view-state.js";

export interface MCPServer {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
  lastConnected?: string;
  tools: string[];
}

export async function loadMCPServers(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.mcpLoading = true;
  state.mcpError = null;

  try {
    const result = (await state.client.request("mcp.list")) as {
      servers: MCPServer[];
    };
    state.mcpServers = result.servers || [];
  } catch (err) {
    state.mcpError = err instanceof Error ? err.message : "Failed to load MCP servers";
    console.error("[MCP] Failed to load:", err);
  } finally {
    state.mcpLoading = false;
  }
}

export async function searchMCPServers(state: AppViewState, query: string): Promise<void> {
  state.mcpSearchQuery = query;
  // Filtering is done in the view
}
