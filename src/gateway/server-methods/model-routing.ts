import type { GatewayRequestHandlers } from "./types.js";

export interface ModelRoutingConfig {
  enabled: boolean;
  tiers: {
    simple: TierConfig;
    medium: TierConfig;
    complex: TierConfig;
  };
  fallback: {
    enabled: boolean;
    maxRetries: number;
    fallbackDelayMs: number;
  };
}

export interface TierConfig {
  name: string;
  models: string[];
  criteria: {
    maxTokens?: number;
    minTokens?: number;
    toolsAllowed: string[];
    toolsBlocked?: string[];
    complexity: "low" | "medium" | "high";
  };
  costPer1kTokens: {
    input: number;
    output: number;
  };
  priority: number;
}

export interface RoutingStats {
  totalRouted: number;
  simpleTierRouted: number;
  mediumTierRouted: number;
  complexTierRouted: number;
  costSavings: number;
  avgLatency: number;
  fallbackCount: number;
  errors: number;
  lastRoutedAt: number | null;
}

const DEFAULT_CONFIG: ModelRoutingConfig = {
  enabled: true,
  tiers: {
    simple: {
      name: "Simple Tasks",
      models: ["ollama/llama3.2:3b", "gpt-4o-mini"],
      criteria: {
        maxTokens: 100,
        toolsAllowed: [],
        complexity: "low",
      },
      costPer1kTokens: { input: 0.0001, output: 0.0004 },
      priority: 1,
    },
    medium: {
      name: "Standard Tasks",
      models: ["gpt-4o", "claude-sonnet-3.5"],
      criteria: {
        maxTokens: 1000,
        minTokens: 101,
        toolsAllowed: ["web_search", "browser", "read_file"],
        complexity: "medium",
      },
      costPer1kTokens: { input: 0.0025, output: 0.01 },
      priority: 2,
    },
    complex: {
      name: "Complex Tasks",
      models: ["gpt-4.5", "claude-opus-3", "o1"],
      criteria: {
        minTokens: 1001,
        toolsAllowed: ["*"],
        complexity: "high",
      },
      costPer1kTokens: { input: 0.015, output: 0.06 },
      priority: 3,
    },
  },
  fallback: {
    enabled: true,
    maxRetries: 3,
    fallbackDelayMs: 1000,
  },
};

let config: ModelRoutingConfig = { ...DEFAULT_CONFIG };
let stats: RoutingStats = {
  totalRouted: 0,
  simpleTierRouted: 0,
  mediumTierRouted: 0,
  complexTierRouted: 0,
  costSavings: 0,
  avgLatency: 0,
  fallbackCount: 0,
  errors: 0,
  lastRoutedAt: null,
};

function calculateComplexity(message: string, tools: string[]): "low" | "medium" | "high" {
  const tokenCount = Math.ceil(message.length / 4);
  const hasComplexTools = tools.some((t) =>
    ["code_interpreter", "analysis", "multi_step", "long_context"].includes(t),
  );
  const hasAnyTools = tools.length > 0;

  if (tokenCount > 1000 || hasComplexTools) {
    return "high";
  }
  if (tokenCount > 100 || hasAnyTools) {
    return "medium";
  }
  return "low";
}

function determineTier(complexity: "low" | "medium" | "high"): keyof ModelRoutingConfig["tiers"] {
  switch (complexity) {
    case "low":
      return "simple";
    case "medium":
      return "medium";
    case "high":
      return "complex";
  }
}

