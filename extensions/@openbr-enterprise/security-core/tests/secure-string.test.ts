import { describe, it, expect, beforeEach } from 'vitest';
import { SecureString } from '../src/secure-string/index.js';

describe('SecureString', () => {
  it('should create from string', () => {
    const ss = SecureString.from('test-value');
    expect(ss.getValue()).toBe('test-value');
  });

  it('should create from buffer', () => {
    const buffer = Buffer.from('buffer-value');
    const ss = SecureString.fromBuffer(buffer);
    expect(ss.getValue()).toBe('buffer-value');
  });

  it('should mask value in toString', () => {
    const ss = SecureString.from('secret-password-123');
    const masked = ss.toString();
    expect(masked).toContain('****');
    expect(masked).not.toContain('secret-password-123');
  });

  it('should throw when accessing zeroized string', () => {
    const ss = SecureString.from('test');
    ss.zeroize();
    expect(() => ss.getValue()).toThrow('zeroized');
  });

  it('should perform constant-time comparison', () => {
    const ss1 = SecureString.from('same-value');
    const ss2 = SecureString.from('same-value');
    const ss3 = SecureString.from('different');

    expect(ss1.equals(ss2)).toBe(true);
    expect(ss1.equals(ss3)).toBe(false);
  });

  it('should compare different lengths safely', () => {
    const ss1 = SecureString.from('short');
    const ss2 = SecureString.from('very-long-string-here');

    expect(ss1.equals(ss2)).toBe(false);
  });

  it('should report correct length', () => {
    const ss = SecureString.from('hello');
    expect(ss.length).toBe(5);
  });

  it('should generate random string', () => {
    const ss = SecureString.random(32);
    expect(ss.length).toBe(32);
  });

  it('should report isZeroized correctly', () => {
    const ss = SecureString.from('test');
    expect(ss.isZeroized()).toBe(false);
    ss.zeroize();
    expect(ss.isZeroized()).toBe(true);
  });

  it('should not throw when zeroizing already zeroized', () => {
    const ss = SecureString.from('test');
    ss.zeroize();
    expect(() => ss.zeroize()).not.toThrow();
  });

  it('should mask short values completely', () => {
    const ss = SecureString.from('hi');
    expect(ss.mask()).toBe('****');
  });

  it('should show first and last chars in mask for long values', () => {
    const ss = SecureString.from('mysecretpassword');
    const masked = ss.mask();
    expect(masked.startsWith('my')).toBe(true);
    expect(masked.endsWith('rd')).toBe(true);
    expect(masked).toContain('****');
  });
});
