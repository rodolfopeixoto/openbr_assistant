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
  // AI-specific sources from Feedspot top AI RSS feeds
  {
    id: "openai-blog",
    name: "OpenAI Blog",
    type: "rss",
    url: "https://openai.com/blog/rss.xml",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "research", "openai"],
    fetchInterval: 60,
  },
  {
    id: "deepmind-blog",
    name: "DeepMind Blog",
    type: "rss",
    url: "https://deepmind.google/blog/rss.xml",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "research", "deepmind"],
    fetchInterval: 60,
  },
  {
    id: "google-ai",
    name: "Google AI Blog",
    type: "rss",
    url: "https://ai.googleblog.com/feeds/posts/default",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "research", "google"],
    fetchInterval: 60,
  },
  {
    id: "mit-ai",
    name: "MIT Technology Review - AI",
    type: "rss",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "research", "mit"],
    fetchInterval: 60,
  },
  {
    id: "venturebeat-ai",
    name: "VentureBeat - AI",
    type: "rss",
    url: "https://venturebeat.com/category/ai/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "business", "venturebeat"],
    fetchInterval: 60,
  },
  {
    id: "towards-datascience",
    name: "Towards Data Science",
    type: "rss",
    url: "https://towardsdatascience.com/feed",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "machine-learning", "data-science"],
    fetchInterval: 60,
  },
  {
    id: "analytics-vidhya",
    name: "Analytics Vidhya",
    type: "rss",
    url: "https://www.analyticsvidhya.com/blog/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "machine-learning", "tutorials"],
    fetchInterval: 60,
  },
  {
    id: "machine-learning-mastery",
    name: "Machine Learning Mastery",
    type: "rss",
    url: "https://machinelearningmastery.com/blog/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "machine-learning", "tutorials"],
    fetchInterval: 60,
  },
  {
    id: "ai-trends",
    name: "AI Trends",
    type: "rss",
    url: "https://www.aitrends.com/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "business", "enterprise"],
    fetchInterval: 60,
  },
  {
    id: "the-gradient",
    name: "The Gradient",
    type: "rss",
    url: "https://thegradient.pub/rss/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "research", "deep-learning"],
    fetchInterval: 60,
  },
  {
    id: "synced-review",
    name: "Synced Review",
    type: "rss",
    url: "https://syncedreview.com/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "research", "global"],
    fetchInterval: 60,
  },
  {
    id: "ai-weekly",
    name: "AI Weekly",
    type: "rss",
    url: "https://aiweekly.co/rss",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "newsletter", "news"],
    fetchInterval: 60,
  },
  {
    id: "import-ai",
    name: "Import AI",
    type: "rss",
    url: "https://importai.substack.com/feed",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "newsletter", "research"],
    fetchInterval: 60,
  },
  {
    id: "microsoft-ai",
    name: "Microsoft AI Blog",
    type: "rss",
    url: "https://blogs.microsoft.com/ai/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "microsoft", "enterprise"],
    fetchInterval: 60,
  },
  {
    id: "aws-ml",
    name: "AWS Machine Learning Blog",
    type: "rss",
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "aws", "cloud"],
    fetchInterval: 60,
  },
  {
    id: "nvidia-ai",
    name: "NVIDIA AI Blog",
    type: "rss",
    url: "https://blogs.nvidia.com/blog/category/artificial-intelligence/feed/",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "nvidia", "hardware"],
    fetchInterval: 60,
  },
  {
    id: "fast-ai",
    name: "fast.ai Blog",
    type: "rss",
    url: "https://www.fast.ai/feed.xml",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "deep-learning", "education"],
    fetchInterval: 60,
  },
  {
    id: "pytorch",
    name: "PyTorch Blog",
    type: "rss",
    url: "https://pytorch.org/blog/feed.xml",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "deep-learning", "framework"],
    fetchInterval: 60,
  },
  {
    id: "tensorflow",
    name: "TensorFlow Blog",
    type: "rss",
    url: "https://blog.tensorflow.org/feeds/posts/default",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "deep-learning", "framework"],
    fetchInterval: 60,
  },
  {
    id: "huggingface",
    name: "Hugging Face Blog",
    type: "rss",
    url: "https://huggingface.co/blog/feed.xml",
    enabled: true,
    itemCount: 0,
    categories: ["ai", "nlp", "open-source"],
    fetchInterval: 60,
  },
];

