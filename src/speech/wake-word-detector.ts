/**
 * Wake Word Detector
 * Detects wake words like "clawd" in transcribed text
 *
 * Features:
 * - Multiple wake words support
 * - Configurable sensitivity
 * - Cooldown between activations
 * - Fuzzy matching for typos
 */

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("speech:wake-word");

export interface WakeWordConfig {
  words: string[];
  aliases?: string[];
  sensitivity?: number;
  cooldownMs?: number;
  caseSensitive?: boolean;
}

export interface WakeWordMatch {
  matched: boolean;
  word: string;
  confidence: number;
  command?: string;
}

export class WakeWordDetector {
  private config: WakeWordConfig;
  private lastActivation: number = 0;
  private patterns: RegExp[] = [];

  constructor(config?: Partial<WakeWordConfig>) {
    this.config = {
      words: ["clawd", "openclaw"],
      aliases: ["hey claw", "claw"],
      sensitivity: 0.7,
      cooldownMs: 2000,
      caseSensitive: false,
      ...config,
    };

    this.buildPatterns();

    log.info("Wake word detector initialized", {
      words: this.config.words,
      aliases: this.config.aliases,
    });
  }

  /**
   * Detect wake word in text
   */
  detect(text: string): WakeWordMatch {
    const now = Date.now();

    // Check cooldown
    if (now - this.lastActivation < this.config.cooldownMs!) {
      return { matched: false, word: "", confidence: 0 };
    }

    // Normalize text
    const normalizedText = this.config.caseSensitive ? text : text.toLowerCase();

    // Check for wake words
    for (const pattern of this.patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        this.lastActivation = now;

        // Extract command after wake word
        const command = this.extractCommand(normalizedText, match[0]);

        log.info("Wake word detected", {
          word: match[0],
          command,
          text: normalizedText.substring(0, 50),
        });

        return {
          matched: true,
          word: match[0],
          confidence: 1.0,
          command,
        };
      }
    }

    return { matched: false, word: "", confidence: 0 };
  }

  /**
   * Check if text starts with wake word (for command mode)
   */
  detectStart(text: string): WakeWordMatch {
    const normalizedText = this.config.caseSensitive ? text.trim() : text.trim().toLowerCase();

    for (const word of this.config.words) {
      const normalizedWord = this.config.caseSensitive ? word : word.toLowerCase();

      // Check exact match at start
      if (normalizedText.startsWith(normalizedWord + " ") || normalizedText === normalizedWord) {
        const command = normalizedText.substring(normalizedWord.length).trim();

        return {
          matched: true,
          word: word,
          confidence: 1.0,
          command: command || undefined,
        };
      }

      // Fuzzy match for typos
      const similarity = this.calculateSimilarity(
        normalizedText.substring(0, normalizedWord.length),
        normalizedWord,
      );

      if (similarity >= this.config.sensitivity!) {
        const command = normalizedText.substring(normalizedWord.length).trim();

        return {
          matched: true,
          word: word,
          confidence: similarity,
          command: command || undefined,
        };
      }
    }

    return { matched: false, word: "", confidence: 0 };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WakeWordConfig>): void {
    this.config = { ...this.config, ...config };
    this.buildPatterns();

    log.info("Wake word config updated", {
      words: this.config.words,
    });
  }

  /**
   * Add new wake word
   */
  addWakeWord(word: string): void {
    if (!this.config.words.includes(word)) {
      this.config.words.push(word);
      this.buildPatterns();
    }
  }

  /**
   * Remove wake word
   */
  removeWakeWord(word: string): void {
    this.config.words = this.config.words.filter((w) => w !== word);
    this.buildPatterns();
  }

  /**
   * Get current configuration
   */
  getConfig(): WakeWordConfig {
    return { ...this.config };
  }

  /**
   * Reset cooldown (for testing)
   */
  resetCooldown(): void {
    this.lastActivation = 0;
  }

  /**
   * Check if in cooldown
   */
  isInCooldown(): boolean {
    return Date.now() - this.lastActivation < this.config.cooldownMs!;
  }

  /**
   * Build regex patterns for wake words
   */
  private buildPatterns(): void {
    this.patterns = [];

    const allWords = [...this.config.words, ...(this.config.aliases || [])];

    for (const word of allWords) {
      // Create pattern with word boundaries and optional punctuation
      const pattern = new RegExp(
        `\\b${this.escapeRegex(word)}\\b`,
        this.config.caseSensitive ? "g" : "gi",
      );
      this.patterns.push(pattern);
    }
  }

  /**
   * Extract command after wake word
   */
  private extractCommand(text: string, wakeWord: string): string | undefined {
    const index = text.toLowerCase().indexOf(wakeWord.toLowerCase());
    if (index === -1) {
      return undefined;
    }

    const after = text.substring(index + wakeWord.length).trim();

    // Remove common punctuation
    return after.replace(/^[,.:!?\s]+/, "").trim() || undefined;
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateSimilarity(a: string, b: string): number {
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

// Singleton instance with default config
export const wakeWordDetector = new WakeWordDetector();
