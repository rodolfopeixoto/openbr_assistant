import type { AppViewState } from "../app-view-state.js";

export interface MCPServer {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
  lastConnected?: string;
  tools: string[];
  category?: string;
  url?: string;
  description?: string;
}

export interface MCPMarketplaceServer {
  id: string;
  name: string;
  description: string;
  url: string;
  transport: string;
  category: string;
  installCommand?: string;
  tags?: string[];
  official?: boolean;
  githubUrl?: string;
  documentationUrl?: string;
}

// Built-in MCP marketplace data based on mcpservers.org
const MCP_MARKETPLACE_DATA: MCPMarketplaceServer[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Access and manipulate files on the local filesystem",
    url: "stdio://npx -y @modelcontextprotocol/server-filesystem",
    transport: "stdio",
    category: "development",
    installCommand: "npx -y @modelcontextprotocol/server-filesystem",
    tags: ["files", "filesystem", "local"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Repository management, file operations, and GitHub API integration",
    url: "stdio://npx -y @modelcontextprotocol/server-github",
    transport: "stdio",
    category: "version-control",
    installCommand: "npx -y @modelcontextprotocol/server-github",
    tags: ["github", "git", "api"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Read-only database access with schema inspection",
    url: "stdio://npx -y @modelcontextprotocol/server-postgres",
    transport: "stdio",
    category: "database",
    installCommand: "npx -y @modelcontextprotocol/server-postgres",
    tags: ["postgres", "database", "sql"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
  },
  {
    id: "sqlite",
    name: "SQLite",
    description: "SQLite database operations and querying",
    url: "stdio://npx -y @modelcontextprotocol/server-sqlite",
    transport: "stdio",
    category: "database",
    installCommand: "npx -y @modelcontextprotocol/server-sqlite",
    tags: ["sqlite", "database", "sql"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite",
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Browser automation and web scraping",
    url: "stdio://npx -y @modelcontextprotocol/server-puppeteer",
    transport: "stdio",
    category: "browser",
    installCommand: "npx -y @modelcontextprotocol/server-puppeteer",
    tags: ["browser", "automation", "scraping"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
  },
  {
    id: "fetch",
    name: "Fetch",
    description: "Web content fetching and processing",
    url: "stdio://npx -y @modelcontextprotocol/server-fetch",
    transport: "stdio",
    category: "api",
    installCommand: "npx -y @modelcontextprotocol/server-fetch",
    tags: ["http", "fetch", "web"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch",
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Web search using Brave Search API",
    url: "stdio://npx -y @modelcontextprotocol/server-brave-search",
    transport: "stdio",
    category: "search",
    installCommand: "npx -y @modelcontextprotocol/server-brave-search",
    tags: ["search", "brave", "web"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Slack workspace integration and messaging",
    url: "stdio://npx -y @modelcontextprotocol/server-slack",
    transport: "stdio",
    category: "communication",
    installCommand: "npx -y @modelcontextprotocol/server-slack",
    tags: ["slack", "messaging", "chat"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
  },
  {
    id: "memory",
    name: "Memory",
    description: "Knowledge graph-based persistent memory",
    url: "stdio://npx -y @modelcontextprotocol/server-memory",
    transport: "stdio",
    category: "ai",
    installCommand: "npx -y @modelcontextprotocol/server-memory",
    tags: ["memory", "knowledge", "persistent"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Google Drive file access and management",
    url: "stdio://npx -y @modelcontextprotocol/server-gdrive",
    transport: "stdio",
    category: "cloud",
    installCommand: "npx -y @modelcontextprotocol/server-gdrive",
    tags: ["google", "drive", "cloud"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive",
  },
  {
    id: "git",
    name: "Git",
    description: "Git repository reading and analysis tools",
    url: "stdio://npx -y @modelcontextprotocol/server-git",
    transport: "stdio",
    category: "version-control",
    installCommand: "npx -y @modelcontextprotocol/server-git",
    tags: ["git", "version-control", "repository"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/git",
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Error tracking and monitoring via Sentry",
    url: "stdio://npx -y @modelcontextprotocol/server-sentry",
    transport: "stdio",
    category: "monitoring",
    installCommand: "npx -y @modelcontextprotocol/server-sentry",
    tags: ["sentry", "monitoring", "errors"],
    official: true,
    githubUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/sentry",
  },
];

// Get unique categories
const CATEGORY_LABELS: Record<string, string> = {
  browser: "Browser Automation",
  database: "Databases",
  cloud: "Cloud & DevOps",
  development: "Development Tools",
  communication: "Communication",
  search: "Search & Info",
  productivity: "Productivity",
  ai: "AI & ML",
  monitoring: "Monitoring",
  security: "Security",
  data: "Data & Analytics",
  api: "APIs & Integration",
  media: "Media & Content",
  "version-control": "Version Control",
  testing: "Testing",
  other: "Other",
};

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

export async function loadMCPMarketplace(state: AppViewState): Promise<void> {
  state.mcpMarketplaceLoading = true;
  state.mcpMarketplaceError = null;

  try {
    // Use built-in marketplace data (could be fetched from API in the future)
    state.mcpMarketplace = MCP_MARKETPLACE_DATA;
    
    // Extract categories and tags
    const categories = new Map<string, number>();
    const tags = new Set<string>();
    
    MCP_MARKETPLACE_DATA.forEach((server) => {
      const count = categories.get(server.category) || 0;
      categories.set(server.category, count + 1);
      
      server.tags?.forEach((tag) => tags.add(tag));
    });
    
    state.mcpMarketplaceCategories = Array.from(categories.entries()).map(([id, count]) => ({
      id,
      name: CATEGORY_LABELS[id] || id,
      count,
    }));
    
    state.mcpMarketplaceTags = Array.from(tags);
  } catch (err) {
    state.mcpMarketplaceError = err instanceof Error ? err.message : "Failed to load marketplace";
    console.error("[MCP] Failed to load marketplace:", err);
  } finally {
    state.mcpMarketplaceLoading = false;
  }
}

export function searchMCPServers(state: AppViewState, query: string): void {
  state.mcpSearchQuery = query;
  // Filtering is done in the view
}

export function filterMCPCategory(state: AppViewState, category: string | null): void {
  state.mcpSelectedCategory = category;
}

export function filterMarketplaceCategory(state: AppViewState, category: string | null): void {
  state.mcpMarketplaceSelectedCategory = category;
}

export function filterMarketplaceTag(state: AppViewState, tag: string | null): void {
  state.mcpMarketplaceSelectedTag = tag;
}

export function toggleMarketplaceOfficial(state: AppViewState): void {
  state.mcpMarketplaceOfficialOnly = !state.mcpMarketplaceOfficialOnly;
}

export function searchMarketplace(state: AppViewState, query: string): void {
  state.mcpMarketplaceSearchQuery = query;
}

export function resetMarketplaceFilters(state: AppViewState): void {
  state.mcpMarketplaceSearchQuery = "";
  state.mcpMarketplaceSelectedCategory = null;
  state.mcpMarketplaceSelectedTag = null;
  state.mcpMarketplaceOfficialOnly = false;
}

export async function installMCPServerFromMarketplace(
  state: AppViewState,
  serverId: string
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  const server = MCP_MARKETPLACE_DATA.find((s) => s.id === serverId);
  if (!server) {
    console.error("[MCP] Server not found in marketplace:", serverId);
    return;
  }

  try {
    await state.client.request("mcp.add", {
      name: server.name,
      url: server.url,
      type: server.transport,
      category: server.category,
    });
    
    // Reload servers list
    await loadMCPServers(state);
  } catch (err) {
    console.error("[MCP] Failed to install server:", err);
    throw err;
  }
}
