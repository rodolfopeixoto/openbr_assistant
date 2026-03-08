export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PrunerConfig {
  maxMessages: number;
  keepSystemMessages: boolean;
  maxTokens?: number;
}

export interface PruneOptions {
  compress?: boolean;
}

export class ContextPruner {
  private config: PrunerConfig;

  constructor(config: PrunerConfig) {
    this.config = {
      maxTokens: 4000,
      ...config,
    };
  }

  prune(messages: Message[], options: PruneOptions = {}): Message[] {
    if (messages.length <= this.config.maxMessages) {
      return messages;
    }

    // Separate system messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    // Calculate how many non-system messages we can keep
    const maxNonSystem = this.config.keepSystemMessages
      ? this.config.maxMessages - systemMessages.length
      : this.config.maxMessages;

    // Keep the most recent messages
    const messagesToKeep = nonSystemMessages.slice(-Math.max(0, maxNonSystem));

    // If compression is enabled and we had to prune, add a summary
    if (options.compress && nonSystemMessages.length > maxNonSystem) {
      const prunedCount = nonSystemMessages.length - maxNonSystem;
      const summaryMessage: Message = {
        role: "system",
        content: `[${prunedCount} older messages summarized for context]`,
      };

      if (this.config.keepSystemMessages) {
        return [...systemMessages, summaryMessage, ...messagesToKeep];
      }
      return [summaryMessage, ...messagesToKeep];
    }

    if (this.config.keepSystemMessages) {
      return [...systemMessages, ...messagesToKeep];
    }

    return messagesToKeep;
  }

  estimateTokens(messages: Message[]): number {
    // Rough estimation: ~4 chars per token on average
    let totalChars = 0;
    for (const message of messages) {
      // Base tokens for message structure
      totalChars += 4;
      // Content tokens
      totalChars += message.content.length;
      // Role tokens
      totalChars += message.role.length;
    }
    return Math.ceil(totalChars / 4);
  }

  pruneByTokens(messages: Message[], maxTokens?: number): Message[] {
    const limit = maxTokens || this.config.maxTokens || 4000;

    if (this.estimateTokens(messages) <= limit) {
      return messages;
    }

    // Binary search for the right number of messages
    let low = 1;
    let high = messages.length;
    let bestFit = messages;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testMessages = this.prune(messages, { compress: true });
      const tokens = this.estimateTokens(testMessages);

      if (tokens <= limit) {
        bestFit = testMessages;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return bestFit;
  }

  getStats(messages: Message[]): {
    totalMessages: number;
    estimatedTokens: number;
    systemMessages: number;
    userMessages: number;
    assistantMessages: number;
  } {
    return {
      totalMessages: messages.length,
      estimatedTokens: this.estimateTokens(messages),
      systemMessages: messages.filter((m) => m.role === "system").length,
      userMessages: messages.filter((m) => m.role === "user").length,
      assistantMessages: messages.filter((m) => m.role === "assistant").length,
    };
  }
}

export default ContextPruner;
