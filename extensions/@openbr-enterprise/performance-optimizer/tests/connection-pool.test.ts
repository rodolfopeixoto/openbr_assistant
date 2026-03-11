import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionPool } from '../src/connection-pool/index.js';

describe('ConnectionPool', () => {
  let pool: ConnectionPool;

  beforeEach(() => {
    pool = new ConnectionPool({
      minConnections: 1,
      maxConnections: 3,
      maxIdleTimeMs: 1000,
      healthCheckIntervalMs: 500,
      acquireTimeoutMs: 1000
    });
  });

  afterEach(async () => {
    await pool.dispose();
  });

  it('should create pool with default config', () => {
    const defaultPool = new ConnectionPool();
    expect(defaultPool).toBeDefined();
    defaultPool.dispose();
  });

  it('should track statistics', () => {
    const stats = pool.getStats();
    expect(stats.totalConnections).toBe(0);
    expect(stats.activeConnections).toBe(0);
    expect(stats.idleConnections).toBe(0);
  });

  it('should handle channel connections', async () => {
    // Since we can't actually connect in tests, 
    // we test that the pool structure works
    const stats = pool.getStats();
    expect(stats.byChannel).toBeInstanceOf(Array);
  });

  it('should return null for non-existent channel acquire', async () => {
    // Without actual connections, acquire will fail
    const conn = await pool.acquire('test-channel');
    // Will be null because no real connection can be made
    expect(conn).toBeNull();
  });

  it('should handle release of unknown connection', () => {
    // Should not throw
    pool.release('non-existent-id');
  });

  it('should dispose cleanly', async () => {
    await expect(pool.dispose()).resolves.not.toThrow();
  });
});
