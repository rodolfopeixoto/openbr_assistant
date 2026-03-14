import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("cache-manager");

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

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  maxBytes?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastCleared?: Date;
}

class ManagedCache {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
  };

  private data: Map<string, { value: unknown; timestamp: number }> = new Map();

  constructor(
    public readonly name: string,
    public readonly type: CacheType,
    private config: CacheConfig,
  ) {}

  get(key: string): unknown | undefined {
    const entry = this.data.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttl * 1000) {
      this.data.delete(key);
      this.stats.misses++;
      this.stats.size = this.data.size;
      return undefined;
    }

    this.stats.hits++;
    return entry.value;
  }

  set(key: string, value: unknown): void {
    // Check max size and evict if needed
    if (this.data.size >= this.config.maxSize && !this.data.has(key)) {
      // Evict oldest entry
      const oldest = this.data.entries().next().value;
      if (oldest) {
        this.data.delete(oldest[0]);
      }
    }

    this.data.set(key, {
      value,
      timestamp: Date.now(),
    });
    this.stats.size = this.data.size;
  }

  delete(key: string): boolean {
    const deleted = this.data.delete(key);
    if (deleted) {
      this.stats.size = this.data.size;
    }
    return deleted;
  }

  clear(): void {
    this.data.clear();
    this.stats.size = 0;
    this.stats.lastCleared = new Date();
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getSize(): number {
    return this.data.size;
  }

  getBytesUsed(): number {
    // Rough estimation
    let bytes = 0;
    for (const [key, entry] of this.data) {
      bytes += key.length * 2;
      bytes += JSON.stringify(entry).length * 2;
    }
    return bytes;
  }

  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  getMissRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.misses / total) * 100 : 0;
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getInfo(): CacheInfo {
    return {
      name: this.name,
      type: this.type,
      size: this.data.size,
      maxSize: this.config.maxSize,
      hitRate: this.getHitRate(),
      missRate: this.getMissRate(),
      ttl: this.config.ttl,
      lastCleared: this.stats.lastCleared?.toISOString(),
      entries: this.data.size,
      bytesUsed: this.getBytesUsed(),
    };
  }
}

export class CacheManager {
  private caches: Map<string, ManagedCache> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.initializeDefaultCaches();
  }

  private initializeDefaultCaches(): void {
    // Config cache
    this.register("config", "memory", {
      ttl: 300,
      maxSize: 1000,
    });

    // Session store cache
    this.register("session", "memory", {
      ttl: 3600,
      maxSize: 10000,
    });

    // Embedding cache
    this.register("embedding", "memory", {
      ttl: 3600,
      maxSize: 5000,
      maxBytes: 100 * 1024 * 1024, // 100MB
    });

    // STT cache
    this.register("stt", "memory", {
      ttl: 3600,
      maxSize: 1000,
    });

    // Cost usage cache
    this.register("cost", "memory", {
      ttl: 60,
      maxSize: 10000,
    });

    // Model selection cache
    this.register("model-selection", "memory", {
      ttl: 300,
      maxSize: 1000,
    });

    // API response cache
    this.register("api-response", "memory", {
      ttl: 600,
      maxSize: 5000,
    });

    // File metadata cache
    this.register("file-metadata", "memory", {
      ttl: 1800,
      maxSize: 10000,
    });
  }

  /**
   * Register a new cache
   */
  register(name: string, type: CacheType, config: CacheConfig): ManagedCache {
    const cache = new ManagedCache(name, type, config);
    this.caches.set(name, cache);
    return cache;
  }

  /**
   * Get a cache by name
   */
  getCache(name: string): ManagedCache | undefined {
    return this.caches.get(name);
  }

  /**
   * Get value from cache
   */
  get(cacheName: string, key: string): unknown | undefined {
    if (!this.enabled) {
      return undefined;
    }

    const cache = this.caches.get(cacheName);
    if (!cache) {
      log.warn(`Cache '${cacheName}' not found`);
      return undefined;
    }

    return cache.get(key);
  }

  /**
   * Set value in cache
   */
  set(cacheName: string, key: string, value: unknown): void {
    if (!this.enabled) {
      return;
    }

    const cache = this.caches.get(cacheName);
    if (!cache) {
      log.warn(`Cache '${cacheName}' not found`);
      return;
    }

    cache.set(key, value);
  }

  /**
   * Delete from cache
   */
  delete(cacheName: string, key: string): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) {
      return false;
    }

    return cache.delete(key);
  }

  /**
   * Clear specific cache
   */
  clearCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (!cache) {
      return false;
    }

    cache.clear();
    log.info(`Cache '${name}' cleared`);
    return true;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const [name, cache] of this.caches) {
      cache.clear();
      log.info(`Cache '${name}' cleared`);
    }
  }

  /**
   * Get status of all caches
   */
  getStatus(): CacheInfo[] {
    return Array.from(this.caches.values())
      .map((cache) => cache.getInfo())
      .toSorted((a, b) => b.bytesUsed! - a.bytesUsed!);
  }

  /**
   * Get specific cache info
   */
  getCacheInfo(name: string): CacheInfo | undefined {
    const cache = this.caches.get(name);
    return cache?.getInfo();
  }

  /**
   * Configure cache
   */
  configureCache(name: string, config: Partial<CacheConfig>): boolean {
    const cache = this.caches.get(name);
    if (!cache) {
      return false;
    }

    cache.setConfig(config);
    log.info(`Cache '${name}' reconfigured:`, config);
    return true;
  }

  /**
   * Get total stats
   */
  getTotalStats(): {
    totalSize: number;
    totalBytes: number;
    avgHitRate: number;
    cacheCount: number;
  } {
    const caches = this.getStatus();
    const totalSize = caches.reduce((sum, c) => sum + c.size, 0);
    const totalBytes = caches.reduce((sum, c) => sum + (c.bytesUsed || 0), 0);
    const avgHitRate =
      caches.length > 0 ? caches.reduce((sum, c) => sum + c.hitRate, 0) / caches.length : 0;

    return {
      totalSize,
      totalBytes,
      avgHitRate,
      cacheCount: caches.length,
    };
  }

  /**
   * Warm cache with frequently used data
   */
  async warmCache(name: string, data: Array<{ key: string; value: unknown }>): Promise<number> {
    const cache = this.caches.get(name);
    if (!cache) {
      return 0;
    }

    let loaded = 0;
    for (const { key, value } of data) {
      cache.set(key, value);
      loaded++;
    }

    log.info(`Cache '${name}' warmed with ${loaded} entries`);
    return loaded;
  }

  /**
   * Enable/disable cache manager
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}
