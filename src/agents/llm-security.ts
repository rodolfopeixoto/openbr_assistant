export interface PromptInjectionDetection {
  score: number;
  detectedPatterns: string[];
  recommendedAction: "allow" | "warn" | "block";
}

export class LLMSecurityController {
  private injectionPatterns = [
    /ignore\s+(?:all|previous)\s+(?:instructions?|system\s+prompts?)/i,
    /disregard\s+(?:the\s+)?(?:above|previous|earlier)/i,
    /system\s*:\s*/i,
    /<\|.*?\|>/g,
    /\[system\]/i,
    /\[instruction\]/i,
    /you\s+are\s+now\s+(?:a|an)\s+/i,
    /pretend\s+(?:to\s+be|you\s+are)/i,
    /DAN\s*\(Do\s+Anything\s+Now\)/i,
    /jailbreak/i,
    /mode:\s*developer/i,
    // oxlint-disable-next-line no-control-regex -- Intentionally detecting null bytes and control characters
    /(?:\x00|\x01|\x02)/,
    /\\x[0-9a-f]{2}/i,
    /&#x[0-9a-f]+;/i,
  ];

  private jailbreakIndicators = [
    "from now on",
    "you will",
    "new instructions",
    "developer mode",
    "ignore previous",
    "disregard",
  ];

  detectPromptInjection(input: string): PromptInjectionDetection {
    const detectedPatterns: string[] = [];
    let score = 0;

    for (const pattern of this.injectionPatterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
        score += 10;
      }
    }

    const lowerInput = input.toLowerCase();
    for (const indicator of this.jailbreakIndicators) {
      if (lowerInput.includes(indicator)) {
        detectedPatterns.push(`indicator:${indicator}`);
        score += 5;
      }
    }

    const entropy = this.calculateEntropy(input);
    if (entropy > 5.5) {
      detectedPatterns.push("high_entropy");
      score += 10;
    }

    let recommendedAction: "allow" | "warn" | "block" = "allow";
    if (score >= 30) {
      recommendedAction = "block";
    } else if (score >= 15) {
      recommendedAction = "warn";
    }

    return { score, detectedPatterns, recommendedAction };
  }

  sanitizePrompt(input: string): string {
    return (
      input
        .replace(/<\|.*?\|>/g, "[REDACTED]")
        .replace(/\[\s*(?:system|instruction|user|assistant)\s*\]/gi, "[REDACTED]")
        // oxlint-disable-next-line no-control-regex -- Intentionally removing null bytes
        .replace(/\x00/g, "")
    );
  }

  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    const len = str.length;
    let entropy = 0;
    for (const char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
