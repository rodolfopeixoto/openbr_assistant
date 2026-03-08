import type { NewsItem } from "../../news-aggregator.js";

export class RelevanceScorer {
  private aiKeywords: string[] = [
    "ai",
    "artificial intelligence",
    "machine learning",
    "ml",
    "deep learning",
    "neural network",
    "gpt",
    "llm",
    "large language model",
    "openai",
    "anthropic",
    "claude",
    "gemini",
    "transformer",
    "nlp",
    "computer vision",
    "cv",
    "robotics",
    "automation",
    "neural",
  ];

  calculate(item: NewsItem): number {
    let score = 0;

    // Base score for AI-related content
    const text = `${item.title} ${item.summary}`.toLowerCase();
    const aiMatches = this.aiKeywords.filter((keyword) => {
      return text.includes(keyword.toLowerCase());
    });
    score += Math.min(aiMatches.length * 5, 40); // Max 40 points for keywords

    // Engagement score (likes, comments, etc)
    if (item.engagement) {
      const engagementScore = Math.min(item.engagement.score / 100, 30); // Max 30 points
      score += engagementScore;
    }

    // Source authority
    const authorityScore = this.getSourceAuthority(item.source);
    score += authorityScore;

    // Recency bonus (within 24 hours)
    const publishedDate = new Date(item.publishedAt);
    const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) {
      score += 10;
    } else if (hoursAgo < 48) {
      score += 5;
    }

    // Category bonus
    if (item.categories.includes("ai")) {
      score += 10;
    }

    // Sentiment bonus (positive content)
    if (item.sentiment === "positive") {
      score += 5;
    }

    // Normalize to 0-100
    return Math.min(Math.round(score), 100);
  }

  private getSourceAuthority(source: string): number {
    const authorityMap: Record<string, number> = {
      twitter: 10,
      hackernews: 15,
      reddit: 8,
      devto: 7,
      rss: 5,
    };

    return authorityMap[source] || 5;
  }
}

export default RelevanceScorer;
