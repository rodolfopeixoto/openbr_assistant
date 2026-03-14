export class AIClassifier {
  private categories: Record<string, { keywords: string[]; weight: number }> = {
    llm: {
      keywords: [
        "gpt",
        "llm",
        "large language model",
        "transformer",
        "openai",
        "anthropic",
        "claude",
        "gemini",
        "nlp",
        "natural language",
        "text generation",
        "chatbot",
        "token",
        "embedding",
      ],
      weight: 1.0,
    },
    vision: {
      keywords: [
        "computer vision",
        "cv",
        "image recognition",
        "cnn",
        "convolutional",
        "object detection",
        "segmentation",
        "diffusion",
        "stable diffusion",
        "dalle",
        "midjourney",
        "vision transformer",
        "vit",
      ],
      weight: 1.0,
    },
    robotics: {
      keywords: [
        "robot",
        "robotics",
        "humanoid",
        "automation",
        "boston dynamics",
        "tesla bot",
        "figure ai",
        "embodied ai",
        "manipulation",
        "locomotion",
      ],
      weight: 1.0,
    },
    research: {
      keywords: [
        "research",
        "paper",
        "arxiv",
        "study",
        "experiment",
        "benchmark",
        "state of the art",
        "sota",
        "breakthrough",
        "novel",
        "method",
        "approach",
        "architecture",
      ],
      weight: 0.8,
    },
    security: {
      keywords: [
        "security",
        "safety",
        "alignment",
        "adversarial",
        "attack",
        "vulnerability",
        "privacy",
        "red team",
        "jailbreak",
        "prompt injection",
      ],
      weight: 0.9,
    },
    business: {
      keywords: [
        "funding",
        "investment",
        "startup",
        "unicorn",
        "acquisition",
        "ipo",
        "valuation",
        "revenue",
        "profit",
        "market",
      ],
      weight: 0.7,
    },
  };

  async classify(text: string): Promise<string | null> {
    const scores: Record<string, number> = {};
    const lowerText = text.toLowerCase();

    // Calculate score for each category
    for (const [category, config] of Object.entries(this.categories)) {
      let score = 0;
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "g");
        const matches = lowerText.match(regex);
        if (matches) {
          score += matches.length * config.weight;
        }
      }
      scores[category] = score;
    }

    // Find category with highest score
    let bestCategory: string | null = null;
    let bestScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // Only return if score is above threshold
    if (bestScore >= 1) {
      return bestCategory;
    }

    return null;
  }

  async classifyWithConfidence(
    text: string,
  ): Promise<{ category: string | null; confidence: number } | null> {
    const scores: Record<string, number> = {};
    const lowerText = text.toLowerCase();

    for (const [category, config] of Object.entries(this.categories)) {
      let score = 0;
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "g");
        const matches = lowerText.match(regex);
        if (matches) {
          score += matches.length * config.weight;
        }
      }
      scores[category] = score;
    }

    // Find best category
    let bestCategory: string | null = null;
    let bestScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    if (bestScore >= 1) {
      // Calculate confidence (0-1)
      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      const confidence = totalScore > 0 ? bestScore / totalScore : 0;

      return { category: bestCategory, confidence };
    }

    return null;
  }
}

export default AIClassifier;
