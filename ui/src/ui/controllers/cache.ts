import type { AppViewState } from "../app-view-state.js";

export type CacheType = "memory" | "sqlite" | "file";

export interface CacheInfo {
  name: string;
  type: CacheType;
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  ttl: number;
  lastCleared?: string;
  entries?: number;
  bytesUsed?: number;
}

export interface CacheTotalStats {
  totalSize: number;
  totalBytes: number;
  avgHitRate: number;
  cacheCount: number;
}

export interface CacheStatus {
  caches: CacheInfo[];
  total: CacheTotalStats;
}

export async function loadCache(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.cacheLoading = true;
  state.cacheError = null;

  try {
    const result = (await state.client.request("cache.status")) as CacheStatus;
    state.cacheStatus = result as unknown as Record<string, unknown>;
  } catch (err) {
    state.cacheError = err instanceof Error ? err.message : "Failed to load cache";
    console.error("[Cache] Failed to load:", err);
  } finally {
    state.cacheLoading = false;
  }
}

export async function clearCache(state: AppViewState, cacheName?: string): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.cacheLoading = true;
  state.cacheError = null;

  try {
    await state.client.request("cache.clear", {
      name: cacheName,
      all: !cacheName,
    });
    await loadCache(state);
  } catch (err) {
    state.cacheError = err instanceof Error ? err.message : "Failed to clear cache";
    console.error("[Cache] Failed to clear:", err);
    throw err;
  } finally {
    state.cacheLoading = false;
  }
}

export async function clearAllCaches(state: AppViewState): Promise<void> {
  return clearCache(state);
}

export async function getCacheConfig(
  state: AppViewState,
  cacheName?: string
): Promise<
  | { name: string; config: { ttl: number; maxSize: number } }[]
  | { ttl: number; maxSize: number }
  | null
> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("cache.config.get", {
      name: cacheName,
    })) as
      | { caches: { name: string; config: { ttl: number; maxSize: number } }[] }
      | { config: { ttl: number; maxSize: number } };

    if (cacheName && "config" in result) {
      return result.config;
    } else if ("caches" in result) {
      return result.caches;
    }
    return null;
  } catch (err) {
    console.error("[Cache] Failed to get config:", err);
    return null;
  }
}

export async function setCacheConfig(
  state: AppViewState,
  cacheName: string,
  config: { ttl?: number; maxSize?: number }
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.cacheLoading = true;
  state.cacheError = null;

  try {
    await state.client.request("cache.config.set", {
      name: cacheName,
      ...config,
    });
    await loadCache(state);
  } catch (err) {
    state.cacheError = err instanceof Error ? err.message : "Failed to set cache config";
    console.error("[Cache] Failed to set config:", err);
    throw err;
  } finally {
    state.cacheLoading = false;
  }
}

export async function warmCache(
  state: AppViewState,
  cacheName: string,
  data: Array<{ key: string; value: unknown }>
): Promise<number> {
  if (!state.client?.connected) {
    return 0;
  }

  try {
    const result = (await state.client.request("cache.warm", {
      name: cacheName,
      data,
    })) as { loaded: number };
    return result.loaded;
  } catch (err) {
    console.error("[Cache] Failed to warm cache:", err);
    return 0;
  }
}

export async function getCacheStats(state: AppViewState): Promise<CacheTotalStats | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("cache.stats")) as CacheTotalStats;
    return result;
  } catch (err) {
    console.error("[Cache] Failed to get stats:", err);
    return null;
  }
}
