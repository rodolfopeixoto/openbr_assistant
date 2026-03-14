import { PromptCache, type CacheConfig } from "./cache/prompt-cache.js";
import { ContextPruner, type Message, type PrunerConfig } from "./pruning/context-pruner.js";
import { ModelRouter, type Task, type TaskType } from "./routing/model-router.js";

export interface OptimizerConfig {
  cache?: CacheConfig;
  pruning?: PrunerConfig;
  enabled: boolean;
}

export interface OptimizationStats {
  totalPrompts: number;
  cachedPrompts: number;
  totalContexts: number;
  prunedContexts: number;
  totalTokensSaved: number;
  cacheHitRate: number;
}

export interface OptimizationRecommendation {
  type: "cache" | "prune" | "route";
  description: string;
  potentialSavings: number;
}

export class TokenOptimizer {
  private cache: PromptCache;
  private pruner: ContextPruner;
  private router: ModelRouter;
  private config: OptimizerConfig;
  private stats: {
    prompts: number;
    cached: number;
    contexts: number;
    pruned: number;
    tokensSaved: number;
  };

  constructor(config: Partial<OptimizerConfig> = {}) {
    this.config = {
      enabled: true,
      cache: { maxSize: 1000, ttlMs: 3600000 }, // 1 hour default
      pruning: { maxMessages: 20, keepSystemMessages: true },
      ...config,
    };

    this.cache = new PromptCache(this.config.cache!);
    this.pruner = new ContextPruner(this.config.pruning!);
    this.router = new ModelRouter();
    this.stats = {
      prompts: 0,
      cached: 0,
      contexts: 0,
      pruned: 0,
      tokensSaved: 0,
    };
  }

  optimizePrompt(prompt: string): {
    prompt: string;
    cached: boolean;
    tokensSaved: number;
  } {
    if (!this.config.enabled) {
      return { prompt, cached: false, tokensSaved: 0 };
    }

    this.stats.prompts++;

    // Try to get from cache
    const cached = this.cache.get(prompt);
    if (cached) {
      this.stats.cached++;
      return {
        prompt: cached,
        cached: true,
        tokensSaved: Math.ceil(prompt.length / 4),
      };
    }

    return {
      prompt,
      cached: false,
      tokensSaved: 0,
    };
  }

  cachePrompt(prompt: string, response: string): void {
    if (!this.config.enabled) return;
    this.cache.set(prompt, response);
  }

  optimizeContext(
    messages: Message[],
    options: { maxMessages?: number; compress?: boolean } = {},
  ): {
    messages: Message[];
    tokensSaved: number;
    wasPruned: boolean;
  } {
    if (!this.config.enabled) {
      return { messages, tokensSaved: 0, wasPruned: false };
    }

    this.stats.contexts++;

    const originalTokens = this.pruner.estimateTokens(messages);

    // Use custom pruner if different maxMessages
    let pruner = this.pruner;
    if (options.maxMessages && options.maxMessages !== this.config.pruning?.maxMessages) {
      pruner = new ContextPruner({
        ...this.config.pruning!,
        maxMessages: options.maxMessages,
      });
    }

    const pruned = pruner.prune(messages, { compress: options.compress });
    const newTokens = pruner.estimateTokens(pruned);
    const tokensSaved = originalTokens - newTokens;

    if (tokensSaved > 0) {
      this.stats.pruned++;
      this.stats.tokensSaved += tokensSaved;
    }

    return {
      messages: pruned,
      tokensSaved,
      wasPruned: tokensSaved > 0,
    };
  }

  selectModel(task: Task): {
    model: string;
    reason: string;
    estimatedTokens: number;
    estimatedCost: number;
  } {
    const decision = this.router.getRoutingDecision(task);

    return {
      model: decision.model,
      reason: decision.reason,
      estimatedTokens: decision.estimatedTokens,
      estimatedCost: decision.estimatedCost,
    };
  }

  getStats(): OptimizationStats {
    const cacheStats = this.cache.getStats();

    return {
      totalPrompts: this.stats.prompts,
      cachedPrompts: this.stats.cached,
      totalContexts: this.stats.contexts,
      prunedContexts: this.stats.pruned,
      totalTokensSaved: this.stats.tokensSaved,
      cacheHitRate: cacheStats.hitRate,
    };
  }

  getRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const stats = this.getStats();

    // Cache recommendations
    if (stats.cacheHitRate < 0.3) {
      recommendations.push({
        type: "cache",
        description:
          "Cache hit rate is low (\u003c30%). Consider increasing cache TTL or reviewing prompt patterns.",
        potentialSavings: 20,
      });
    } else if (stats.cacheHitRate > 0.7) {
      recommendations.push({
        type: "cache",
        description: "Cache is performing well! High hit rate detected.",
        potentialSavings: 0,
      });
    }

    // Pruning recommendations
    if (stats.prunedContexts / stats.totalContexts > 0.5) {
      recommendations.push({
        type: "prune",
        description:
          "Frequent context pruning detected. Consider adjusting maxMessages or using compression.",
        potentialSavings: 30,
      });
    }

    // Routing recommendations
    recommendations.push({
      type: "route",
      description: "Using model routing to select appropriate model for each task type.",
      potentialSavings: 40,
    });

    return recommendations;
  }

  clearCache(): void {
    this.cache.clear();
  }

  configure(newConfig: Partial<OptimizerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reinitialize components if config changed
    if (newConfig.cache) {
      this.cache = new PromptCache({ ...this.config.cache!, ...newConfig.cache });
    }

    if (newConfig.pruning) {
      this.pruner = new ContextPruner({ ...this.config.pruning!, ...newConfig.pruning });
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }
}

export default TokenOptimizer;
