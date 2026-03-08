import type {
  Channel,
  ChannelType,
  ChannelStatus,
  ChannelStatusInfo,
  ChannelMetrics,
  RouteResult,
  UnifiedStatus,
  HealthStatus,
  TestResult,
} from "./types.js";

export class UnifiedChannelManager {
  private channels: Map<string, Channel> = new Map();
  private statuses: Map<string, ChannelStatusInfo> = new Map();
  private metrics: Map<string, ChannelMetrics> = new Map();

  registerChannel(channel: Channel): void {
    if (this.channels.has(channel.id)) {
      console.warn(`[UnifiedChannelManager] Channel ${channel.id} already registered, updating...`);
    }

    const now = new Date().toISOString();
    this.channels.set(channel.id, {
      ...channel,
      createdAt: channel.createdAt || now,
      updatedAt: now,
    });

    // Initialize status if not exists
    if (!this.statuses.has(channel.id)) {
      this.statuses.set(channel.id, {
        channelId: channel.id,
        status: "offline",
      });
    }

    // Initialize metrics if not exists
    if (!this.metrics.has(channel.id)) {
      this.metrics.set(channel.id, {
        channelId: channel.id,
        messagesSent: 0,
        messagesReceived: 0,
        messagesFailed: 0,
        successRate: 1.0,
        averageLatency: 0,
        lastActivity: now,
      });
    }
  }

  unregisterChannel(channelId: string): boolean {
    const deleted = this.channels.delete(channelId);
    this.statuses.delete(channelId);
    this.metrics.delete(channelId);
    return deleted;
  }

  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  getAllChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  getChannelsByType(type: ChannelType): Channel[] {
    return this.getAllChannels().filter((c) => c.type === type);
  }

  getEnabledChannels(): Channel[] {
    return this.getAllChannels().filter((c) => c.enabled);
  }

