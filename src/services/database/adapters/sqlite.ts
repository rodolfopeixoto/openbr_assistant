/**
 * SQLite Adapter Implementation
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { NewsItem, NewsSource } from "../../../gateway/server-methods/news.types.js";
import type { DatabaseAdapter, NewsFilters, PaginatedResult } from "../adapter.js";

export class SQLiteAdapter implements DatabaseAdapter {
  readonly type = "sqlite";
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async connect(): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");

    // Initialize schema
    await this.initializeSchema();
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  async initializeSchema(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    // News items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS news_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        summary TEXT,
        content TEXT,
        source TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL,
        categories TEXT, -- JSON array
        sentiment TEXT CHECK(sentiment IN ('positive', 'negative', 'neutral')),
        published_at DATETIME NOT NULL,
        fetched_at DATETIME NOT NULL,
        image_url TEXT,
        author TEXT,
        engagement_score INTEGER,
        engagement_comments INTEGER
      )
    `);

    // Full-text search index
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS news_fts USING fts5(
        title, summary, content,
        content='news_items',
        content_rowid='id'
      )
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_news_source ON news_items(source)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_at)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_news_sentiment ON news_items(sentiment)`);

    // Sources table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS news_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('hackernews', 'devto', 'rss')),
        url TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        last_fetched_at DATETIME,
        categories TEXT -- JSON array
      )
    `);

    // Triggers for FTS
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS news_items_ai AFTER INSERT ON news_items BEGIN
        INSERT INTO news_fts(rowid, title, summary, content)
        VALUES (new.id, new.title, new.summary, new.content);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS news_items_ad AFTER DELETE ON news_items BEGIN
        INSERT INTO news_fts(news_fts, rowid, title, summary, content)
        VALUES ('delete', old.id, old.title, old.summary, old.content);
      END
    `);
  }

  async createNewsItem(item: NewsItem): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO news_items (
        id, title, url, summary, content, source, source_name, source_url,
        categories, sentiment, published_at, fetched_at, image_url, author,
        engagement_score, engagement_comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.title,
      item.url,
      item.summary,
      item.content || null,
      item.source,
      item.sourceName,
      item.sourceUrl,
      JSON.stringify(item.categories),
      item.sentiment,
      item.publishedAt,
      item.fetchedAt,
      item.imageUrl || null,
      item.author || null,
      item.engagement?.score || null,
      item.engagement?.comments || null,
    );
  }

  async getNewsItems(
    filters: NewsFilters,
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<NewsItem>> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    let whereClause = "1=1";
    const params: any[] = [];

    if (filters.source) {
      whereClause += " AND source = ?";
      params.push(filters.source);
    }

    if (filters.sentiment) {
      whereClause += " AND sentiment = ?";
      params.push(filters.sentiment);
    }

    if (filters.timeRange && filters.timeRange !== "all") {
      const now = new Date();
      let cutoff: Date;

      switch (filters.timeRange) {
        case "today":
          cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }

      whereClause += " AND published_at >= ?";
      params.push(cutoff.toISOString());
    }

    // Get total count
    const countStmt = this.db.prepare(
      `SELECT COUNT(*) as total FROM news_items WHERE ${whereClause}`,
    );
    const { total } = countStmt.get(...params) as { total: number };

    // Get items with pagination
    const query = `
      SELECT * FROM news_items 
      WHERE ${whereClause} 
      ORDER BY published_at DESC 
      LIMIT ? OFFSET ?
    `;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params, limit, offset) as any[];

    const items = rows.map((row) => this.rowToNewsItem(row));

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async updateNewsItem(id: string, updates: Partial<NewsItem>): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const sets: string[] = [];
    const values: any[] = [];

    if (updates.title) {
      sets.push("title = ?");
      values.push(updates.title);
    }
    if (updates.summary) {
      sets.push("summary = ?");
      values.push(updates.summary);
    }
    if (updates.sentiment) {
      sets.push("sentiment = ?");
      values.push(updates.sentiment);
    }

    if (sets.length === 0) {
      return;
    }

    values.push(id);
    const stmt = this.db.prepare(`UPDATE news_items SET ${sets.join(", ")} WHERE id = ?`);
    stmt.run(...values);
  }

  async deleteNewsItem(id: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare("DELETE FROM news_items WHERE id = ?");
    stmt.run(id);
  }

  async deleteNewsItemsBySource(sourceId: string): Promise<number> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare("DELETE FROM news_items WHERE source = ?");
    const result = stmt.run(sourceId);
    return result.changes;
  }

  async getNewsItemByUrl(url: string): Promise<NewsItem | null> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare("SELECT * FROM news_items WHERE url = ?");
    const row = stmt.get(url) as any;

    if (!row) {
      return null;
    }

    return this.rowToNewsItem(row);
  }

  async createSource(source: NewsSource): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO news_sources (id, name, type, url, enabled, last_fetched_at, categories)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      source.id,
      source.name,
      source.type,
      source.url,
      source.enabled ? 1 : 0,
      source.lastFetchedAt || null,
      JSON.stringify(source.categories),
    );
  }

  async getSources(): Promise<NewsSource[]> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare("SELECT * FROM news_sources ORDER BY name");
    const rows = stmt.all() as any[];

    return rows.map((row) => this.rowToNewsSource(row));
  }

  async updateSource(id: string, updates: Partial<NewsSource>): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const sets: string[] = [];
    const values: any[] = [];

    if (updates.name) {
      sets.push("name = ?");
      values.push(updates.name);
    }
    if (updates.enabled !== undefined) {
      sets.push("enabled = ?");
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.lastFetchedAt) {
      sets.push("last_fetched_at = ?");
      values.push(updates.lastFetchedAt);
    }

    if (sets.length === 0) {
      return;
    }

    values.push(id);
    const stmt = this.db.prepare(`UPDATE news_sources SET ${sets.join(", ")} WHERE id = ?`);
    stmt.run(...values);
  }

  async deleteSource(id: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare("DELETE FROM news_sources WHERE id = ?");
    stmt.run(id);
  }

  async getSourceItemCount(sourceId: string): Promise<number> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM news_items WHERE source = ?");
    const { count } = stmt.get(sourceId) as { count: number };
    return count;
  }

  async getTotalItemCount(): Promise<number> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM news_items");
    const { count } = stmt.get() as { count: number };
    return count;
  }

  async cleanupOldItems(retentionDays: number): Promise<number> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const stmt = this.db.prepare("DELETE FROM news_items WHERE fetched_at < ?");
    const result = stmt.run(cutoff.toISOString());
    return result.changes;
  }

  async vacuum(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    this.db.exec("VACUUM");
  }

  private rowToNewsItem(row: any): NewsItem {
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      summary: row.summary,
      content: row.content,
      source: row.source,
      sourceName: row.source_name,
      sourceUrl: row.source_url,
      categories: JSON.parse(row.categories || "[]"),
      sentiment: row.sentiment,
      publishedAt: row.published_at,
      fetchedAt: row.fetched_at,
      imageUrl: row.image_url,
      author: row.author,
      engagement: row.engagement_score
        ? {
            score: row.engagement_score,
            comments: row.engagement_comments,
          }
        : undefined,
    };
  }

  private rowToNewsSource(row: any): NewsSource {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      enabled: Boolean(row.enabled),
      lastFetchedAt: row.last_fetched_at,
      itemCount: 0, // Calculated separately
      categories: JSON.parse(row.categories || "[]"),
    };
  }
}
