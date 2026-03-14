/**
 * News Collector Service
 * Fetches articles from RSS feeds and APIs
 */

import Parser from "rss-parser";
import { v4 as uuidv4 } from "uuid";
import type { NewsSourceConfig } from "../config/intelligence-config.js";
import { getConfig } from "../config/intelligence-config.js";

export interface RawArticle {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  sourceId: string;
  sourceName: string;
  publishedAt: Date;
  category?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface FetchResult {
  articles: RawArticle[];
  errors: Error[];
  fetchedAt: Date;
}

export interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  isoDate?: string;
  enclosure?: {
    url?: string;
  };
  categories?: string[];
}

export class NewsCollector {
  private rssParser: Parser;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    this.rssParser = new Parser({
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "OpenClaw-Intelligence/1.0",
      },
    });
  }

  /**
   * Fetch articles from all enabled sources
   */
  async fetchAll(): Promise<Map<string, FetchResult>> {
    const config = getConfig();
    const sources = config.intelligence.sources.filter((s) => s.enabled);

    const results = new Map<string, FetchResult>();

    // Fetch from all sources in parallel with concurrency limit
    const concurrency = config.intelligence.collector.concurrency;
    const batches = this.chunkArray(sources, concurrency);

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (source) => {
          try {
            const result = await this.fetchFromSource(source);
            return { sourceId: source.id, result };
          } catch (error) {
            return {
              sourceId: source.id,
              result: {
                articles: [],
                errors: [error as Error],
                fetchedAt: new Date(),
              },
            };
          }
        }),
      );

      for (const { sourceId, result } of batchResults) {
        results.set(sourceId, result);
      }
    }

    return results;
  }

  /**
   * Fetch articles from a specific source
   */
  async fetchFromSource(source: NewsSourceConfig): Promise<FetchResult> {
    const abortController = new AbortController();
    this.abortControllers.set(source.id, abortController);

    try {
      let articles: RawArticle[] = [];

      switch (source.type) {
        case "rss":
          articles = await this.fetchRSS(source, abortController.signal);
          break;
        case "api":
          articles = await this.fetchAPI(source, abortController.signal);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      // Apply filters
      articles = this.applyFilters(articles, source.filters);

      // Limit max articles
      articles = articles.slice(0, source.maxArticles);

      return {
        articles,
        errors: [],
        fetchedAt: new Date(),
      };
    } catch (error) {
      return {
        articles: [],
        errors: [error as Error],
        fetchedAt: new Date(),
      };
    } finally {
      this.abortControllers.delete(source.id);
    }
  }

  /**
   * Fetch from RSS feed
   */
  private async fetchRSS(source: NewsSourceConfig, _signal: AbortSignal): Promise<RawArticle[]> {
    const feed = await this.rssParser.parseURL(source.url);

    return (feed.items || [])
      .map((item: RSSItem) => this.normalizeRSSItem(item, source))
      .filter((article: RawArticle | null): article is RawArticle => article !== null);
  }

  /**
   * Fetch from API
   */
  private async fetchAPI(source: NewsSourceConfig, _signal: AbortSignal): Promise<RawArticle[]> {
    // Hacker News specific implementation
    if (source.url.includes("hacker-news")) {
      return this.fetchHackerNews(source, _signal);
    }

    // Generic API fetch
    const response = await fetch(source.url, {
      signal: _signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OpenClaw-Intelligence/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizeAPIData(data, source);
  }

  /**
   * Fetch from Hacker News API
   */
  private async fetchHackerNews(
    source: NewsSourceConfig,
    signal: AbortSignal,
  ): Promise<RawArticle[]> {
    // Get top stories IDs
    const topStoriesUrl = `${source.url}topstories.json`;
    const response = await fetch(topStoriesUrl, { signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch HN top stories: ${response.statusText}`);
    }

    const storyIds: number[] = await response.json();
    const topIds = storyIds.slice(0, source.maxArticles);

    // Fetch story details in parallel
    const stories = await Promise.all(
      topIds.map(async (id) => {
        try {
          const storyRes = await fetch(`${source.url}item/${id}.json`, {
            signal,
          });
          if (!storyRes.ok) {
            return null;
          }
          return await storyRes.json();
        } catch {
          return null;
        }
      }),
    );

    return stories
      .filter((story): story is Record<string, any> => story !== null && story.type === "story")
      .map((story) => ({
        id: uuidv4(),
        title: story.title || "Untitled",
        summary: story.text?.substring(0, 500),
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        sourceId: source.id,
        sourceName: source.name,
        publishedAt: new Date(story.time * 1000),
        category: source.category,
        metadata: {
          score: story.score,
          descendants: story.descendants,
          hnId: story.id,
        },
      }));
  }

  /**
   * Normalize RSS item to RawArticle
   */
  private normalizeRSSItem(item: RSSItem, source: NewsSourceConfig): RawArticle | null {
    if (!item.title || !item.link) {
      return null;
    }

    const publishedAt = item.isoDate
      ? new Date(item.isoDate)
      : item.pubDate
        ? new Date(item.pubDate)
        : new Date();

    return {
      id: uuidv4(),
      title: item.title,
      summary: item.contentSnippet || item.content?.substring(0, 500),
      content: item.content,
      url: item.link,
      sourceId: source.id,
      sourceName: source.name,
      publishedAt,
      category: source.category,
      imageUrl: item.enclosure?.url,
      metadata: {
        categories: item.categories,
      },
    };
  }

  /**
   * Normalize API data to RawArticle
   */
  private normalizeAPIData(data: any, source: NewsSourceConfig): RawArticle[] {
    // Generic normalization - override for specific APIs
    if (Array.isArray(data)) {
      return data
        .filter((item) => item.title && item.url)
        .map((item) => ({
          id: uuidv4(),
          title: item.title,
          summary: item.description || item.summary,
          content: item.content,
          url: item.url,
          sourceId: source.id,
          sourceName: source.name,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
          category: source.category,
          imageUrl: item.imageUrl || item.urlToImage,
          metadata: item,
        }));
    }

    return [];
  }

  /**
   * Apply filters to articles
   */
  private applyFilters(
    articles: RawArticle[],
    filters?: NewsSourceConfig["filters"],
  ): RawArticle[] {
    if (!filters) {
      return articles;
    }

    return articles.filter((article) => {
      // Keyword filter
      const keywords = filters.keywords;
      if (keywords && keywords.length > 0) {
        const text = `${article.title} ${article.summary || ""}`.toLowerCase();
        const hasKeyword = keywords.some((kw: string) => text.includes(kw.toLowerCase()));
        if (!hasKeyword) {
          return false;
        }
      }

      // Exclude keywords
      const excludeKeywords = filters.excludeKeywords;
      if (excludeKeywords && excludeKeywords.length > 0) {
        const text = `${article.title} ${article.summary || ""}`.toLowerCase();
        const hasExcluded = excludeKeywords.some((kw: string) => text.includes(kw.toLowerCase()));
        if (hasExcluded) {
          return false;
        }
      }

      // Min length filter
      if (filters.minLength) {
        const length = (article.content || article.summary || "").length;
        if (length < filters.minLength) {
          return false;
        }
      }

      // Max age filter
      if (filters.maxAge) {
        const age = Date.now() - article.publishedAt.getTime();
        const maxAgeMs = filters.maxAge * 60 * 60 * 1000;
        if (age > maxAgeMs) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Cancel all ongoing fetches
   */
  cancelAll(): void {
    for (const [id, controller] of this.abortControllers) {
      controller.abort();
      this.abortControllers.delete(id);
    }
  }

  /**
   * Helper: chunk array for batch processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Singleton instance
export const newsCollector = new NewsCollector();
