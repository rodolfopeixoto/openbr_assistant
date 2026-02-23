/**
 * AI Analyzer Service
 * Processes articles with LLM to extract insights
 */

import type { IntelligenceConfig } from "../config/intelligence-config.js";
import { getConfig } from "../config/intelligence-config.js";

export interface ArticleAnalysis {
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative";
  categories: string[];
  insights: Insight[];
  suggestedActions?: string[];
  relatedTopics: string[];
}

export interface Insight {
  id: string;
  type: "trend" | "opportunity" | "risk" | "key_point";
  content: string;
  confidence: number;
  evidence: string;
}

export interface AnalyzedArticle {
  id: string;
  title: string;
  originalUrl: string;
  sourceName: string;
  publishedAt: Date;
  analysis: ArticleAnalysis;
  analyzedAt: Date;
}

export interface Trend {
  id: string;
  topic: string;
  mentions: number;
  sentiment: "positive" | "neutral" | "negative";
  momentum: "rising" | "stable" | "falling";
  firstSeen: Date;
  lastSeen: Date;
  relatedArticles: string[];
}

export class AIAnalyzer {
  private config: IntelligenceConfig["analyzer"];

  constructor() {
    this.config = getConfig().intelligence.analyzer;
  }

  /**
   * Analyze a single article
   */
  async analyzeArticle(article: {
    id: string;
    title: string;
    content?: string;
    summary?: string;
    url: string;
    sourceName: string;
    publishedAt: Date;
  }): Promise<AnalyzedArticle> {
    if (!this.config.enabled) {
      return this.createBasicAnalysis(article);
    }

    try {
      const textToAnalyze = article.content || article.summary || article.title;

      // Call LLM for analysis
      const analysis = await this.callLLM(textToAnalyze);

      return {
        id: article.id,
        title: article.title,
        originalUrl: article.url,
        sourceName: article.sourceName,
        publishedAt: article.publishedAt,
        analysis,
        analyzedAt: new Date(),
      };
    } catch (error) {
      console.error("AI analysis failed:", error);
      return this.createBasicAnalysis(article);
    }
  }

