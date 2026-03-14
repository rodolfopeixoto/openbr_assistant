import type { GatewayRequestHandlers } from "./types.js";
import { getRateLimiter } from "../../services/rate-limiter.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const rateLimitsHandlers: GatewayRequestHandlers = {
  "rate-limits.status": async ({ respond }) => {
    try {
      const limiter = getRateLimiter();
      const status = limiter.getStatus();
      respond(true, status);
    } catch (err) {
      console.error("[RateLimits] Status error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get rate limits status",
        ),
      );
    }
  },

  "rate-limits.config.get": async ({ respond }) => {
    try {
      const limiter = getRateLimiter();
      const config = limiter.getConfig();
      respond(true, { config });
    } catch (err) {
      console.error("[RateLimits] Config get error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get rate limits config",
        ),
      );
    }
  },

  "rate-limits.config.set": async ({ params, respond }) => {
    try {
      const limiter = getRateLimiter();
      const { global, perTool, errorHandling } = params as {
        global?: { minTimeBetweenCalls?: number };
        perTool?: Record<
          string,
          {
            minDelay?: number;
            maxBatchSize?: number;
            cooldownDuration?: number;
            batchSimilarWork?: boolean;
          }
        >;
        errorHandling?: {
          on429?: {
            waitTime?: number;
            retryAttempts?: number;
            exponentialBackoff?: boolean;
          };
        };
      };

      const config: Partial<import("../../services/rate-limiter.js").RateLimitConfig> = {};
      if (global) {
        config.global = global as { minTimeBetweenCalls: number };
      }
      if (perTool) {
        config.perTool = perTool as Record<
          string,
          import("../../services/rate-limiter.js").RateLimitToolConfig
        >;
      }
      if (errorHandling) {
        config.errorHandling =
          errorHandling as import("../../services/rate-limiter.js").RateLimitConfig["errorHandling"];
      }
      limiter.setConfig(config);

      respond(true, { ok: true, config: limiter.getConfig() });
    } catch (err) {
      console.error("[RateLimits] Config set error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to set rate limits config",
        ),
      );
    }
  },

  "rate-limits.reset": async ({ respond }) => {
    try {
      const limiter = getRateLimiter();
      limiter.reset();
      respond(true, { ok: true });
    } catch (err) {
      console.error("[RateLimits] Reset error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to reset rate limits",
        ),
      );
    }
  },

  "rate-limits.enable": async ({ params, respond }) => {
    try {
      const limiter = getRateLimiter();
      const { enabled } = params as { enabled?: boolean };
      limiter.setEnabled(enabled ?? true);
      respond(true, { ok: true, enabled: enabled ?? true });
    } catch (err) {
      console.error("[RateLimits] Enable error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to enable/disable rate limits",
        ),
      );
    }
  },
};
