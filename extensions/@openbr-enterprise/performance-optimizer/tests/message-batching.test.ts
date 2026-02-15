import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageBatching } from '../src/message-batching/index.js';

describe('MessageBatching', () => {
  let batcher: MessageBatching;

  beforeEach(() => {
    batcher = new MessageBatching({
      maxSize: 5,
      maxWaitMs: 100,
      maxRetries: 2,
      retryDelayMs: 50,
      compress: false
    });
  });

  afterEach(async () => {
    await batcher.dispose();
  });

  it('should create batcher with default config', () => {
    const defaultBatcher = new MessageBatching();
    expect(defaultBatcher).toBeDefined();
    defaultBatcher.dispose();
  });

  it('should add messages to buffer', async () => {
    await batcher.add({ test: 1 });
    await batcher.add({ test: 2 });

    const stats = batcher.getStats();
    expect(stats.buffered).toBe(2);
  });

  it('should flush when buffer is full', async () => {
    const messages: any[] = [];

    // Add messages to fill buffer
    for (let i = 0; i < 5; i++) {
      await batcher.add({ id: i });
    }

    // Wait for flush
    await new Promise(resolve => setTimeout(resolve, 150));

    const stats = batcher.getStats();
    // Buffer should be empty after flush
    expect(stats.buffered).toBeLessThanOrEqual(0);
  });

  it('should track statistics', async () => {
    await batcher.add({ test: 1 });

    const stats = batcher.getStats();
    expect(stats.buffered).toBe(1);
    expect(stats.isFlushing).toBe(false);
  });

  it('should dispose cleanly', async () => {
    await batcher.add({ test: 1 });
    await expect(batcher.dispose()).resolves.not.toThrow();
  });

  it('should handle empty buffer flush', async () => {
    await expect(batcher.flush()).resolves.not.toThrow();
  });
});
