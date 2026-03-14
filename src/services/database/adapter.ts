/**
 * Database Adapter Interface
 *
 * Abstract interface for different database implementations.
 * Supports: SQLite (default), PostgreSQL, MySQL
 * Configurable via UI
 */

import type { NewsItem, NewsSource } from "../../gateway/server-methods/news.types.js";

export interface DatabaseConfig {
  type: "sqlite" | "postgresql" | "mysql";
  sqlite?: {
    path: string;
  };
  postgresql?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
  mysql?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
}

export interface NewsFilters {
  source?: string;
  category?: string;
  timeRange?: "all" | "today" | "week" | "month";
  search?: string;
  sentiment?: "positive" | "negative" | "neutral";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface DatabaseAdapter {
  readonly type: string;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Schema
  initializeSchema(): Promise<void>;

  // News Items
  createNewsItem(item: NewsItem): Promise<void>;
  getNewsItems(
    filters: NewsFilters,
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<NewsItem>>;
  updateNewsItem(id: string, updates: Partial<NewsItem>): Promise<void>;
  deleteNewsItem(id: string): Promise<void>;
  deleteNewsItemsBySource(sourceId: string): Promise<number>;
  getNewsItemByUrl(url: string): Promise<NewsItem | null>;

  // Sources
  createSource(source: NewsSource): Promise<void>;
  getSources(): Promise<NewsSource[]>;
  updateSource(id: string, updates: Partial<NewsSource>): Promise<void>;
  deleteSource(id: string): Promise<void>;

  // Stats
  getSourceItemCount(sourceId: string): Promise<number>;
  getTotalItemCount(): Promise<number>;

  // Maintenance
  cleanupOldItems(retentionDays: number): Promise<number>;
  vacuum?(): Promise<void>; // Optional, mainly for SQLite
}

// Factory function to create appropriate adapter
export async function createDatabaseAdapter(config: DatabaseConfig): Promise<DatabaseAdapter> {
  switch (config.type) {
    case "sqlite": {
      const { SQLiteAdapter } = await import("./adapters/sqlite.js");
      return new SQLiteAdapter(config.sqlite?.path || "./data/news.db");
    }

    case "postgresql": {
      const { PostgreSQLAdapter } = await import("./adapters/postgresql.js");
      if (!config.postgresql) {
        throw new Error("PostgreSQL configuration required");
      }
      // Stub adapters don't take config parameters
      return new PostgreSQLAdapter();
    }

    case "mysql": {
      const { MySQLAdapter } = await import("./adapters/mysql.js");
      if (!config.mysql) {
        throw new Error("MySQL configuration required");
      }
      // Stub adapters don't take config parameters
      return new MySQLAdapter();
    }

    default: {
      const _exhaustiveCheck: never = config.type;
      throw new Error(`Unsupported database type: ${String(_exhaustiveCheck)}`);
    }
  }
}

// Test connection without creating full adapter
export async function testDatabaseConnection(
  config: DatabaseConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adapter = await createDatabaseAdapter(config);
    await adapter.connect();
    await adapter.disconnect();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
