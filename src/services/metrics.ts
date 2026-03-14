/**
 * Metrics Service
 * Tracks token usage, costs, and performance metrics with time series data
 */

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("metrics");

export interface MetricsQuery {
  period: "1h" | "24h" | "7d" | "30d" | "custom";
  startDate?: string;
  endDate?: string;
  groupBy?: "hour" | "day" | "week";
  filters?: {
    models?: string[];
    providers?: string[];
    sessions?: string[];
  };
}

export interface MetricsDataPoint {
  timestamp: string;
  tokens: number;
  cost: number;
  requests: number;
}

export interface ModelMetrics {
  model: string;
  provider: string;
  tokens: number;
  cost: number;
  requests: number;
  avgLatency: number;
}

export interface ProviderMetrics {
  provider: string;
  tokens: number;
  cost: number;
  requests: number;
}

export interface MetricsSummary {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  avgTokensPerRequest: number;
  avgCostPerRequest: number;
}

export interface MetricsResponse {
  summary: MetricsSummary;
  timeSeries: MetricsDataPoint[];
  byModel: ModelMetrics[];
  byProvider: ProviderMetrics[];
}

export interface MetricsRecord {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  sessionKey?: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  latency: number;
  requestType?: string;
}

// Maximum records to keep in memory (30 days of data)
const MAX_RECORDS = 100000;

export class MetricsService {
  private records: MetricsRecord[] = [];
  private enabled: boolean = true;

  constructor() {
    this.loadRecords();
  }

  private loadRecords(): void {
    try {
      const stored = process.env.METRICS_DATA;
      if (stored) {
        this.records = JSON.parse(stored);
        // Clean old records on load
        this.cleanup();
      }
    } catch {
      this.records = [];
    }
  }

  private saveRecords(): void {
    try {
      // Keep only last 30 days
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = this.records.filter((r) => r.timestamp > cutoff);
      process.env.METRICS_DATA = JSON.stringify(recent);
    } catch {
      log.warn("Failed to save metrics");
    }
  }

  private cleanup(): void {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.records = this.records.filter((r) => r.timestamp > cutoff);

    // If still too many records, keep most recent
    if (this.records.length > MAX_RECORDS) {
      this.records = this.records.slice(-MAX_RECORDS);
    }
  }

  /**
   * Record a new metrics entry
   */
  record(data: Omit<MetricsRecord, "id" | "timestamp">): MetricsRecord {
    if (!this.enabled) {
      return { ...data, id: "", timestamp: Date.now() };
    }

    const record: MetricsRecord = {
      ...data,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.records.push(record);
    this.cleanup();
    this.saveRecords();

    return record;
  }

  /**
   * Query metrics with filters and aggregation
   */
  query(query: MetricsQuery): MetricsResponse {
    const now = Date.now();
    let start: number;
    let end: number = now;

    // Calculate time range
    if (query.period === "custom" && query.startDate && query.endDate) {
      start = new Date(query.startDate).getTime();
      end = new Date(query.endDate).getTime();
    } else {
      const periodMs: Record<string, number> = {
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      };
      start = now - periodMs[query.period];
    }

    // Filter records
    let filtered = this.records.filter((r) => {
      if (r.timestamp < start || r.timestamp > end) {
        return false;
      }
      if (query.filters?.models?.length && !query.filters.models.includes(r.model)) {
        return false;
      }
      if (query.filters?.providers?.length && !query.filters.providers.includes(r.provider)) {
        return false;
      }
      if (query.filters?.sessions?.length && !query.filters.sessions.includes(r.sessionKey || "")) {
        return false;
      }
      return true;
    });

    // Calculate summary
    const totalTokens = filtered.reduce((sum, r) => sum + r.tokensInput + r.tokensOutput, 0);
    const totalCost = filtered.reduce((sum, r) => sum + r.cost, 0);
    const totalRequests = filtered.length;

    const summary: MetricsSummary = {
      totalTokens,
      totalCost,
      totalRequests,
      avgTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
    };

    // Build time series
    const timeSeries = this.buildTimeSeries(filtered, query.groupBy || "day", start, end);

    // Calculate by model
    const byModel = this.calculateByModel(filtered);

    // Calculate by provider
    const byProvider = this.calculateByProvider(filtered);

    return {
      summary,
      timeSeries,
      byModel,
      byProvider,
    };
  }

