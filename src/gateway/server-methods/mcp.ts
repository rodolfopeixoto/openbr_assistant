import { v4 as uuidv4 } from "uuid";
import type { GatewayRequestHandlers } from "./types.js";
import { loadConfig, writeConfigFile } from "../../config/config.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

// Extended MCP Marketplace with 58+ servers from awesome-mcp-servers
const MARKETPLACE_SERVERS: Array<{
  id: string;
  name: string;
  description: string;
  url: string;
  transport: "stdio" | "http" | "websocket";
  category: string;
  installCommand?: string;
  tags: string[];
  official?: boolean;
}> = [
  // Browser Automation (5)
  {
    id: "chrome-devtools",
    name: "Chrome DevTools",
    description:
      "Debug web pages directly in Chrome with performance insights, network monitoring, and console access",
    url: "stdio://chrome-devtools-mcp",
    transport: "stdio",
    category: "browser",
    installCommand: "npx chrome-devtools-mcp@latest",
    tags: ["browser", "debugging", "performance", "chrome"],
    official: true,
  },
  {
    id: "playwright",
    name: "Playwright",
    description:
      "Microsoft's official Playwright MCP server for browser automation and web scraping",
    url: "stdio://@playwright/mcp",
    transport: "stdio",
    category: "browser",
    installCommand: "npx @playwright/mcp@latest",
    tags: ["browser", "automation", "testing", "microsoft"],
    official: true,
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Official Puppeteer MCP server for browser automation and web scraping",
    url: "stdio://@modelcontextprotocol/puppeteer",
    transport: "stdio",
    category: "browser",
    installCommand: "npx @modelcontextprotocol/puppeteer@latest",
    tags: ["browser", "automation", "google"],
    official: true,
  },
  {
    id: "browser-base",
    name: "BrowserBase",
    description: "Cloud browser automation for web navigation, data extraction, and form filling",
    url: "stdio://@browserbase/mcp",
    transport: "stdio",
    category: "browser",
    installCommand: "npx @browserbase/mcp@latest",
    tags: ["browser", "cloud", "automation"],
  },
  {
    id: "browser-use",
    name: "Browser Use",
    description: "Autonomous browser automation for AI agents with vision capabilities",
    url: "stdio://browser-use-mcp",
    transport: "stdio",
    category: "browser",
    installCommand: "pip install browser-use-mcp",
    tags: ["browser", "ai", "automation", "vision"],
  },

  // Databases (5)
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Query and manage PostgreSQL databases with natural language",
    url: "stdio://@anthropic-ai/mcp-postgres",
    transport: "stdio",
    category: "database",
    installCommand: "npm install -g @anthropic-ai/mcp-postgres",
    tags: ["database", "sql", "postgres"],
    official: true,
  },
  {
    id: "sqlite",
    name: "SQLite",
    description: "Query SQLite databases with natural language",
    url: "stdio://@anthropic-ai/mcp-sqlite",
    transport: "stdio",
    category: "database",
    installCommand: "npm install -g @anthropic-ai/mcp-sqlite",
    tags: ["database", "sql", "sqlite"],
    official: true,
  },
  {
    id: "mysql",
    name: "MySQL",
    description: "Connect to and query MySQL databases",
    url: "stdio://mysql-mcp-server",
    transport: "stdio",
    category: "database",
    installCommand: "npm install -g mysql-mcp-server",
    tags: ["database", "sql", "mysql"],
  },
  {
    id: "mongodb",
    name: "MongoDB",
    description: "Query and manage MongoDB databases with natural language",
    url: "stdio://mongodb-mcp-server",
    transport: "stdio",
    category: "database",
    installCommand: "npm install -g mongodb-mcp-server",
    tags: ["database", "nosql", "mongodb"],
  },
  {
    id: "redis",
    name: "Redis",
    description: "Interact with Redis databases for caching and data storage",
    url: "stdio://redis-mcp-server",
    transport: "stdio",
    category: "database",
    installCommand: "npm install -g redis-mcp-server",
    tags: ["database", "cache", "redis"],
  },

  // Cloud & DevOps (5)
  {
    id: "aws",
    name: "AWS CLI",
    description: "Execute AWS CLI commands and manage AWS resources",
    url: "stdio://aws-mcp-server",
    transport: "stdio",
    category: "cloud",
    installCommand: "pip install aws-mcp-server",
    tags: ["cloud", "aws", "infrastructure"],
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    description: "Manage Kubernetes clusters with kubectl operations",
    url: "stdio://mcp-server-kubernetes",
    transport: "stdio",
    category: "cloud",
    installCommand: "npm install -g mcp-server-kubernetes",
    tags: ["cloud", "kubernetes", "containers", "devops"],
  },
  {
    id: "docker",
    name: "Docker",
    description: "Manage Docker containers and images",
    url: "stdio://docker-mcp-server",
    transport: "stdio",
    category: "cloud",
    installCommand: "npm install -g docker-mcp-server",
    tags: ["cloud", "docker", "containers", "devops"],
  },
  {
    id: "terraform",
    name: "Terraform",
    description: "Official Terraform MCP server for infrastructure management",
    url: "stdio://terraform-mcp-server",
    transport: "stdio",
    category: "cloud",
    installCommand: "npx terraform-mcp-server@latest",
    tags: ["cloud", "terraform", "iac", "devops"],
    official: true,
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "Manage Cloudflare Workers, KV, R2, and D1",
    url: "stdio://@cloudflare/mcp-server-cloudflare",
    transport: "stdio",
    category: "cloud",
    installCommand: "npx @cloudflare/mcp-server-cloudflare@latest",
    tags: ["cloud", "cloudflare", "serverless"],
    official: true,
  },

  // Development (6)
  {
    id: "github",
    name: "GitHub",
    description: "Interact with GitHub repositories, issues, PRs, and more",
    url: "stdio://@modelcontextprotocol/github",
    transport: "stdio",
    category: "development",
    installCommand: "npx @modelcontextprotocol/github@latest",
    tags: ["development", "git", "github"],
    official: true,
  },
  {
    id: "git",
    name: "Git",
    description: "Execute git commands and analyze repositories",
    url: "stdio://@anthropic-ai/mcp-git",
    transport: "stdio",
    category: "development",
    installCommand: "npm install -g @anthropic-ai/mcp-git",
    tags: ["development", "git", "version-control"],
    official: true,
  },
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read and write files on the local filesystem",
    url: "stdio://@anthropic-ai/mcp-filesystem",
    transport: "stdio",
    category: "development",
    installCommand: "npm install -g @anthropic-ai/mcp-filesystem",
    tags: ["development", "filesystem", "files"],
    official: true,
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Create and edit diagrams with AI-powered Excalidraw canvas",
    url: "stdio://mcp-excalidraw",
    transport: "stdio",
    category: "development",
    installCommand: "npm install -g mcp-excalidraw",
    tags: ["development", "diagrams", "design", "canvas"],
  },
  {
    id: "vscode",
    name: "VS Code",
    description: "Control VS Code editor, manage files and extensions",
    url: "stdio://vscode-mcp-server",
    transport: "stdio",
    category: "development",
    installCommand: "npm install -g vscode-mcp-server",
    tags: ["development", "editor", "vscode", "ide"],
  },
  {
    id: "mermaid",
    name: "Mermaid",
    description: "Generate diagrams and flowcharts from text using Mermaid",
    url: "stdio://mermaid-mcp-server",
    transport: "stdio",
    category: "development",
    installCommand: "npm install -g mermaid-mcp-server",
    tags: ["development", "diagrams", "documentation"],
  },

  // Communication (4)
  {
    id: "slack",
    name: "Slack",
    description: "Send messages and manage Slack workspaces",
    url: "stdio://@modelcontextprotocol/slack",
    transport: "stdio",
    category: "communication",
    installCommand: "npx @modelcontextprotocol/slack@latest",
    tags: ["communication", "slack", "messaging"],
    official: true,
  },
  {
    id: "discord",
    name: "Discord",
    description: "Send messages and manage Discord servers",
    url: "stdio://discord-mcp-server",
    transport: "stdio",
    category: "communication",
    installCommand: "npm install -g discord-mcp-server",
    tags: ["communication", "discord", "messaging"],
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Send messages via Telegram Bot API",
    url: "stdio://telegram-mcp-server",
    transport: "stdio",
    category: "communication",
    installCommand: "npm install -g telegram-mcp-server",
    tags: ["communication", "telegram", "messaging"],
  },
  {
    id: "email",
    name: "Email (SMTP)",
    description: "Send emails via SMTP servers",
    url: "stdio://email-mcp-server",
    transport: "stdio",
    category: "communication",
    installCommand: "npm install -g email-mcp-server",
    tags: ["communication", "email", "smtp"],
  },

  // Search & Information (5)
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Search the web using Brave Search API",
    url: "stdio://@anthropic-ai/mcp-brave-search",
    transport: "stdio",
    category: "search",
    installCommand: "npm install -g @anthropic-ai/mcp-brave-search",
    tags: ["search", "web", "brave"],
    official: true,
  },
  {
    id: "fetch",
    name: "Fetch",
    description: "Fetch web pages and extract content",
    url: "stdio://@anthropic-ai/mcp-fetch",
    transport: "stdio",
    category: "search",
    installCommand: "npm install -g @anthropic-ai/mcp-fetch",
    tags: ["search", "web", "scraping"],
    official: true,
  },
  {
    id: "tavily",
    name: "Tavily Search",
    description: "AI-powered search engine optimized for LLMs",
    url: "stdio://tavily-mcp",
    transport: "stdio",
    category: "search",
    installCommand: "pip install tavily-mcp",
    tags: ["search", "ai", "web", "research"],
  },
  {
    id: "serp",
    name: "SERP API",
    description: "Google Search results via SERP API",
    url: "stdio://serp-mcp-server",
    transport: "stdio",
    category: "search",
    installCommand: "npm install -g serp-mcp-server",
    tags: ["search", "google", "seo"],
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    description: "Search and retrieve Wikipedia articles",
    url: "stdio://wikipedia-mcp-server",
    transport: "stdio",
    category: "search",
    installCommand: "npm install -g wikipedia-mcp-server",
    tags: ["search", "knowledge", "wikipedia"],
  },

  // Productivity & Tools (5)
  {
    id: "notion",
    name: "Notion",
    description: "Read and write Notion pages and databases",
    url: "stdio://@notion/mcp-server",
    transport: "stdio",
    category: "productivity",
    installCommand: "npx @notion/mcp-server@latest",
    tags: ["productivity", "notes", "notion", "wiki"],
    official: true,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Manage issues and projects in Linear",
    url: "stdio://linear-mcp-server",
    transport: "stdio",
    category: "productivity",
    installCommand: "npm install -g linear-mcp-server",
    tags: ["productivity", "project-management", "issues"],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Read and write Obsidian vault notes",
    url: "stdio://obsidian-mcp-server",
    transport: "stdio",
    category: "productivity",
    installCommand: "npm install -g obsidian-mcp-server",
    tags: ["productivity", "notes", "knowledge", "markdown"],
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Manage Google Calendar events and schedules",
    url: "stdio://google-calendar-mcp",
    transport: "stdio",
    category: "productivity",
    installCommand: "npm install -g google-calendar-mcp",
    tags: ["productivity", "calendar", "scheduling"],
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Manage tasks and projects in Todoist",
    url: "stdio://todoist-mcp-server",
    transport: "stdio",
    category: "productivity",
    installCommand: "npm install -g todoist-mcp-server",
    tags: ["productivity", "tasks", "todo"],
  },

  // AI & ML (5)
  {
    id: "openai",
    name: "OpenAI",
    description: "Access GPT-4, GPT-4o, and other OpenAI models",
    url: "stdio://openai-mcp-server",
    transport: "stdio",
    category: "ai",
    installCommand: "npm install -g openai-mcp-server",
    tags: ["ai", "llm", "openai", "gpt"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Access Claude models via Anthropic API",
    url: "stdio://anthropic-mcp-server",
    transport: "stdio",
    category: "ai",
    installCommand: "npm install -g anthropic-mcp-server",
    tags: ["ai", "llm", "anthropic", "claude"],
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Run local LLMs through Ollama (Llama, Mistral, etc.)",
    url: "stdio://ollama-mcp-server",
    transport: "stdio",
    category: "ai",
    installCommand: "npm install -g ollama-mcp-server",
    tags: ["ai", "llm", "local", "ollama"],
  },
  {
    id: "image-gen",
    name: "Image Generation",
    description: "Generate AI images using DALL-E, Stable Diffusion, etc.",
    url: "stdio://image-gen-mcp",
    transport: "stdio",
    category: "ai",
    installCommand: "npm install -g image-gen-mcp",
    tags: ["ai", "image-generation", "dalle", "stable-diffusion"],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "AI-powered search with citations and sources",
    url: "stdio://perplexity-mcp",
    transport: "stdio",
    category: "ai",
    installCommand: "npm install -g perplexity-mcp",
    tags: ["ai", "search", "research", "perplexity"],
  },

  // Monitoring & Observability (3)
  {
    id: "prometheus",
    name: "Prometheus",
    description: "Query Prometheus metrics and alerts",
    url: "stdio://prometheus-mcp-server",
    transport: "stdio",
    category: "monitoring",
    installCommand: "npm install -g prometheus-mcp-server",
    tags: ["monitoring", "metrics", "prometheus"],
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Query Grafana dashboards and datasources",
    url: "stdio://grafana-mcp-server",
    transport: "stdio",
    category: "monitoring",
    installCommand: "npm install -g grafana-mcp-server",
    tags: ["monitoring", "dashboards", "grafana"],
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "View and manage Sentry errors and issues",
    url: "stdio://sentry-mcp-server",
    transport: "stdio",
    category: "monitoring",
    installCommand: "npm install -g sentry-mcp-server",
    tags: ["monitoring", "errors", "sentry"],
  },

  // Security (2)
  {
    id: "security-scan",
    name: "Security Scanner",
    description: "Scan code and dependencies for vulnerabilities",
    url: "stdio://security-mcp-server",
    transport: "stdio",
    category: "security",
    installCommand: "npm install -g security-mcp-server",
    tags: ["security", "scanning", "vulnerabilities"],
  },
  {
    id: "semgrep",
    name: "Semgrep",
    description: "Static analysis for finding bugs and security issues",
    url: "stdio://semgrep-mcp-server",
    transport: "stdio",
    category: "security",
    installCommand: "pip install semgrep-mcp",
    tags: ["security", "static-analysis", "semgrep"],
  },

  // Data & Analytics (3)
  {
    id: "pandas",
    name: "Pandas",
    description: "Data analysis and manipulation with pandas",
    url: "stdio://pandas-mcp-server",
    transport: "stdio",
    category: "data",
    installCommand: "pip install pandas-mcp-server",
    tags: ["data", "analytics", "pandas", "python"],
  },
  {
    id: "snowflake",
    name: "Snowflake",
    description: "Query Snowflake data warehouses",
    url: "stdio://snowflake-mcp-server",
    transport: "stdio",
    category: "data",
    installCommand: "pip install snowflake-mcp-server",
    tags: ["data", "warehouse", "snowflake"],
  },
  {
    id: "bigquery",
    name: "BigQuery",
    description: "Query Google BigQuery datasets",
    url: "stdio://bigquery-mcp-server",
    transport: "stdio",
    category: "data",
    installCommand: "pip install bigquery-mcp-server",
    tags: ["data", "warehouse", "bigquery", "google"],
  },

  // API & Integration (3)
  {
    id: "rest-api",
    name: "REST API",
    description: "Generic REST API client for any HTTP endpoint",
    url: "stdio://rest-api-mcp",
    transport: "stdio",
    category: "api",
    installCommand: "npm install -g rest-api-mcp",
    tags: ["api", "rest", "http", "integration"],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Manage Stripe payments and subscriptions",
    url: "stdio://stripe-mcp-server",
    transport: "stdio",
    category: "api",
    installCommand: "npm install -g stripe-mcp-server",
    tags: ["api", "payments", "stripe"],
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Send SMS and make calls via Twilio",
    url: "stdio://twilio-mcp-server",
    transport: "stdio",
    category: "api",
    installCommand: "npm install -g twilio-mcp-server",
    tags: ["api", "sms", "voice", "twilio"],
  },

  // Media & Content (3)
  {
    id: "youtube",
    name: "YouTube",
    description: "Search videos and get transcripts from YouTube",
    url: "stdio://youtube-mcp-server",
    transport: "stdio",
    category: "media",
    installCommand: "npm install -g youtube-mcp-server",
    tags: ["media", "youtube", "video", "transcript"],
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Control Spotify playback and manage playlists",
    url: "stdio://spotify-mcp-server",
    transport: "stdio",
    category: "media",
    installCommand: "npm install -g spotify-mcp-server",
    tags: ["media", "music", "spotify"],
  },
  {
    id: "ffmpeg",
    name: "FFmpeg",
    description: "Video and audio processing with FFmpeg",
    url: "stdio://ffmpeg-mcp-server",
    transport: "stdio",
    category: "media",
    installCommand: "npm install -g ffmpeg-mcp-server",
    tags: ["media", "video", "audio", "ffmpeg"],
  },

  // Version Control (2)
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "Enhanced GitHub integration with Copilot features",
    url: "stdio://github-copilot-mcp",
    transport: "stdio",
    category: "version-control",
    installCommand: "npm install -g github-copilot-mcp",
    tags: ["version-control", "github", "copilot", "ai"],
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    description: "Manage Bitbucket repositories and pull requests",
    url: "stdio://bitbucket-mcp-server",
    transport: "stdio",
    category: "version-control",
    installCommand: "npm install -g bitbucket-mcp-server",
    tags: ["version-control", "bitbucket", "git"],
  },

  // Testing (2)
  {
    id: "jest",
    name: "Jest",
    description: "Run Jest tests and view results",
    url: "stdio://jest-mcp-server",
    transport: "stdio",
    category: "testing",
    installCommand: "npm install -g jest-mcp-server",
    tags: ["testing", "jest", "javascript"],
  },
  {
    id: "pytest",
    name: "Pytest",
    description: "Run Python tests with pytest",
    url: "stdio://pytest-mcp-server",
    transport: "stdio",
    category: "testing",
    installCommand: "pip install pytest-mcp-server",
    tags: ["testing", "pytest", "python"],
  },
];

