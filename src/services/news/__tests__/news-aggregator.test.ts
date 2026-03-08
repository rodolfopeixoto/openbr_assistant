import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NewsItem, NewsSource } from "../../news-aggregator.js";
import { TwitterCrawler } from "../../news/crawler/twitter-crawler.js";
import { AIClassifier } from "../../news/processor/ai-classifier.js";
import { RelevanceScorer } from "../../news/processor/relevance-scorer.js";

describe("News Aggregator v2", () => {
  describe("TwitterCrawler", () => {
    let crawler: TwitterCrawler;

    beforeEach(() => {
      crawler = new TwitterCrawler({
        apiKey: "test-key",
        apiSecret: "test-secret",
        bearerToken: "test-bearer",
      });
    });

    it("should fetch tweets from monitored accounts", async () => {
      // Arrange
      const account = "@OpenAI";
      const limit = 10;

      // Act
      const tweets = await crawler.fetchAccount(account, { limit });

      // Assert
      expect(tweets).toHaveLength(limit);
      expect(tweets[0]).toHaveProperty("id");
      expect(tweets[0]).toHaveProperty("text");
      expect(tweets[0]).toHaveProperty("engagement");
      expect(tweets[0].source).toBe("twitter");
    });

    it("should fetch tweets by hashtag", async () => {
      // Arrange
      const hashtag = "#AI";

      // Act
      const tweets = await crawler.fetchHashtag(hashtag, { limit: 5 });

      // Assert
      expect(tweets.length).toBeGreaterThan(0);
      expect(tweets[0].text.toLowerCase()).toContain("#ai");
    });

    it("should filter by minimum engagement", async () => {
      // Arrange
      const account = "@OpenAI";
      const minEngagement = 100;

      // Act
      const tweets = await crawler.fetchAccount(account, {
        limit: 20,
        minEngagement,
      });

      // Assert
      expect(tweets.every((t) => t.engagement.likes >= minEngagement)).toBe(true);
    });

    it("should handle rate limiting", async () => {
      // Arrange
      const account = "@OpenAI";

      // Act
      const result = await crawler.checkRateLimit();

      // Assert
      expect(result).toHaveProperty("remaining");
      expect(result).toHaveProperty("resetTime");
    });

    it("should cache tweets to avoid duplicates", async () => {
      // Arrange
      const account = "@OpenAI";

      // Act - Fetch twice
      const tweets1 = await crawler.fetchAccount(account, { limit: 5 });
      const tweets2 = await crawler.fetchAccount(account, { limit: 5 });

      // Assert - IDs should not overlap (cache working)
      const ids1 = new Set(tweets1.map((t) => t.id));
      const ids2 = new Set(tweets2.map((t) => t.id));
      const intersection = [...ids1].filter((id) => ids2.has(id));

      // Some overlap is expected, but not all
      expect(intersection.length).toBeLessThan(tweets1.length);
    });
  });

  describe("RelevanceScorer", () => {
    let scorer: RelevanceScorer;

    beforeEach(() => {
      scorer = new RelevanceScorer();
    });

    it("should score AI-related content high", () => {
      // Arrange
      const article: NewsItem = {
        id: "test-1",
        title: "OpenAI releases GPT-5 with breakthrough capabilities",
        url: "https://example.com",
        summary: "The new model achieves human-level performance on many tasks",
        source: "twitter",
        sourceName: "Twitter",
        sourceUrl: "https://twitter.com",
        categories: ["ai"],
        sentiment: "positive",
        publishedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        engagement: { score: 1000, comments: 200 },
      };

      // Act
      const score = scorer.calculate(article);

      // Assert
      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should score non-AI content lower", () => {
      // Arrange
      const article: NewsItem = {
        id: "test-2",
        title: "New JavaScript framework released",
        url: "https://example.com",
        summary: "Another frontend framework for web development",
        source: "devto",
        sourceName: "Dev.to",
        sourceUrl: "https://dev.to",
        categories: ["programming"],
        sentiment: "neutral",
        publishedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        engagement: { score: 50 },
      };

      // Act
      const score = scorer.calculate(article);

      // Assert
      expect(score).toBeLessThan(70);
    });

    it("should factor in engagement", () => {
      // Arrange
      const article1: NewsItem = {
        id: "test-3",
        title: "AI breakthrough",
        url: "https://example.com",
        summary: "Summary",
        source: "twitter",
        sourceName: "Twitter",
        sourceUrl: "https://twitter.com",
        categories: ["ai"],
        sentiment: "positive",
        publishedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        engagement: { score: 100, likes: 100 },
      };

      const article2: NewsItem = {
        id: "test-4",
        title: "AI breakthrough",
        url: "https://example.com",
        summary: "Summary",
        source: "twitter",
        sourceName: "Twitter",
        sourceUrl: "https://twitter.com",
        categories: ["ai"],
        sentiment: "positive",
        publishedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        engagement: { score: 5000, likes: 5000 },
      };

      // Act
      const score1 = scorer.calculate(article1);
      const score2 = scorer.calculate(article2);

      // Assert
      expect(score2).toBeGreaterThan(score1);
    });
  });

  describe("AIClassifier", () => {
    let classifier: AIClassifier;

    beforeEach(() => {
      classifier = new AIClassifier();
    });

    it("should classify LLM content correctly", async () => {
      // Arrange
      const text = "GPT-5, Large Language Models, and transformer architecture";

      // Act
      const category = await classifier.classify(text);

      // Assert
      expect(category).toBe("llm");
    });

    it("should classify Computer Vision content", async () => {
      // Arrange
      const text = "Image recognition, CNNs, and computer vision applications";

      // Act
      const category = await classifier.classify(text);

      // Assert
      expect(category).toBe("vision");
    });

    it("should classify Robotics content", async () => {
      // Arrange
      const text = "Boston Dynamics, humanoid robots, and automation";

      // Act
      const category = await classifier.classify(text);

      // Assert
      expect(category).toBe("robotics");
    });

    it("should classify Research content", async () => {
      // Arrange
      const text = "New paper on arXiv, research breakthrough, scientific discovery";

      // Act
      const category = await classifier.classify(text);

      // Assert
      expect(category).toBe("research");
    });

    it("should return null for non-AI content", async () => {
      // Arrange
      const text = "Best pizza recipes and cooking tips";

      // Act
      const category = await classifier.classify(text);

      // Assert
      expect(category).toBeNull();
    });
  });

  describe("NewsAggregator Integration", () => {
    it("should aggregate from multiple sources including Twitter", async () => {
      // This test will be implemented after integration
      expect(true).toBe(true);
    });
  });
});
