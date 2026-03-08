export type TaskType =
  | "classify"
  | "summarize"
  | "generate"
  | "code"
  | "chat"
  | "extract"
  | "analyze"
  | "unknown";

export type ModelTier = "mini" | "standard" | "large";

export interface Task {
  type: TaskType;
  content: string;
  complexity?: "low" | "medium" | "high";
  codeLanguage?: string;
}

export interface RoutingDecision {
  model: string;
  tier: ModelTier;
  reason: string;
  estimatedTokens: number;
  estimatedCost: number;
}

export class ModelRouter {
  private modelConfig: Record<ModelTier, { model: string; costPer1k: number }> = {
    mini: { model: "gpt-4o-mini", costPer1k: 0.00015 },
    standard: { model: "gpt-4o", costPer1k: 0.005 },
    large: { model: "gpt-4o", costPer1k: 0.005 }, // Same model, different usage
  };

  selectModel(task: Task): string {
    const decision = this.getRoutingDecision(task);
    return decision.model;
  }

  getRoutingDecision(task: Task): RoutingDecision {
    const tier = this.determineTier(task);
    const config = this.modelConfig[tier];
    const estimatedTokens = this.estimateTokens(task);
    const estimatedCost = (estimatedTokens / 1000) * config.costPer1k;

    return {
      model: config.model,
      tier,
      reason: this.getReason(task, tier),
      estimatedTokens,
      estimatedCost,
    };
  }

  private determineTier(task: Task): ModelTier {
    // Simple tasks go to mini
    const simpleTasks: TaskType[] = ["classify", "summarize", "extract"];
    if (simpleTasks.includes(task.type)) {
      // Check complexity override
      if (task.complexity === "high") {
        return "standard";
      }
      return "mini";
    }

    // Code tasks
    if (task.type === "code") {
      // Complex code tasks need larger model
      if (task.content.length > 2000 || task.complexity === "high") {
        return "large";
      }
      return "standard";
    }

    // Generation tasks
    if (task.type === "generate" || task.type === "analyze") {
      if (task.complexity === "high" || task.content.length > 3000) {
        return "large";
      }
      return "standard";
    }

    // Chat - default to standard, mini for short/simple
    if (task.type === "chat") {
      if (task.content.length < 500 && !task.complexity) {
        return "mini";
      }
      return "standard";
    }

    // Default to standard for unknown
    return "standard";
  }

  private getReason(task: Task, tier: ModelTier): string {
    const reasons: Record<ModelTier, string> = {
      mini: `Task type "${task.type}" is simple and can be handled efficiently by a smaller model`,
      standard: `Task type "${task.type}" requires good performance, using standard model`,
      large: `Task type "${task.type}" with ${task.complexity || "medium"} complexity requires full capability`,
    };

    return reasons[tier];
  }

  private estimateTokens(task: Task): number {
    // Rough estimation
    const baseTokens = 100; // System prompt, overhead
    const contentTokens = Math.ceil(task.content.length / 4);

    // Add tokens based on task type
    const taskOverhead: Record<TaskType, number> = {
      classify: 50,
      summarize: 200,
      generate: 500,
      code: 300,
      chat: 100,
      extract: 100,
      analyze: 400,
      unknown: 200,
    };

    return baseTokens + contentTokens + (taskOverhead[task.type] || 200);
  }

  compareCosts(task: Task): {
    mini: number;
    standard: number;
    large: number;
    recommended: ModelTier;
    savings: number;
  } {
    const tiers: ModelTier[] = ["mini", "standard", "large"];
    const costs: Record<ModelTier, number> = {} as Record<ModelTier, number>;

    for (const tier of tiers) {
      const testTask = { ...task };
      const decision = this.getRoutingDecision(testTask);
      costs[tier] = decision.estimatedCost;
    }

    const recommended = this.determineTier(task);
    const standardCost = costs["standard"];
    const recommendedCost = costs[recommended];
    const savings = standardCost - recommendedCost;

    return {
      ...costs,
      recommended,
      savings,
    };
  }
}

export default ModelRouter;
