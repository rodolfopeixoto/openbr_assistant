/**
 * News Gateway Handlers
 * RPC methods for news aggregation
 */

import type { NewsItem } from "../../services/news-aggregator.js";
import type { GatewayRequestHandlers } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import {
  initializeNewsAggregator,
  getNewsItems,
  getNewsSources,
  getNewsItem,
  refreshNews,
  getLastFetchTime,
} from "../../services/news/aggregator.js";
import { TwitterCrawler } from "../../services/news/crawler/twitter-crawler.js";
import { AIClassifier } from "../../services/news/processor/ai-classifier.js";
import { RelevanceScorer } from "../../services/news/processor/relevance-scorer.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

const log = createSubsystemLogger("gateway:news");

// v2 Components
let aggregator: NewsAggregator | null = null;
let twitterCrawler: TwitterCrawler | null = null;
let relevanceScorer: RelevanceScorer | null = null;
let aiClassifier: AIClassifier | null = null;
let twitterConfig: { apiKey: string; apiSecret: string; bearerToken: string } | null = null;

// Initialize on module load
let initialized = false;

function ensureInitialized(): void {
  if (!initialized) {
    initializeNewsAggregator();
    initialized = true;
  }
}

export const newsHandlers: GatewayRequestHandlers = {
  "news.list": ({ params, respond }) => {
    ensureInitialized();

    try {
      const typedParams = params as {
        source?: string;
        category?: string;
        search?: string;
        limit?: number;
        offset?: number;
      };
      const { items, total } = getNewsItems({
        source: typedParams?.source,
        category: typedParams?.category,
        search: typedParams?.search,
        limit: typedParams?.limit,
        offset: typedParams?.offset,
      });

      respond(true, {
        items,
        total,
        hasMore: items.length + (typedParams?.offset || 0) < total,
        lastFetchTime: getLastFetchTime()?.toISOString(),
      });
    } catch (err) {
      log.error("Failed to list news", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to list news: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "news.sources": ({ respond }) => {
    ensureInitialized();

    try {
      const sources = getNewsSources();
      respond(true, { sources });
    } catch (err) {
      log.error("Failed to get news sources", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get sources: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "news.get": ({ params, respond }) => {
    ensureInitialized();

    try {
      const itemId = (params as { id?: string } | undefined)?.id;

      if (!itemId) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "News item ID is required"),
        );
        return;
      }

      const item = getNewsItem(itemId);

      if (!item) {
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "News item not found"));
        return;
      }

      respond(true, { item });
    } catch (err) {
      log.error("Failed to get news item", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get item: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "news.refresh": async ({ respond }) => {
    ensureInitialized();

    try {
      const result = await refreshNews();

      respond(true, {
        added: result.added,
        errors: result.errors,
        lastFetchTime: getLastFetchTime()?.toISOString(),
      });
    } catch (err) {
      log.error("Failed to refresh news", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to refresh: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "news.stats": ({ respond }) => {
    ensureInitialized();

    try {
      const { items, total } = getNewsItems({ limit: 10000 });
      const sources = getNewsSources();

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayItems = items.filter((item) => new Date(item.publishedAt) >= today);

      const bySource: Record<string, number> = {};
      for (const item of items) {
        bySource[item.source] = (bySource[item.source] || 0) + 1;
      }

      const bySentiment = {
        positive: items.filter((i) => i.sentiment === "positive").length,
        negative: items.filter((i) => i.sentiment === "negative").length,
        neutral: items.filter((i) => i.sentiment === "neutral").length,
      };

      respond(true, {
        total,
        today: todayItems.length,
        sources: sources.length,
        bySource,
        bySentiment,
        lastFetchTime: getLastFetchTime()?.toISOString(),
      });
    } catch (err) {
      log.error("Failed to get news stats", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get stats: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // v2: Twitter/X Integration
  "news.twitter.configure": async ({ params, respond }) => {
    try {
      const { apiKey, apiSecret, bearerToken } = params as {
        apiKey: string;
        apiSecret: string;
        bearerToken: string;
      };

      if (!apiKey || !apiSecret || !bearerToken) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "apiKey, apiSecret, and bearerToken are required"),
        );
        return;
      }

      twitterConfig = { apiKey, apiSecret, bearerToken };
      twitterCrawler = new TwitterCrawler(twitterConfig);
      const rateLimit = await twitterCrawler.checkRateLimit();

      respond(true, {
        ok: true,
        rateLimit,
      });
    } catch (err) {
      log.error("Failed to configure Twitter", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to configure Twitter: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // v2: Fetch from Twitter account
  "news.twitter.fetch": async ({ params, respond }) => {
    try {
      if (!twitterCrawler) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.UNAVAILABLE,
            "Twitter not configured. Call news.twitter.configure first.",
          ),
        );
        return;
      }

      const {
        account,
        limit = 10,
        minEngagement = 0,
      } = params as {
        account: string;
        limit?: number;
        minEngagement?: number;
      };

      if (!account) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "account is required"));
        return;
      }

      const tweets = await twitterCrawler.fetchAccount(account, { limit, minEngagement });

      respond(true, {
        items: tweets,
        count: tweets.length,
        account,
      });
    } catch (err) {
      log.error("Failed to fetch Twitter account", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to fetch: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // v2: Search news with relevance scoring
  "news.search": async ({ params, respond }) => {
    try {
      ensureInitialized();

      const {
        query,
        limit = 20,
        minRelevance = 0,
      } = params as {
        query: string;
        limit?: number;
        minRelevance?: number;
      };

      if (!query) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "query is required"));
        return;
      }

      if (!relevanceScorer) {
        relevanceScorer = new RelevanceScorer();
      }

      const { items } = getNewsItems({ limit: limit * 2 });

      // Score and filter
      const scoredItems = items.map((item) => ({
        ...item,
        relevanceScore: relevanceScorer!.calculate(item),
      }));

      const queryLower = query.toLowerCase();
      const filteredItems = scoredItems.filter(
        (item) =>
          item.title.toLowerCase().includes(queryLower) ||
          item.summary.toLowerCase().includes(queryLower),
      );

      if (minRelevance > 0) {
        filteredItems.filter((item) => item.relevanceScore >= minRelevance);
      }

      // Sort by relevance
      filteredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

      respond(true, {
        items: filteredItems.slice(0, limit),
        total: filteredItems.length,
        query,
      });
    } catch (err) {
      log.error("Failed to search news", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to search: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // v2: Classify content
  "news.classify": async ({ params, respond }) => {
    try {
      const { text } = params as { text: string };

      if (!text) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "text is required"));
        return;
      }

      if (!aiClassifier) {
        aiClassifier = new AIClassifier();
      }

      const category = await aiClassifier.classify(text);
      const result = await aiClassifier.classifyWithConfidence(text);

      respond(true, {
        text,
        category,
        confidence: result?.confidence || 0,
        allCategories: ["llm", "vision", "robotics", "research", "security", "business"],
      });
    } catch (err) {
      log.error("Failed to classify", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to classify: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};
