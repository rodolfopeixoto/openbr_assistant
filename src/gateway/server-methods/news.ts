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

  "news.analyze": ({ params, respond }) => {
    ensureInitialized();

    try {
      const typedParams = params as {
        type: string;
        query?: string;
        itemCount?: number;
        filters?: Record<string, unknown>;
      };

      const { items } = getNewsItems({ limit: 50 });
      const analysis = generateNewsAnalysis(items, typedParams.type, typedParams.query);

      respond(true, { analysis });
    } catch (err) {
      log.error("Failed to analyze news", { error: String(err) });
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to analyze: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};

function generateNewsAnalysis(items: unknown[], type: string, customQuery?: string): string {
  if (items.length === 0) {
    return "No news items available for analysis.";
  }

  const newsItems = items as Array<{
    title: string;
    source: string;
    summary?: string;
    sentiment?: string;
    publishedAt: string;
    categories?: string[];
  }>;

  switch (type) {
    case "summary":
      return generateSummaryAnalysis(newsItems);
    case "trends":
      return generateTrendsAnalysis(newsItems);
    case "key-insights":
      return generateKeyInsightsAnalysis(newsItems);
    case "roadmap":
      return generateRoadmapAnalysis(newsItems);
    case "custom":
      return generateCustomAnalysis(newsItems, customQuery || "");
    default:
      return generateSummaryAnalysis(newsItems);
  }
}

function generateSummaryAnalysis(
  items: Array<{ title: string; source: string; summary?: string; sentiment?: string }>,
): string {
  const total = items.length;
  const sources = [...new Set(items.map((i) => i.source))];
  const positive = items.filter((i) => i.sentiment === "positive").length;
  const negative = items.filter((i) => i.sentiment === "negative").length;
  const neutral = items.filter((i) => i.sentiment === "neutral" || !i.sentiment).length;

  let analysis = `## News Summary\n\n`;
  analysis += `**Total Articles:** ${total}\n`;
  analysis += `**Sources:** ${sources.length} (${sources.join(", ")})\n`;
  analysis += `**Sentiment:** ${positive} positive, ${negative} negative, ${neutral} neutral\n\n`;

  analysis += `### Top Stories\n\n`;
  items.slice(0, 5).forEach((item, index) => {
    const emoji =
      item.sentiment === "positive" ? "🟢" : item.sentiment === "negative" ? "🔴" : "⚪";
    analysis += `${index + 1}. ${emoji} **${item.title}**\n   Source: ${item.source}\n\n`;
  });

  return analysis;
}

function generateTrendsAnalysis(
  items: Array<{ title: string; categories?: string[]; source: string }>,
): string {
  const categoryCount: Record<string, number> = {};
  const sourceCount: Record<string, number> = {};

  items.forEach((item) => {
    item.categories?.forEach((cat) => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    sourceCount[item.source] = (sourceCount[item.source] || 0) + 1;
  });

  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let analysis = `## Trending Topics\n\n`;
  analysis += `### Top Categories\n\n`;
  topCategories.forEach(([cat, count]) => {
    analysis += `- **${cat}**: ${count} articles\n`;
  });

  analysis += `\n### Most Active Sources\n\n`;
  Object.entries(sourceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([source, count]) => {
      analysis += `- **${source}**: ${count} articles\n`;
    });

  return analysis;
}

function generateKeyInsightsAnalysis(
  items: Array<{ title: string; summary?: string; sentiment?: string; source: string }>,
): string {
  const positive = items.filter((i) => i.sentiment === "positive");
  const negative = items.filter((i) => i.sentiment === "negative");

  let analysis = `## Key Insights\n\n`;

  analysis += `### Positive Developments (${positive.length})\n\n`;
  positive.slice(0, 3).forEach((item) => {
    analysis += `- **${item.title}**\n  ${item.summary || "No summary available"}\n\n`;
  });

  analysis += `### Areas of Concern (${negative.length})\n\n`;
  negative.slice(0, 3).forEach((item) => {
    analysis += `- **${item.title}**\n  ${item.summary || "No summary available"}\n\n`;
  });

  return analysis;
}

function generateRoadmapAnalysis(
  items: Array<{ title: string; categories?: string[]; source: string }>,
): string {
  let analysis = `## Strategic Roadmap Based on News\n\n`;

  analysis += `### Technology Trends to Watch\n\n`;
  analysis += `Based on the latest news from ${items.length} articles:\n\n`;

  const categories = [...new Set(items.flatMap((i) => i.categories || []))];
  categories.slice(0, 5).forEach((cat) => {
    const catItems = items.filter((i) => i.categories?.includes(cat));
    analysis += `#### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
    analysis += `- ${catItems.length} recent developments\n`;
    analysis += `- Key players: ${[...new Set(catItems.map((i) => i.source))].slice(0, 3).join(", ")}\n\n`;
  });

  analysis += `### Recommended Actions\n\n`;
  analysis += `1. Monitor developments in ${categories.slice(0, 3).join(", ")}\n`;
  analysis += `2. Follow updates from leading sources\n`;
  analysis += `3. Stay informed on sentiment shifts\n`;

  return analysis;
}

function generateCustomAnalysis(
  items: Array<{ title: string; summary?: string; source: string; categories?: string[] }>,
  query: string,
): string {
  const queryLower = query.toLowerCase();

  // Filter relevant items based on query
  const relevant = items.filter(
    (item) =>
      item.title.toLowerCase().includes(queryLower) ||
      item.summary?.toLowerCase().includes(queryLower) ||
      item.categories?.some((c) => c.toLowerCase().includes(queryLower)),
  );

  if (relevant.length === 0) {
    return `## Analysis for: "${query}"\n\nNo articles found matching your query. Try different keywords or broader terms.`;
  }

  let analysis = `## Analysis for: "${query}"\n\n`;
  analysis += `**Found ${relevant.length} relevant articles**\n\n`;

  analysis += `### Key Findings\n\n`;
  relevant.slice(0, 5).forEach((item, index) => {
    analysis += `${index + 1}. **${item.title}**\n`;
    analysis += `   Source: ${item.source}\n`;
    if (item.summary) {
      analysis += `   ${item.summary.substring(0, 150)}...\n`;
    }
    analysis += `\n`;
  });

  return analysis;
}
