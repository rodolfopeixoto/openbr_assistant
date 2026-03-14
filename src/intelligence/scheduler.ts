/**
 * Newsletter Scheduler Service
 * Automated collection and delivery scheduling
 */

import type { RawArticle, AnalyzedArticle } from "../intelligence/index.js";
import { getConfig } from "../config/intelligence-config.js";
import { aiAnalyzer } from "../intelligence/analyzer.js";
import { newsCollector } from "../intelligence/collector.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("newsletter:scheduler");

export type DigestType = "morning" | "afternoon" | "evening" | "realtime";

export interface ScheduledDigest {
  id: string;
  type: DigestType;
  userId: string;
  title: string;
  articles: AnalyzedArticle[];
  trends: Array<{
    topic: string;
    mentions: number;
    sentiment: string;
  }>;
  keyInsights: Array<{
    type: string;
    content: string;
    confidence: number;
  }>;
  generatedAt: Date;
  scheduledFor: Date;
  delivered: boolean;
  deliveredAt?: Date;
}

export interface SchedulerConfig {
  enabled: boolean;
  timezone: string;
  schedules: {
    morning: { time: string; enabled: boolean };
    afternoon: { time: string; enabled: boolean };
    evening: { time: string; enabled: boolean };
  };
  maxArticlesPerDigest: number;
  channels: string[];
}

