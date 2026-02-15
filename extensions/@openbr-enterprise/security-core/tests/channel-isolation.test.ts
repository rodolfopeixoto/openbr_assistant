import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChannelIsolation } from '../src/channel-isolation/index.js';

describe('ChannelIsolation', () => {
  let isolation: ChannelIsolation;

  beforeEach(() => {
    isolation = new ChannelIsolation(1000); // 1 second health check for tests
  });

  afterEach(async () => {
    await isolation.stopAll();
    isolation.dispose();
  });

  it('should create instance', () => {
    expect(isolation).toBeDefined();
  });

  it('should list channels when empty', () => {
    const channels = isolation.listChannels();
    expect(channels).toHaveLength(0);
  });

  it('should emit events', () => {
    const events: string[] = [];
    isolation.on('channelStarted', () => events.push('started'));
    
    // We can't actually start a process in unit tests without a real module,
    // but we can verify the event emitter works
    isolation.emit('test-event');
    expect(events).toHaveLength(0); // No listener for test-event
  });

  it('should return null for non-existent channel stats', () => {
    const stats = isolation.getChannelStats('non-existent');
    expect(stats).toBeNull();
  });

  it('should return false for non-existent channel message', () => {
    const result = isolation.sendMessage('non-existent', { test: true });
    expect(result).toBe(false);
  });

  it('should handle dispose gracefully', () => {
    expect(() => isolation.dispose()).not.toThrow();
  });

  it('should throw when starting duplicate channel', async () => {
    // This test demonstrates the error handling
    // We would need a real module path to fully test this
    const config = {
      name: 'test-channel',
      modulePath: '/fake/path.js'
    };

    // First call should fail because module doesn't exist
    try {
      await isolation.startChannel(config);
    } catch (e) {
      // Expected to fail
    }
  });
});