  updateChannel(channelId: string, updates: Partial<Channel>): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    this.channels.set(channelId, {
      ...channel,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  updateChannelStatus(channelId: string, status: ChannelStatus, error?: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const currentStatus = this.statuses.get(channelId);
    const now = new Date().toISOString();

    this.statuses.set(channelId, {
      channelId,
      status,
      lastSeen: status === "online" ? now : currentStatus?.lastSeen,
      lastError: error || currentStatus?.lastError,
      connectedSince:
        status === "online" && currentStatus?.status !== "online"
          ? now
          : currentStatus?.connectedSince,
    });

    return true;
  }

  getChannelStatus(channelId: string): ChannelStatusInfo {
    return (
      this.statuses.get(channelId) || {
        channelId,
        status: "offline",
      }
    );
  }

  getAllStatuses(): ChannelStatusInfo[] {
    return Array.from(this.statuses.values());
  }

  recordMessageSent(channelId: string, success: boolean = true, latency: number = 0): void {
    const metrics = this.metrics.get(channelId);
    if (!metrics) return;

    if (success) {
      metrics.messagesSent++;
    } else {
      metrics.messagesFailed++;
    }

    // Update success rate
    const total = metrics.messagesSent + metrics.messagesFailed;
    metrics.successRate = total > 0 ? metrics.messagesSent / total : 1.0;

    // Update average latency
    if (latency > 0) {
      const oldAvg = metrics.averageLatency;
      const count = metrics.messagesSent;
      metrics.averageLatency = (oldAvg * (count - 1) + latency) / count;
    }

    metrics.lastActivity = new Date().toISOString();
  }

  recordMessageReceived(channelId: string): void {
    const metrics = this.metrics.get(channelId);
    if (!metrics) return;

    metrics.messagesReceived++;
    metrics.lastActivity = new Date().toISOString();
  }

  getChannelMetrics(channelId: string): ChannelMetrics | undefined {
    return this.metrics.get(channelId);
  }

  getAllMetrics(): ChannelMetrics[] {
    return Array.from(this.metrics.values());
  }

  selectRoute(type: ChannelType, requireEnabled: boolean = true): RouteResult | null {
    const candidates = this.getChannelsByType(type);

    if (candidates.length === 0) return null;

    // Score each candidate
    const scored = candidates
      .filter((c) => !requireEnabled || c.enabled)
      .map((channel) => {
        const status = this.getChannelStatus(channel.id);
        const metrics = this.getChannelMetrics(channel.id);

        // Calculate health score (0-100)
        let healthScore = 50;

        // Status bonus/penalty
        if (status.status === "online") healthScore += 30;
        else if (status.status === "error") healthScore -= 30;
        else if (status.status === "offline") healthScore -= 20;

        // Success rate bonus
        if (metrics) {
          healthScore += metrics.successRate * 20;

          // Latency penalty
          if (metrics.averageLatency > 1000) healthScore -= 10;
          if (metrics.averageLatency > 5000) healthScore -= 20;
        }

        return {
          channel,
          status,
          metrics,
          healthScore: Math.max(0, Math.min(100, healthScore)),
        };
      })
      .sort((a, b) => b.healthScore - a.healthScore);

    if (scored.length === 0) return null;

    const best = scored[0];
    return {
      channelId: best.channel.id,
      channelName: best.channel.name,
      channelType: best.channel.type,
      healthScore: best.healthScore,
      estimatedLatency: best.metrics?.averageLatency || 100,
      reason: `Selected based on health score: ${best.healthScore}/100`,
    };
  }

  selectRouteWithFallback(
    preferredType: ChannelType,
    fallbackTypes: ChannelType[],
  ): RouteResult | null {
    // Try preferred type
    const preferred = this.selectRoute(preferredType);
    if (preferred && preferred.healthScore > 50) {
      return preferred;
    }

    // Try fallbacks
    for (const type of fallbackTypes) {
      const route = this.selectRoute(type);
      if (route && route.healthScore > 50) {
        return {
          ...route,
          reason: `Fallback from ${preferredType}: ${route.reason}`,
        };
      }
    }

    // Return preferred even if not great, or first available
    if (preferred) return preferred;

    // Last resort: any online channel
    for (const type of fallbackTypes) {
      const route = this.selectRoute(type, false);
      if (route) return route;
    }

    return null;
  }

  getUnifiedStatus(): UnifiedStatus {
    const channels = this.getAllChannels();
    const statuses = this.getAllStatuses();

    const byType: UnifiedStatus["byType"] = {} as any;

    channels.forEach((channel) => {
      const status = this.getChannelStatus(channel.id);
      if (!byType[channel.type]) {
        byType[channel.type] = { total: 0, online: 0 };
      }
      byType[channel.type].total++;
      if (status.status === "online") {
        byType[channel.type].online++;
      }
    });

    return {
      total: channels.length,
      enabled: channels.filter((c) => c.enabled).length,
      online: statuses.filter((s) => s.status === "online").length,
      offline: statuses.filter((s) => s.status === "offline").length,
      error: statuses.filter((s) => s.status === "error").length,
      byType,
    };
  }

  getHealthStatus(): HealthStatus {
    const status = this.getUnifiedStatus();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check overall health
    const onlineRatio = status.total > 0 ? status.online / status.total : 0;
    let score = onlineRatio * 100;

    if (status.error > 0) {
      issues.push(`${status.error} channel(s) in error state`);
      score -= status.error * 10;
    }

    if (status.offline > status.online) {
      issues.push("More channels offline than online");
      recommendations.push("Check channel configurations and connectivity");
    }

    if (onlineRatio < 0.5) {
      recommendations.push("Consider enabling backup channels");
    }

    // Check success rates
    const metrics = this.getAllMetrics();
    const lowSuccess = metrics.filter((m) => m.successRate < 0.8);
    if (lowSuccess.length > 0) {
      issues.push(`${lowSuccess.length} channel(s) with low success rate`);
      recommendations.push("Review failed messages and error logs");
    }

    return {
      healthy: score >= 70 && issues.length === 0,
      score: Math.max(0, Math.min(100, score)),
      issues,
      recommendations,
    };
  }

  setChannelsEnabled(channelIds: string[], enabled: boolean): void {
    channelIds.forEach((id) => {
      this.updateChannel(id, { enabled });
    });
  }

  async testChannel(channelId: string): Promise<TestResult> {
    const start = Date.now();
    const channel = this.getChannel(channelId);

    if (!channel) {
      return {
        channelId,
        success: false,
        latency: 0,
        error: "Channel not found",
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Simulate test based on channel type
      // In real implementation, this would actually test the channel
      await new Promise((resolve) => setTimeout(resolve, 100));

      const latency = Date.now() - start;

      return {
        channelId,
        success: true,
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        channelId,
        success: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async testAllChannels(): Promise<TestResult[]> {
    const channels = this.getEnabledChannels();
    const results = await Promise.all(channels.map((c) => this.testChannel(c.id)));
    return results;
  }

  exportConfig(): { channels: Channel[] } {
    return {
      channels: this.getAllChannels(),
    };
  }

  importConfig(config: { channels: Channel[] }): void {
    this.channels.clear();
    this.statuses.clear();
    this.metrics.clear();

    config.channels.forEach((channel) => {
      this.registerChannel(channel);
    });
  }
}

export default UnifiedChannelManager;
