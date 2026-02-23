import type { GatewayRequestHandlers } from "./types.js";

export interface RateLimitsConfig {
  enabled: boolean;
  defaultLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  toolLimits: Record<string, ToolRateLimit>;
}

export interface ToolRateLimit {
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrent: number;
  cooldownMs: number;
}

export interface RateLimitStatus {
  enabled: boolean;
  currentUsage: {
    totalRequests: number;
    totalTokens: number;
  };
  toolStats: Record<string, ToolUsageStats>;
}

export interface ToolUsageStats {
  requestsThisMinute: number;
  tokensThisMinute: number;
  concurrentCalls: number;
  lastCallAt: number | null;
  blockedThisMinute: number;
}

const DEFAULT_CONFIG: RateLimitsConfig = {
  enabled: true,
  defaultLimits: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
  },
  toolLimits: {
    web_search: {
      requestsPerMinute: 20,
      tokensPerMinute: 50000,
      concurrent: 3,
      cooldownMs: 1000,
    },
    browser: {
      requestsPerMinute: 30,
      tokensPerMinute: 80000,
      concurrent: 5,
      cooldownMs: 500,
    },
    code_interpreter: {
      requestsPerMinute: 10,
      tokensPerMinute: 30000,
      concurrent: 2,
      cooldownMs: 2000,
    },
    read_file: {
      requestsPerMinute: 100,
      tokensPerMinute: 200000,
      concurrent: 10,
      cooldownMs: 100,
    },
  },
};

let config: RateLimitsConfig = { ...DEFAULT_CONFIG };
let stats: Record<string, ToolUsageStats> = {};

function getToolStats(tool: string): ToolUsageStats {
  if (!stats[tool]) {
    stats[tool] = {
      requestsThisMinute: 0,
      tokensThisMinute: 0,
      concurrentCalls: 0,
      lastCallAt: null,
      blockedThisMinute: 0,
    };
  }
  return stats[tool];
}

export const rateLimitsHandlers: GatewayRequestHandlers = {
  "rate-limits.status": async ({ respond }) => {
    const totalRequests = Object.values(stats).reduce((sum, s) => sum + s.requestsThisMinute, 0);
    const totalTokens = Object.values(stats).reduce((sum, s) => sum + s.tokensThisMinute, 0);

    respond(true, {
      enabled: config.enabled,
      config,
      currentUsage: { totalRequests, totalTokens },
      toolStats: stats,
    });
  },

  "rate-limits.configure": async ({ params, respond }) => {
    const { enabled, defaultLimits, toolLimits } = params as Partial<RateLimitsConfig>;
    if (enabled !== undefined) {
      config.enabled = enabled;
    }
    if (defaultLimits) {
      config.defaultLimits = { ...config.defaultLimits, ...defaultLimits };
    }
    if (toolLimits) {
      config.toolLimits = { ...config.toolLimits, ...toolLimits };
    }
    respond(true, { ok: true, config });
  },

  "rate-limits.check": async ({ params, respond }) => {
    const { tool, estimatedTokens = 0 } = params as { tool: string; estimatedTokens?: number };
    if (!config.enabled) {
      respond(true, { allowed: true });
      return;
    }

    const toolConfig = config.toolLimits[tool] || config.defaultLimits;
    const toolStats = getToolStats(tool);

    const allowed =
      toolStats.requestsThisMinute < toolConfig.requestsPerMinute &&
      toolStats.tokensThisMinute + estimatedTokens < toolConfig.tokensPerMinute;

    respond(true, {
      allowed,
      currentUsage: toolStats,
      limits: toolConfig,
      resetAt: Date.now() + 60000,
    });
  },

  "rate-limits.report": async ({ params, respond }) => {
    const { tool, tokens } = params as { tool: string; tokens: number };
    const toolStats = getToolStats(tool);
    toolStats.requestsThisMinute++;
    toolStats.tokensThisMinute += tokens;
    toolStats.lastCallAt = Date.now();
    respond(true, { ok: true });
  },

  "rate-limits.reset": async ({ respond }) => {
    stats = {};
    respond(true, { ok: true });
  },
};
