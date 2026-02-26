export type NewsSourceType = "hackernews" | "devto" | "rss";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  content?: string;
  source: NewsSourceType;
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

export interface NewsSource {
  id: string;
  name: string;
  type: NewsSourceType;
  url: string;
  enabled: boolean;
  itemCount: number;
  categories: string[];
  lastFetchedAt?: string;
}

interface FetchOptions {
  limit?: number;
  since?: Date;
}

// HackerNews Adapter
export async function fetchHackerNews(options: FetchOptions = {}): Promise<NewsItem[]> {
  const { limit = 30 } = options;

  try {
    // Fetch top stories IDs
    const topStoriesRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    if (!topStoriesRes.ok) {
      throw new Error("Failed to fetch HN top stories");
    }

    const storyIds = (await topStoriesRes.json()) as number[];
    const limitedIds = storyIds.slice(0, limit);

    // Fetch details for each story
    const stories = await Promise.all(
      limitedIds.map(async (id) => {
        try {
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!res.ok) {
            return null;
          }
          return await res.json();
        } catch {
          return null;
        }
      }),
    );

    return stories
      .filter((s): s is any => s !== null && s.type === "story")
      .map((story) => ({
        id: `hn-${story.id}`,
        title: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        summary: story.text?.substring(0, 500) || "",
        content: story.text,
        source: "hackernews",
        sourceName: "Hacker News",
        sourceUrl: "https://news.ycombinator.com",
        categories: categorizeHN(story),
        sentiment: "neutral",
        publishedAt: new Date(story.time * 1000).toISOString(),
        fetchedAt: new Date().toISOString(),
        author: story.by,
        engagement: {
          score: story.score || 0,
          comments: story.descendants || 0,
        },
      }));
  } catch (err) {
    console.error("[News] HN fetch failed:", err);
    return [];
  }
}

function categorizeHN(story: any): string[] {
  const categories: string[] = [];
  const text = (story.title + " " + (story.text || "")).toLowerCase();

  if (text.includes("ai") || text.includes("machine learning") || text.includes("llm")) {
    categories.push("ai");
  }
  if (text.includes("startup") || text.includes("founder")) {
    categories.push("startup");
  }
  if (text.includes("security") || text.includes("vulnerability")) {
    categories.push("security");
  }
  if (text.includes("programming") || text.includes("code") || text.includes("developer")) {
    categories.push("programming");
  }
  if (text.includes("web") || text.includes("javascript") || text.includes("react")) {
    categories.push("web");
  }
  if (text.includes("database") || text.includes("sql")) {
    categories.push("database");
  }
  if (text.includes("cloud") || text.includes("aws") || text.includes("azure")) {
    categories.push("cloud");
  }

  return categories.length > 0 ? categories : ["tech"];
}

// Dev.to Adapter
export async function fetchDevTo(options: FetchOptions = {}): Promise<NewsItem[]> {
  const { limit = 30 } = options;

  try {
    const res = await fetch(`https://dev.to/api/articles?per_page=${limit}`);
    if (!res.ok) {
      throw new Error("Failed to fetch Dev.to articles");
    }

    const articles = await res.json();

    return articles.map((article: any) => ({
      id: `devto-${article.id}`,
      title: article.title,
      url: article.url,
      summary: article.description || article.body_markdown?.substring(0, 500) || "",
      content: article.body_markdown,
      source: "devto",
      sourceName: "Dev.to",
      sourceUrl: "https://dev.to",
      categories: article.tag_list || ["programming"],
      sentiment: "neutral",
      publishedAt: article.published_at,
      fetchedAt: new Date().toISOString(),
      author: article.user?.name,
      imageUrl: article.cover_image,
      engagement: {
        score: article.positive_reactions_count || 0,
        comments: article.comments_count || 0,
      },
    }));
  } catch (err) {
    console.error("[News] Dev.to fetch failed:", err);
    return [];
  }
}

// Simple RSS Parser (without external dependency)
export async function fetchRSSFeed(
  feedUrl: string,
  sourceName: string,
  options: FetchOptions = {},
): Promise<NewsItem[]> {
  const { limit = 20 } = options;

  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "OpenClaw-NewsAggregator/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch RSS: ${res.status}`);
    }

    const xml = await res.text();

    // Simple regex-based RSS parsing (for basic RSS 2.0)
    const items: NewsItem[] = [];
    const itemMatches = xml.match(/\u003citem[\s\S]*?\u003e([\s\S]*?)\u003c\/item\u003e/g) || [];

    for (const itemXml of itemMatches.slice(0, limit)) {
      try {
        const title = extractXmlTag(itemXml, "title") || "Untitled";
        const link = extractXmlTag(itemXml, "link") || "";
        const description = extractXmlTag(itemXml, "description") || "";
        const pubDate =
          extractXmlTag(itemXml, "pubDate") ||
          extractXmlTag(itemXml, "published") ||
          new Date().toISOString();
        const creator = extractXmlTag(itemXml, "creator") || extractXmlTag(itemXml, "author") || "";

        // Try to extract image from content
        const content = extractXmlTag(itemXml, "content:encoded") || description;
        const imageMatch = content?.match(/<img[^\u003e]+src="([^"]+)"/);
        const imageUrl = imageMatch ? imageMatch[1] : undefined;

        items.push({
          id: `rss-${hashCode(link + title)}`,
          title,
          url: link,
          summary: stripHtml(description).substring(0, 500),
          content: stripHtml(content),
          source: "rss",
          sourceName,
          sourceUrl: feedUrl,
          categories: ["general"],
          sentiment: "neutral",
          publishedAt: new Date(pubDate).toISOString(),
          fetchedAt: new Date().toISOString(),
          author: creator,
          imageUrl,
        });
      } catch {
        // Skip malformed items
      }
    }

    return items;
  } catch (err) {
    console.error(`[News] RSS fetch failed for ${feedUrl}:`, err);
    return [];
  }
}

