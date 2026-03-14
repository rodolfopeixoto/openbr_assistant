/**
 * News system types
 */

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
  lastFetchedAt?: string;
  itemCount: number;
  categories: string[];
}

export interface ListNewsParams {
  source?: string;
  category?: string;
  timeRange?: "all" | "today" | "week" | "month";
  search?: string;
  sentiment?: "positive" | "negative" | "neutral";
  limit?: number;
  offset?: number;
}

export interface AddSourceParams {
  name: string;
  type: "rss";
  url: string;
  categories?: string[];
}

export interface RemoveSourceParams {
  sourceId: string;
}

export interface FetchResult {
  added: number;
  updated: number;
  errors: string[];
}

export interface RSSTestResult {
  valid: boolean;
  title?: string;
  error?: string;
}
