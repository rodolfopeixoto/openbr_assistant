import type { GatewayRequestHandlers } from "./types.js";
import { getCacheManager } from "../../services/cache-manager.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const cacheHandlers: GatewayRequestHandlers = {
  "cache.status": async ({ respond }) => {
    try {
      const manager = getCacheManager();
      const caches = manager.getStatus();
      const totalStats = manager.getTotalStats();

      respond(true, {
        caches,
        total: totalStats,
      });
    } catch (err) {
      console.error("[Cache] Status error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get cache status",
        ),
      );
    }
  },

  "cache.clear": async ({ params, respond }) => {
    try {
      const manager = getCacheManager();
      const { name, all } = params as { name?: string; all?: boolean };

      if (all) {
        manager.clearAll();
        respond(true, { ok: true, cleared: "all" });
      } else if (name) {
        const cleared = manager.clearCache(name);
        if (cleared) {
          respond(true, { ok: true, cleared: name });
        } else {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, `Cache '${name}' not found`),
          );
        }
      } else {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "Must specify 'name' or 'all'"),
        );
      }
    } catch (err) {
      console.error("[Cache] Clear error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to clear cache",
        ),
      );
    }
  },

  "cache.config.get": async ({ params, respond }) => {
    try {
      const manager = getCacheManager();
      const { name } = params as { name?: string };

      if (name) {
        const info = manager.getCacheInfo(name);
        if (info) {
          respond(true, { config: { ttl: info.ttl, maxSize: info.maxSize } });
        } else {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, `Cache '${name}' not found`),
          );
        }
      } else {
        const caches = manager.getStatus();
        respond(true, {
          caches: caches.map((c) => ({
            name: c.name,
            config: { ttl: c.ttl, maxSize: c.maxSize },
          })),
        });
      }
    } catch (err) {
      console.error("[Cache] Config get error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get cache config",
        ),
      );
    }
  },

  "cache.config.set": async ({ params, respond }) => {
    try {
      const manager = getCacheManager();
      const { name, ttl, maxSize } = params as {
        name: string;
        ttl?: number;
        maxSize?: number;
      };

      const success = manager.configureCache(name, {
        ...(ttl !== undefined && { ttl }),
        ...(maxSize !== undefined && { maxSize }),
      });

      if (success) {
        const info = manager.getCacheInfo(name);
        respond(true, { ok: true, config: { ttl: info?.ttl, maxSize: info?.maxSize } });
      } else {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Cache '${name}' not found`),
        );
      }
    } catch (err) {
      console.error("[Cache] Config set error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to set cache config",
        ),
      );
    }
  },

  "cache.warm": async ({ params, respond }) => {
    try {
      const manager = getCacheManager();
      const { name, data } = params as {
        name: string;
        data: Array<{ key: string; value: unknown }>;
      };

      const loaded = await manager.warmCache(name, data);
      respond(true, { ok: true, loaded });
    } catch (err) {
      console.error("[Cache] Warm error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to warm cache",
        ),
      );
    }
  },

  "cache.stats": async ({ respond }) => {
    try {
      const manager = getCacheManager();
      const stats = manager.getTotalStats();
      respond(true, stats);
    } catch (err) {
      console.error("[Cache] Stats error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get cache stats",
        ),
      );
    }
  },
};
