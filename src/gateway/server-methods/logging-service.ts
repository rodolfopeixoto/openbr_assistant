import type { GatewayRequestHandlers } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { getLoggingService, type LogLevel } from "../../services/logging/service.js";

const log = createSubsystemLogger("gateway:logging");

export const loggingHandlers: GatewayRequestHandlers = {
  // Query logs
  "logging.query": async ({ params, respond }) => {
    try {
      const {
        level,
        source,
        userId,
        correlationId,
        startTime,
        endTime,
        search,
        limit = 100,
        offset = 0,
      } = params as {
        level?: LogLevel;
        source?: string;
        userId?: string;
        correlationId?: string;
        startTime?: string;
        endTime?: string;
        search?: string;
        limit?: number;
        offset?: number;
      };

      const loggingService = getLoggingService();

      const result = loggingService.query({
        level,
        source,
        userId,
        correlationId,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        search,
        limit,
        offset,
      });

      respond(true, {
        entries: result.entries.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        })),
        total: result.total,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Query failed";
      log.error("logging.query failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Get log statistics
  "logging.stats": async ({ respond }) => {
    try {
      const loggingService = getLoggingService();
      const stats = loggingService.getStats();

      respond(true, {
        stats: {
          ...stats,
          timeRange: {
            start: stats.timeRange.start.toISOString(),
            end: stats.timeRange.end.toISOString(),
          },
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get stats";
      log.error("logging.stats failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Get log sources
  "logging.sources": async ({ respond }) => {
    try {
      const loggingService = getLoggingService();
      const sources = loggingService.getSources();

      respond(true, { sources });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get sources";
      log.error("logging.sources failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Export logs
  "logging.export": async ({ params, respond }) => {
    try {
      const { level, source, startTime, endTime, search } = params as {
        level?: LogLevel;
        source?: string;
        startTime?: string;
        endTime?: string;
        search?: string;
      };

      const loggingService = getLoggingService();

      const export_ = loggingService.export({
        level,
        source,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        search,
      });

      respond(true, {
        export: {
          ...export_,
          exportedAt: export_.exportedAt.toISOString(),
          entries: export_.entries.map((e) => ({
            ...e,
            timestamp: e.timestamp.toISOString(),
          })),
          filters: {
            ...export_.filters,
            startTime: export_.filters.startTime?.toISOString(),
            endTime: export_.filters.endTime?.toISOString(),
          },
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Export failed";
      log.error("logging.export failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Clear logs
  "logging.clear": async ({ respond }) => {
    try {
      const loggingService = getLoggingService();
      loggingService.clear();

      respond(true, { success: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Clear failed";
      log.error("logging.clear failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Write log entry
  "logging.write": async ({ params, respond }) => {
    try {
      const { level, message, context, source, userId, correlationId } = params as {
        level: LogLevel;
        message: string;
        context?: Record<string, unknown>;
        source?: string;
        userId?: string;
        correlationId?: string;
      };

      const loggingService = getLoggingService();

      loggingService.log({
        level,
        message,
        context,
        source,
        userId,
        correlationId,
      });

      respond(true, { success: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Write failed";
      log.error("logging.write failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Get recent logs
  "logging.recent": async ({ params, respond }) => {
    try {
      const { count = 50 } = params as { count?: number };

      const loggingService = getLoggingService();
      const entries = loggingService.getRecent(count);

      respond(true, {
        entries: entries.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        })),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get recent logs";
      log.error("logging.recent failed: " + msg);
      respond(false, { error: msg });
    }
  },
};
