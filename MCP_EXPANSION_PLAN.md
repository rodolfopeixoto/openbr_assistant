# MCP Marketplace Expansion Plan

## Overview
This plan details the expansion of the MCP (Model Context Protocol) marketplace from 8 servers to 50+ servers across 12 categories, with enhanced UI features including search, filtering, tags, and improved organization.

---

## 1. Backend Changes

### 1.1 Updated Type Definitions (src/gateway/server-methods/mcp.ts)

```typescript
// Enhanced category type with 12 categories
type MCPCategory = 
  | "browser-automation"
  | "databases"
  | "cloud-devops"
  | "development"
  | "communication"
  | "search"
  | "productivity"
  | "ai-ml"
  | "monitoring"
  | "security"
  | "data"
  | "api"
  | "media"
  | "other";

// Enhanced server definition with tags and popularity
type MarketplaceServer = {
  id: string;
  name: string;
  description: string;
  url: string;
  transport: "stdio" | "http" | "websocket";
  category: MCPCategory;
  installCommand?: string;
  tags: string[];
  popularity: "high" | "medium" | "low";
  official: boolean;
  author?: string;
  stars?: number;
  docsUrl?: string;
};
```

### 1.2 MARKETPLACE_SERVERS Array (50+ Servers)

```typescript
const MARKETPLACE_SERVERS: MarketplaceServer[] = [
  // ============================================
  // BROWSER AUTOMATION (5 servers)
  // ============================================
  {
    id: "playwright",
    name: "Playwright",
    description: "Microsoft's browser automation tool for end-to-end testing and web scraping",
    url: "stdio://@anthropic-ai/mcp-playwright",
    transport: "stdio",
    category: "browser-automation",
    installCommand: "npx @anthropic-ai/mcp-playwright@latest",
    tags: ["automation", "testing", "scraping", "microsoft"],
    popularity: "high",
    official: true,
    author: "Microsoft",
    docsUrl: "https://playwright.dev",
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Google's Node.js library for controlling headless Chrome/Chromium",
    url: "stdio://@anthropic-ai/mcp-puppeteer",
    transport: "stdio",
    category: "browser-automation",
    installCommand: "npx @anthropic-ai/mcp-puppeteer@latest",
    tags: ["automation", "chrome", "scraping", "google"],
    popularity: "high",
    official: true,
    author: "Google",
    docsUrl: "https://pptr.dev",
  },
  {
    id: "chrome-devtools",
    name: "Chrome DevTools",
    description: "Interact with Chrome DevTools Protocol for debugging and profiling",
    url: "stdio://chrome-devtools-mcp",
    transport: "stdio",
    category: "browser-automation",
    installCommand: "npx chrome-devtools-mcp@latest",
    tags: ["debugging", "profiling", "devtools", "chrome"],
    popularity: "medium",
    official: false,
  },
  {
    id: "browserbase",
    name: "BrowserBase",
    description: "Cloud-based browser automation with proxy and session management",
    url: "stdio://@browserbase/mcp-server",
    transport: "stdio",
    category: "browser-automation",
    installCommand: "npx @browserbase/mcp-server@latest",
    tags: ["cloud", "proxy", "sessions", "automation"],
    popularity: "medium",
    official: true,
    author: "BrowserBase",
  },
  {
    id: "browser-use",
    name: "Browser Use",
    description: "Autonomous browser agent for complex web interactions",
    url: "stdio://@anthropic-ai/mcp-browser-use",
    transport: "stdio",
    category: "browser-automation",
    installCommand: "npx @anthropic-ai/mcp-browser-use@latest",
    tags: ["autonomous", "agent", "automation", "ai"],
    popularity: "high",
    official: true,
  },

  // ============================================
  // DATABASES (5 servers)
  // ============================================
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Query and manage PostgreSQL databases with natural language",
    url: "stdio://@anthropic-ai/mcp-postgres",
    transport: "stdio",
    category: "databases",
    installCommand: "npm install -g @anthropic-ai/mcp-postgres",
    tags: ["sql", "database", "postgresql", "relational"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "sqlite",
    name: "SQLite",
    description: "Query SQLite databases with natural language support",
    url: "stdio://@anthropic-ai/mcp-sqlite",
    transport: "stdio",
    category: "databases",
    installCommand: "npm install -g @anthropic-ai/mcp-sqlite",
    tags: ["sql", "database", "sqlite", "embedded"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "mysql",
    name: "MySQL",
    description: "Interact with MySQL databases using natural language queries",
    url: "stdio://@anthropic-ai/mcp-mysql",
    transport: "stdio",
    category: "databases",
    installCommand: "npm install -g @anthropic-ai/mcp-mysql",
    tags: ["sql", "database", "mysql", "relational"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    description: "Query MongoDB collections with natural language",
    url: "stdio://@anthropic-ai/mcp-mongodb",
    transport: "stdio",
    category: "databases",
    installCommand: "npm install -g @anthropic-ai/mcp-mongodb",
    tags: ["nosql", "database", "mongodb", "document"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "redis",
    name: "Redis",
    description: "Interact with Redis cache and data structures",
    url: "stdio://@anthropic-ai/mcp-redis",
    transport: "stdio",
    category: "databases",
    installCommand: "npm install -g @anthropic-ai/mcp-redis",
    tags: ["cache", "database", "redis", "key-value"],
    popularity: "medium",
    official: true,
    author: "Anthropic",
  },

  // ============================================
  // CLOUD & DEVOPS (5 servers)
  // ============================================
  {
    id: "aws-cli",
    name: "AWS CLI",
    description: "Execute AWS CLI commands and manage cloud resources",
    url: "stdio://@anthropic-ai/mcp-aws",
    transport: "stdio",
    category: "cloud-devops",
    installCommand: "npm install -g @anthropic-ai/mcp-aws",
    tags: ["aws", "cloud", "infrastructure", "devops"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    description: "Manage Kubernetes clusters and deployments with kubectl",
    url: "stdio://@anthropic-ai/mcp-kubernetes",
    transport: "stdio",
    category: "cloud-devops",
    installCommand: "npm install -g @anthropic-ai/mcp-kubernetes",
    tags: ["k8s", "containers", "orchestration", "devops"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "docker",
    name: "Docker",
    description: "Manage Docker containers, images, and networks",
    url: "stdio://@anthropic-ai/mcp-docker",
    transport: "stdio",
    category: "cloud-devops",
    installCommand: "npm install -g @anthropic-ai/mcp-docker",
    tags: ["containers", "docker", "devops", "virtualization"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "terraform",
    name: "Terraform",
    description: "Official HashiCorp Terraform MCP server for infrastructure as code",
    url: "stdio://@hashicorp/mcp-terraform",
    transport: "stdio",
    category: "cloud-devops",
    installCommand: "npx @hashicorp/mcp-terraform@latest",
    tags: ["iac", "terraform", "infrastructure", "hashicorp"],
    popularity: "high",
    official: true,
    author: "HashiCorp",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "Manage Cloudflare DNS, CDN, and security settings",
    url: "stdio://@anthropic-ai/mcp-cloudflare",
    transport: "stdio",
    category: "cloud-devops",
    installCommand: "npm install -g @anthropic-ai/mcp-cloudflare",
    tags: ["cdn", "dns", "security", "cloudflare"],
    popularity: "medium",
    official: true,
    author: "Anthropic",
  },

  // ============================================
  // DEVELOPMENT (6 servers)
  // ============================================
  {
    id: "github",
    name: "GitHub",
    description: "Official GitHub MCP server for repositories, issues, and PRs",
    url: "stdio://@github/mcp-server",
    transport: "stdio",
    category: "development",
    installCommand: "npx @github/mcp-server@latest",
    tags: ["git", "github", "version-control", "official"],
    popularity: "high",
    official: true,
    author: "GitHub",
  },
  {
    id: "git",
    name: "Git",
    description: "Execute git commands and analyze repositories",
    url: "stdio://@anthropic-ai/mcp-git",
    transport: "stdio",
    category: "development",
    installCommand: "npm install -g @anthropic-ai/mcp-git",
    tags: ["git", "version-control", "scm"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read and write files on the local filesystem securely",
    url: "stdio://@anthropic-ai/mcp-filesystem",
    transport: "stdio",
    category: "development",
    installCommand: "npm install -g @anthropic-ai/mcp-filesystem",
    tags: ["files", "filesystem", "local", "io"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Create and edit diagrams and sketches",
    url: "stdio://@anthropic-ai/mcp-excalidraw",
    transport: "stdio",
    category: "development",
    installCommand: "npx @anthropic-ai/mcp-excalidraw@latest",
    tags: ["diagrams", "drawing", "visualization"],
    popularity: "medium",
    official: true,
  },
  {
    id: "vscode",
    name: "VS Code",
    description: "Interact with VS Code for code editing and workspace management",
    url: "stdio://@anthropic-ai/mcp-vscode",
    transport: "stdio",
    category: "development",
    installCommand: "npm install -g @anthropic-ai/mcp-vscode",
    tags: ["editor", "ide", "microsoft", "vscode"],
    popularity: "high",
    official: true,
    author: "Microsoft",
  },
  {
    id: "mermaid",
    name: "Mermaid",
    description: "Generate diagrams and flowcharts from text descriptions",
    url: "stdio://@anthropic-ai/mcp-mermaid",
    transport: "stdio",
    category: "development",
    installCommand: "npx @anthropic-ai/mcp-mermaid@latest",
    tags: ["diagrams", "charts", "documentation", "visualization"],
    popularity: "medium",
    official: true,
  },

  // ============================================
  // COMMUNICATION (4 servers)
  // ============================================
  {
    id: "slack",
    name: "Slack",
    description: "Official Slack MCP server for messaging and workspace management",
    url: "stdio://@slack/mcp-server",
    transport: "stdio",
    category: "communication",
    installCommand: "npx @slack/mcp-server@latest",
    tags: ["chat", "messaging", "workspace", "official"],
    popularity: "high",
    official: true,
    author: "Slack",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Send messages and manage Discord servers and channels",
    url: "stdio://@anthropic-ai/mcp-discord",
    transport: "stdio",
    category: "communication",
    installCommand: "npm install -g @anthropic-ai/mcp-discord",
    tags: ["chat", "messaging", "community", "voice"],
    popularity: "high",
    official: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Send messages and manage Telegram bots and channels",
    url: "stdio://@anthropic-ai/mcp-telegram",
    transport: "stdio",
    category: "communication",
    installCommand: "npm install -g @anthropic-ai/mcp-telegram",
    tags: ["chat", "messaging", "bots", "telegram"],
    popularity: "medium",
    official: true,
  },
  {
    id: "smtp",
    name: "Email SMTP",
    description: "Send emails via SMTP for notifications and alerts",
    url: "stdio://@anthropic-ai/mcp-smtp",
    transport: "stdio",
    category: "communication",
    installCommand: "npm install -g @anthropic-ai/mcp-smtp",
    tags: ["email", "smtp", "notifications", "alerts"],
    popularity: "medium",
    official: true,
  },

  // ============================================
  // SEARCH (5 servers)
  // ============================================
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Search the web using Brave Search API with privacy focus",
    url: "stdio://@anthropic-ai/mcp-brave-search",
    transport: "stdio",
    category: "search",
    installCommand: "npm install -g @anthropic-ai/mcp-brave-search",
    tags: ["search", "web", "privacy", "brave"],
    popularity: "high",
    official: true,
  },
  {
    id: "fetch",
    name: "Fetch",
    description: "Fetch web pages and extract content with content parsing",
    url: "stdio://@anthropic-ai/mcp-fetch",
    transport: "stdio",
    category: "search",
    installCommand: "npm install -g @anthropic-ai/mcp-fetch",
    tags: ["http", "fetch", "scraping", "content"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "tavily",
    name: "Tavily",
    description: "AI-powered search engine optimized for LLMs and RAG applications",
    url: "stdio://@tavily/mcp-server",
    transport: "stdio",
    category: "search",
    installCommand: "npx @tavily/mcp-server@latest",
    tags: ["search", "ai", "rag", "llm"],
    popularity: "high",
    official: true,
    author: "Tavily",
  },
  {
    id: "serp-api",
    name: "SERP API",
    description: "Google Search results API for programmatic search access",
    url: "stdio://@anthropic-ai/mcp-serpapi",
    transport: "stdio",
    category: "search",
    installCommand: "npm install -g @anthropic-ai/mcp-serpapi",
    tags: ["search", "google", "serp", "api"],
    popularity: "medium",
    official: true,
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    description: "Search and retrieve Wikipedia articles and knowledge",
    url: "stdio://@anthropic-ai/mcp-wikipedia",
    transport: "stdio",
    category: "search",
    installCommand: "npm install -g @anthropic-ai/mcp-wikipedia",
    tags: ["search", "knowledge", "encyclopedia", "wiki"],
    popularity: "medium",
    official: true,
  },

  // ============================================
  // PRODUCTIVITY (5 servers)
  // ============================================
  {
    id: "notion",
    name: "Notion",
    description: "Official Notion integration for pages, databases, and workspaces",
    url: "stdio://@notion/mcp-server",
    transport: "stdio",
    category: "productivity",
    installCommand: "npx @notion/mcp-server@latest",
    tags: ["wiki", "documents", "database", "official"],
    popularity: "high",
    official: true,
    author: "Notion",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Manage issues, projects, and cycles in Linear",
    url: "stdio://@anthropic-ai/mcp-linear",
    transport: "stdio",
    category: "productivity",
    installCommand: "npm install -g @anthropic-ai/mcp-linear",
    tags: ["project-management", "issues", "tracking"],
    popularity: "high",
    official: true,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Interact with Obsidian vaults for knowledge management",
    url: "stdio://@anthropic-ai/mcp-obsidian",
    transport: "stdio",
    category: "productivity",
    installCommand: "npm install -g @anthropic-ai/mcp-obsidian",
    tags: ["notes", "knowledge", "markdown", "second-brain"],
    popularity: "medium",
    official: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Manage Google Calendar events and schedules",
    url: "stdio://@anthropic-ai/mcp-google-calendar",
    transport: "stdio",
    category: "productivity",
    installCommand: "npm install -g @anthropic-ai/mcp-google-calendar",
    tags: ["calendar", "scheduling", "google", "time"],
    popularity: "high",
    official: true,
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Manage tasks and projects in Todoist",
    url: "stdio://@anthropic-ai/mcp-todoist",
    transport: "stdio",
    category: "productivity",
    installCommand: "npm install -g @anthropic-ai/mcp-todoist",
    tags: ["tasks", "todo", "productivity", "gtd"],
    popularity: "medium",
    official: true,
  },

  // ============================================
  // AI/ML (5 servers)
  // ============================================
  {
    id: "openai",
    name: "OpenAI",
    description: "Access OpenAI models including GPT-4, DALL-E, and embeddings",
    url: "stdio://@anthropic-ai/mcp-openai",
    transport: "stdio",
    category: "ai-ml",
    installCommand: "npm install -g @anthropic-ai/mcp-openai",
    tags: ["ai", "llm", "gpt", "openai", "embeddings"],
    popularity: "high",
    official: true,
  },
  {
    id: "anthropic-ai",
    name: "Anthropic",
    description: "Access Claude and other Anthropic AI models",
    url: "stdio://@anthropic-ai/mcp-anthropic",
    transport: "stdio",
    category: "ai-ml",
    installCommand: "npm install -g @anthropic-ai/mcp-anthropic",
    tags: ["ai", "llm", "claude", "anthropic"],
    popularity: "high",
    official: true,
    author: "Anthropic",
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Run local LLMs including Llama, Mistral, and CodeLlama",
    url: "stdio://@ollama/mcp-server",
    transport: "stdio",
    category: "ai-ml",
    installCommand: "npx @ollama/mcp-server@latest",
    tags: ["ai", "llm", "local", "open-source", "privacy"],
    popularity: "high",
    official: true,
    author: "Ollama",
  },
  {
    id: "image-generation",
    name: "Image Generation",
    description: "Generate images using various AI models and services",
    url: "stdio://@anthropic-ai/mcp-image-gen",
    transport: "stdio",
    category: "ai-ml",
    installCommand: "npm install -g @anthropic-ai/mcp-image-gen",
    tags: ["ai", "images", "generation", "dalle", "sd"],
    popularity: "medium",
    official: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "AI search with citations and real-time information",
    url: "stdio://@perplexity/mcp-server",
    transport: "stdio",
    category: "ai-ml",
    installCommand: "npx @perplexity/mcp-server@latest",
    tags: ["ai", "search", "citations", "research"],
    popularity: "high",
    official: true,
    author: "Perplexity",
  },

  // ============================================
  // MONITORING (3 servers)
  // ============================================
  {
    id: "prometheus",
    name: "Prometheus",
    description: "Query metrics and monitor systems with Prometheus",
    url: "stdio://@anthropic-ai/mcp-prometheus",
    transport: "stdio",
    category: "monitoring",
    installCommand: "npm install -g @anthropic-ai/mcp-prometheus",
    tags: ["metrics", "monitoring", "prometheus", "observability"],
    popularity: "medium",
    official: true,
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Create and view Grafana dashboards and alerts",
    url: "stdio://@anthropic-ai/mcp-grafana",
    transport: "stdio",
    category: "monitoring",
    installCommand: "npm install -g @anthropic-ai/mcp-grafana",
    tags: ["dashboards", "monitoring", "visualization", "grafana"],
    popularity: "medium",
    official: true,
  },
  {
    id: "datadog",
    name: "Datadog",
    description: "Monitor applications and infrastructure with Datadog",
    url: "stdio://@anthropic-ai/mcp-datadog",
    transport: "stdio",
    category: "monitoring",
    installCommand: "npm install -g @anthropic-ai/mcp-datadog",
    tags: ["apm", "monitoring", "logs", "datadog"],
    popularity: "medium",
    official: true,
  },

  // ============================================
  // SECURITY (3 servers)
  // ============================================
  {
    id: "1password",
    name: "1Password",
    description: "Securely access passwords and secrets from 1Password",
    url: "stdio://@1password/mcp-server",
    transport: "stdio",
    category: "security",
    installCommand: "npx @1password/mcp-server@latest",
    tags: ["passwords", "secrets", "security", "vault"],
    popularity: "high",
    official: true,
    author: "1Password",
  },
  {
    id: "snyk",
    name: "Snyk",
    description: "Scan dependencies for vulnerabilities and security issues",
    url: "stdio://@snyk/mcp-server",
    transport: "stdio",
    category: "security",
    installCommand: "npx @snyk/mcp-server@latest",
    tags: ["security", "vulnerabilities", "dependencies", "scanning"],
    popularity: "medium",
    official: true,
    author: "Snyk",
  },
  {
    id: "vault",
    name: "HashiCorp Vault",
    description: "Manage secrets and sensitive data with HashiCorp Vault",
    url: "stdio://@hashicorp/mcp-vault",
    transport: "stdio",
    category: "security",
    installCommand: "npx @hashicorp/mcp-vault@latest",
    tags: ["secrets", "security", "vault", "hashicorp"],
    popularity: "medium",
    official: true,
    author: "HashiCorp",
  },

  // ============================================
  // DATA & ANALYTICS (4 servers)
  // ============================================
  {
    id: "snowflake",
    name: "Snowflake",
    description: "Query and analyze data in Snowflake data warehouse",
    url: "stdio://@snowflake/mcp-server",
    transport: "stdio",
    category: "data",
    installCommand: "npx @snowflake/mcp-server@latest",
    tags: ["data-warehouse", "analytics", "sql", "cloud"],
    popularity: "medium",
    official: true,
    author: "Snowflake",
  },
  {
    id: "bigquery",
    name: "BigQuery",
    description: "Query Google BigQuery datasets and tables",
    url: "stdio://@anthropic-ai/mcp-bigquery",
    transport: "stdio",
    category: "data",
    installCommand: "npm install -g @anthropic-ai/mcp-bigquery",
    tags: ["data-warehouse", "analytics", "google", "sql"],
    popularity: "medium",
    official: true,
  },
  {
    id: "pandas",
    name: "Pandas",
    description: "Data manipulation and analysis with Python pandas",
    url: "stdio://@anthropic-ai/mcp-pandas",
    transport: "stdio",
    category: "data",
    installCommand: "npm install -g @anthropic-ai/mcp-pandas",
    tags: ["data-analysis", "python", "pandas", "dataframe"],
    popularity: "medium",
    official: true,
  },
  {
    id: "jupyter",
    name: "Jupyter",
    description: "Execute code in Jupyter notebooks and kernels",
    url: "stdio://@anthropic-ai/mcp-jupyter",
    transport: "stdio",
    category: "data",
    installCommand: "npm install -g @anthropic-ai/mcp-jupyter",
    tags: ["notebooks", "python", "data-science", "kernels"],
    popularity: "medium",
    official: true,
  },

  // ============================================
  // APIs & INTEGRATIONS (4 servers)
  // ============================================
  {
    id: "stripe",
    name: "Stripe",
    description: "Manage payments, customers, and subscriptions via Stripe API",
    url: "stdio://@stripe/mcp-server",
    transport: "stdio",
    category: "api",
    installCommand: "npx @stripe/mcp-server@latest",
    tags: ["payments", "billing", "fintech", "api"],
    popularity: "high",
    official: true,
    author: "Stripe",
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Send SMS, make calls, and manage communications via Twilio",
    url: "stdio://@twilio/mcp-server",
    transport: "stdio",
    category: "api",
    installCommand: "npx @twilio/mcp-server@latest",
    tags: ["sms", "voice", "communications", "api"],
    popularity: "medium",
    official: true,
    author: "Twilio",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Send transactional and marketing emails via SendGrid",
    url: "stdio://@sendgrid/mcp-server",
    transport: "stdio",
    category: "api",
    installCommand: "npx @sendgrid/mcp-server@latest",
    tags: ["email", "marketing", "api", "communications"],
    popularity: "medium",
    official: true,
    author: "SendGrid",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Manage CRM data, contacts, and marketing in HubSpot",
    url: "stdio://@hubspot/mcp-server",
    transport: "stdio",
    category: "api",
    installCommand: "npx @hubspot/mcp-server@latest",
    tags: ["crm", "marketing", "sales", "api"],
    popularity: "medium",
    official: true,
    author: "HubSpot",
  },

  // ============================================
  // MEDIA (4 servers)
  // ============================================
  {
    id: "ffmpeg",
    name: "FFmpeg",
    description: "Process and convert video, audio, and image files",
    url: "stdio://@anthropic-ai/mcp-ffmpeg",
    transport: "stdio",
    category: "media",
    installCommand: "npm install -g @anthropic-ai/mcp-ffmpeg",
    tags: ["video", "audio", "conversion", "media"],
    popularity: "medium",
    official: true,
  },
  {
    id: "sharp",
    name: "Sharp",
    description: "High-performance Node.js image processing",
    url: "stdio://@anthropic-ai/mcp-sharp",
    transport: "stdio",
    category: "media",
    installCommand: "npm install -g @anthropic-ai/mcp-sharp",
    tags: ["images", "processing", "resize", "optimization"],
    popularity: "medium",
    official: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Search and retrieve YouTube videos and metadata",
    url: "stdio://@anthropic-ai/mcp-youtube",
    transport: "stdio",
    category: "media",
    installCommand: "npm install -g @anthropic-ai/mcp-youtube",
    tags: ["video", "youtube", "search", "media"],
    popularity: "high",
    official: true,
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Control Spotify playback and manage playlists",
    url: "stdio://@anthropic-ai/mcp-spotify",
    transport: "stdio",
    category: "media",
    installCommand: "npm install -g @anthropic-ai/mcp-spotify",
    tags: ["music", "audio", "streaming", "spotify"],
    popularity: "medium",
    official: true,
  },
];
```

