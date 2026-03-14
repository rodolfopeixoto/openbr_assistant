import type { GatewayRequestHandlers } from "./types.js";
import { TokenOptimizer } from "../../optimization/token-optimizer.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

// Global optimizer instance
let optimizer: TokenOptimizer | null = null;

function getOptimizer(): TokenOptimizer {
  if (!optimizer) {
    optimizer = new TokenOptimizer({
      enabled: true,
      cache: { maxSize: 1000, ttlMs: 3600000 }, // 1 hour
      pruning: { maxMessages: 20, keepSystemMessages: true },
    });
  }
  return optimizer;
}

export const optimizationHandlers: GatewayRequestHandlers = {
  // Get optimization statistics
  "optimization.stats": ({ respond }) => {
    try {
      const opt = getOptimizer();
      const stats = opt.getStats();

      respond(true, {
        stats: {
          totalPrompts: stats.totalPrompts,
          cachedPrompts: stats.cachedPrompts,
          cacheHitRate: Math.round(stats.cacheHitRate * 100),
          totalContexts: stats.totalContexts,
          prunedContexts: stats.prunedContexts,
          totalTokensSaved: stats.totalTokensSaved,
        },
        enabled: opt.isEnabled(),
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get stats: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Configure optimization
  "optimization.configure": ({ params, respond }) => {
    try {
      const { enabled, cache, pruning } = params as {
        enabled?: boolean;
        cache?: { maxSize?: number; ttlMs?: number };
        pruning?: { maxMessages?: number; keepSystemMessages?: boolean };
      };

      const opt = getOptimizer();

      opt.configure({
        enabled: enabled ?? opt.isEnabled(),
        cache: cache
          ? {
              maxSize: cache.maxSize || 1000,
              ttlMs: cache.ttlMs || 3600000,
            }
          : undefined,
        pruning: pruning
          ? {
              maxMessages: pruning.maxMessages || 20,
              keepSystemMessages: pruning.keepSystemMessages ?? true,
            }
          : undefined,
      });

      respond(true, {
        ok: true,
        config: {
          enabled: opt.isEnabled(),
        },
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to configure: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Clear cache
  "optimization.cache.clear": ({ respond }) => {
    try {
      const opt = getOptimizer();
      opt.clearCache();

      respond(true, { ok: true, message: "Cache cleared successfully" });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to clear cache: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Get recommendations
  "optimization.recommendations": ({ respond }) => {
    try {
      const opt = getOptimizer();
      const recommendations = opt.getRecommendations();

      respond(true, {
        recommendations: recommendations.map((rec) => ({
          type: rec.type,
          description: rec.description,
          potentialSavings: rec.potentialSavings,
        })),
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get recommendations: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Test model routing
  "optimization.model.route": ({ params, respond }) => {
    try {
      const { type, content, complexity } = params as {
        type: string;
        content: string;
        complexity?: "low" | "medium" | "high";
      };

      if (!type || !content) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "type and content are required"),
        );
        return;
      }

      const opt = getOptimizer();
      const decision = opt.selectModel({
        type: type as any,
        content,
        complexity,
      });

      respond(true, {
        task: { type, content, complexity },
        routing: decision,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to route: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Enable optimization
  "optimization.enable": ({ respond }) => {
    try {
      const opt = getOptimizer();
      opt.enable();

      respond(true, { ok: true, enabled: true });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to enable: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Disable optimization
  "optimization.disable": ({ respond }) => {
    try {
      const opt = getOptimizer();
      opt.disable();

      respond(true, { ok: true, enabled: false });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to disable: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};

export default optimizationHandlers;