function extractXmlTag(xml: string, tag: string): string | undefined {
  const openTag = `<${tag}`;
  const closeTag = `</${tag}>`;
  const startIdx = xml.indexOf(openTag);
  if (startIdx === -1) {
    return undefined;
  }

  const tagEndIdx = xml.indexOf(">", startIdx);
  if (tagEndIdx === -1) {
    return undefined;
  }

  const contentStartIdx = tagEndIdx + 1;
  const contentEndIdx = xml.indexOf(closeTag, contentStartIdx);
  if (contentEndIdx === -1) {
    return undefined;
  }

  const content = xml.substring(contentStartIdx, contentEndIdx).trim();
  return stripHtml(content);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^\u003e]+>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

// News Aggregator
export class NewsAggregator {
  private static instance: NewsAggregator | null = null;
  private sources: NewsSource[];
  private cache: Map<string, NewsItem[]> = new Map();
  private lastFetch: Map<string, Date> = new Map();

  constructor(sources: NewsSource[]) {
    this.sources = sources;
  }

  static getInstance(): NewsAggregator {
    if (!NewsAggregator.instance) {
      NewsAggregator.instance = new NewsAggregator(DEFAULT_NEWS_SOURCES);
    }
    return NewsAggregator.instance;
  }

  async fetchAll(
    options: { limit?: number; since?: Date } = {},
  ): Promise<{ items: NewsItem[]; added: number; updated: number; errors: number }> {
    let added = 0;
    let updated = 0;
    let errors = 0;
    const allItems: NewsItem[] = [];

    for (const source of this.sources.filter((s) => s.enabled)) {
      try {
        let items: NewsItem[] = [];

        switch (source.type) {
          case "hackernews":
            items = await fetchHackerNews(options);
            break;
          case "devto":
            items = await fetchDevTo(options);
            break;
          case "rss":
            items = await fetchRSSFeed(source.url, source.name, options);
            break;
        }

        // Count new vs updated
        const cachedItems = this.cache.get(source.id) || [];
        const cachedIds = new Set(cachedItems.map((i) => i.id));

        for (const item of items) {
          if (cachedIds.has(item.id)) {
            updated++;
          } else {
            added++;
          }
        }

        allItems.push(...items);

        // Update source metadata
        source.lastFetchedAt = new Date().toISOString();
        source.itemCount = items.length;

        // Cache
        this.cache.set(source.id, items);
        this.lastFetch.set(source.id, new Date());
      } catch (err) {
        console.error(`[News] Failed to fetch ${source.name}:`, err);
        errors++;
      }
    }

    // Sort by published date (newest first) - using toSorted (immutable)
    const sortedItems = allItems.toSorted(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    return { items: sortedItems, added, updated, errors };
  }

  async getNewsItems(filters: {
    source?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<NewsItem[]> {
    let items: NewsItem[] = [];

    // If specific source requested
    if (filters.source) {
      items = await this.fetchSource(filters.source);
    } else {
      // Get from all sources
      const result = await this.fetchAll();
      items = result.items;
    }

    // Apply filters
    if (filters.category) {
      items = items.filter((item) => item.categories.includes(filters.category!));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.summary.toLowerCase().includes(searchLower),
      );
    }

    return items;
  }

  async testRSS(url: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const items = await fetchRSSFeed(url, "Test", { limit: 1 });
      if (items.length > 0) {
        return { valid: true };
      }
      return { valid: false, error: "No items found in feed" };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchSource(sourceId: string, options: FetchOptions = {}): Promise<NewsItem[]> {
    const source = this.sources.find((s) => s.id === sourceId);
    if (!source || !source.enabled) {
      return [];
    }

    // Check cache
    const lastFetch = this.lastFetch.get(sourceId);
    if (lastFetch && Date.now() - lastFetch.getTime() < 5 * 60 * 1000) {
      // Return cached data if less than 5 minutes old
      return this.cache.get(sourceId) || [];
    }

    switch (source.type) {
      case "hackernews":
        return fetchHackerNews(options);
      case "devto":
        return fetchDevTo(options);
      case "rss":
        return fetchRSSFeed(source.url, source.name, options);
      default:
        return [];
    }
  }

  getSources(): NewsSource[] {
    return this.sources;
  }

  addSource(source: NewsSource): NewsSource {
    this.sources.push(source);
    return source;
  }

  removeSource(sourceId: string): void {
    this.sources = this.sources.filter((s) => s.id !== sourceId);
  }

  toggleSource(sourceId: string, enabled: boolean): void {
    const source = this.sources.find((s) => s.id === sourceId);
    if (source) {
      source.enabled = enabled;
    }
  }
}

// Default sources configuration
export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    id: "hackernews",
    name: "Hacker News",
    type: "hackernews",
    url: "https://news.ycombinator.com",
    enabled: true,
    categories: ["tech", "startup"],
    itemCount: 0,
  },
  {
    id: "devto",
    name: "Dev.to",
    type: "devto",
    url: "https://dev.to",
    enabled: true,
    categories: ["programming", "tech"],
    itemCount: 0,
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    type: "rss",
    url: "https://techcrunch.com/feed/",
    enabled: true,
    categories: ["tech", "startup", "business"],
    itemCount: 0,
  },
  {
    id: "verge",
    name: "The Verge",
    type: "rss",
    url: "https://www.theverge.com/rss/index.xml",
    enabled: true,
    categories: ["tech", "culture"],
    itemCount: 0,
  },
];
