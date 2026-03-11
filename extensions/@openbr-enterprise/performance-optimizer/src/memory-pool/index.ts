/**
 * SecureMemoryPool - Performance optimization with security
 * Reusable buffer pool with automatic zeroization
 */

export interface BufferPoolConfig {
  minSize: number;
  maxSize: number;
  initialCapacity: number;
  maxCapacity: number;
}

interface PooledBuffer {
  buffer: Buffer;
  size: number;
  inUse: boolean;
  lastUsed: Date;
}

/**
 * SecureMemoryPool - High-performance secure buffer management
 * 
 * Features:
 * - Buffer reuse to reduce GC pressure
 * - Automatic zeroization between uses
 * - Size-tiered pools
 * - Memory limits
 */
export class SecureMemoryPool {
  private pools: Map<number, PooledBuffer[]> = new Map();
  private config: BufferPoolConfig;
  private totalAllocated = 0;
  private totalReused = 0;

  constructor(config: Partial<BufferPoolConfig> = {}) {
    this.config = {
      minSize: 1024,        // 1KB
      maxSize: 1024 * 1024, // 1MB
      initialCapacity: 10,
      maxCapacity: 100,
      ...config
    };

    this.initializePools();
  }

  /**
   * Acquire a buffer from the pool
   */
  acquire(size: number): Buffer {
    const tier = this.getTier(size);
    const pool = this.pools.get(tier);

    if (pool) {
      // Find available buffer
      const available = pool.find(b => !b.inUse);
      if (available) {
        available.inUse = true;
        available.lastUsed = new Date();
        this.totalReused++;
        
        // Zeroize before returning
        available.buffer.fill(0);
        return available.buffer.subarray(0, size);
      }
    }

    // Create new buffer if pool not at capacity
    if (pool && pool.length < this.config.maxCapacity) {
      const buffer = Buffer.alloc(tier);
      const pooled: PooledBuffer = {
        buffer,
        size: tier,
        inUse: true,
        lastUsed: new Date()
      };
      pool.push(pooled);
      this.totalAllocated++;
      return buffer.subarray(0, size);
    }

    // Fall back to allocation
    this.totalAllocated++;
    return Buffer.alloc(size);
  }

  /**
   * Return a buffer to the pool
   */
  release(buffer: Buffer): void {
    // Zeroize immediately
    buffer.fill(0);

    // Find and mark as not in use
    for (const pool of this.pools.values()) {
      const pooled = pool.find(p => p.buffer === buffer || 
        (p.buffer.buffer === buffer.buffer && p.inUse));
      if (pooled) {
        pooled.inUse = false;
        pooled.lastUsed = new Date();
        return;
      }
    }

    // Buffer not from pool - will be GC'd
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalAllocated: number;
    totalReused: number;
    reuseRate: number;
    pools: { tier: number; available: number; inUse: number }[];
  } {
    const pools = Array.from(this.pools.entries()).map(([tier, pool]) => ({
      tier,
      available: pool.filter(b => !b.inUse).length,
      inUse: pool.filter(b => b.inUse).length
    }));

    const total = this.totalAllocated + this.totalReused;
    return {
      totalAllocated: this.totalAllocated,
      totalReused: this.totalReused,
      reuseRate: total > 0 ? this.totalReused / total : 0,
      pools
    };
  }

  /**
   * Clear all pools
   */
  clear(): void {
    for (const pool of this.pools.values()) {
      for (const buffer of pool) {
        buffer.buffer.fill(0);
        buffer.inUse = false;
      }
    }
  }

  /**
   * Dispose the pool
   */
  dispose(): void {
    this.clear();
    this.pools.clear();
  }

  private initializePools(): void {
    const tiers = [1024, 4096, 16384, 65536, 262144, 1048576];
    
    for (const tier of tiers) {
      if (tier >= this.config.minSize && tier <= this.config.maxSize) {
        const pool: PooledBuffer[] = [];
        
        // Pre-allocate initial capacity
        for (let i = 0; i < this.config.initialCapacity; i++) {
          pool.push({
            buffer: Buffer.alloc(tier),
            size: tier,
            inUse: false,
            lastUsed: new Date()
          });
        }
        
        this.pools.set(tier, pool);
      }
    }
  }

  private getTier(size: number): number {
    const tiers = Array.from(this.pools.keys()).sort((a, b) => a - b);
    for (const tier of tiers) {
      if (tier >= size) return tier;
    }
    return this.config.maxSize;
  }
}

export default SecureMemoryPool;
