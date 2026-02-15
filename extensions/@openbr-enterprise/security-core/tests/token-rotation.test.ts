import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenRotation } from '../src/token-rotation/index.js';

describe('TokenRotation', () => {
  let rotation: TokenRotation;

  beforeEach(() => {
    rotation = new TokenRotation();
  });

  afterEach(() => {
    rotation.dispose();
  });

  it('should register a token', () => {
    rotation.registerToken({
      name: 'test-token',
      currentToken: 'token-123'
    });

    const metadata = rotation.getTokenMetadata('test-token');
    expect(metadata).not.toBeNull();
    expect(metadata?.name).toBe('test-token');
    expect(metadata?.isActive).toBe(true);
  });

  it('should rotate token successfully', async () => {
    rotation.registerToken({
      name: 'rotate-test',
      currentToken: 'old-token'
    });

    const result = await rotation.rotateToken('rotate-test', async () => 'new-token');

    expect(result.success).toBe(true);
    expect(result.oldToken).toBe('old-token');
    expect(result.newToken).toBe('new-token');
    expect(rotation.getToken('rotate-test')).toBe('new-token');
  });

  it('should track rotation count', async () => {
    rotation.registerToken({
      name: 'count-test',
      currentToken: 'token-1'
    });

    await rotation.rotateToken('count-test', async () => 'token-2');
    await rotation.rotateToken('count-test', async () => 'token-3');

    const metadata = rotation.getTokenMetadata('count-test');
    expect(metadata?.rotationCount).toBe(2);
  });

  it('should return error for non-existent token', async () => {
    const result = await rotation.rotateToken('non-existent', async () => 'new');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should list all tokens', () => {
    rotation.registerToken({ name: 'token1', currentToken: 't1' });
    rotation.registerToken({ name: 'token2', currentToken: 't2' });

    const tokens = rotation.listTokens();
    expect(tokens).toHaveLength(2);
    expect(tokens.map(t => t.name)).toContain('token1');
    expect(tokens.map(t => t.name)).toContain('token2');
  });

  it('should revoke token', () => {
    rotation.registerToken({ name: 'revoke-test', currentToken: 'token' });
    rotation.revokeToken('revoke-test');

    const metadata = rotation.getTokenMetadata('revoke-test');
    expect(metadata?.isActive).toBe(false);
    expect(rotation.getToken('revoke-test')).toBeNull();
  });

  it('should check token status', () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    rotation.registerToken({
      name: 'expire-test',
      currentToken: 'token',
      expiresAt,
      notifyBeforeExpiration: 10
    });

    const status = rotation.checkTokenStatus('expire-test');
    expect(status.isExpired).toBe(false);
    expect(status.isNearExpiration).toBe(true);
    expect(status.daysUntilExpiration).toBe(7);
  });

  it('should emit events', () => {
    const events: string[] = [];
    rotation.on('tokenRegistered', () => events.push('registered'));
    rotation.on('tokenRotated', () => events.push('rotated'));

    rotation.registerToken({ name: 'event-test', currentToken: 't1' });
    expect(events).toContain('registered');
  });
});
