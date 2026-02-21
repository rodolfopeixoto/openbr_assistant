/**
 * Telegram Delivery Service
 * Send newsletters via Telegram Bot
 */

import type { ScheduledDigest } from "../../intelligence/scheduler.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("delivery:telegram");

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode: "HTML" | "Markdown" | "MarkdownV2";
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard: Array<Array<Record<string, unknown>>>;
  };
}

export class TelegramDeliveryService {
  private config: TelegramConfig;
  private baseUrl: string;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`;
  }

  /**
   * Send digest to Telegram
   */
  async sendDigest(digest: ScheduledDigest): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return { success: false, error: "Telegram delivery is disabled" };
    }

    try {
      log.info(`Sending digest "${digest.title}" to Telegram`);

      // Format message
      const message = this.formatDigestMessage(digest);

      // Send to Telegram
      const result = await this.sendMessage({
        chat_id: this.config.chatId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: false,
      });

      if (result.success) {
        log.info(`Digest sent successfully, message ID: ${result.messageId}`);
      } else {
        log.error(`Failed to send digest:`, { error: result.error });
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error("Exception sending digest to Telegram:", { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Send a simple text message
   */
  async sendMessage(message: TelegramMessage): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.description || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.result?.message_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send digest with inline keyboard for interaction
   */
  async sendInteractiveDigest(digest: ScheduledDigest): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return { success: false, error: "Telegram delivery is disabled" };
    }

    try {
      // Format main message
      const message = this.formatDigestMessage(digest);

      // Create inline keyboard with article links
      const keyboard: Array<Record<string, unknown>>[] = digest.articles
        .slice(0, 5)
        .map((article: { title: string; originalUrl: string }, index: number) => [
          {
            text: `${index + 1}. ${article.title.substring(0, 30)}...`,
            url: article.originalUrl,
          },
        ]);

      // Add action buttons
      keyboard.push([
        { text: "💾 Save Digest", callback_data: `save_digest:${digest.id}` },
        { text: "📊 View Insights", callback_data: `insights:${digest.id}` },
      ]);

      const result = await this.sendMessage({
        chat_id: this.config.chatId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error("Exception sending interactive digest:", { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Format digest for Telegram with MarkdownV2
   */
  private formatDigestMessage(digest: ScheduledDigest): string {
    const lines: string[] = [];

    // Title
    lines.push(`📰 *${this.escapeMarkdown(digest.title)}*`);
    lines.push("");

    // Date
    lines.push(`🕐 ${digest.generatedAt.toLocaleDateString()}`);
    lines.push("");

    // Summary if available
    if (digest.articles.length > 0) {
      lines.push(`📊 *${digest.articles.length} articles analyzed*`);
      lines.push("");
    }

    // Top articles
    lines.push("*Top Articles:*");
    lines.push("");

    digest.articles.slice(0, 5).forEach((article, index) => {
      const title = this.escapeMarkdown(article.title);
      const summary = this.escapeMarkdown(article.analysis.summary.substring(0, 100));

      lines.push(`${index + 1}. [${title}](${article.originalUrl})`);
      lines.push(`   ${summary}...`);
      lines.push("");
    });

    // Key insights
    if (digest.keyInsights.length > 0) {
      lines.push("*Key Insights:*");
      lines.push("");

      digest.keyInsights.slice(0, 3).forEach((insight) => {
        const emoji = this.getInsightEmoji(insight.type);
        const content = this.escapeMarkdown(insight.content);
        lines.push(`${emoji} ${content}`);
      });

      lines.push("");
    }

    // Trends
    if (digest.trends.length > 0) {
      lines.push("*Trending Topics:*");
      lines.push("");

      digest.trends.slice(0, 3).forEach((trend) => {
        const emoji = this.getSentimentEmoji(trend.sentiment);
        const topic = this.escapeMarkdown(trend.topic);
        lines.push(`${emoji} ${topic} (${trend.mentions} mentions)`);
      });

      lines.push("");
    }

    // Footer
    lines.push("💡 Use /news to see all articles");
    lines.push("🔍 Use /insights to explore trends");

    return lines.join("\n");
  }

  /**
   * Escape special characters for MarkdownV2
   */
  private escapeMarkdown(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/_/g, "\\_")
      .replace(/\*/g, "\\*")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/~/g, "\\~")
      .replace(/`/g, "\\`")
      .replace(/>/g, "\\>")
      .replace(/#/g, "\\#")
      .replace(/\+/g, "\\+")
      .replace(/-/g, "\\-")
      .replace(/=/g, "\\=")
      .replace(/\|/g, "\\|")
      .replace(/{/g, "\\{")
      .replace(/}/g, "\\}")
      .replace(/\./g, "\\.")
      .replace(/!/g, "\\!");
  }

  /**
   * Get emoji for insight type
   */
  private getInsightEmoji(type: string): string {
    switch (type) {
      case "trend":
        return "📈";
      case "opportunity":
        return "💡";
      case "risk":
        return "⚠️";
      case "key_point":
        return "🔑";
      default:
        return "•";
    }
  }

  /**
   * Get emoji for sentiment
   */
  private getSentimentEmoji(sentiment: string): string {
    switch (sentiment) {
      case "positive":
        return "📈";
      case "negative":
        return "📉";
      case "neutral":
      default:
        return "➡️";
    }
  }

  /**
   * Test connection to Telegram API
   */
  async testConnection(): Promise<{
    success: boolean;
    botInfo?: { id: number; first_name: string; username: string };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.description || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        botInfo: {
          id: data.result.id,
          first_name: data.result.first_name,
          username: data.result.username,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<{
    success: boolean;
    info?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      can_join_groups?: boolean;
      can_read_all_group_messages?: boolean;
      supports_inline_queries?: boolean;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.description || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        info: data.result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Factory function
export function createTelegramDeliveryService(config: TelegramConfig): TelegramDeliveryService {
  return new TelegramDeliveryService(config);
}
