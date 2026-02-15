import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecretVault } from '../src/vault/index.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SecretVault', () => {
  let vault: SecretVault;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `vault-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    vault = new SecretVault({ masterPassword: 'test-password-123' });
    (vault as any).vaultPath = testDir;
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it('should initialize successfully', async () => {
    await expect(vault.initialize()).resolves.not.toThrow();
  });

  it('should store and retrieve a secret', async () => {
    await vault.initialize();
    await vault.set('test-key', 'test-value');
    const value = await vault.get('test-key');
    expect(value).toBe('test-value');
  });

  it('should return null for non-existent key', async () => {
    await vault.initialize();
    const value = await vault.get('non-existent');
    expect(value).toBeNull();
  });

  it('should delete a secret', async () => {
    await vault.initialize();
    await vault.set('delete-key', 'delete-value');
    await vault.delete('delete-key');
    const value = await vault.get('delete-key');
    expect(value).toBeNull();
  });

  it('should list all keys', async () => {
    await vault.initialize();
    await vault.set('key1', 'value1');
    await vault.set('key2', 'value2');
    const keys = await vault.list();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should handle special characters in values', async () => {
    await vault.initialize();
    const specialValue = 'test!@#$%^&*()_+-=[]{}|;:,.<>?';
    await vault.set('special', specialValue);
    const retrieved = await vault.get('special');
    expect(retrieved).toBe(specialValue);
  });

  it('should handle unicode characters', async () => {
    await vault.initialize();
    const unicodeValue = '🎉 Teste com acentuação: áéíóú àèìòù';
    await vault.set('unicode', unicodeValue);
    const retrieved = await vault.get('unicode');
    expect(retrieved).toBe(unicodeValue);
  });

  it('should clear cache', async () => {
    await vault.initialize();
    await vault.set('cache-key', 'cache-value');
    await vault.get('cache-key'); // Load into cache
    vault.clearCache();
    // Should still work after clearing cache
    const value = await vault.get('cache-key');
    expect(value).toBe('cache-value');
  });
});
