/**
 * News Aggregator Service
 * Fetches and aggregates news from multiple sources with AI summarization
 */

import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("news:aggregator");

// News item structure
export interface NewsItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  content?: string;
  source: string;
  sourceName: string;
  sourceUrl: string;
  categories: string[];
  sentiment: "positive" | "negative" | "neutral";
  publishedAt: string;
  fetchedAt: string;
  imageUrl?: string;
  author?: string;
  engagement?: {
    score: number;
    comments?: number;
  };
}

// News source configuration
export interface NewsSource {
  id: string;
  name: string;
  type: "rss" | "api" | "hackernews" | "reddit";
  url: string;
  enabled: boolean;
  lastFetchedAt?: string;
  itemCount: number;
  categories: string[];
  fetchInterval: number; // minutes
}

// Configuration for news sources
const NEWS_SOURCES: NewsSource[] = [
  {
    id: "hackernews",
    name: "Hacker News",
    type: "hackernews",
    url: "https://hacker-news.firebaseio.com/v0",
    enabled: true,
    itemCount: 0,
    categories: ["technology", "programming", "startups"],
    fetchInterval: 30,
  },
  {
    id: "devto",
    name: "Dev.to",
    type: "api",
    url: "https://dev.to/api/articles",
    enabled: true,
    itemCount: 0,
    categories: ["technology", "programming", "tutorials"],
    fetchInterval: 60,
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    type: "rss",
    url: "https://techcrunch.com/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["technology", "startups", "business"],
    fetchInterval: 60,
  },
  {
    id: "theverge",
    name: "The Verge",
    type: "rss",
    url: "https://www.theverge.com/rss/index.xml",
    enabled: true,
    itemCount: 0,
    categories: ["technology", "culture", "reviews"],
    fetchInterval: 60,
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    type: "rss",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    enabled: true,
    itemCount: 0,
    categories: ["technology", "science", "policy"],
    fetchInterval: 60,
  },
  {
    id: "reddit-tech",
    name: "Reddit r/technology",
    type: "reddit",
    url: "https://www.reddit.com/r/technology/hot.json",
    enabled: true,
    itemCount: 0,
    categories: ["technology", "news"],
    fetchInterval: 30,
  },
  {
    id: "reddit-programming",
    name: "Reddit r/programming",
    type: "reddit",
    url: "https://www.reddit.com/r/programming/hot.json",
    enabled: true,
    itemCount: 0,
    categories: ["programming", "technology"],
    fetchInterval: 30,
  },
  {
    id: "reddit-ai",
    name: "Reddit r/artificial",
    type: "reddit",
    url: "https://www.reddit.com/r/artificial/hot.json",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "technology"],
    fetchInterval: 60,
  },
];

// In-memory cache
let newsCache: NewsItem[] = [];
let lastFetchTime: Date | null = null;
let fetchInProgress = false;

/**
 * Initialize the news aggregator
 */
export function initializeNewsAggregator(): void {
  log.info("Initializing News Aggregator");

  // Initial fetch
  fetchAllNews().catch((err) => {
    log.error("Initial news fetch failed", { error: String(err) });
  });

  // Schedule periodic fetches
  setInterval(
    () => {
      fetchAllNews().catch((err) => {
        log.error("Scheduled news fetch failed", { error: String(err) });
      });
    },
    15 * 60 * 1000,
  ); // Every 15 minutes
}

/**
 * Fetch news from all enabled sources
 */
