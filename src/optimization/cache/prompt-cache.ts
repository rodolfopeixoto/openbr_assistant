export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

interface CacheEntry {
  value: string;
  timestamp: number;
  accessCount: number;
}

export class PromptCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private stats: { hits: number; misses: number };

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
    this.stats = { hits: 0, misses: 0 };
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access count
    entry.accessCount++;
    this.stats.hits++;

    return entry.value;
  }

  set(key: string, value: string): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

export default PromptCache;