export class NewsletterScheduler {
  private config: SchedulerConfig;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(config?: Partial<SchedulerConfig>) {
    const appConfig = getConfig();

    this.config = {
      enabled: true,
      timezone: "UTC",
      schedules: {
        morning: { time: "08:00", enabled: appConfig.intelligence.delivery.schedule.morning },
        afternoon: { time: "14:00", enabled: appConfig.intelligence.delivery.schedule.afternoon },
        evening: { time: "19:00", enabled: appConfig.intelligence.delivery.schedule.evening },
      },
      maxArticlesPerDigest: 10,
      channels: ["telegram"],
      ...config,
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;
    log.info("Starting newsletter scheduler");

    // Schedule all digest types
    this.scheduleDigest("morning");
    this.scheduleDigest("afternoon");
    this.scheduleDigest("evening");

    log.info("Scheduler started with schedules:", this.config.schedules);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;

    for (const [type, timer] of this.timers) {
      clearTimeout(timer);
      this.timers.delete(type);
      log.info(`Cancelled ${type} digest schedule`);
    }

    log.info("Scheduler stopped");
  }

  /**
   * Generate digest immediately (manual trigger)
   */
  async generateDigestNow(type: DigestType, userId: string): Promise<ScheduledDigest> {
    log.info(`Manually generating ${type} digest for user ${userId}`);

    try {
      // 1. Collect articles
      log.info("Collecting articles...");
      const fetchResults = await newsCollector.fetchAll();

      const allArticles: RawArticle[] = [];
      for (const [, result] of fetchResults) {
        allArticles.push(...result.articles);
      }

      if (allArticles.length === 0) {
        throw new Error("No articles collected");
      }

      log.info(`Collected ${allArticles.length} articles`);

      // 2. Analyze articles
      log.info("Analyzing articles with AI...");
      const analyzedArticles = await aiAnalyzer.analyzeBatch(allArticles);
      log.info(`Analyzed ${analyzedArticles.length} articles`);

      // 3. Generate digest
      const format = type === "morning" ? "full" : type === "afternoon" ? "medium" : "short";
      const digest = aiAnalyzer.generateDigest(analyzedArticles, format);

      // 4. Create scheduled digest object
      const scheduledDigest: ScheduledDigest = {
        id: `digest-${Date.now()}`,
        type,
        userId,
        title: digest.title,
        articles: digest.articles,
        trends: digest.trends.map((t) => ({
          topic: t.topic,
          mentions: t.mentions,
          sentiment: t.sentiment,
        })),
        keyInsights: digest.keyInsights.map((i) => ({
          type: i.type,
          content: i.content,
          confidence: i.confidence,
        })),
        generatedAt: new Date(),
        scheduledFor: new Date(),
        delivered: false,
      };

      log.info(`Generated digest "${digest.title}" with ${digest.articles.length} articles`);

      return scheduledDigest;
    } catch (error) {
      log.error("Failed to generate digest:", { error: String(error) });
      throw error;
    }
  }

  /**
   * Schedule a specific digest type
   */
  private scheduleDigest(type: DigestType): void {
    if (type === "realtime") {
      return; // Realtime is not scheduled
    }

    const schedule = this.config.schedules[type];
    if (!schedule.enabled) {
      log.info(`${type} digest is disabled`);
      return;
    }

    const nextRun = this.calculateNextRun(schedule.time);
    const delay = nextRun.getTime() - Date.now();

    log.info(
      `Scheduling ${type} digest for ${nextRun.toISOString()} (${Math.round(delay / 1000 / 60)} minutes)`,
    );

    const timer = setTimeout(async () => {
      await this.executeScheduledDigest(type);
      // Reschedule for next day
      this.scheduleDigest(type);
    }, delay);

    this.timers.set(type, timer);
  }

  /**
   * Execute scheduled digest
   */
  private async executeScheduledDigest(type: DigestType): Promise<void> {
    log.info(`Executing scheduled ${type} digest`);

    try {
      // For now, use a default user ID
      // In production, this would iterate over all users with this schedule enabled
      const userId = "default";

      const digest = await this.generateDigestNow(type, userId);

      // Save to database
      await this.saveDigest(digest);

      // Deliver to channels
      await this.deliverDigest(digest);

      log.info(`${type} digest completed successfully`);
    } catch (error) {
      log.error(`Failed to execute ${type} digest:`, { error: String(error) });
    }
  }

  /**
   * Deliver digest through configured channels
   */
  private async deliverDigest(digest: ScheduledDigest): Promise<void> {
    log.info(`Delivering digest "${digest.title}" to channels: ${this.config.channels.join(", ")}`);

    for (const channel of this.config.channels) {
      try {
        switch (channel) {
          case "telegram":
            await this.deliverToTelegram(digest);
            break;
          case "whatsapp":
            // TODO: Implement WhatsApp delivery
            log.info("WhatsApp delivery not yet implemented");
            break;
          case "slack":
            // TODO: Implement Slack delivery
            log.info("Slack delivery not yet implemented");
            break;
          case "email":
            // TODO: Implement Email delivery
            log.info("Email delivery not yet implemented");
            break;
          default:
            log.warn(`Unknown channel: ${channel}`);
        }
      } catch (error) {
        log.error(`Failed to deliver to ${channel}:`, { error: String(error) });
      }
    }

    // Mark as delivered
    digest.delivered = true;
    digest.deliveredAt = new Date();
  }

  /**
   * Deliver to Telegram
   */
  private async deliverToTelegram(digest: ScheduledDigest): Promise<void> {
    log.info("Delivering to Telegram...");

    // Format message for Telegram
    const message = this.formatForTelegram(digest);

    // TODO: Actually send via Telegram bot
    // This will be implemented in the channel delivery service
    log.info("Telegram message prepared:", { preview: message.substring(0, 100) + "..." });
  }

  /**
   * Format digest for Telegram
   */
  private formatForTelegram(digest: ScheduledDigest): string {
    const lines: string[] = [
      `📰 *${digest.title}*`,
      "",
      `🕐 ${digest.generatedAt.toLocaleDateString()}`,
      "",
      "📰 *Top Articles:*",
      "",
    ];

    digest.articles.slice(0, 5).forEach((article, index) => {
      lines.push(`${index + 1}. [${article.title}](${article.originalUrl})`);
      lines.push(`   ${article.analysis.summary.substring(0, 100)}...`);
      lines.push("");
    });

    if (digest.trends.length > 0) {
      lines.push("📈 *Trending Topics:*");
      digest.trends.slice(0, 3).forEach((trend) => {
        const emoji =
          trend.sentiment === "positive" ? "📈" : trend.sentiment === "negative" ? "📉" : "➡️";
        lines.push(`${emoji} ${trend.topic} (${trend.mentions} mentions)`);
      });
      lines.push("");
    }

    lines.push("💡 Use /news to see all articles or /insights to explore trends");

    return lines.join("\n");
  }

  /**
   * Calculate next run time for a schedule
   */
  private calculateNextRun(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    const next = new Date();

    next.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Save digest to database
   */
  private async saveDigest(digest: ScheduledDigest): Promise<void> {
    // TODO: Implement database save
    log.info(`Saving digest ${digest.id} to database`);
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    nextRuns: Record<string, string>;
    config: SchedulerConfig;
  } {
    const nextRuns: Record<string, string> = {};

    for (const [type, schedule] of Object.entries(this.config.schedules)) {
      if (schedule.enabled) {
        const next = this.calculateNextRun(schedule.time);
        nextRuns[type] = next.toISOString();
      }
    }

    return {
      isRunning: this.isRunning,
      nextRuns,
      config: this.config,
    };
  }
}

// Singleton instance
export const newsletterScheduler = new NewsletterScheduler();
