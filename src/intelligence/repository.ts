/**
 * Database Operations for Intelligence System
 * Repository pattern for data access
 */

import type { Database } from "better-sqlite3";
import type { RawArticle, AnalyzedArticle } from "../intelligence/index.js";
import type { ScheduledDigest } from "./scheduler.js";

export interface ArticleRecord {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  source_id: string;
  source_name: string;
  published_at: string;
  category: string | null;
  tags: string; // JSON
  sentiment: "positive" | "neutral" | "negative" | null;
  relevance_score: number;
  status: "new" | "processed" | "analyzed" | "published" | "archived";
  created_at: string;
}

export interface InsightRecord {
  id: string;
  article_id: string;
  type: "trend" | "opportunity" | "risk" | "key_point";
  content: string;
  confidence: number;
  extracted_at: string;
}

export interface DigestRecord {
  id: string;
  user_id: string;
  type: "morning" | "afternoon" | "evening" | "custom";
  title: string;
  summary: string | null;
  articles: string; // JSON array of article IDs
  insights: string; // JSON array
  trends: string; // JSON array
  generated_at: string;
  sent_at: string | null;
  status: "draft" | "sent" | "failed";
  format: "short" | "medium" | "full";
}

export class IntelligenceRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Save raw articles from collector
   */
  async saveArticles(articles: RawArticle[]): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO articles (
        id, title, summary, content, url, source_id, source_name,
        published_at, category, tags, sentiment, relevance_score, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let saved = 0;

    for (const article of articles) {
      try {
        stmt.run(
          article.id,
          article.title,
          article.summary || null,
          article.content || null,
          article.url,
          article.sourceId,
          article.sourceName,
          article.publishedAt.toISOString(),
          article.category || null,
          JSON.stringify(article.metadata?.categories || []),
          null, // sentiment - will be set after analysis
          0, // relevance_score
          "new",
        );
        saved++;
      } catch (error) {
        console.error(`Failed to save article ${article.id}:`, error);
      }
    }

    return saved;
  }

  /**
   * Save analyzed article with insights
   */
  async saveAnalyzedArticle(article: AnalyzedArticle): Promise<void> {
    // Update article with analysis
    this.db
      .prepare(`
      UPDATE articles SET
        summary = ?,
        sentiment = ?,
        relevance_score = ?,
        status = 'analyzed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .run(
        article.analysis.summary,
        article.analysis.sentiment,
        this.calculateRelevanceScore(article),
        article.id,
      );

    // Save insights
    const insightStmt = this.db.prepare(`
      INSERT INTO insights (id, article_id, type, content, confidence)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const insight of article.analysis.insights) {
      insightStmt.run(insight.id, article.id, insight.type, insight.content, insight.confidence);
    }
  }

  /**
   * Get articles for digest generation
   */
  async getArticlesForDigest(since: Date, limit: number = 50): Promise<ArticleRecord[]> {
    return this.db
      .prepare(`
      SELECT * FROM articles
      WHERE published_at > ?
        AND status IN ('new', 'analyzed')
      ORDER BY relevance_score DESC, published_at DESC
      LIMIT ?
    `)
      .all(since.toISOString(), limit) as ArticleRecord[];
  }

  /**
   * Save digest
   */
  async saveDigest(digest: ScheduledDigest): Promise<void> {
    this.db
      .prepare(`
      INSERT INTO digests (
        id, user_id, type, title, summary, articles, insights, trends,
        generated_at, sent_at, status, format
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .run(
        digest.id,
        digest.userId,
        digest.type,
        digest.title,
        null, // summary - could be generated
        JSON.stringify(digest.articles.map((a) => a.id)),
        JSON.stringify(digest.keyInsights),
        JSON.stringify(digest.trends),
        digest.generatedAt.toISOString(),
        digest.deliveredAt?.toISOString() || null,
        digest.delivered ? "sent" : "draft",
        "full", // format
      );
  }

  /**
   * Get recent digests for user
   */
  async getRecentDigests(userId: string, limit: number = 10): Promise<DigestRecord[]> {
    return this.db
      .prepare(`
      SELECT * FROM digests
      WHERE user_id = ?
      ORDER BY generated_at DESC
      LIMIT ?
    `)
      .all(userId, limit) as DigestRecord[];
  }

  /**
   * Get digest by ID with full article details
   */
  async getDigestById(digestId: string): Promise<{
    digest: DigestRecord;
    articles: ArticleRecord[];
  } | null> {
    const digest = this.db
      .prepare(`
      SELECT * FROM digests WHERE id = ?
    `)
      .get(digestId) as DigestRecord | undefined;

    if (!digest) {
      return null;
    }

    const articleIds = JSON.parse(digest.articles) as string[];

    // Get full article details
    const articles: ArticleRecord[] = [];
    for (const id of articleIds) {
      const article = this.db
        .prepare(`
        SELECT * FROM articles WHERE id = ?
      `)
        .get(id) as ArticleRecord | undefined;

      if (article) {
        articles.push(article);
      }
    }

    return { digest, articles };
  }

  /**
   * Mark articles as published
   */
  async markArticlesAsPublished(articleIds: string[]): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE articles SET status = 'published'
      WHERE id = ?
    `);

    for (const id of articleIds) {
      stmt.run(id);
    }
  }

  /**
   * Get trending topics from recent articles
   */
  async getTrendingTopics(
    days: number = 7,
    limit: number = 20,
  ): Promise<Array<{ topic: string; count: number }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // This is a simplified query - in production would use proper analytics
    const articles = this.db
      .prepare(`
      SELECT category, tags FROM articles
      WHERE published_at > ?
    `)
      .all(since.toISOString()) as Array<{ category: string | null; tags: string }>;

    const topicCounts = new Map<string, number>();

    for (const article of articles) {
      if (article.category) {
        topicCounts.set(article.category, (topicCounts.get(article.category) || 0) + 1);
      }

      try {
        const tags = JSON.parse(article.tags) as string[];
        for (const tag of tags) {
          topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
        }
      } catch {
        // Ignore parse errors
      }
    }

    return Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .toSorted((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Search articles
   */
  async searchArticles(
    query: string,
    options?: {
      category?: string;
      since?: Date;
      limit?: number;
    },
  ): Promise<ArticleRecord[]> {
    let sql = `
      SELECT * FROM articles
      WHERE (title LIKE ? OR summary LIKE ?)
    `;
    const params: (string | number)[] = [`%${query}%`, `%${query}%`];

    if (options?.category) {
      sql += " AND category = ?";
      params.push(options.category);
    }

    if (options?.since) {
      sql += " AND published_at > ?";
      params.push(options.since.toISOString());
    }

    sql += " ORDER BY published_at DESC LIMIT ?";
    params.push(options?.limit || 20);

    return this.db.prepare(sql).all(...params) as ArticleRecord[];
  }

  /**
   * Get article statistics
   */
  async getStats(): Promise<{
    totalArticles: number;
    articlesToday: number;
    articlesThisWeek: number;
    digestsSent: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const totalArticles = this.db
      .prepare(`
      SELECT COUNT(*) as count FROM articles
    `)
      .get() as { count: number };

    const articlesToday = this.db
      .prepare(`
      SELECT COUNT(*) as count FROM articles
      WHERE DATE(published_at) = DATE('now')
    `)
      .get() as { count: number };

    const articlesThisWeek = this.db
      .prepare(`
      SELECT COUNT(*) as count FROM articles
      WHERE published_at > ?
    `)
      .get(weekAgo.toISOString()) as { count: number };

    const digestsSent = this.db
      .prepare(`
      SELECT COUNT(*) as count FROM digests
      WHERE status = 'sent'
    `)
      .get() as { count: number };

    return {
      totalArticles: totalArticles.count,
      articlesToday: articlesToday.count,
      articlesThisWeek: articlesThisWeek.count,
      digestsSent: digestsSent.count,
    };
  }

  /**
   * Clean up old articles
   */
  async cleanupOldArticles(daysToKeep: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const result = this.db
      .prepare(`
      DELETE FROM articles
      WHERE published_at < ?
        AND status = 'archived'
    `)
      .run(cutoff.toISOString());

    return result.changes;
  }

  /**
   * Calculate relevance score for article
   */
  private calculateRelevanceScore(article: AnalyzedArticle): number {
    let score = 0;

    // Base score from sentiment confidence
    if (article.analysis.sentiment !== "neutral") {
      score += 10;
    }

    // Score from number of insights
    score += article.analysis.insights.length * 5;

    // Score from key points
    score += article.analysis.keyPoints.length * 2;

    // Recency bonus (articles from last 24 hours)
    const hoursOld = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 24) {
      score += 20;
    } else if (hoursOld < 48) {
      score += 10;
    }

    return Math.min(score, 100);
  }
}

// Factory function for creating repository
export function createIntelligenceRepository(db: Database): IntelligenceRepository {
  return new IntelligenceRepository(db);
}