### 1.3 New API Endpoints

```typescript
export const mcpHandlers: GatewayRequestHandlers = {
  // ... existing handlers ...

  "mcp.marketplace": async ({ params, respond }) => {
    try {
      const { 
        search,           // Search query string
        category,         // Filter by category
        tags,             // Filter by tags (array)
        official,         // Filter by official status (boolean)
        popularity,       // Filter by popularity level
        page = 1,         // Pagination page
        limit = 20        // Items per page
      } = (params || {}) as {
        search?: string;
        category?: string;
        tags?: string[];
        official?: boolean;
        popularity?: "high" | "medium" | "low";
        page?: number;
        limit?: number;
      };

      let servers = [...MARKETPLACE_SERVERS];

      // Apply search filter
      if (search) {
        const query = search.toLowerCase();
        servers = servers.filter(s => 
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some(t => t.toLowerCase().includes(query))
        );
      }

      // Apply category filter
      if (category && category !== "all") {
        servers = servers.filter(s => s.category === category);
      }

      // Apply tags filter
      if (tags && tags.length > 0) {
        servers = servers.filter(s => 
          tags.some(tag => s.tags.includes(tag))
        );
      }

      // Apply official filter
      if (official !== undefined) {
        servers = servers.filter(s => s.official === official);
      }

      // Apply popularity filter
      if (popularity) {
        servers = servers.filter(s => s.popularity === popularity);
      }

      // Calculate pagination
      const total = servers.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedServers = servers.slice(startIndex, endIndex);

      respond(true, { 
        servers: paginatedServers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to load marketplace: ${err instanceof Error ? err.message : String(err)}`
        )
      );
    }
  },

  "mcp.categories": async ({ respond }) => {
    try {
      // Get unique categories from marketplace servers
      const categorySet = new Set<string>();
      MARKETPLACE_SERVERS.forEach(s => categorySet.add(s.category));
      
      // Build category info with counts
      const categories = Array.from(categorySet).map(cat => ({
        id: cat,
        label: CATEGORY_LABELS[cat] || cat,
        description: CATEGORY_DESCRIPTIONS[cat] || "",
        icon: CATEGORY_ICONS[cat] || "box",
        color: CATEGORY_COLORS[cat] || "#6b7280",
        count: MARKETPLACE_SERVERS.filter(s => s.category === cat).length
      }));

      respond(true, { categories });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to load categories: ${err instanceof Error ? err.message : String(err)}`
        )
      );
    }
  },

  "mcp.tags": async ({ respond }) => {
    try {
      // Get all unique tags with counts
      const tagCounts = new Map<string, number>();
      MARKETPLACE_SERVERS.forEach(s => {
        s.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      const tags = Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      respond(true, { tags });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to load tags: ${err instanceof Error ? err.message : String(err)}`
        )
      );
    }
  },
};
```

---

## 2. UI Improvements

### 2.1 Updated Category Definitions (ui/src/ui/views/mcp.ts)

```typescript
// MCP Categories with icons, descriptions, and colors
const MCP_CATEGORIES: Record<
  string,
  { 
    label: string; 
    icon: keyof typeof icons; 
    description: string; 
    color: string;
    order: number;
  }
