/**
 * News Commands Handler
 * Provides /news command for Telegram and other channels
 */

import type { CommandHandler } from "./commands-types.js";
import {
  getNewsItems,
  getNewsSources,
  type NewsItem,
  type NewsSource,
} from "../../services/news/aggregator.js";

export const handleNewsCommand: CommandHandler = async (params) => {
  const { command } = params;
  const cmd = command.commandBodyNormalized;

  // Check if this is a news command
  if (!cmd.startsWith("/news")) {
    return { shouldContinue: true };
  }

  const args = cmd.replace("/news", "").trim().toLowerCase();

  // Get recent news (last 48h by default)
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  let items = getNewsItems({ limit: 20 }).items;

  // Filter based on arguments
  if (args === "48h" || args === "" || args === "latest") {
    // Last 48 hours (default)
    items = items.filter((item) => new Date(item.publishedAt) >= twoDaysAgo);
  } else if (args === "today") {
    const today = new Date();
    items = items.filter(
      (item) => new Date(item.publishedAt).toDateString() === today.toDateString(),
    );
  } else if (args === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    items = items.filter((item) => new Date(item.publishedAt) >= weekAgo);
  } else if (args === "important" || args === "top") {
    // Sort by engagement and filter for important news
    items = items
      .filter((item) => (item.engagement?.score ?? 0) > 50 || item.sentiment === "positive")
      .slice(0, 10);
  } else if (args === "sources" || args === "list") {
    // List all sources
    const sources = getNewsSources();
    const activeSources = sources.filter((s) => s.enabled);
    const sourceList = activeSources.map((s) => `• ${s.name}: ${s.itemCount} articles`).join("\n");

    return {
      shouldContinue: false,
      text: `📰 **News Sources (${activeSources.length})**\n\n${sourceList}`,
    };
  } else if (args.startsWith("about") || args.startsWith("search")) {
    // Search for specific topic
    const topic = args.replace("about", "").replace("search", "").trim();
    if (topic) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(topic) ||
          item.summary.toLowerCase().includes(topic) ||
          item.categories.some((c) => c.toLowerCase().includes(topic)),
      );
    }
  }

  if (items.length === 0) {
    return {
      shouldContinue: false,
      text: "📰 No news found for the specified criteria. Try `/news` for latest articles.",
    };
  }

  // Format news items
  const newsList = items
    .slice(0, 10)
    .map((item, i) => {
      const emoji =
        item.sentiment === "positive" ? "🟢" : item.sentiment === "negative" ? "🔴" : "⚪";
      const time = formatTimeAgo(item.publishedAt);
      return `${i + 1}. ${emoji} [${item.source}] ${item.title}\n   📅 ${time} | 🔗 ${item.url}`;
    })
    .join("\n\n");

  const totalItems = getNewsItems({ limit: 1000 }).items.length;
  const sources = getNewsSources().filter((s) => s.enabled).length;

  return {
    shouldContinue: false,
    text: `📰 **Latest News** (${items.length} of ${totalItems} from ${sources} sources)\n\n${newsList}\n\n💡 Use \`/news important\` for top stories, \`/news 48h\` for last 48 hours, or \`/news about [topic]\` to search.`,
  };
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