export async function fetchAllNews(): Promise<{ added: number; errors: string[] }> {
  if (fetchInProgress) {
    log.info("Fetch already in progress, skipping");
    return { added: 0, errors: [] };
  }

  fetchInProgress = true;
  const errors: string[] = [];
  let added = 0;

  try {
    log.info("Fetching news from all sources");

    const enabledSources = NEWS_SOURCES.filter((s) => s.enabled);

    for (const source of enabledSources) {
      try {
        const items = await fetchFromSource(source);

        // Add new items to cache
        for (const item of items) {
          if (!newsCache.find((cached) => cached.id === item.id)) {
            newsCache.push(item);
            added++;
          }
        }

        // Update source metadata
        source.lastFetchedAt = new Date().toISOString();
        source.itemCount = newsCache.filter((i) => i.source === source.id).length;

        log.info(`Fetched ${items.length} items from ${source.name}`);
      } catch (err) {
        const errorMsg = `Failed to fetch from ${source.name}: ${err}`;
        log.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Sort by published date (newest first)
    newsCache = newsCache.toSorted(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    // Limit cache size (keep last 1000 items)
    if (newsCache.length > 1000) {
      newsCache = newsCache.slice(0, 1000);
    }

    lastFetchTime = new Date();

    log.info(`News fetch complete: ${added} new items, ${newsCache.length} total`);
  } finally {
    fetchInProgress = false;
  }

  return { added, errors };
}

/**
 * Fetch news from a specific source
 */
async function fetchFromSource(source: NewsSource): Promise<NewsItem[]> {
  switch (source.type) {
    case "hackernews":
      return fetchHackerNews(source);
    case "reddit":
      return fetchReddit(source);
    case "rss":
      return fetchRSS(source);
    case "api":
      return fetchAPI(source);
    default:
      throw new Error(`Unknown source type: ${source.type}`);
  }
}

/**
 * Fetch from Hacker News API
 */
async function fetchHackerNews(source: NewsSource): Promise<NewsItem[]> {
  // Fetch top stories
  const response = await fetch(`${source.url}/topstories.json`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const storyIds: number[] = await response.json();
  const topIds = storyIds.slice(0, 30); // Get top 30

  const items: NewsItem[] = [];

  for (const id of topIds) {
    try {
      const storyResponse = await fetch(`${source.url}/item/${id}.json`);
      if (!storyResponse.ok) {
        continue;
      }

      const story = await storyResponse.json();

      if (!story || story.deleted || story.dead) {
        continue;
      }

      const publishedAt = new Date(story.time * 1000).toISOString();

      items.push({
        id: `hn-${story.id}`,
        title: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        summary: generateSummary(story.title, null),
        source: source.id,
        sourceName: source.name,
        sourceUrl: "https://news.ycombinator.com",
        categories: source.categories,
        sentiment: analyzeSentiment(story.title),
        publishedAt,
        fetchedAt: new Date().toISOString(),
        author: story.by,
        engagement: {
          score: story.score || 0,
          comments: story.descendants || 0,
        },
      });
    } catch (err) {
      log.debug(`Failed to fetch story ${id}`, { error: String(err) });
    }
  }

  return items;
}

/**
 * Fetch from Reddit
 */
async function fetchReddit(source: NewsSource): Promise<NewsItem[]> {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "OpenClaw-NewsBot/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const posts = data.data?.children || [];

  const items: NewsItem[] = [];

  for (const post of posts) {
    const postData = post.data;

    // Skip stickied posts and self posts without URLs
    if (postData.stickied || (!postData.url && !postData.selftext)) {
      continue;
    }

    const publishedAt = new Date(postData.created_utc * 1000).toISOString();

    items.push({
      id: `reddit-${postData.id}`,
      title: postData.title,
      url: postData.url || `https://reddit.com${postData.permalink}`,
      summary: generateSummary(postData.title, postData.selftext),
      content: postData.selftext || undefined,
      source: source.id,
      sourceName: source.name,
      sourceUrl: `https://reddit.com${postData.permalink}`,
      categories: source.categories,
      sentiment: analyzeSentiment(postData.title + " " + (postData.selftext || "")),
      publishedAt,
      fetchedAt: new Date().toISOString(),
      author: postData.author,
      engagement: {
        score: postData.score || 0,
        comments: postData.num_comments || 0,
      },
    });
  }

  return items;
}

/**
 * Fetch from RSS feed
 */
async function fetchRSS(source: NewsSource): Promise<NewsItem[]> {
  // Use a CORS proxy or RSS-to-JSON service
  const rssToJsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`;

  const response = await fetch(rssToJsonUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();

  if (data.status !== "ok") {
    throw new Error(`RSS parse error: ${data.message || "Unknown error"}`);
  }

  const items: NewsItem[] = [];

  for (const item of (data.items || []).slice(0, 20)) {
    const publishedAt = item.pubDate
      ? new Date(item.pubDate).toISOString()
      : new Date().toISOString();

    items.push({
      id: `${source.id}-${item.guid || item.link || Math.random().toString(36)}`,
      title: item.title,
      url: item.link,
      summary: generateSummary(item.title, item.description),
      content: item.content || item.description,
      source: source.id,
      sourceName: source.name,
      sourceUrl: data.feed?.link || source.url,
      categories: [...source.categories, ...(item.categories || [])],
      sentiment: analyzeSentiment(item.title + " " + (item.description || "")),
      publishedAt,
      fetchedAt: new Date().toISOString(),
      author: item.author,
      imageUrl: item.thumbnail || item.enclosure?.link,
    });
  }

  return items;
}

/**
 * Fetch from generic API (Dev.to)
 */
async function fetchAPI(source: NewsSource): Promise<NewsItem[]> {
  const response = await fetch(`${source.url}?per_page=20`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const articles = await response.json();
  const items: NewsItem[] = [];

  for (const article of articles) {
    const publishedAt = new Date(article.published_at).toISOString();

    items.push({
      id: `devto-${article.id}`,
      title: article.title,
      url: article.url,
      summary: generateSummary(article.title, article.description),
      content: article.body_markdown || article.description,
      source: source.id,
      sourceName: source.name,
      sourceUrl: "https://dev.to",
      categories: [...source.categories, ...(article.tag_list || [])],
      sentiment: analyzeSentiment(article.title + " " + (article.description || "")),
      publishedAt,
      fetchedAt: new Date().toISOString(),
      author: article.user?.name,
      engagement: {
        score: article.positive_reactions_count || 0,
        comments: article.comments_count || 0,
      },
    });
  }

  return items;
}

/**
 * Get all news items with optional filtering
 */
export function getNewsItems(filters?: {
  source?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): { items: NewsItem[]; total: number } {
  let filtered = [...newsCache];

  // Filter by source
  if (filters?.source) {
    filtered = filtered.filter((item) => item.source === filters.source);
  }

  // Filter by category
  if (filters?.category && filters.category !== "all") {
    filtered = filtered.filter((item) =>
      item.categories.some((cat) => cat.toLowerCase().includes(filters.category!.toLowerCase())),
    );
  }

  // Filter by search
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.categories.some((cat) => cat.toLowerCase().includes(query)),
    );
  }

  const total = filtered.length;

  // Apply pagination
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;
  filtered = filtered.slice(offset, offset + limit);

  return { items: filtered, total };
}

/**
 * Get all news sources
 */
export function getNewsSources(): NewsSource[] {
  return NEWS_SOURCES.map((source) => ({
    ...source,
    itemCount: newsCache.filter((item) => item.source === source.id).length,
  }));
}

/**
 * Get a single news item by ID
 */
export function getNewsItem(id: string): NewsItem | undefined {
  return newsCache.find((item) => item.id === id);
}

/**
 * Force refresh news from all sources
 */
export async function refreshNews(): Promise<{ added: number; errors: string[] }> {
  return fetchAllNews();
}

/**
 * Get last fetch time
 */
export function getLastFetchTime(): Date | null {
  return lastFetchTime;
}

// Simple summary generator
function generateSummary(title: string, content: string | null): string {
  if (!content) {
    return title;
  }

  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, " ");

  // Get first 200 characters
  const summary = plainText.slice(0, 200).trim();

  return summary + (plainText.length > 200 ? "..." : "");
}

// Simple sentiment analysis
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const positiveWords = [
    "great",
    "awesome",
    "excellent",
    "amazing",
    "fantastic",
    "wonderful",
    "best",
    "love",
    "win",
    "success",
    "breakthrough",
    "innovation",
    "revolutionary",
    "game-changer",
    "promising",
    "excited",
    "happy",
    "celebrate",
    "achievement",
    "milestone",
    "record",
    "growth",
  ];

  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "worst",
    "hate",
    "fail",
    "failure",
    "crisis",
    "crash",
    "bug",
    "vulnerability",
    "hack",
    "breach",
    "outage",
    "downtime",
    "layoff",
    "shutdown",
    "ban",
    "block",
    "controversy",
    "scandal",
    "lawsuit",
    "fraud",
  ];

  const lowerText = text.toLowerCase();
  let positive = 0;
  let negative = 0;

  for (const word of positiveWords) {
    if (lowerText.includes(word)) {
      positive++;
    }
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) {
      negative++;
    }
  }

  if (positive > negative) {
    return "positive";
  }
  if (negative > positive) {
    return "negative";
  }
  return "neutral";
}