  /**
   * Analyze batch of articles
   */
  async analyzeBatch(
    articles: Array<{
      id: string;
      title: string;
      content?: string;
      summary?: string;
      url: string;
      sourceName: string;
      publishedAt: Date;
    }>,
  ): Promise<AnalyzedArticle[]> {
    const results: AnalyzedArticle[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);

      const batchResults = await Promise.all(batch.map((article) => this.analyzeArticle(article)));

      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < articles.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Extract trends from analyzed articles
   */
  extractTrends(analyzedArticles: AnalyzedArticle[]): Trend[] {
    const topicMap = new Map<string, Trend>();

    for (const article of analyzedArticles) {
      // Analyze topics
      const topics = [...article.analysis.categories, ...article.analysis.relatedTopics];

      for (const topic of topics) {
        const normalizedTopic = topic.toLowerCase().trim();

        if (topicMap.has(normalizedTopic)) {
          const existing = topicMap.get(normalizedTopic)!;
          existing.mentions += 1;
          existing.lastSeen = article.publishedAt;
          existing.relatedArticles.push(article.id);

          // Update sentiment (simple average)
          if (article.analysis.sentiment === "positive") {
            // Would need more sophisticated calculation
          }
        } else {
          topicMap.set(normalizedTopic, {
            id: `trend-${normalizedTopic.replace(/\s+/g, "-")}`,
            topic: normalizedTopic,
            mentions: 1,
            sentiment: article.analysis.sentiment,
            momentum: "rising",
            firstSeen: article.publishedAt,
            lastSeen: article.publishedAt,
            relatedArticles: [article.id],
          });
        }
      }
    }

    // Convert to array and sort by mentions
    return Array.from(topicMap.values())
      .toSorted((a, b) => b.mentions - a.mentions)
      .slice(0, 20); // Top 20 trends
  }

  /**
   * Generate digest from analyzed articles
   */
  generateDigest(
    analyzedArticles: AnalyzedArticle[],
    format: "short" | "medium" | "full",
  ): {
    title: string;
    summary: string;
    articles: AnalyzedArticle[];
    trends: Trend[];
    keyInsights: Insight[];
    suggestedReading: AnalyzedArticle[];
  } {
    // Sort by relevance (would use ML model in production)
    const sorted = analyzedArticles.toSorted(
      (a, b) => b.analysis.insights.length - a.analysis.insights.length,
    );

    // Select top articles based on format
    const topArticles = sorted.slice(0, format === "short" ? 5 : format === "medium" ? 10 : 20);

    // Extract trends
    const trends = this.extractTrends(topArticles);

    // Collect all insights
    const allInsights = topArticles.flatMap((a) => a.analysis.insights);
    const keyInsights = allInsights.filter((i) => i.confidence > 0.8).slice(0, 10);

    // Suggested reading (articles with high insight density)
    const suggestedReading = sorted.slice(topArticles.length, topArticles.length + 5);

    return {
      title: this.generateDigestTitle(topArticles, format),
      summary: this.generateDigestSummary(topArticles, trends),
      articles: topArticles,
      trends,
      keyInsights,
      suggestedReading,
    };
  }

  /**
   * Call LLM for analysis
   */
  private async callLLM(text: string): Promise<ArticleAnalysis> {
    // const { provider, model, maxTokens, temperature } = this.config;
    // const prompt = this.buildAnalysisPrompt(text);

    // In production, this would call OpenAI, Anthropic, or local model
    // For now, return simulated analysis
    return this.simulateAnalysis(text);
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(text: string): string {
    return `
Analyze the following article and provide a structured analysis:

ARTICLE:
${text.substring(0, 4000)}

Please provide:
1. A concise summary (2-3 sentences)
2. 3-5 key points
3. Sentiment (positive/neutral/negative)
4. Categories (e.g., AI, Technology, Business)
5. Key insights with type (trend/opportunity/risk/key_point)
6. Suggested actions (if applicable)
7. Related topics

Format your response as JSON with the following structure:
{
  "summary": "...",
  "keyPoints": ["..."],
  "sentiment": "positive|neutral|negative",
  "categories": ["..."],
  "insights": [
    {
      "type": "trend|opportunity|risk|key_point",
      "content": "...",
      "confidence": 0.95,
      "evidence": "..."
    }
  ],
  "suggestedActions": ["..."],
  "relatedTopics": ["..."]
}
`;
  }

  /**
   * Simulate analysis (for development)
   */
  private simulateAnalysis(text: string): ArticleAnalysis {
    // Simple keyword-based analysis for development
    const lowerText = text.toLowerCase();

    // Detect categories
    const categories: string[] = [];
    if (lowerText.includes("ai") || lowerText.includes("machine learning")) {
      categories.push("AI");
    }
    if (lowerText.includes("startup") || lowerText.includes("funding")) {
      categories.push("Business");
    }
    if (lowerText.includes("javascript") || lowerText.includes("python")) {
      categories.push("Programming");
    }
    if (categories.length === 0) {
      categories.push("Technology");
    }

    // Detect sentiment
    const positiveWords = ["breakthrough", "success", "growth", "innovation", "launch"];
    const negativeWords = ["crash", "failure", "hack", "breach", "loss"];

    const positiveCount = positiveWords.filter((w) => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => lowerText.includes(w)).length;

    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    if (positiveCount > negativeCount) {
      sentiment = "positive";
    }
    if (negativeCount > positiveCount) {
      sentiment = "negative";
    }

    // Generate summary
    const summary = text.length > 200 ? text.substring(0, 200) + "..." : text;

    // Extract key points
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const keyPoints = sentences.slice(0, 5).map((s) => s.trim());

    // Generate insights
    const insights: Insight[] = [
      {
        id: `insight-${Date.now()}-1`,
        type: "key_point",
        content: `Article discusses ${categories[0]} developments`,
        confidence: 0.85,
        evidence: "Category detection from keywords",
      },
    ];

    if (sentiment !== "neutral") {
      insights.push({
        id: `insight-${Date.now()}-2`,
        type: sentiment === "positive" ? "opportunity" : "risk",
        content: `${sentiment === "positive" ? "Positive" : "Negative"} sentiment detected`,
        confidence: 0.7,
        evidence: "Sentiment analysis",
      });
    }

    return {
      summary,
      keyPoints,
      sentiment,
      categories,
      insights,
      relatedTopics: categories,
    };
  }

  /**
   * Create basic analysis without AI
   */
  private createBasicAnalysis(article: {
    id: string;
    title: string;
    content?: string;
    summary?: string;
    url: string;
    sourceName: string;
    publishedAt: Date;
  }): AnalyzedArticle {
    const text = article.content || article.summary || article.title;

    return {
      id: article.id,
      title: article.title,
      originalUrl: article.url,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt,
      analysis: {
        summary: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
        keyPoints: [article.title],
        sentiment: "neutral",
        categories: ["General"],
        insights: [],
        relatedTopics: [],
      },
      analyzedAt: new Date(),
    };
  }

  /**
   * Generate digest title
   */
  private generateDigestTitle(articles: AnalyzedArticle[], format: string): string {
    const now = new Date();
    const timeStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    if (format === "morning") {
      return `Morning Briefing - ${timeStr}`;
    } else if (format === "afternoon") {
      return `Afternoon Update - ${timeStr}`;
    } else if (format === "evening") {
      return `Daily Recap - ${timeStr}`;
    }

    return `AI Intelligence Digest - ${timeStr}`;
  }

  /**
   * Generate digest summary
   */
  private generateDigestSummary(articles: AnalyzedArticle[], trends: Trend[]): string {
    const topTrends = trends
      .slice(0, 3)
      .map((t) => t.topic)
      .join(", ");
    return `Today's digest covers ${articles.length} articles with key trends in ${topTrends}.`;
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const aiAnalyzer = new AIAnalyzer();
