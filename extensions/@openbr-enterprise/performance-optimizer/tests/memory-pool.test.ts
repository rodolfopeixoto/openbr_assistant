import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecureMemoryPool } from '../src/memory-pool/index.js';

describe('SecureMemoryPool', () => {
  let pool: SecureMemoryPool;

  beforeEach(() => {
    pool = new SecureMemoryPool({
      minSize: 1024,
      maxSize: 4096,
      initialCapacity: 2,
      maxCapacity: 5
    });
  });

  afterEach(() => {
    pool.dispose();
  });

  it('should create pool with default config', () => {
    const defaultPool = new SecureMemoryPool();
    expect(defaultPool).toBeDefined();
    defaultPool.dispose();
  });

  it('should acquire and release buffer', () => {
    const buffer = pool.acquire(512);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThanOrEqual(512);

    pool.release(buffer);
    // Should not throw
  });

  it('should zeroize buffer on release', () => {
    const buffer = pool.acquire(100);
    buffer.fill(0xFF);
    expect(buffer[0]).toBe(0xFF);

    pool.release(buffer);
    // Buffer should be zeroized
    expect(buffer[0]).toBe(0);
  });

  it('should reuse buffers', () => {
    const buffer1 = pool.acquire(1024);
    const ptr1 = buffer1.buffer;
    pool.release(buffer1);

    const buffer2 = pool.acquire(1024);
    const ptr2 = buffer2.buffer;

    // Should reuse same underlying buffer
    expect(ptr1).toBe(ptr2);

    const stats = pool.getStats();
    expect(stats.totalReused).toBe(1);
  });

  it('should track statistics', () => {
    pool.acquire(1024);
    pool.acquire(2048);

    const stats = pool.getStats();
    expect(stats.totalAllocated).toBeGreaterThan(0);
    expect(stats.pools.length).toBeGreaterThan(0);
  });

  it('should handle different sizes', () => {
    const small = pool.acquire(512);
    const large = pool.acquire(3072);

    expect(small.length).toBeGreaterThanOrEqual(512);
    expect(large.length).toBeGreaterThanOrEqual(3072);

    pool.release(small);
    pool.release(large);
  });

  it('should clear all pools', () => {
    const buffer = pool.acquire(1024);
    buffer.fill(0xFF);

    pool.clear();

    // Buffer should be zeroized
    expect(buffer[0]).toBe(0);
  });
});
