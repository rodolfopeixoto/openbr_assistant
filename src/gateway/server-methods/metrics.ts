import type { GatewayRequestHandlers } from "./types.js";

export interface UsageMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  byModel: Record<string, ModelMetrics>;
  byTool: Record<string, ToolMetrics>;
  daily: DailyMetrics[];
}

export interface ModelMetrics {
  requests: number;
  tokens: number;
  cost: number;
  avgResponseTime: number;
}

export interface ToolMetrics {
  invocations: number;
  avgLatency: number;
  errors: number;
}

export interface DailyMetrics {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

let metrics: UsageMetrics = {
  totalRequests: 0,
  totalTokens: 0,
  totalCost: 0,
  avgResponseTime: 0,
  byModel: {},
  byTool: {},
  daily: [],
};

function getModelMetrics(model: string): ModelMetrics {
  if (!metrics.byModel[model]) {
    metrics.byModel[model] = {
      requests: 0,
      tokens: 0,
      cost: 0,
      avgResponseTime: 0,
    };
  }
  return metrics.byModel[model];
}

function getToolMetrics(tool: string): ToolMetrics {
  if (!metrics.byTool[tool]) {
    metrics.byTool[tool] = {
      invocations: 0,
      avgLatency: 0,
      errors: 0,
    };
  }
  return metrics.byTool[tool];
}

function getDailyMetrics(date: string): DailyMetrics {
  let day = metrics.daily.find((d) => d.date === date);
  if (!day) {
    day = { date, requests: 0, tokens: 0, cost: 0 };
    metrics.daily.push(day);
  }
  return day;
}

export const metricsHandlers: GatewayRequestHandlers = {
  "metrics.usage": async ({ params, respond }) => {
    const { period = "7d" } = params as { period?: string };
    const days = parseInt(period) || 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filteredDaily = metrics.daily.filter((d) => new Date(d.date) >= cutoff);

    respond(true, {
      ...metrics,
      daily: filteredDaily,
      period,
    });
  },

  "metrics.report": async ({ params, respond }) => {
    const { model, tokens, cost, latency, tool, error } = params as {
      model?: string;
      tokens?: number;
      cost?: number;
      latency?: number;
      tool?: string;
      error?: boolean;
    };

    const date = new Date().toISOString().slice(0, 10);
    const day = getDailyMetrics(date);

    if (model) {
      const modelMetrics = getModelMetrics(model);
      modelMetrics.requests++;
      if (tokens) {
        modelMetrics.tokens += tokens;
        day.tokens += tokens;
        metrics.totalTokens += tokens;
      }
      if (cost) {
        modelMetrics.cost += cost;
        day.cost += cost;
        metrics.totalCost += cost;
      }
      if (latency) {
        modelMetrics.avgResponseTime =
          (modelMetrics.avgResponseTime * (modelMetrics.requests - 1) + latency) /
          modelMetrics.requests;
        metrics.avgResponseTime =
          (metrics.avgResponseTime * (metrics.totalRequests - 1) + latency) / metrics.totalRequests;
      }
      metrics.totalRequests++;
      day.requests++;
    }

    if (tool) {
      const toolMetrics = getToolMetrics(tool);
      toolMetrics.invocations++;
      if (latency) {
        toolMetrics.avgLatency =
          (toolMetrics.avgLatency * (toolMetrics.invocations - 1) + latency) /
          toolMetrics.invocations;
      }
      if (error) {
        toolMetrics.errors++;
      }
    }

    respond(true, { ok: true });
  },

  "metrics.models": async ({ respond }) => {
    respond(true, { models: metrics.byModel });
  },

  "metrics.tools": async ({ respond }) => {
    respond(true, { tools: metrics.byTool });
  },

  "metrics.reset": async ({ respond }) => {
    metrics = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
      byModel: {},
      byTool: {},
      daily: [],
    };
    respond(true, { ok: true });
  },
};
