import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("model-router");

export type RoutingTier = "simple" | "medium" | "complex";
export type ComplexityLevel = "low" | "medium" | "high";

export interface TierConfig {
  name: string;
  models: string[];
  criteria: {
    maxTokens: number;
    minTokens?: number;
    toolsAllowed: string[];
    complexity: ComplexityLevel;
  };
  costPer1kTokens: {
    input: number;
    output: number;
  };
}

export interface RoutingConfig {
  enabled: boolean;
  autoSelect: boolean;
  tiers: {
    simple: TierConfig;
    medium: TierConfig;
    complex: TierConfig;
  };
  fallbackChain: RoutingTier[];
  costOptimization: {
    targetSavings: number;
    maxLatency: number;
  };
}

export interface ModelSelection {
  tier: RoutingTier;
  model: string;
  reason: string;
  estimatedCost: number;
  fallbackChain: string[];
}

export interface SelectModelParams {
  prompt: string;
  estimatedTokens: number;
  tools: string[];
  complexity?: "auto" | ComplexityLevel;
}

export interface RoutingStats {
  totalRouted: number;
  costSavings: number;
  avgLatency: number;
  tierDistribution: Record<RoutingTier, number>;
  modelUsage: Record<string, number>;
}

// Default configuration
const DEFAULT_CONFIG: RoutingConfig = {
  enabled: false,
  autoSelect: true,
  tiers: {
    simple: {
      name: "Simple",
      models: ["local/llama-3.2-3b", "gpt-4o-mini"],
      criteria: {
        maxTokens: 500,
        toolsAllowed: ["memory_search", "basic_chat"],
        complexity: "low",
      },
      costPer1kTokens: {
        input: 0.00015,
        output: 0.0006,
      },
    },
    medium: {
      name: "Medium",
      models: ["gpt-4o", "claude-sonnet"],
      criteria: {
        maxTokens: 4000,
        minTokens: 100,
        toolsAllowed: ["*"],
        complexity: "medium",
      },
      costPer1kTokens: {
        input: 0.0025,
        output: 0.01,
      },
    },
    complex: {
      name: "Complex",
      models: ["gpt-4.5", "claude-opus"],
      criteria: {
        maxTokens: 128000,
        minTokens: 1000,
        toolsAllowed: ["*"],
        complexity: "high",
      },
      costPer1kTokens: {
        input: 0.03,
        output: 0.12,
      },
    },
  },
  fallbackChain: ["complex", "medium", "simple"],
  costOptimization: {
    targetSavings: 30,
    maxLatency: 5000,
  },
};

// Model availability cache
interface ModelAvailability {
  available: boolean;
  lastChecked: number;
}