  /**
   * Get usage for a specific time period
   */
  getUsage(period: MetricsQuery["period"], startDate?: string, endDate?: string): MetricsResponse {
    return this.query({
      period,
      startDate,
      endDate,
      groupBy: period === "1h" ? "hour" : "day",
    });
  }

  /**
   * Get costs breakdown
   */
  getCosts(
    period: MetricsQuery["period"],
    groupBy?: "provider" | "model" | "day",
  ): {
    total: number;
    breakdown: Array<{ name: string; cost: number; percentage: number }>;
  } {
    const metrics = this.query({
      period,
      groupBy: "day",
    });

    let breakdown: Array<{ name: string; cost: number }>;

    if (groupBy === "provider") {
      breakdown = metrics.byProvider.map((p) => ({
        name: p.provider,
        cost: p.cost,
      }));
    } else if (groupBy === "model") {
      breakdown = metrics.byModel.map((m) => ({
        name: m.model,
        cost: m.cost,
      }));
    } else {
      breakdown = metrics.timeSeries.map((t) => ({
        name: t.timestamp.split("T")[0],
        cost: t.cost,
      }));
    }

    const total = breakdown.reduce((sum, b) => sum + b.cost, 0);

    return {
      total,
      breakdown: breakdown
        .map((b) => ({
          ...b,
          percentage: total > 0 ? (b.cost / total) * 100 : 0,
        }))
        .toSorted((a, b) => b.cost - a.cost),
    };
  }

  /**
   * Get model-specific metrics
   */
  getModels(period: MetricsQuery["period"]): ModelMetrics[] {
    const metrics = this.query({
      period,
      groupBy: "day",
    });

    return metrics.byModel;
  }

