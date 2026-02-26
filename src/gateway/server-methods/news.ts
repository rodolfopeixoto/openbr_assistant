/**
 * News Gateway Handlers
 * RPC methods for news aggregation
 */

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
import { ErrorCodes, errorShape } from "../protocol/index.js";

const log = createSubsystemLogger("gateway:news");

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
};
