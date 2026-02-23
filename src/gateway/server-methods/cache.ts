import type { GatewayRequestHandlers } from "./types.js";

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  compression: boolean;
}

export interface CacheEntry {
  key: string;
  size: number;
  hits: number;
  misses: number;
  createdAt: string;
  lastAccessedAt: string | null;
  expiresAt: string | null;
}

export interface CacheStatus {
  enabled: boolean;
  entries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

let config: CacheConfig = {
  enabled: true,
  maxSize: 100 * 1024 * 1024,
  ttl: 3600,
  compression: true,
};

let entries: Map<string, CacheEntry> = new Map();
let totalHits = 0;
let totalMisses = 0;
let evictionCount = 0;

export const cacheHandlers: GatewayRequestHandlers = {
  "cache.status": async ({ respond }) => {
    const totalSize = Array.from(entries.values()).reduce((sum, e) => sum + e.size, 0);
    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? (totalHits / total) * 100 : 0;
    const missRate = total > 0 ? (totalMisses / total) * 100 : 0;

    respond(true, {
      enabled: config.enabled,
      entries: entries.size,
      totalSize,
      hitRate,
      missRate,
      evictionCount,
      config,
    });
  },

  "cache.entries": async ({ respond }) => {
    respond(true, {
      entries: Array.from(entries.values()),
    });
  },

  "cache.get": async ({ params, respond }) => {
    const { key } = params as { key: string };
    const entry = entries.get(key);

    if (entry) {
      entry.hits++;
      entry.lastAccessedAt = new Date().toISOString();
      totalHits++;
      respond(true, { hit: true, entry });
    } else {
      totalMisses++;
      respond(true, { hit: false });
    }
  },

  "cache.set": async ({ params, respond }) => {
    const { key, size, ttl } = params as { key: string; size: number; ttl?: number };

    if (!config.enabled) {
      respond(true, { ok: false, reason: "cache_disabled" });
      return;
    }

    const now = new Date();
    const entry: CacheEntry = {
      key,
      size,
      hits: 0,
      misses: 0,
      createdAt: now.toISOString(),
      lastAccessedAt: null,
      expiresAt: ttl ? new Date(now.getTime() + ttl * 1000).toISOString() : null,
    };

    entries.set(key, entry);

    const totalSize = Array.from(entries.values()).reduce((sum, e) => sum + e.size, 0);
    if (totalSize > config.maxSize) {
      const oldest = Array.from(entries.entries()).toSorted(
        (a, b) =>
          new Date(a[1].lastAccessedAt || a[1].createdAt).getTime() -
          new Date(b[1].lastAccessedAt || b[1].createdAt).getTime(),
      )[0];
      if (oldest) {
        entries.delete(oldest[0]);
        evictionCount++;
      }
    }

    respond(true, { ok: true });
  },

  "cache.clear": async ({ respond }) => {
    entries.clear();
    respond(true, { ok: true, cleared: true });
  },

  "cache.configure": async ({ params, respond }) => {
    const { enabled, maxSize, ttl, compression } = params as Partial<CacheConfig>;
    if (enabled !== undefined) {
      config.enabled = enabled;
    }
    if (maxSize !== undefined) {
      config.maxSize = maxSize;
    }
    if (ttl !== undefined) {
      config.ttl = ttl;
    }
    if (compression !== undefined) {
      config.compression = compression;
    }
    respond(true, { ok: true, config });
  },
};
