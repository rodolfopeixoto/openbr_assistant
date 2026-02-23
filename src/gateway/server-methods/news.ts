/**
 * News system gateway handlers
 *
 * Provides RPC endpoints for:
 * - news.list: List aggregated news with filters
 * - news.sources: Get configured news sources
 * - news.refresh: Force refresh from all sources
 * - news.source.add: Add RSS feed
 * - news.source.remove: Remove source
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NewsItem, NewsSource } from "./news.types.js";
import type { GatewayRequestHandlers } from "./types.js";
import { NewsAggregator } from "../../services/news-aggregator.js";

// Validation schemas
const ListNewsSchema = z.object({
  source: z.string().optional(),
  category: z.string().optional(),
  timeRange: z.enum(["all", "today", "week", "month"]).optional().default("all"),
  search: z.string().optional(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  limit: z.number().int().min(1).max(1000).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

const AddSourceSchema = z.object({
  name: z.string().min(1),
  type: z.literal("rss"),
  url: z.string().url(),
  categories: z.array(z.string()).optional(),
});

const RemoveSourceSchema = z.object({
  sourceId: z.string().uuid(),
});

export const newsHandlers: GatewayRequestHandlers = {
  "news.list": async ({ params, respond }) => {
    try {
      const parsed = ListNewsSchema.safeParse(params);
      if (!parsed.success) {
        respond(false, undefined, {
          code: "-32602",
          message: `invalid parameters: ${parsed.error.message}`,
        });
        return;
      }

      const filters = parsed.data;
      const aggregator = await NewsAggregator.getInstance();

      // Get news items from storage
      let items = await aggregator.getNewsItems(filters);

      // Calculate total before pagination
      const total = items.length;

      // Apply pagination
      items = items.slice(filters.offset, filters.offset + filters.limit);

      respond(true, {
        items: items.map(serializeNewsItem),
        total,
        hasMore: filters.offset + items.length < total,
        offset: filters.offset,
        limit: filters.limit,
      });
    } catch (err) {
      respond(false, undefined, {
        code: "-32603",
        message: `failed to list news: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },

  "news.sources": async ({ respond }) => {
    try {
      const aggregator = await NewsAggregator.getInstance();
      const sources = await aggregator.getSources();

      respond(true, {
        sources: sources.map(serializeSource),
      });
    } catch (err) {
      respond(false, undefined, {
        code: "-32603",
        message: `failed to get sources: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },

  "news.refresh": async ({ respond }) => {
    try {
      const aggregator = await NewsAggregator.getInstance();

      // Start refresh
      const result = await aggregator.fetchAll();

      respond(true, {
        added: result.added,
        updated: result.updated,
        errors: result.errors,
      });
    } catch (err) {
      respond(false, undefined, {
        code: "-32603",
        message: `failed to refresh news: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },

  "news.source.add": async ({ params, respond }) => {
    try {
      const parsed = AddSourceSchema.safeParse(params);
      if (!parsed.success) {
        respond(false, undefined, {
          code: "-32602",
          message: `invalid parameters: ${parsed.error.message}`,
        });
        return;
      }

      const sourceData = parsed.data;
      const aggregator = await NewsAggregator.getInstance();

      // Test if RSS is valid
      const testResult = await aggregator.testRSS(sourceData.url);
      if (!testResult.valid) {
        respond(false, undefined, {
          code: "-32602",
          message: `invalid RSS feed: ${testResult.error}`,
        });
        return;
      }

      // Add source
      const source = await aggregator.addSource({
        id: randomUUID(),
        name: sourceData.name,
        type: sourceData.type,
        url: sourceData.url,
        enabled: true,
        categories: sourceData.categories || [],
        itemCount: 0,
      });

      respond(true, { source: serializeSource(source) });
    } catch (err) {
      respond(false, undefined, {
        code: "-32603",
        message: `failed to add source: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },

  "news.source.remove": async ({ params, respond }) => {
    try {
      const parsed = RemoveSourceSchema.safeParse(params);
      if (!parsed.success) {
        respond(false, undefined, {
          code: "-32602",
          message: `invalid parameters: ${parsed.error.message}`,
        });
        return;
      }

      const { sourceId } = parsed.data;
      const aggregator = await NewsAggregator.getInstance();

      const removed = await aggregator.removeSource(sourceId);

      respond(true, { removed });
    } catch (err) {
      respond(false, undefined, {
        code: "-32603",
        message: `failed to remove source: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },

  "news.source.test": async ({ params, respond }) => {
    try {
      const urlSchema = z.object({ url: z.string().url() });
      const parsed = urlSchema.safeParse(params);

      if (!parsed.success) {
        respond(false, undefined, {
          code: "-32602",
          message: `invalid URL: ${parsed.error.message}`,
        });
        return;
      }

      const aggregator = await NewsAggregator.getInstance();
      const result = await aggregator.testRSS(parsed.data.url);

      respond(true, result);
    } catch (err) {
      respond(false, undefined, {
        code: "-32603",
        message: `failed to test source: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },
};

// Serialization helpers
function serializeNewsItem(item: NewsItem) {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    summary: item.summary,
    content: item.content,
    source: item.source,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    categories: item.categories,
    sentiment: item.sentiment,
    publishedAt: item.publishedAt,
    fetchedAt: item.fetchedAt,
    imageUrl: item.imageUrl,
    author: item.author,
    engagement: item.engagement,
  };
}

function serializeSource(source: NewsSource) {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    url: source.url,
    enabled: source.enabled,
    lastFetchedAt: source.lastFetchedAt,
    itemCount: source.itemCount,
    categories: source.categories,
  };
}
