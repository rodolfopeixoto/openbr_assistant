import type { AppViewState } from "../app-view-state.js";

export interface MetricsSummary {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  avgTokensPerRequest: number;
  avgCostPerRequest: number;
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

export interface MetricsResponse {
  summary: MetricsSummary;
  timeSeries: MetricsDataPoint[];
  byModel: ModelMetrics[];
  byProvider: ProviderMetrics[];
}

export interface CostBreakdown {
  total: number;
  breakdown: Array<{
    name: string;
    cost: number;
    percentage: number;
  }>;
}

export type MetricsPeriod = "1h" | "24h" | "7d" | "30d";

export async function loadMetrics(
  state: AppViewState,
  period: MetricsPeriod = "24h"
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.metricsLoading = true;
  state.metricsError = null;

  try {
    const result = (await state.client.request("metrics.usage", { period })) as MetricsResponse;
    state.metricsStatus = result as unknown as Record<string, unknown>;
  } catch (err) {
    state.metricsError = err instanceof Error ? err.message : "Failed to load metrics";
    console.error("[Metrics] Failed to load:", err);
  } finally {
    state.metricsLoading = false;
  }
}

export async function getCosts(
  state: AppViewState,
  period: MetricsPeriod = "24h",
  groupBy: "provider" | "model" | "day" = "day"
): Promise<CostBreakdown | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("metrics.costs", {
      period,
      groupBy,
    })) as CostBreakdown;
    return result;
  } catch (err) {
    console.error("[Metrics] Failed to get costs:", err);
    return null;
  }
}

export async function getModels(
  state: AppViewState,
  period: MetricsPeriod = "24h"
): Promise<ModelMetrics[] | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("metrics.models", { period })) as {
      models: ModelMetrics[];
    };
    return result.models;
  } catch (err) {
    console.error("[Metrics] Failed to get models:", err);
    return null;
  }
}

export async function getSessions(
  state: AppViewState,
  period: MetricsPeriod = "24h"
): Promise<
  | Array<{
      sessionKey: string;
      tokens: number;
      cost: number;
      requests: number;
    }>
  | null
> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("metrics.sessions", { period })) as {
      sessions: Array<{
        sessionKey: string;
        tokens: number;
        cost: number;
        requests: number;
      }>;
    };
    return result.sessions;
  } catch (err) {
    console.error("[Metrics] Failed to get sessions:", err);
    return null;
  }
}

export async function exportMetrics(
  state: AppViewState,
  format: "json" | "csv" = "csv"
): Promise<string | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("metrics.export", { format })) as {
      csv?: string;
      json?: string;
    };
    return format === "csv" ? result.csv || null : result.json || null;
  } catch (err) {
    console.error("[Metrics] Failed to export:", err);
    return null;
  }
}

export async function resetMetrics(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("metrics.reset");
    await loadMetrics(state);
  } catch (err) {
    console.error("[Metrics] Failed to reset:", err);
    throw err;
  }
}