// Sample/mock data for demonstration
const SAMPLE_NEWS: NewsItem[] = [
  {
    id: "sample-1",
    title: "OpenAI Releases GPT-5 with Multimodal Capabilities",
    url: "https://openai.com/blog/gpt-5",
    summary:
      "OpenAI announces GPT-5, featuring unprecedented multimodal capabilities including native image, audio, and video understanding alongside text generation.",
    content: "OpenAI has unveiled GPT-5, their most advanced AI model to date...",
    source: "openai-blog",
    sourceName: "OpenAI Blog",
    sourceUrl: "https://openai.com/blog",
    categories: ["ai", "openai", "breakthrough"],
    sentiment: "positive",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    author: "OpenAI Team",
  },
  {
    id: "sample-2",
    title: "Google DeepMind Achieves New Milestone in Protein Folding",
    url: "https://deepmind.google/discover/blog/",
    summary:
      "DeepMind's AlphaFold3 accurately predicts protein structures with 95% accuracy, accelerating drug discovery and biological research.",
    content: "In a groundbreaking development, DeepMind researchers have...",
    source: "deepmind-blog",
    sourceName: "DeepMind Blog",
    sourceUrl: "https://deepmind.google",
    categories: ["ai", "research", "deepmind"],
    sentiment: "positive",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    author: "DeepMind Research",
  },
  {
    id: "sample-3",
    title: "Tech Layoffs Continue: Major Companies Cut 10,000 Jobs",
    url: "https://techcrunch.com/2024/01/15/tech-layoffs/",
    summary:
      "Several major technology companies announced significant workforce reductions this week, citing economic pressures and AI automation.",
    content: "The technology sector continues to face headwinds as companies...",
    source: "techcrunch",
    sourceName: "TechCrunch",
    sourceUrl: "https://techcrunch.com",
    categories: ["technology", "business", "startups"],
    sentiment: "negative",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    author: "Sarah Johnson",
  },
  {
    id: "sample-4",
    title: "New JavaScript Framework Promises 10x Performance",
    url: "https://dev.to/javascript/new-framework",
    summary:
      "Developers are excited about a new JavaScript framework that claims to render applications 10 times faster than current solutions.",
    content: "A team of developers has released a new JavaScript framework...",
    source: "devto",
    sourceName: "Dev.to",
    sourceUrl: "https://dev.to",
    categories: ["technology", "programming", "javascript"],
    sentiment: "positive",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    author: "Dev Community",
  },
  {
    id: "sample-5",
    title: "AI Regulation Bill Passes in European Parliament",
    url: "https://www.theverge.com/2024/1/14/ai-regulation",
    summary:
      "The European Parliament has passed comprehensive AI regulation, setting standards for transparency, safety, and ethical AI development.",
    content: "In a landmark decision, the European Parliament has approved...",
    source: "theverge",
    sourceName: "The Verge",
    sourceUrl: "https://www.theverge.com",
    categories: ["technology", "policy", "ai"],
    sentiment: "neutral",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    author: "Tech Policy Team",
  },
  {
    id: "sample-6",
    title: "Quantum Computing Breakthrough: 1000 Qubits Achieved",
    url: "https://arstechnica.com/science/2024/01/quantum-breakthrough/",
    summary:
      "IBM announces a major milestone in quantum computing with a 1000-qubit processor, bringing practical quantum applications closer to reality.",
    content: "IBM researchers have achieved a significant breakthrough...",
    source: "arstechnica",
    sourceName: "Ars Technica",
    sourceUrl: "https://arstechnica.com",
    categories: ["technology", "science", "quantum"],
    sentiment: "positive",
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    author: "Science Desk",
  },
  {
    id: "sample-7",
    title: "Cybersecurity Threat: New Vulnerability Affects Millions of Devices",
    url: "https://news.ycombinator.com/item?id=39012345",
    summary:
      "Security researchers have discovered a critical vulnerability affecting millions of IoT devices worldwide. Patches are being released.",
    content: "A new cybersecurity threat has emerged affecting...",
    source: "hackernews",
    sourceName: "Hacker News",
    sourceUrl: "https://news.ycombinator.com",
    categories: ["technology", "security", "programming"],
    sentiment: "negative",
    publishedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    author: "Security Researcher",
  },
  {
    id: "sample-8",
    title: "Microsoft Integrates GPT-5 into Office 365 Suite",
    url: "https://blogs.microsoft.com/ai/2024/01/office-gpt5/",
    summary:
      "Microsoft announces deep integration of GPT-5 into Word, Excel, and PowerPoint, transforming how users create and edit documents.",
    content: "Microsoft is bringing the power of GPT-5 to Office 365...",
    source: "microsoft-ai",
    sourceName: "Microsoft AI Blog",
    sourceUrl: "https://blogs.microsoft.com/ai",
    categories: ["ai", "microsoft", "enterprise"],
    sentiment: "positive",
    publishedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    author: "Microsoft AI Team",
  },
];

// In-memory cache - initialized with sample data
let newsCache: NewsItem[] = [...SAMPLE_NEWS];
let lastFetchTime: Date | null = new Date();
let fetchInProgress = false;

/**
 * Initialize the news aggregator
 */
export function initializeNewsAggregator(): void {
  log.info("Initializing News Aggregator");

  // Update source counts with sample data
  for (const source of NEWS_SOURCES) {
    source.itemCount = SAMPLE_NEWS.filter((item) => item.source === source.id).length;
  }

  // Initial fetch (will add real data to the sample data)
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