// Get unique categories from marketplace
const CATEGORIES = [...new Set(MARKETPLACE_SERVERS.map((s) => s.category))].toSorted();

// Get all unique tags with counts
const getAllTags = () => {
  const tagCounts = new Map<string, number>();
  MARKETPLACE_SERVERS.forEach((server) => {
    server.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  return Array.from(tagCounts.entries())
    .toSorted((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
};

export const mcpHandlers: GatewayRequestHandlers = {
  "mcp.list": async ({ respond }) => {
    try {
      const cfg = loadConfig();
      const servers = cfg.mcpServers || [];

      // Add status field based on enabled state
      const serversWithStatus = servers.map((server) => ({
        ...server,
        status: server.enabled ? "connected" : "disconnected",
      }));

      respond(true, { servers: serversWithStatus });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to list MCP servers: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "mcp.marketplace": async ({ params, respond }) => {
    try {
      const { category, search, tag, official } = params as {
        category?: string;
        search?: string;
        tag?: string;
        official?: boolean;
      };

      let servers = [...MARKETPLACE_SERVERS];

      // Filter by category
      if (category && category !== "all") {
        servers = servers.filter((s) => s.category === category);
      }

      // Filter by official status
      if (official !== undefined) {
        servers = servers.filter((s) => (s.official ?? false) === official);
      }

      // Filter by search query
      if (search) {
        const query = search.toLowerCase();
        servers = servers.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.description.toLowerCase().includes(query) ||
            s.tags.some((t) => t.toLowerCase().includes(query)),
        );
      }

      // Filter by tag
      if (tag) {
        servers = servers.filter((s) => s.tags.includes(tag));
      }

      respond(true, {
        servers,
        categories: CATEGORIES,
        tags: getAllTags(),
        total: MARKETPLACE_SERVERS.length,
        filtered: servers.length,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to load marketplace: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "mcp.categories": async ({ respond }) => {
    try {
      // Count servers per category
      const categoryCounts = new Map<string, number>();
      MARKETPLACE_SERVERS.forEach((server) => {
        categoryCounts.set(server.category, (categoryCounts.get(server.category) || 0) + 1);
      });

      const categories = CATEGORIES.map((id) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        count: categoryCounts.get(id) || 0,
      }));

      respond(true, { categories });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to load categories: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "mcp.add": async ({ params, respond }) => {
    try {
      const { name, url, transport, category, description, auth, env } = params as {
        name: string;
        url: string;
        transport: "stdio" | "http" | "websocket";
        category?: string;
        description?: string;
        auth?: {
          type: "bearer" | "api-key" | "basic";
          token?: string;
          apiKey?: string;
          username?: string;
          password?: string;
        };
        env?: Record<string, string>;
      };

      if (!name || !url || !transport) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "name, url, and transport are required"),
        );
        return;
      }

      const cfg = loadConfig();
      if (!cfg.mcpServers) {
        cfg.mcpServers = [];
      }

      const newServer = {
        id: uuidv4(),
        name,
        url,
        transport,
        category: category || "other",
        description: description || "",
        enabled: false,
        auth,
        env,
      };

      cfg.mcpServers.push(newServer);
      await writeConfigFile(cfg);

      respond(true, { server: { ...newServer, status: "disconnected" } });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to add MCP server: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "mcp.remove": async ({ params, respond }) => {
    try {
      const { id } = params as { id: string };

      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "server id is required"));
        return;
      }

      const cfg = loadConfig();
      if (!cfg.mcpServers) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "no MCP servers configured"),
        );
        return;
      }

      cfg.mcpServers = cfg.mcpServers.filter((s) => s.id !== id);
      await writeConfigFile(cfg);

      respond(true, { id });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to remove MCP server: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "mcp.enable": async ({ params, respond }) => {
    try {
      const { id, enabled } = params as { id: string; enabled: boolean };

      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "server id is required"));
        return;
      }

      const cfg = loadConfig();
      if (!cfg.mcpServers) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "no MCP servers configured"),
        );
        return;
      }

      const server = cfg.mcpServers.find((s) => s.id === id);
      if (!server) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, `server ${id} not found`));
        return;
      }

      server.enabled = enabled;
      await writeConfigFile(cfg);

      respond(true, {
        id,
        enabled,
        status: enabled ? "connected" : "disconnected",
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to ${params.enabled ? "enable" : "disable"} MCP server: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "mcp.install": async ({ params, respond }) => {
    try {
      const { marketplaceId } = params as { marketplaceId: string };

      if (!marketplaceId) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "marketplaceId is required"),
        );
        return;
      }

      const marketplaceServer = MARKETPLACE_SERVERS.find((s) => s.id === marketplaceId);
      if (!marketplaceServer) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `server ${marketplaceId} not found in marketplace`,
          ),
        );
        return;
      }

      const cfg = loadConfig();
      if (!cfg.mcpServers) {
        cfg.mcpServers = [];
      }

      // Check if already installed
      if (cfg.mcpServers.some((s) => s.name === marketplaceServer.name)) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `${marketplaceServer.name} is already installed`),
        );
        return;
      }

      const newServer = {
        id: uuidv4(),
        name: marketplaceServer.name,
        description: marketplaceServer.description,
        url: marketplaceServer.url,
        transport: marketplaceServer.transport,
        category: marketplaceServer.category,
        enabled: false,
      };

      cfg.mcpServers.push(newServer);
      await writeConfigFile(cfg);

      respond(true, {
        server: { ...newServer, status: "disconnected" },
        installCommand: marketplaceServer.installCommand,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to install MCP server: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};
