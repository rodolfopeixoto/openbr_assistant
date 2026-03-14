import type { GatewayRequestHandlers } from "./types.js";
import { getMetricsService } from "../../services/metrics.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const metricsHandlers: GatewayRequestHandlers = {
  "metrics.usage": async ({ params, respond }) => {
    try {
      const service = getMetricsService();
      const { period, startDate, endDate } = params as {
        period?: "1h" | "24h" | "7d" | "30d";
        startDate?: string;
        endDate?: string;
      };

      const metrics = service.getUsage(period || "24h", startDate, endDate);
      respond(true, metrics);
    } catch (err) {
      console.error("[Metrics] Usage error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get usage metrics",
        ),
      );
    }
  },

  "metrics.costs": async ({ params, respond }) => {
    try {
      const service = getMetricsService();
      const { period, groupBy } = params as {
        period?: "1h" | "24h" | "7d" | "30d";
        groupBy?: "provider" | "model" | "day";
      };

      const costs = service.getCosts(period || "24h", groupBy || "day");
      respond(true, costs);
    } catch (err) {
      console.error("[Metrics] Costs error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get costs metrics",
        ),
      );
    }
  },

  "metrics.models": async ({ params, respond }) => {
    try {
      const service = getMetricsService();
      const { period } = params as { period?: "1h" | "24h" | "7d" | "30d" };

      const models = service.getModels(period || "24h");
      respond(true, { models });
    } catch (err) {
      console.error("[Metrics] Models error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get model metrics",
        ),
      );
    }
  },

  "metrics.sessions": async ({ params, respond }) => {
    try {
      const service = getMetricsService();
      const { period } = params as { period?: "1h" | "24h" | "7d" | "30d" };

      const sessions = service.getSessions(period || "24h");
      respond(true, { sessions });
    } catch (err) {
      console.error("[Metrics] Sessions error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get session metrics",
        ),
      );
    }
  },

  "metrics.report": async ({ params, respond }) => {
    try {
      const service = getMetricsService();
      const { provider, model, tokensInput, tokensOutput, cost, latency, sessionKey, requestType } =
        params as {
          provider: string;
          model: string;
          tokensInput: number;
          tokensOutput: number;
          cost: number;
          latency: number;
          sessionKey?: string;
          requestType?: string;
        };

      const record = service.record({
        provider,
        model,
        tokensInput,
        tokensOutput,
        cost,
        latency,
        sessionKey,
        requestType,
      });

      respond(true, { ok: true, recordId: record.id });
    } catch (err) {
      console.error("[Metrics] Report error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to report metrics",
        ),
      );
    }
  },

  "metrics.export": async ({ params, respond }) => {
    try {
      const service = getMetricsService();
      const { format } = params as { format?: "json" | "csv" };

      if (format === "csv") {
        const csv = service.exportCSV();
        respond(true, { csv });
      } else {
        const json = service.exportJSON();
        respond(true, { json });
      }
    } catch (err) {
      console.error("[Metrics] Export error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to export metrics",
        ),
      );
    }
  },

  "metrics.reset": async ({ respond }) => {
    try {
      const service = getMetricsService();
      service.reset();
      respond(true, { ok: true });
    } catch (err) {
      console.error("[Metrics] Reset error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to reset metrics",
        ),
      );
    }
  },
};