export const modelRoutingHandlers: GatewayRequestHandlers = {
  "model-routing.status": async ({ respond }) => {
    const currentTier = stats.lastRoutedAt
      ? determineTier(
          stats.simpleTierRouted > stats.mediumTierRouted &&
            stats.simpleTierRouted > stats.complexTierRouted
            ? "low"
            : stats.mediumTierRouted > stats.complexTierRouted
              ? "medium"
              : "high",
        )
      : null;

    respond(true, {
      enabled: config.enabled,
      currentTier,
      tiers: config.tiers,
      fallback: config.fallback,
      stats,
    });
  },

  "model-routing.configure": async ({ params, respond }) => {
    try {
      const { enabled, tiers, fallback } = params as Partial<ModelRoutingConfig>;

      if (enabled !== undefined) {
        config.enabled = enabled;
      }
      if (tiers) {
        config.tiers = { ...config.tiers, ...tiers };
      }
      if (fallback) {
        config.fallback = { ...config.fallback, ...fallback };
      }

      respond(true, { ok: true, config });
    } catch (error) {
      respond(false, undefined, { code: "INTERNAL_ERROR", message: String(error) });
    }
  },

  "model-routing.select": async ({ params, respond }) => {
    if (!config.enabled) {
      respond(false, undefined, { code: "INVALID_PARAMS", message: "Model routing is disabled" });
      return;
    }

    try {
      const {
        message,
        tools = [],
        preferredModel,
      } = params as {
        message: string;
        tools?: string[];
        preferredModel?: string;
      };

      const startTime = Date.now();
      const complexity = calculateComplexity(message, tools);
      const tierKey = determineTier(complexity);
      const tier = config.tiers[tierKey];

      let selectedModel = tier.models[0];
      if (preferredModel && tier.models.includes(preferredModel)) {
        selectedModel = preferredModel;
      }

      const latency = Date.now() - startTime;
      stats.totalRouted++;
      stats.lastRoutedAt = Date.now();

      if (tierKey === "simple") {
        stats.simpleTierRouted++;
      } else if (tierKey === "medium") {
        stats.mediumTierRouted++;
      } else {
        stats.complexTierRouted++;
      }

      stats.avgLatency = (stats.avgLatency * (stats.totalRouted - 1) + latency) / stats.totalRouted;

      const estimatedTokens = Math.ceil(message.length / 4);
      const baseCost = (estimatedTokens / 1000) * config.tiers.complex.costPer1kTokens.input;
      const actualCost = (estimatedTokens / 1000) * tier.costPer1kTokens.input;
      stats.costSavings += baseCost - actualCost;

      respond(true, {
        tier: tierKey,
        model: selectedModel,
        alternatives: tier.models.slice(1),
        complexity,
        estimatedTokens,
        latency,
      });
    } catch (error) {
      stats.errors++;
      respond(false, undefined, { code: "INTERNAL_ERROR", message: String(error) });
    }
  },

  "model-routing.stats": async ({ respond }) => {
    respond(true, {
      ...stats,
      savingsPercentage:
        stats.totalRouted > 0 ? (stats.costSavings / (stats.totalRouted * 0.015)) * 100 : 0,
    });
  },

  "model-routing.reset": async ({ respond }) => {
    config = { ...DEFAULT_CONFIG };
    stats = {
      totalRouted: 0,
      simpleTierRouted: 0,
      mediumTierRouted: 0,
      complexTierRouted: 0,
      costSavings: 0,
      avgLatency: 0,
      fallbackCount: 0,
      errors: 0,
      lastRoutedAt: null,
    };
    respond(true, { ok: true });
  },

  "model-routing.test": async ({ params, respond }) => {
    try {
      const { prompt, tools = [] } = params as {
        prompt: string;
        tools?: string[];
      };

      if (!config.enabled) {
        respond(false, undefined, {
          code: "INVALID_PARAMS",
          message: "Model routing is disabled",
        });
        return;
      }

      const complexity = calculateComplexity(prompt, tools);
      const tierKey = determineTier(complexity);
      const tier = config.tiers[tierKey];

      const estimatedTokens = Math.ceil(prompt.length / 4);
      const estimatedCost =
        (estimatedTokens / 1000) * (tier.costPer1kTokens.input + tier.costPer1kTokens.output);

      respond(true, {
        tier: tierKey,
        model: tier.models[0],
        reason: `${tierKey} tier selected for ${complexity} complexity task`,
        estimatedCost,
        fallbackChain: tier.models.slice(1),
        complexity,
        estimatedTokens,
      });
    } catch (error) {
      respond(false, undefined, { code: "INTERNAL_ERROR", message: String(error) });
    }
  },

  "model-routing.tier.add-model": async ({ params, respond }) => {
    try {
      const { tier, model } = params as { tier: keyof ModelRoutingConfig["tiers"]; model: string };

      if (!config.tiers[tier]) {
        respond(false, undefined, { code: "INVALID_PARAMS", message: `Invalid tier: ${tier}` });
        return;
      }

      if (config.tiers[tier].models.includes(model)) {
        respond(false, undefined, { code: "INVALID_PARAMS", message: "Model already in tier" });
        return;
      }

      config.tiers[tier].models.push(model);
      respond(true, { ok: true, tier, models: config.tiers[tier].models });
    } catch (error) {
      respond(false, undefined, { code: "INTERNAL_ERROR", message: String(error) });
    }
  },

  "model-routing.tier.remove-model": async ({ params, respond }) => {
    try {
      const { tier, index } = params as { tier: keyof ModelRoutingConfig["tiers"]; index: number };

      if (!config.tiers[tier]) {
        respond(false, undefined, { code: "INVALID_PARAMS", message: `Invalid tier: ${tier}` });
        return;
      }

      if (index < 0 || index >= config.tiers[tier].models.length) {
        respond(false, undefined, { code: "INVALID_PARAMS", message: "Invalid model index" });
        return;
      }

      const removed = config.tiers[tier].models.splice(index, 1)[0];
      respond(true, { ok: true, tier, removed, models: config.tiers[tier].models });
    } catch (error) {
      respond(false, undefined, { code: "INTERNAL_ERROR", message: String(error) });
    }
  },

  "model-routing.tier.reorder": async ({ params, respond }) => {
    try {
      const { tier, fromIndex, toIndex } = params as {
        tier: keyof ModelRoutingConfig["tiers"];
        fromIndex: number;
        toIndex: number;
      };

      if (!config.tiers[tier]) {
        respond(false, undefined, { code: "INVALID_PARAMS", message: `Invalid tier: ${tier}` });
        return;
      }

      const models = config.tiers[tier].models;
      if (fromIndex < 0 || fromIndex >= models.length || toIndex < 0 || toIndex >= models.length) {
        respond(false, undefined, { code: "INVALID_PARAMS", message: "Invalid index" });
        return;
      }

      const [moved] = models.splice(fromIndex, 1);
      models.splice(toIndex, 0, moved);

      respond(true, { ok: true, tier, models });
    } catch (error) {
      respond(false, undefined, { code: "INTERNAL_ERROR", message: String(error) });
    }
  },
};

export function getModelRoutingConfig(): ModelRoutingConfig {
  return config;
}

export function getRoutingStats(): RoutingStats {
  return stats;
}
