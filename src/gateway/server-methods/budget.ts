import type { GatewayRequestHandlers } from "./types.js";
import { getBudgetTracker } from "../../services/budget.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const budgetHandlers: GatewayRequestHandlers = {
  "budget.status": async ({ respond }) => {
    try {
      const tracker = getBudgetTracker();
      const status = tracker.getStatus();
      respond(true, status);
    } catch (err) {
      console.error("[Budget] Status error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get budget status",
        ),
      );
    }
  },

  "budget.config.get": async ({ respond }) => {
    try {
      const tracker = getBudgetTracker();
      const config = tracker.getConfig();
      respond(true, { config });
    } catch (err) {
      console.error("[Budget] Config get error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get budget config",
        ),
      );
    }
  },

  "budget.config.set": async ({ params, respond }) => {
    try {
      const tracker = getBudgetTracker();
      const { daily, monthly, notifications } = params as {
        daily?: {
          limit?: number;
          alertThresholds?: number[];
          hardStop?: boolean;
        };
        monthly?: {
          limit?: number;
          alertThresholds?: number[];
          hardStop?: boolean;
        };
        notifications?: {
          desktop?: boolean;
          email?: boolean;
          emailAddress?: string;
        };
      };

      const config: Partial<import("../../services/budget.js").BudgetConfig> = {};
      if (daily) {
        config.daily = daily as { limit: number; alertThresholds: number[]; hardStop: boolean };
      }
      if (monthly) {
        config.monthly = monthly as { limit: number; alertThresholds: number[]; hardStop: boolean };
      }
      if (notifications) {
        config.notifications = notifications as {
          desktop: boolean;
          email: boolean;
          emailAddress?: string;
        };
      }
      tracker.setConfig(config);

      respond(true, { ok: true, config: tracker.getConfig() });
    } catch (err) {
      console.error("[Budget] Config set error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to set budget config",
        ),
      );
    }
  },

  "budget.report": async ({ params, respond }) => {
    try {
      const tracker = getBudgetTracker();
      const { provider, model, cost, tokensInput, tokensOutput, sessionKey, description } =
        params as {
          provider: string;
          model: string;
          cost: number;
          tokensInput: number;
          tokensOutput: number;
          sessionKey?: string;
          description?: string;
        };

      const tx = tracker.recordTransaction({
        provider,
        model,
        cost,
        tokensInput,
        tokensOutput,
        sessionKey,
        description,
      });

      respond(true, { ok: true, transactionId: tx.id });
    } catch (err) {
      console.error("[Budget] Report error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to record budget transaction",
        ),
      );
    }
  },

  "budget.history": async ({ params, respond }) => {
    try {
      const tracker = getBudgetTracker();
      const { days } = params as { days?: number };
      const history = tracker.getHistory(days || 30);
      respond(true, { history });
    } catch (err) {
      console.error("[Budget] History error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get budget history",
        ),
      );
    }
  },

  "budget.breakdown": async ({ params, respond }) => {
    try {
      const tracker = getBudgetTracker();
      const { period, startDate, endDate } = params as {
        period?: "today" | "month" | "custom";
        startDate?: string;
        endDate?: string;
      };

      const breakdown = tracker.getBreakdown(period, startDate, endDate);
      respond(true, breakdown);
    } catch (err) {
      console.error("[Budget] Breakdown error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get budget breakdown",
        ),
      );
    }
  },

  "budget.check": async ({ respond }) => {
    try {
      const tracker = getBudgetTracker();
      const check = tracker.shouldBlock();
      respond(true, check);
    } catch (err) {
      console.error("[Budget] Check error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to check budget",
        ),
      );
    }
  },

  "budget.reset": async ({ respond }) => {
    try {
      const tracker = getBudgetTracker();
      tracker.reset();
      respond(true, { ok: true });
    } catch (err) {
      console.error("[Budget] Reset error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to reset budget",
        ),
      );
    }
  },

  "budget.export": async ({ respond }) => {
    try {
      const tracker = getBudgetTracker();
      const csv = tracker.exportCSV();
      respond(true, { csv });
    } catch (err) {
      console.error("[Budget] Export error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to export budget",
        ),
      );
    }
  },
};