  /**
   * Get session-specific metrics
   */
  getSessions(period: MetricsQuery["period"]): Array<{
    sessionKey: string;
    tokens: number;
    cost: number;
    requests: number;
  }> {
    const now = Date.now();
    const periodMs: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const start = now - periodMs[period];

    const sessionMap = new Map<string, { tokens: number; cost: number; requests: number }>();

    for (const record of this.records) {
      if (record.timestamp < start) {
        continue;
      }
      if (!record.sessionKey) {
        continue;
      }

      const existing = sessionMap.get(record.sessionKey);
      if (existing) {
        existing.tokens += record.tokensInput + record.tokensOutput;
        existing.cost += record.cost;
        existing.requests++;
      } else {
        sessionMap.set(record.sessionKey, {
          tokens: record.tokensInput + record.tokensOutput,
          cost: record.cost,
          requests: 1,
        });
      }
    }

    return Array.from(sessionMap.entries())
      .map(([sessionKey, data]) => ({
        sessionKey,
        ...data,
      }))
      .toSorted((a, b) => b.cost - a.cost);
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        records: this.records,
      },
      null,
      2,
    );
  }

  /**
   * Export metrics as CSV
   */
  exportCSV(): string {
    const headers = [
      "timestamp",
      "provider",
      "model",
      "tokens_input",
      "tokens_output",
      "cost",
      "latency",
      "session_key",
      "request_type",
    ].join(",");

    const rows = this.records
      .map((r) => {
        return [
          new Date(r.timestamp).toISOString(),
          r.provider,
          r.model,
          r.tokensInput,
          r.tokensOutput,
          r.cost.toFixed(4),
          r.latency,
          r.sessionKey || "",
          r.requestType || "",
        ].join(",");
      })
      .join("\n");

    return `${headers}\n${rows}`;
  }

  /**
   * Enable/disable metrics tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Reset all metrics data
   */
  reset(): void {
    this.records = [];
    this.saveRecords();
  }

  private buildTimeSeries(
    records: MetricsRecord[],
    groupBy: "hour" | "day" | "week",
    start: number,
    end: number,
  ): MetricsDataPoint[] {
    const groups = new Map<string, { tokens: number; cost: number; requests: number }>();

    // Group records
    for (const record of records) {
      const date = new Date(record.timestamp);
      let key: string;

      if (groupBy === "hour") {
        key = `${date.toISOString().split("T")[0]}T${String(date.getHours()).padStart(2, "0")}:00:00`;
      } else if (groupBy === "day") {
        key = date.toISOString().split("T")[0];
      } else {
        // Week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      }

      const existing = groups.get(key);
      if (existing) {
        existing.tokens += record.tokensInput + record.tokensOutput;
        existing.cost += record.cost;
        existing.requests++;
      } else {
        groups.set(key, {
          tokens: record.tokensInput + record.tokensOutput,
          cost: record.cost,
          requests: 1,
        });
      }
    }

    // Fill gaps in time series
    const result: MetricsDataPoint[] = [];
    const interval =
      groupBy === "hour"
        ? 60 * 60 * 1000
        : groupBy === "day"
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;

    for (let t = start; t <= end; t += interval) {
      const date = new Date(t);
      let key: string;

      if (groupBy === "hour") {
        key = `${date.toISOString().split("T")[0]}T${String(date.getHours()).padStart(2, "0")}:00:00`;
      } else if (groupBy === "day") {
        key = date.toISOString().split("T")[0];
      } else {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      }

      const data = groups.get(key);
      result.push({
        timestamp: key,
        tokens: data?.tokens || 0,
        cost: data?.cost || 0,
        requests: data?.requests || 0,
      });
    }

    return result;
  }

  private calculateByModel(records: MetricsRecord[]): ModelMetrics[] {
    const modelMap = new Map<
      string,
      {
        provider: string;
        tokens: number;
        cost: number;
        requests: number;
        latencies: number[];
      }
    >();

    for (const record of records) {
      const existing = modelMap.get(record.model);
      if (existing) {
        existing.tokens += record.tokensInput + record.tokensOutput;
        existing.cost += record.cost;
        existing.requests++;
        existing.latencies.push(record.latency);
      } else {
        modelMap.set(record.model, {
          provider: record.provider,
          tokens: record.tokensInput + record.tokensOutput,
          cost: record.cost,
          requests: 1,
          latencies: [record.latency],
        });
      }
    }

    return Array.from(modelMap.entries())
      .map(([model, data]) => ({
        model,
        provider: data.provider,
        tokens: data.tokens,
        cost: data.cost,
        requests: data.requests,
        avgLatency: data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length,
      }))
      .toSorted((a, b) => b.cost - a.cost);
  }

  private calculateByProvider(records: MetricsRecord[]): ProviderMetrics[] {
    const providerMap = new Map<string, { tokens: number; cost: number; requests: number }>();

    for (const record of records) {
      const existing = providerMap.get(record.provider);
      if (existing) {
        existing.tokens += record.tokensInput + record.tokensOutput;
        existing.cost += record.cost;
        existing.requests++;
      } else {
        providerMap.set(record.provider, {
          tokens: record.tokensInput + record.tokensOutput,
          cost: record.cost,
          requests: 1,
        });
      }
    }

    return Array.from(providerMap.entries())
      .map(([provider, data]) => ({
        provider,
        tokens: data.tokens,
        cost: data.cost,
        requests: data.requests,
      }))
      .toSorted((a, b) => b.cost - a.cost);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let metricsService: MetricsService | null = null;

export function getMetricsService(): MetricsService {
  if (!metricsService) {
    metricsService = new MetricsService();
  }
  return metricsService;
}
