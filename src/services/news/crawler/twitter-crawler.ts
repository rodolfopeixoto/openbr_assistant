import type { NewsItem } from "../../news-aggregator.js";

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  bearerToken: string;
}

export interface TwitterFetchOptions {
  limit?: number;
  minEngagement?: number;
  sinceId?: string;
}

export interface TwitterTweet {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

export class TwitterCrawler {
  private config: TwitterConfig;
  private cache: Map<string, TwitterTweet> = new Map();
  private rateLimitRemaining: number = 300;
  private rateLimitReset: Date = new Date();

  constructor(config: TwitterConfig) {
    this.config = config;
  }

  async fetchAccount(account: string, options: TwitterFetchOptions = {}): Promise<NewsItem[]> {
    const { limit = 10, minEngagement = 0 } = options;

    // Check rate limit
    if (this.rateLimitRemaining <= 0) {
      const now = new Date();
      if (now < this.rateLimitReset) {
        throw new Error(`Rate limit exceeded. Reset at ${this.rateLimitReset.toISOString()}`);
      }
      // Reset rate limit
      this.rateLimitRemaining = 300;
    }

    // Remove @ if present
    const username = account.replace("@", "");

    try {
      // Fetch tweets from Twitter API v2
      const response = await fetch(
        `https://api.twitter.com/2/users/by/username/${username}/tweets?max_results=${limit}&tweet.fields=public_metrics,created_at&exclude=replies,retweets`,
        {
          headers: {
            Authorization: `Bearer ${this.config.bearerToken}`,
            "User-Agent": "OpenClaw-NewsAggregator/1.0",
          },
        },
      );

      // Update rate limit
      this.rateLimitRemaining =
        parseInt(response.headers.get("x-rate-limit-remaining") || "300") - 1;
      const resetTime = parseInt(response.headers.get("x-rate-limit-reset") || "0");
      if (resetTime) {
        this.rateLimitReset = new Date(resetTime * 1000);
      }

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      // Filter and transform tweets
      const tweets: NewsItem[] = data.data
        .filter((tweet: any) => {
          const likes = tweet.public_metrics?.like_count || 0;
          return likes >= minEngagement;
        })
        .map((tweet: any) => {
          const newsItem: NewsItem = {
            id: `twitter-${tweet.id}`,
            title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? "..." : ""),
            url: `https://twitter.com/${username}/status/${tweet.id}`,
            summary: tweet.text,
            source: "twitter",
            sourceName: `Twitter @${username}`,
            sourceUrl: `https://twitter.com/${username}`,
            categories: this.categorizeTweet(tweet.text),
            sentiment: "neutral",
            publishedAt: tweet.created_at,
            fetchedAt: new Date().toISOString(),
            author: `@${username}`,
            engagement: {
              score: tweet.public_metrics?.like_count || 0,
              comments: tweet.public_metrics?.reply_count || 0,
            },
          };

          // Cache the tweet
          this.cache.set(tweet.id, {
            id: tweet.id,
            text: tweet.text,
            author: username,
            createdAt: tweet.created_at,
            engagement: {
              likes: tweet.public_metrics?.like_count || 0,
              retweets: tweet.public_metrics?.retweet_count || 0,
              replies: tweet.public_metrics?.reply_count || 0,
            },
          });

          return newsItem;
        });

      return tweets;
    } catch (error) {
      console.error(`[TwitterCrawler] Failed to fetch ${account}:`, error);
      return [];
    }
  }

  async fetchHashtag(hashtag: string, options: TwitterFetchOptions = {}): Promise<NewsItem[]> {
    const { limit = 10, minEngagement = 0 } = options;

    // Check rate limit
    if (this.rateLimitRemaining <= 0) {
      const now = new Date();
      if (now < this.rateLimitReset) {
        throw new Error(`Rate limit exceeded. Reset at ${this.rateLimitReset.toISOString()}`);
      }
      this.rateLimitRemaining = 300;
    }

    // Remove # if present
    const tag = hashtag.replace("#", "");

    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=%23${tag}&max_results=${limit}&tweet.fields=public_metrics,created_at,author_id&expansions=author_id&user.fields=username`,
        {
          headers: {
            Authorization: `Bearer ${this.config.bearerToken}`,
            "User-Agent": "OpenClaw-NewsAggregator/1.0",
          },
        },
      );

      // Update rate limit
      this.rateLimitRemaining =
        parseInt(response.headers.get("x-rate-limit-remaining") || "300") - 1;
      const resetTime = parseInt(response.headers.get("x-rate-limit-reset") || "0");
      if (resetTime) {
        this.rateLimitReset = new Date(resetTime * 1000);
      }

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      // Create a map of user IDs to usernames
      const users = new Map();
      if (data.includes?.users) {
        for (const user of data.includes.users) {
          users.set(user.id, user.username);
        }
      }

      // Filter and transform tweets
      const tweets: NewsItem[] = data.data
        .filter((tweet: any) => {
          const likes = tweet.public_metrics?.like_count || 0;
          return likes >= minEngagement;
        })
        .map((tweet: any) => {
          const username = users.get(tweet.author_id) || "unknown";

          return {
            id: `twitter-${tweet.id}`,
            title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? "..." : ""),
            url: `https://twitter.com/${username}/status/${tweet.id}`,
            summary: tweet.text,
            source: "twitter",
            sourceName: `Twitter #${tag}`,
            sourceUrl: `https://twitter.com/hashtag/${tag}`,
            categories: ["ai", "tech"],
            sentiment: "neutral",
            publishedAt: tweet.created_at,
            fetchedAt: new Date().toISOString(),
            author: `@${username}`,
            engagement: {
              score: tweet.public_metrics?.like_count || 0,
              comments: tweet.public_metrics?.reply_count || 0,
            },
          };
        });

      return tweets;
    } catch (error) {
      console.error(`[TwitterCrawler] Failed to fetch hashtag #${tag}:`, error);
      return [];
    }
  }

  async checkRateLimit(): Promise<{
    remaining: number;
    resetTime: Date;
  }> {
    return {
      remaining: this.rateLimitRemaining,
      resetTime: this.rateLimitReset,
    };
  }

  getCachedTweet(id: string): TwitterTweet | undefined {
    return this.cache.get(id);
  }

  private categorizeTweet(text: string): string[] {
    const categories: string[] = [];
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes("gpt") ||
      lowerText.includes("llm") ||
      lowerText.includes("language model") ||
      lowerText.includes("openai") ||
      lowerText.includes("anthropic") ||
      lowerText.includes("claude")
    ) {
      categories.push("ai", "llm");
    }

    if (lowerText.includes("vision") || lowerText.includes("image") || lowerText.includes("cnn")) {
      categories.push("ai", "vision");
    }

    if (
      lowerText.includes("robot") ||
      lowerText.includes("robotics") ||
      lowerText.includes("automation")
    ) {
      categories.push("ai", "robotics");
    }

    if (
      lowerText.includes("research") ||
      lowerText.includes("paper") ||
      lowerText.includes("arxiv")
    ) {
      categories.push("ai", "research");
    }

    if (categories.length === 0) {
      categories.push("tech");
    }

    return categories;
  }
}

export default TwitterCrawler;
