/**
 * Multi-Environment Configuration System
 * Easy setup for localhost, self-hosted, or cloud
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

export type Environment = "development" | "production" | "test";
export type DeploymentType = "localhost" | "self-hosted" | "cloud";

export interface IntelligenceConfig {
  enabled: boolean;
  sources: NewsSourceConfig[];
  collector: CollectorConfig;
  analyzer: AnalyzerConfig;
  digest: DigestConfig;
  delivery: DeliveryConfig;
}

export interface NewsSourceConfig {
  id: string;
  name: string;
  type: "rss" | "api" | "webhook";
  url: string;
  enabled: boolean;
  category: string;
  refreshInterval: number; // minutes
  maxArticles: number;
  filters?: {
    keywords?: string[];
    excludeKeywords?: string[];
    minLength?: number;
    maxAge?: number; // hours
  };
}

export interface CollectorConfig {
  enabled: boolean;
  schedule: {
    morning: string; // "08:00"
    afternoon: string; // "14:00"
    evening: string; // "19:00"
  };
  realtime: boolean;
  batchSize: number;
  concurrency: number;
  deduplication: {
    enabled: boolean;
    similarityThreshold: number;
  };
}

export interface AnalyzerConfig {
  enabled: boolean;
  provider: "openai" | "anthropic" | "local";
  model: string;
  maxTokens: number;
  temperature: number;
  features: {
    summarize: boolean;
    extractInsights: boolean;
    sentiment: boolean;
    categorize: boolean;
  };
}

export interface DigestConfig {
  enabled: boolean;
  formats: {
    short: boolean; // Quick summary
    medium: boolean; // Key points
    full: boolean; // Complete with insights
  };
  maxArticlesPerDigest: number;
  includeImages: boolean;
  includeLinks: boolean;
}

export interface DeliveryConfig {
  channels: {
    whatsapp?: ChannelConfig;
    telegram?: ChannelConfig;
    slack?: ChannelConfig;
    email?: ChannelConfig;
    push?: ChannelConfig;
  };
  defaultChannels: string[];
  schedule: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

export interface ChannelConfig {
  enabled: boolean;
  credentials: Record<string, string>;
  format: "rich" | "simple";
  maxLength?: number;
}

export interface MarketplaceConfig {
  enabled: boolean;
  registries: {
    mcp: {
      enabled: boolean;
      url: string;
      cacheDuration: number; // minutes
    };
    skills: {
      enabled: boolean;
      url: string;
      cacheDuration: number;
    };
  };
  security: {
    validatePackages: boolean;
    sandboxInstall: boolean;
    allowedHosts: string[];
  };
}

export interface DatabaseConfig {
  type: "sqlite" | "postgres" | "mysql";
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  poolSize?: number;
}

export interface CacheConfig {
  type: "memory" | "redis";
  host?: string;
  port?: number;
  password?: string;
  ttl: number; // seconds
}

export interface SearchConfig {
  enabled: boolean;
  type: "memory" | "elasticsearch";
  host?: string;
  port?: number;
}

export interface AppConfig {
  environment: Environment;
  deployment: DeploymentType;
  port: number;
  host: string;
  logLevel: "debug" | "info" | "warn" | "error";
  intelligence: IntelligenceConfig;
  marketplace: MarketplaceConfig;
  database: DatabaseConfig;
  cache: CacheConfig;
  search: SearchConfig;
  security: {
    jwtSecret: string;
    encryptionKey: string;
    allowedOrigins: string[];
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

// Default configuration - works out of the box
const defaultConfig: AppConfig = {
  environment: "development",
  deployment: "localhost",
  port: 3000,
  host: "localhost",
  logLevel: "info",

  intelligence: {
    enabled: true,
    sources: [
      {
        id: "hackernews",
        name: "Hacker News",
        type: "api",
        url: "https://hacker-news.firebaseio.com/v0/",
        enabled: true,
        category: "tech",
        refreshInterval: 15,
        maxArticles: 30,
      },
      {
        id: "devto",
        name: "Dev.to",
        type: "rss",
        url: "https://dev.to/feed",
        enabled: true,
        category: "tech",
        refreshInterval: 30,
        maxArticles: 20,
      },
      {
        id: "openai-blog",
        name: "OpenAI Blog",
        type: "rss",
        url: "https://openai.com/blog/rss.xml",
        enabled: true,
        category: "ai",
        refreshInterval: 60,
        maxArticles: 10,
      },
    ],
    collector: {
      enabled: true,
      schedule: {
        morning: "08:00",
        afternoon: "14:00",
        evening: "19:00",
      },
      realtime: true,
      batchSize: 50,
      concurrency: 5,
      deduplication: {
        enabled: true,
        similarityThreshold: 0.85,
      },
    },
    analyzer: {
      enabled: true,
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 1000,
      temperature: 0.3,
      features: {
        summarize: true,
        extractInsights: true,
        sentiment: true,
        categorize: true,
      },
    },
    digest: {
      enabled: true,
      formats: {
        short: true,
        medium: true,
        full: true,
      },
      maxArticlesPerDigest: 10,
      includeImages: true,
      includeLinks: true,
    },
    delivery: {
      channels: {},
      defaultChannels: [],
      schedule: {
        morning: true,
        afternoon: false,
        evening: true,
      },
    },
  },

  marketplace: {
    enabled: true,
    registries: {
      mcp: {
        enabled: true,
        url: "https://registry.modelcontextprotocol.io",
        cacheDuration: 60,
      },
      skills: {
        enabled: true,
        url: "https://skills.sh",
        cacheDuration: 60,
      },
    },
    security: {
      validatePackages: true,
      sandboxInstall: true,
      allowedHosts: ["github.com", "registry.npmjs.org"],
    },
  },

  database: {
    type: "sqlite",
    database: "./data/openclaw.db",
  },

  cache: {
    type: "memory",
    ttl: 3600,
  },

  search: {
    enabled: false,
    type: "memory",
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    encryptionKey: process.env.ENCRYPTION_KEY || "dev-key-change-in-production",
    allowedOrigins: ["http://localhost:3000", "http://localhost:5173"],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
  },
};

// Environment-specific overrides
const environmentConfigs: Record<DeploymentType, Partial<AppConfig>> = {
  localhost: {
    database: {
      type: "sqlite",
      database: "./data/openclaw.db",
    },
    cache: {
      type: "memory",
      ttl: 3600,
    },
  },

  "self-hosted": {
    database: {
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "openclaw",
      username: process.env.DB_USER || "openclaw",
      password: process.env.DB_PASSWORD || "",
      poolSize: 10,
    },
    cache: {
      type: "redis",
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      ttl: 3600,
    },
    search: {
      enabled: true,
      type: "elasticsearch",
      host: process.env.ES_HOST || "localhost",
      port: parseInt(process.env.ES_PORT || "9200"),
    },
  },

  cloud: {
    database: {
      type: "postgres",
      host: process.env.DB_HOST || "",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "openclaw",
      username: process.env.DB_USER || "",
      password: process.env.DB_PASSWORD || "",
      ssl: true,
      poolSize: 20,
    },
    cache: {
      type: "redis",
      host: process.env.REDIS_HOST || "",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || "",
      ttl: 3600,
    },
    search: {
      enabled: true,
      type: "elasticsearch",
      host: process.env.ES_HOST || "",
      port: parseInt(process.env.ES_PORT || "9200"),
    },
  },
};

class ConfigManager {
  private config: AppConfig;
  private configPath: string;

  constructor() {
    this.configPath = this.resolveConfigPath();
    this.config = this.loadConfig();
  }

  private resolveConfigPath(): string {
    // Check for config file in multiple locations
    const paths = [
      process.env.OPENCLAW_CONFIG,
      "./config/openclaw.json",
      "./openclaw.json",
      "/etc/openclaw/config.json",
    ].filter(Boolean) as string[];

    for (const path of paths) {
      if (existsSync(path)) {
        return resolve(path);
      }
    }

    return "";
  }

  private loadConfig(): AppConfig {
    let customConfig: Partial<AppConfig> = {};

    // Load from file if exists
    if (this.configPath && existsSync(this.configPath)) {
      try {
        const fileContent = readFileSync(this.configPath, "utf-8");
        customConfig = JSON.parse(fileContent);
      } catch (error) {
        console.warn(`Failed to load config from ${this.configPath}:`, error);
      }
    }

    // Override with environment variables
    const envConfig = this.loadFromEnvironment();

    // Determine deployment type
    const deployment =
      (process.env.DEPLOYMENT as DeploymentType) || customConfig.deployment || "localhost";

    // Merge configurations
    const merged = this.deepMerge(
      defaultConfig,
      environmentConfigs[deployment] || {},
      customConfig,
      envConfig,
    );

    return merged as AppConfig;
  }

  private loadFromEnvironment(): Partial<AppConfig> {
    const config: Partial<AppConfig> = {};

    if (process.env.PORT) {
      config.port = parseInt(process.env.PORT);
    }
    if (process.env.HOST) {
      config.host = process.env.HOST;
    }
    if (process.env.NODE_ENV) {
      config.environment = process.env.NODE_ENV as Environment;
    }
    if (process.env.DEPLOYMENT) {
      config.deployment = process.env.DEPLOYMENT as DeploymentType;
    }
    if (process.env.LOG_LEVEL) {
      config.logLevel = process.env.LOG_LEVEL as AppConfig["logLevel"];
    }

    return config;
  }

  private deepMerge(...objects: any[]): any {
    const result: any = {};

    for (const obj of objects) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
            result[key] = this.deepMerge(result[key] || {}, obj[key]);
          } else {
            result[key] = obj[key];
          }
        }
      }
    }

    return result;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getIntelligenceConfig(): IntelligenceConfig {
    return this.config.intelligence;
  }

  getMarketplaceConfig(): MarketplaceConfig {
    return this.config.marketplace;
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = this.deepMerge(this.config, updates);
    // In production, persist to file or database
  }
}

// Singleton instance
export const configManager = new ConfigManager();
export const getConfig = () => configManager.getConfig();