export class ModelRouter {
  private config: RoutingConfig = { ...DEFAULT_CONFIG };
  private stats: RoutingStats = {
    totalRouted: 0,
    costSavings: 0,
    avgLatency: 0,
    tierDistribution: { simple: 0, medium: 0, complex: 0 },
    modelUsage: {},
  };
  private modelAvailability: Map<string, ModelAvailability> = new Map();
  private availabilityCacheDuration = 30000; // 30 seconds

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const stored = process.env.MODEL_ROUTING_CONFIG;
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      log.warn("Failed to load model routing config, using defaults");
    }
  }

  private saveConfig(): void {
    try {
      process.env.MODEL_ROUTING_CONFIG = JSON.stringify(this.config);
    } catch {
      log.warn("Failed to save model routing config");
    }
  }

  /**
   * Main method to select the best model for a given request
   */
  async selectModel(params: SelectModelParams): Promise<ModelSelection> {
    if (!this.config.enabled) {
      throw new Error("Model routing is disabled");
    }

    const startTime = Date.now();

    // 1. Calculate complexity if 'auto'
    const complexity =
      params.complexity === "auto" || !params.complexity
        ? this.calculateComplexity(params)
        : params.complexity;

    // 2. Map complexity to tier
    const tier = this.mapComplexityToTier(complexity);

    // 3. Select first available model from tier
    const model = await this.selectAvailableModel(tier);

    // 4. Calculate estimated cost
    const estimatedCost = this.estimateCost(model, params.estimatedTokens);

    // 5. Build fallback chain
    const fallbackChain = this.buildFallbackChain(tier, model);

    // 6. Update stats
    const latency = Date.now() - startTime;
    this.updateStats(tier, model, estimatedCost, latency);

    const selection: ModelSelection = {
      tier,
      model,
      reason: this.explainSelection(tier, complexity, model),
      estimatedCost,
      fallbackChain,
    };

    log.info(`Model routed: ${selection.model} (${selection.tier}) - ${selection.reason}`);

    return selection;
  }

  /**
   * Calculate task complexity based on multiple heuristics
   */
  private calculateComplexity(params: SelectModelParams): ComplexityLevel {
    let score = 0;

    // Based on token count
    if (params.estimatedTokens < 100) {
      score += 1;
    } else if (params.estimatedTokens < 1000) {
      score += 2;
    } else {
      score += 3;
    }

    // Based on tools complexity
    const complexTools = ["code", "analyze", "multi-step", "browser", "file-write"];
    const toolComplexity = params.tools.filter((t) =>
      complexTools.some((ct) => t.toLowerCase().includes(ct)),
    ).length;
    score += toolComplexity * 2;

    // Based on keywords in prompt
    const complexKeywords = [
      "analyze",
      "compare",
      "explain in detail",
      "step by step",
      "debug",
      "optimize",
      "refactor",
      "architect",
      "design",
    ];
    const promptLower = params.prompt.toLowerCase();
    const keywordMatches = complexKeywords.filter((kw) => promptLower.includes(kw)).length;
    score += keywordMatches;

    // Based on code indicators
    const codeIndicators = ["```", "function", "class", "import", "export"];
    const codeMatches = codeIndicators.filter((indicator) =>
      promptLower.includes(indicator),
    ).length;
    if (codeMatches >= 2) {
      score += 2;
    }

    // Map score to complexity
    if (score <= 3) {
      return "low";
    }
    if (score <= 6) {
      return "medium";
    }
    return "high";
  }

  /**
   * Map complexity level to routing tier
   */
  private mapComplexityToTier(complexity: ComplexityLevel): RoutingTier {
    switch (complexity) {
      case "low":
        return "simple";
      case "medium":
        return "medium";
      case "high":
        return "complex";
      default:
        return "medium";
    }
  }

  /**
   * Select the first available model from a tier
   */
  private async selectAvailableModel(tier: RoutingTier): Promise<string> {
    const tierConfig = this.config.tiers[tier];

    for (const model of tierConfig.models) {
      if (await this.isModelAvailable(model)) {
        return model;
      }
    }

    // If no model available in this tier, try fallback chain
    return this.fallbackToNextTier(tier);
  }

  /**
   * Check if a model is available (with caching)
   */
  private async isModelAvailable(model: string): Promise<boolean> {
    const cached = this.modelAvailability.get(model);
    const now = Date.now();

    if (cached && now - cached.lastChecked < this.availabilityCacheDuration) {
      return cached.available;
    }

    // Check availability (simulated - in real implementation would check with provider)
    const available = await this.checkModelAvailability(model);

    this.modelAvailability.set(model, {
      available,
      lastChecked: now,
    });

    return available;
  }

  /**
   * Check model availability with provider
   */
  private async checkModelAvailability(model: string): Promise<boolean> {
    // For Ollama models, check if Ollama is running
    if (model.includes("ollama")) {
      try {
        // This would check Ollama service
        return true; // Simplified for now
      } catch {
        return false;
      }
    }

    // For API models, assume available (would check rate limits, etc.)
    return true;
  }

  /**
   * Fallback to next tier in chain
   */
  private async fallbackToNextTier(currentTier: RoutingTier): Promise<string> {
    const chain = this.config.fallbackChain;
    const currentIndex = chain.indexOf(currentTier);

    for (let i = currentIndex + 1; i < chain.length; i++) {
      const nextTier = chain[i];
      const tierConfig = this.config.tiers[nextTier];

      for (const model of tierConfig.models) {
        if (await this.isModelAvailable(model)) {
          log.warn(`Falling back from ${currentTier} to ${nextTier}: ${model}`);
          return model;
        }
      }
    }

    // Ultimate fallback
    throw new Error("No models available in any tier");
  }

  /**
   * Estimate cost for a model and token count
   */
  private estimateCost(model: string, tokens: number): number {
    // Find tier for this model
    let tierConfig: TierConfig | null = null;
    for (const tier of Object.values(this.config.tiers)) {
      if (tier.models.includes(model)) {
        tierConfig = tier;
        break;
      }
    }

    if (!tierConfig) {
      // Default to medium tier pricing
      tierConfig = this.config.tiers.medium;
    }

    const costPer1k = tierConfig.costPer1kTokens.input + tierConfig.costPer1kTokens.output;
    return (tokens / 1000) * costPer1k;
  }

  /**
   * Build fallback chain for a selection
   */
  private buildFallbackChain(tier: RoutingTier, selectedModel: string): string[] {
    const chain: string[] = [];
    const tierConfig = this.config.tiers[tier];

    // Add remaining models from current tier
    const currentIndex = tierConfig.models.indexOf(selectedModel);
    for (let i = currentIndex + 1; i < tierConfig.models.length; i++) {
      chain.push(tierConfig.models[i]);
    }

    // Add models from fallback tiers
    const fallbackIndex = this.config.fallbackChain.indexOf(tier);
    for (let i = fallbackIndex + 1; i < this.config.fallbackChain.length; i++) {
      const fallbackTier = this.config.fallbackChain[i];
      const fallbackConfig = this.config.tiers[fallbackTier];
      chain.push(...fallbackConfig.models);
    }

    return chain;
  }

  /**
   * Generate explanation for model selection
   */
  private explainSelection(tier: RoutingTier, complexity: ComplexityLevel, model: string): string {
    const reasons: string[] = [];

    reasons.push(`${tier} tier selected for ${complexity} complexity`);

    if (model.includes("ollama")) {
      reasons.push("local model preferred for cost savings");
    } else if (tier === "simple") {
      reasons.push("cost-optimized for simple task");
    } else if (tier === "complex") {
      reasons.push("high-capability model for complex task");
    }

    return reasons.join(", ");
  }

  /**
   * Update routing statistics
   */
  private updateStats(tier: RoutingTier, model: string, cost: number, latency: number): void {
    this.stats.totalRouted++;
    this.stats.tierDistribution[tier]++;

    // Calculate cost savings (vs using complex tier always)
    const complexCost =
      this.config.tiers.complex.costPer1kTokens.input +
      this.config.tiers.complex.costPer1kTokens.output;
    const savings = complexCost - cost;
    if (savings > 0) {
      this.stats.costSavings += savings;
    }

    // Update latency average
    this.stats.avgLatency =
      (this.stats.avgLatency * (this.stats.totalRouted - 1) + latency) / this.stats.totalRouted;

    // Update model usage
    this.stats.modelUsage[model] = (this.stats.modelUsage[model] || 0) + 1;
  }

  /**
   * Get current configuration
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<RoutingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      tiers: {
        simple: { ...this.config.tiers.simple, ...config.tiers?.simple },
        medium: { ...this.config.tiers.medium, ...config.tiers?.medium },
        complex: { ...this.config.tiers.complex, ...config.tiers?.complex },
      },
      costOptimization: {
        ...this.config.costOptimization,
        ...config.costOptimization,
      },
    };
    this.saveConfig();
  }

  /**
   * Get current statistics
   */
  getStats(): RoutingStats {
    return { ...this.stats };
  }

  /**
   * Get status for dashboard
   */
  getStatus(): {
    enabled: boolean;
    currentTier: RoutingTier | null;
    tiers: RoutingConfig["tiers"];
    stats: RoutingStats;
  } {
    return {
      enabled: this.config.enabled,
      currentTier: null, // Would track current if routing active session
      tiers: this.config.tiers,
      stats: this.stats,
    };
  }

  /**
   * Test routing with a prompt
   */
  async testRouting(prompt: string, tools: string[] = []): Promise<ModelSelection> {
    // Estimate tokens (rough approximation)
    const estimatedTokens = Math.ceil(prompt.length / 4);

    return this.selectModel({
      prompt,
      estimatedTokens,
      tools,
      complexity: "auto",
    });
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRouted: 0,
      costSavings: 0,
      avgLatency: 0,
      tierDistribution: { simple: 0, medium: 0, complex: 0 },
      modelUsage: {},
    };
  }

  /**
   * Add model to tier
   */
  addModelToTier(tier: RoutingTier, model: string): boolean {
    const tierConfig = this.config.tiers[tier];
    if (!tierConfig.models.includes(model)) {
      tierConfig.models.push(model);
      this.saveConfig();
      return true;
    }
    return false;
  }

  /**
   * Remove model from tier
   */
  removeModelFromTier(tier: RoutingTier, index: number): boolean {
    const tierConfig = this.config.tiers[tier];
    if (index >= 0 && index < tierConfig.models.length) {
      tierConfig.models.splice(index, 1);
      this.saveConfig();
      return true;
    }
    return false;
  }

  /**
   * Reorder models in tier (for drag-and-drop)
   */
  reorderModelsInTier(tier: RoutingTier, fromIndex: number, toIndex: number): boolean {
    const tierConfig = this.config.tiers[tier];
    if (
      fromIndex >= 0 &&
      fromIndex < tierConfig.models.length &&
      toIndex >= 0 &&
      toIndex < tierConfig.models.length
    ) {
      const [moved] = tierConfig.models.splice(fromIndex, 1);
      tierConfig.models.splice(toIndex, 0, moved);
      this.saveConfig();
      return true;
    }
    return false;
  }
}

// Singleton instance
let modelRouter: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
  if (!modelRouter) {
    modelRouter = new ModelRouter();
  }
  return modelRouter;
}
