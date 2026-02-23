/**
 * News Aggregator Service
 *
 * Aggregates news from multiple sources with database persistence
 */

import { randomUUID } from "node:crypto";
import type {
  NewsItem,
  NewsSource,
  ListNewsParams,
  FetchResult,
  RSSTestResult,
} from "../gateway/server-methods/news.types.js";
import type { DatabaseAdapter, DatabaseConfig } from "./database/adapter.js";
import { createDatabaseAdapter } from "./database/adapter.js";

// Singleton instance
let instance: NewsAggregator | null = null;

export class NewsAggregator {
  private db: DatabaseAdapter | null = null;
  private initialized = false;
  private dbConfig: DatabaseConfig;

  static async getInstance(): Promise<NewsAggregator> {
    if (!instance) {
      instance = new NewsAggregator();
      await instance.initialize();
    }
    return instance;
  }

  constructor() {
    // Default to SQLite
    this.dbConfig = {
      type: "sqlite",
      sqlite: {
        path: "./data/news.db",
      },
    };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create database adapter
    this.db = await createDatabaseAdapter(this.dbConfig);
    await this.db.connect();

    // Initialize with default sources if empty
    const existingSources = await this.db.getSources();
    if (existingSources.length === 0) {
      await this.seedDefaultSources();
    }

    this.initialized = true;
  }

  async configureDatabase(config: DatabaseConfig): Promise<void> {
    // Disconnect current database
    if (this.db) {
      await this.db.disconnect();
    }

    // Create new adapter
    this.dbConfig = config;
    this.db = await createDatabaseAdapter(config);
    await this.db.connect();

    // Initialize schema
    await this.db.initializeSchema();

    // Seed default sources if empty
    const existingSources = await this.db.getSources();
    if (existingSources.length === 0) {
      await this.seedDefaultSources();
    }
  }

  getDatabaseConfig(): DatabaseConfig {
    return this.dbConfig;
  }

  private async seedDefaultSources(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const defaultSources: NewsSource[] = [
      {
        id: randomUUID(),
        name: "Hacker News",
        type: "hackernews",
        url: "https://news.ycombinator.com",
        enabled: true,
        itemCount: 0,
        categories: ["tech", "startup"],
      },
      {
        id: randomUUID(),
        name: "Dev.to",
        type: "devto",
        url: "https://dev.to",
        enabled: true,
        itemCount: 0,
        categories: ["tech", "programming"],
      },
    ];

    for (const source of defaultSources) {
      await this.db.createSource(source);
    }
  }

  async getNewsItems(filters: ListNewsParams): Promise<NewsItem[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await this.db.getNewsItems(filters, limit, offset);
    return result.items;
  }

  async getSources(): Promise<NewsSource[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const sources = await this.db.getSources();

    // Add item counts
    for (const source of sources) {
      source.itemCount = await this.db.getSourceItemCount(source.id);
    }

    return sources;
  }

  async addSource(source: NewsSource): Promise<NewsSource> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    await this.db.createSource(source);
    return source;
  }

  async removeSource(sourceId: string): Promise<number> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    // Delete associated news items
    await this.db.deleteNewsItemsBySource(sourceId);

    // Delete source
    await this.db.deleteSource(sourceId);

    return 1;
  }

  async fetchAll(): Promise<FetchResult> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const result: FetchResult = {
      added: 0,
      updated: 0,
      errors: [],
    };

    const sources = await this.db.getSources();

    for (const source of sources) {
      if (!source.enabled) {
        continue;
      }

      try {
        switch (source.type) {
          case "hackernews":
            await this.fetchHackerNews(source);
            break;
          case "devto":
            await this.fetchDevTo(source);
            break;
          case "rss":
            await this.fetchRSS(source);
            break;
        }
        result.added += 1;

        // Update last fetched timestamp
        await this.db.updateSource(source.id, {
          lastFetchedAt: new Date().toISOString(),
        });
      } catch (err) {
        result.errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return result;
  }

  private async fetchHackerNews(_source: NewsSource): Promise<void> {
    // TODO: Implement Hacker News API integration
    // https://github.com/HackerNews/API
    console.log("Fetching from Hacker News...");
  }

  private async fetchDevTo(_source: NewsSource): Promise<void> {
    // TODO: Implement Dev.to API integration
    // https://developers.forem.com/api/v1
    console.log("Fetching from Dev.to...");
  }

  private async fetchRSS(_source: NewsSource): Promise<void> {
    // TODO: Implement RSS parsing
    console.log("Fetching from RSS...");
  }

  async testRSS(url: string): Promise<RSSTestResult> {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("xml") && !contentType?.includes("rss")) {
        // Still might be valid, try to fetch content
        const contentResponse = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const content = await contentResponse.text();

        if (content.includes("<rss") || content.includes("<feed")) {
          return { valid: true, title: "RSS Feed" };
        }

        return {
          valid: false,
          error: "Does not appear to be a valid RSS/Atom feed",
        };
      }

      return { valid: true, title: "RSS Feed" };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : "Failed to fetch URL",
      };
    }
  }
}