> = {
  "browser-automation": {
    label: "Browser Automation",
    icon: "globe",
    description: "Web scraping, testing, and browser control tools",
    color:="#f97316",
    order: 1,
  },
  databases: {
    label: "Databases",
    icon: "database",
    description: "SQL and NoSQL database integrations",
    color:="#10b981",
    order: 2,
  },
  "cloud-devops": {
    label: "Cloud & DevOps",
    icon: "cloud",
    description: "AWS, Kubernetes, Docker, and infrastructure tools",
    color:="#06b6d4",
    order: 3,
  },
  development: {
    label: "Development",
    icon: "code",
    description: "Git, GitHub, IDEs, and development tools",
    color:="#3b82f6",
    order: 4,
  },
  communication: {
    label: "Communication",
    icon: "messageSquare",
    description: "Slack, Discord, email, and messaging platforms",
    color:="#8b5cf6",
    order: 5,
  },
  search: {
    label: "Search",
    icon: "search",
    description: "Web search, scraping, and information retrieval",
    color:="#ec4899",
    order: 6,
  },
  productivity: {
    label: "Productivity",
    icon: "checkSquare",
    description: "Notion, calendars, task managers, and productivity tools",
    color:="#f59e0b",
    order: 7,
  },
  "ai-ml": {
    label: "AI/ML",
    icon: "brain",
    description: "OpenAI, Anthropic, Ollama, and AI model integrations",
    color:="#6366f1",
    order: 8,
  },
  monitoring: {
    label: "Monitoring",
    icon: "activity",
    description: "Prometheus, Grafana, and observability tools",
    color:="#ef4444",
    order: 9,
  },
  security: {
    label: "Security",
    icon: "shield",
    description: "1Password, Vault, and security scanning tools",
    color:="#dc2626",
    order: 10,
  },
  data: {
    label: "Data & Analytics",
    icon: "barChart",
    description: "Data warehouses, analytics, and visualization",
    color:="#14b8a6",
    order: 11,
  },
  api: {
    label: "APIs & Integrations",
    icon: "plug",
    description: "Stripe, Twilio, and third-party API integrations",
    color:="#84cc16",
    order: 12,
  },
  media: {
    label: "Media",
    icon: "image",
    description: "FFmpeg, image processing, and media tools",
    color:="#a855f7",
    order: 13,
  },
  other: {
    label: "Other",
    icon: "star",
    description: "Miscellaneous tools and integrations",
    color:="#6b7280",
    order: 14,
  },
};
```

### 2.2 Enhanced Marketplace Modal with Search and Filters

```typescript
function renderMarketplaceModal(state: AppViewState) {
  if (!state.mcpShowMarketplace) return nothing;

  return html`
    <div class="modal-overlay" @click="${() => state.handleMcpCloseMarketplace()}">
      <div class="modal-content modal-large modal-marketplace" @click="${(e: Event) => e.stopPropagation()}">
        <div class="modal-header">
          <div class="modal-header-content">
            <div>
              <h2>MCP Marketplace</h2>
              <p class="modal-subtitle">${state.mcpMarketplacePagination?.total || 0} servers available</p>
            </div>
            <button class="modal-close" @click="${() => state.handleMcpCloseMarketplace()}">
              ${icons.x}
            </button>
          </div>
        </div>
        
        <div class="modal-body">
          <!-- Search and Filters -->
          <div class="marketplace-filters">
            <div class="marketplace-search">
              <div class="search-icon">${icons.search}</div>
              <input 
                type="text" 
                placeholder="Search servers, tags, or descriptions..."
                .value="${state.mcpMarketplaceSearchQuery}"
                @input="${(e: InputEvent) => state.handleMcpMarketplaceSearchChange((e.target as HTMLInputElement).value)}"
              />
              ${state.mcpMarketplaceSearchQuery ? html`
                <button class="clear-search" @click="${() => state.handleMcpMarketplaceSearchChange('')}">
                  ${icons.x}
                </button>
              ` : nothing}
            </div>
            
            <div class="filter-chips">
              <select 
                class="filter-select"
                .value="${state.mcpMarketplaceCategoryFilter || 'all'}"
                @change="${(e: InputEvent) => state.handleMcpMarketplaceCategoryChange((e.target as HTMLSelectElement).value)}"
              >
                <option value="all">All Categories</option>
                ${Object.entries(MCP_CATEGORIES).map(([key, cat]) => html`
                  <option value="${key}">${cat.label}</option>
                `)}
              </select>
              
              <select 
                class="filter-select"
                .value="${state.mcpMarketplaceOfficialFilter ?? 'all'}"
                @change="${(e: InputEvent) => state.handleMcpMarketplaceOfficialChange((e.target as HTMLSelectElement).value)}"
              >
                <option value="all">All Sources</option>
                <option value="true">Official Only</option>
                <option value="false">Community</option>
              </select>
              
              <select 
                class="filter-select"
                .value="${state.mcpMarketplacePopularityFilter || 'all'}"
                @change="${(e: InputEvent) => state.handleMcpMarketplacePopularityChange((e.target as HTMLSelectElement).value)}"
              >
                <option value="all">All Popularity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <!-- Tag Cloud -->
            ${state.mcpMarketplaceTags.length > 0 ? html`
              <div class="tag-cloud">
                ${state.mcpMarketplaceTags.slice(0, 15).map(tag => html`
                  <button 
                    class="tag-chip ${state.mcpMarketplaceSelectedTags.includes(tag.name) ? 'active' : ''}"
                    @click="${() => state.handleMcpMarketplaceTagToggle(tag.name)}"
                  >
                    ${tag.name}
                    <span class="tag-count">${tag.count}</span>
                  </button>
                `)}
              </div>
            ` : nothing}
          </div>
          
          <!-- Results -->
          ${state.mcpMarketplaceLoading ? html`
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Loading marketplace...</p>
            </div>
          ` : state.mcpMarketplace.length === 0 ? html`
            <div class="empty-state">
              <div class="empty-icon">${icons.package}</div>
              <h3>No servers found</h3>
              <p>Try adjusting your search or filters</p>
              <button class="btn-secondary" @click="${() => state.handleMcpMarketplaceResetFilters()}">
                Reset Filters
              </button>
            </div>
          ` : html`
            <div class="marketplace-results">
              <div class="marketplace-grid">
                ${state.mcpMarketplace.map(server => renderMarketplaceItem(state, server))}
              </div>
              
              <!-- Pagination -->
              ${state.mcpMarketplacePagination && state.mcpMarketplacePagination.totalPages > 1 ? html`
                <div class="marketplace-pagination">
                  <button 
                    class="pagination-btn"
                    ?disabled="${state.mcpMarketplacePagination.page <= 1}"
                    @click="${() => state.handleMcpMarketplacePageChange(state.mcpMarketplacePagination.page - 1)}"
                  >
                    ${icons.chevronLeft}
                    Previous
                  </button>
                  
                  <span class="pagination-info">
                    Page ${state.mcpMarketplacePagination.page} of ${state.mcpMarketplacePagination.totalPages}
                  </span>
                  
                  <button 
                    class="pagination-btn"
                    ?disabled="${state.mcpMarketplacePagination.page >= state.mcpMarketplacePagination.totalPages}"
                    @click="${() => state.handleMcpMarketplacePageChange(state.mcpMarketplacePagination.page + 1)}"
                  >
                    Next
                    ${icons.chevronRight}
                  </button>
                </div>
              ` : nothing}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderMarketplaceItem(state: AppViewState, server: MarketplaceServerUI) {
  const category = MCP_CATEGORIES[server.category];
  const isInstalled = state.mcpServers.some(s => s.name === server.name);
  
  return html`
    <div class="marketplace-item">
      <div class="marketplace-item-header">
        <div class="marketplace-icon" style="--category-color: ${category?.color || '#6b7280'}">
          ${category?.icon ? icons[category.icon] : icons.tool}
        </div>
        <div class="marketplace-info">
          <div class="marketplace-title-row">
            <h4>${server.name}</h4>
            ${server.official ? html`
              <span class="official-badge" title="Official">${icons.checkCircle}</span>
            ` : nothing}
          </div>
          <span class="marketplace-category" style="--category-color: ${category?.color || '#6b7280'}">
            ${category?.label || server.category}
          </span>
        </div>
        ${server.popularity === "high" ? html`
          <span class="popularity-badge popular">Popular</span>
        ` : nothing}
      </div>
      
      <p class="marketplace-description">${server.description}</p>
      
      <!-- Tags -->
      <div class="marketplace-tags">
        ${server.tags.slice(0, 4).map(tag => html`
          <span class="marketplace-tag">${tag}</span>
        `)}
      </div>
      
      <!-- Install Command -->
      ${server.installCommand ? html`
        <div class="marketplace-install-command">
          <code>${server.installCommand}</code>
          <button 
            class="copy-btn"
            title="Copy command"
            @click="${() => navigator.clipboard.writeText(server.installCommand!)}"
          >
            ${icons.copy}
          </button>
        </div>
      ` : nothing}
      
      <div class="marketplace-footer">
        <div class="marketplace-meta">
          <span class="meta-item" title="Transport">
            ${icons.server}
            ${server.transport}
          </span>
          ${server.author ? html`
            <span class="meta-item" title="Author">
              ${icons.user}
              ${server.author}
            </span>
          ` : nothing}
        </div>
        
        ${isInstalled ? html`
          <button class="btn-secondary" disabled>
            ${icons.check}
            Installed
          </button>
        ` : html`
          <button 
            class="btn-primary" 
            @click="${() => state.handleMcpInstallFromMarketplace(server.id)}"
          >
            ${icons.plus}
            Install
          </button>
        `}
      </div>
    </div>
  `;
}
```

### 2.3 Updated App State Interface Additions (ui/src/ui/app-view-state.ts)

```typescript
// MCP state additions
mcpMarketplaceSearchQuery: string;
mcpMarketplaceCategoryFilter: string | null;
mcpMarketplaceOfficialFilter: boolean | null;
mcpMarketplacePopularityFilter: "high" | "medium" | "low" | null;
mcpMarketplaceSelectedTags: string[];
mcpMarketplaceTags: Array<{ name: string; count: number }>;
mcpMarketplacePage: number;
mcpMarketplacePagination: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} | null;

// MCP handlers
handleMcpMarketplaceSearchChange: (query: string) => void;
handleMcpMarketplaceCategoryChange: (category: string) => void;
handleMcpMarketplaceOfficialChange: (value: string) => void;
handleMcpMarketplacePopularityChange: (value: string) => void;
handleMcpMarketplaceTagToggle: (tag: string) => void;
handleMcpMarketplacePageChange: (page: number) => void;
handleMcpMarketplaceResetFilters: () => void;
```

---

## 3. CSS Updates (ui/src/styles/mcp.css)

### 3.1 New Styles for Enhanced Marketplace

```css
/* Marketplace Modal Enhancements */
.modal-marketplace .modal-body {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.modal-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.modal-subtitle {
  font-size: 13px;
  color: var(--muted);
  margin: 4px 0 0 0;
}

/* Marketplace Filters */
.marketplace-filters {
  padding: 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
}

.marketplace-search {
  position: relative;
  margin-bottom: 12px;
}

.marketplace-search input {
  width: 100%;
  padding: 10px 40px 10px 36px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
}

.marketplace-search input:focus {
  outline: none;
  border-color: var(--accent);
}

.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.filter-select {
  padding: 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  min-width: 140px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--accent);
}

/* Tag Cloud */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-chip:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.tag-chip.active {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

.tag-count {
  font-size: 10px;
  color: var(--muted);
  background: var(--bg);
  padding: 1px 4px;
  border-radius: 8px;
}

.tag-chip.active .tag-count {
  background: var(--accent);
  color: white;
}

/* Marketplace Results */
.marketplace-results {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* Enhanced Marketplace Item */
.marketplace-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.15s ease;
}

.marketplace-item:hover {
  border-color: var(--border-strong);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.marketplace-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.marketplace-title-row h4 {
  margin: 0;
}

.official-badge {
  color: #22c55e;
  display: flex;
  align-items: center;
}

.official-badge svg {
  width: 16px;
  height: 16px;
}

.popularity-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.popularity-badge.popular {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
}

.marketplace-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.marketplace-tag {
  font-size: 11px;
  color: var(--muted);
  background: var(--bg-elevated);
  padding: 2px 8px;
  border-radius: 4px;
}

.marketplace-install-command {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
}

.marketplace-install-command code {
  flex: 1;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  color: var(--text);
  overflow-x: auto;
  white-space: nowrap;
}

.copy-btn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.copy-btn svg {
  width: 14px;
  height: 14px;
}

.marketplace-meta {
  display: flex;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
}

.meta-item svg {
  width: 12px;
  height: 12px;
}

/* Pagination */
.marketplace-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn svg {
  width: 14px;
  height: 14px;
}

.pagination-info {
  font-size: 13px;
  color: var(--muted);
}

/* Infinite Scroll Loading */
.infinite-scroll-loader {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.infinite-scroll-loader .spinner {
  width: 24px;
  height: 24px;
}
```

---

## 4. Implementation Checklist

### Phase 1: Backend (src/gateway/server-methods/mcp.ts)
- [ ] Update type definitions with new fields
- [ ] Expand MARKETPLACE_SERVERS to 50+ entries
- [ ] Implement `mcp.marketplace` endpoint with filtering
- [ ] Implement `mcp.categories` endpoint
- [ ] Implement `mcp.tags` endpoint
- [ ] Add pagination support
- [ ] Test all endpoints

### Phase 2: UI State Management (ui/src/ui/app-view-state.ts)
- [ ] Add new marketplace state fields
- [ ] Add filter state fields
- [ ] Add pagination state
- [ ] Implement filter handler methods
- [ ] Implement search handler
- [ ] Implement pagination handler

### Phase 3: UI Components (ui/src/ui/views/mcp.ts)
- [ ] Update MCP_CATEGORIES with 12 categories
- [ ] Add new icon imports
- [ ] Implement enhanced marketplace modal
- [ ] Add search input component
- [ ] Add filter dropdowns
- [ ] Add tag cloud component
- [ ] Add pagination controls
- [ ] Add install command display with copy button
- [ ] Add official/popularity badges

### Phase 4: Styling (ui/src/styles/mcp.css)
- [ ] Add marketplace filter styles
- [ ] Add tag cloud styles
- [ ] Add enhanced card styles
- [ ] Add pagination styles
- [ ] Add responsive breakpoints
- [ ] Add loading states

### Phase 5: Testing & Polish
- [ ] Test search functionality
- [ ] Test category filtering
- [ ] Test tag filtering
- [ ] Test official filter
- [ ] Test popularity filter
- [ ] Test pagination
- [ ] Test install flow
- [ ] Verify responsive design
- [ ] Performance test with 50+ items

---

## 5. Server Summary by Category

| Category | Count | Key Servers |
|----------|-------|-------------|
| Browser Automation | 5 | Playwright, Puppeteer, Chrome DevTools, BrowserBase, Browser Use |
| Databases | 5 | PostgreSQL, SQLite, MySQL, MongoDB, Redis |
| Cloud & DevOps | 5 | AWS CLI, Kubernetes, Docker, Terraform, Cloudflare |
| Development | 6 | GitHub, Git, Filesystem, Excalidraw, VS Code, Mermaid |
| Communication | 4 | Slack, Discord, Telegram, SMTP |
| Search | 5 | Brave Search, Fetch, Tavily, SERP API, Wikipedia |
| Productivity | 5 | Notion, Linear, Obsidian, Google Calendar, Todoist |
| AI/ML | 5 | OpenAI, Anthropic, Ollama, Image Gen, Perplexity |
| Monitoring | 3 | Prometheus, Grafana, Datadog |
| Security | 3 | 1Password, Snyk, HashiCorp Vault |
| Data & Analytics | 4 | Snowflake, BigQuery, Pandas, Jupyter |
| APIs & Integrations | 4 | Stripe, Twilio, SendGrid, HubSpot |
| Media | 4 | FFmpeg, Sharp, YouTube, Spotify |
| **Total** | **58** | |

---

## 6. Notes

- All install commands use `npx` or `npm install -g` for easy installation
- Official servers are marked with a green checkmark badge
- Popular servers (high popularity) get an orange "Popular" badge
- Tags enable cross-category discovery (e.g., search for "api" to find all API-related servers)
- Pagination defaults to 20 items per page for optimal performance
- All servers include documentation URLs where available
- Colors are chosen for accessibility and visual distinction
