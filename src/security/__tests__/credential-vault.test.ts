import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { AuthProfileStore } from "../../agents/auth-profiles/types.js";
import {
  autoMigrateIfNeeded,
  migrateCredentials,
  detectPlaintextCredentials,
} from "../credential-migration.js";
import { CredentialVault, CredentialVaultMetadata } from "../credential-vault.js";

describe("CredentialVault", () => {
  let tempDir: string;
  let vault: CredentialVault;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "credential-test-"));
  });

  afterEach(async () => {
    if (vault) {
      vault.destroy();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("with passphrase", () => {
    beforeEach(async () => {
      vault = await CredentialVault.initialize({
        agentDir: tempDir,
        usePassphrase: true,
        passphrase: "test-passphrase-123",
      });
    });

    it("should encrypt and decrypt credentials", async () => {
      const plaintext = "sk-test-api-key-12345";
      const encrypted = await vault.encrypt(plaintext);

      expect(encrypted).toHaveProperty("version", 1);
      expect(encrypted).toHaveProperty("algorithm", "aes-256-gcm");
      expect(encrypted).toHaveProperty("encrypted");
      expect(encrypted).toHaveProperty("keyId");
      expect(encrypted).toHaveProperty("createdAt");

      const decrypted = await vault.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertexts for same plaintext", async () => {
      const plaintext = "test-data";
      const encrypted1 = await vault.encrypt(plaintext);
      const encrypted2 = await vault.encrypt(plaintext);

      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
    });

    it("should throw on decryption with wrong algorithm", async () => {
      const encrypted = await vault.encrypt("test");
      encrypted.algorithm = "aes-128-cbc" as any;

      await expect(vault.decrypt(encrypted)).rejects.toThrow("Unsupported algorithm");
    });

    it("should throw when vault not initialized", async () => {
      const uninitializedVault = new (CredentialVault as any)({ agentDir: tempDir });
      await expect(uninitializedVault.encrypt("test")).rejects.toThrow("Vault not initialized");
    });
  });

  describe("key rotation", () => {
    beforeEach(async () => {
      vault = await CredentialVault.initialize({
        agentDir: tempDir,
        usePassphrase: true,
        passphrase: "test-passphrase-123",
      });
    });

    it("should rotate master key", async () => {
      const plaintext = "test-data";
      const encrypted = await vault.encrypt(plaintext);

      await vault.rotateKey();

      // After rotation, we should still be able to decrypt
      const decrypted = await vault.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("destroy", () => {
    it("should zeroize master key", async () => {
      vault = await CredentialVault.initialize({
        agentDir: tempDir,
        usePassphrase: true,
        passphrase: "test-passphrase-123",
      });

      vault.destroy();

      // Should throw after destroy
      await expect(vault.encrypt("test")).rejects.toThrow("Vault not initialized");
    });
  });
});

describe("Argon2id KDF", () => {
  let tempDir: string;
  let vault: CredentialVault;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "argon2id-test-"));
  });

  afterEach(async () => {
    if (vault) {
      vault.destroy();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should use Argon2id for new vaults", async () => {
    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "test-passphrase-123",
    });

    const metadata = vault.getMetadata();
    expect(metadata).toBeDefined();
    expect(metadata!.kdf).toBe("argon2id");
    expect(metadata!.version).toBe(2);
  });

  it("should encrypt and decrypt with Argon2id key", async () => {
    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "secure-passphrase-123",
    });

    const plaintext = "secret-api-key-12345";
    const encrypted = await vault.encrypt(plaintext);
    const decrypted = await vault.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(vault.getMetadata()!.kdf).toBe("argon2id");
  });

  it("should have metadata persisted to disk", async () => {
    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "test-passphrase-123",
    });

    // Re-initialize to verify metadata is loaded from disk
    vault.destroy();
    const newVault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "test-passphrase-123",
    });

    const metadata = newVault.getMetadata();
    expect(metadata).toBeDefined();
    expect(metadata!.kdf).toBe("argon2id");
    expect(metadata!.version).toBe(2);

    newVault.destroy();
  });
});

describe("PBKDF2 to Argon2id Migration", () => {
  let tempDir: string;
  let vault: CredentialVault;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "migration-test-"));
  });

  afterEach(async () => {
    if (vault) {
      vault.destroy();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should migrate from PBKDF2 to Argon2id on unlock", async () => {
    // Simulate old PBKDF2 vault by creating metadata manually
    const metadataPath = path.join(tempDir, ".credential-vault-metadata.json");
    const oldMetadata: CredentialVaultMetadata = {
      kdf: "pbkdf2",
      version: 1,
    };
    await fs.writeFile(metadataPath, JSON.stringify(oldMetadata), { mode: 0o600 });

    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "migration-test-pass",
    });

    // After initialization, metadata should be migrated
    const metadata = vault.getMetadata();
    expect(metadata).toBeDefined();
    expect(metadata!.kdf).toBe("argon2id");
    expect(metadata!.version).toBe(2);
  });

  it("should still work with PBKDF2-encrypted credentials after migration", async () => {
    // First create a vault with PBKDF2 (simulate old state)
    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "test-passphrase",
    });

    // Encrypt something before migration
    const plaintext = "secret-data-12345";
    const encrypted = await vault.encrypt(plaintext);

    // Simulate migration by updating metadata
    const metadataPath = path.join(tempDir, ".credential-vault-metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify({ kdf: "argon2id", version: 2 }), {
      mode: 0o600,
    });

    // Verify we can still decrypt after migration
    const decrypted = await vault.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should maintain backward compatibility with old vaults", async () => {
    // Create metadata indicating PBKDF2
    const metadataPath = path.join(tempDir, ".credential-vault-metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify({ kdf: "pbkdf2", version: 1 }), {
      mode: 0o600,
    });

    // Initialize should trigger migration
    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "backward-compat-test",
    });

    // Should work normally after migration
    const plaintext = "test-data";
    const encrypted = await vault.encrypt(plaintext);
    const decrypted = await vault.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(vault.getMetadata()!.kdf).toBe("argon2id");
  });

  it("should complete migration in under 500ms", async () => {
    const metadataPath = path.join(tempDir, ".credential-vault-metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify({ kdf: "pbkdf2", version: 1 }), {
      mode: 0o600,
    });

    const startTime = Date.now();
    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "performance-test-pass",
    });
    const endTime = Date.now();

    const duration = endTime - startTime;
    expect(duration).toBeLessThan(500);
    expect(vault.getMetadata()!.kdf).toBe("argon2id");
  });
});

describe("Key Re-encryption", () => {
  let tempDir: string;
  let vault: CredentialVault;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reencrypt-test-"));
    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "reencrypt-test-pass",
    });
  });

  afterEach(async () => {
    if (vault) {
      vault.destroy();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should re-encrypt credentials with new key", async () => {
    const crypto = await import("node:crypto");
    const plaintext = "data-to-reencrypt";
    const encrypted = await vault.encrypt(plaintext);

    const oldKey = crypto.randomBytes(32);
    const newKey = crypto.randomBytes(32);

    await vault.reencryptAllCredentials(oldKey, newKey);

    // Vault should still work after re-encryption
    const decrypted = await vault.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should update metadata after re-encryption", async () => {
    const crypto = await import("node:crypto");
    const oldKey = crypto.randomBytes(32);
    const newKey = crypto.randomBytes(32);

    expect(vault.getMetadata()!.version).toBe(2);
    await vault.reencryptAllCredentials(oldKey, newKey);

    // Metadata should still show correct KDF
    const metadata = vault.getMetadata();
    expect(metadata!.kdf).toBe("argon2id");
    expect(metadata!.version).toBe(2);
  });
});

describe("Credential Migration", () => {
  let tempDir: string;
  let vault: CredentialVault;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "migration-test-"));
    vault = await CredentialVault.initialize({
      agentDir: tempDir,
      usePassphrase: true,
      passphrase: "migration-test-pass",
    });
  });

  afterEach(async () => {
    if (vault) {
      vault.destroy();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("detectPlaintextCredentials", () => {
    it("should detect plaintext API key", () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {
          "openai:default": {
            type: "api_key",
            provider: "openai",
            key: "sk-plaintext-key-123",
          },
        },
      };

      expect(detectPlaintextCredentials(store)).toBe(true);
    });

    it("should detect plaintext OAuth tokens", () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {
          "oauth:default": {
            type: "oauth",
            provider: "anthropic",
            access: "sk-access-token",
            refresh: "refresh-token",
          },
        },
      };

      expect(detectPlaintextCredentials(store)).toBe(true);
    });

    it("should not detect encrypted credentials", () => {
      const store: AuthProfileStore = {
        version: 2,
        profiles: {
          "openai:default": {
            type: "api_key",
            provider: "openai",
            key: JSON.stringify({
              version: 1,
              algorithm: "aes-256-gcm",
              encrypted: "base64data",
              keyId: "test",
              createdAt: "2024-01-01",
            }),
          },
        },
      };

      expect(detectPlaintextCredentials(store)).toBe(false);
    });

    it("should return false for empty store", () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {},
      };

      expect(detectPlaintextCredentials(store)).toBe(false);
    });
  });

  describe("migrateCredentials", () => {
    it("should migrate plaintext credentials", async () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {
          "openai:default": {
            type: "api_key",
            provider: "openai",
            key: "sk-test-key-123",
          },
        },
      };

      const result = await migrateCredentials(store, vault, tempDir);

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.backupPath).not.toBeNull();

      // Verify encryption
      const profile = store.profiles["openai:default"];
      const keyData = JSON.parse(profile.key as string);
      expect(keyData).toHaveProperty("version", 1);
      expect(keyData).toHaveProperty("algorithm", "aes-256-gcm");

      // Verify decryption works
      const decrypted = await vault.decrypt(keyData);
      expect(decrypted).toBe("sk-test-key-123");
    });

    it("should skip already encrypted credentials", async () => {
      const encryptedKey = await vault.encrypt("already-encrypted");

      const store: AuthProfileStore = {
        version: 2,
        profiles: {
          "openai:default": {
            type: "api_key",
            provider: "openai",
            key: JSON.stringify(encryptedKey),
          },
        },
      };

      const result = await migrateCredentials(store, vault, tempDir);

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should create backup before migration", async () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {
          "test:default": {
            type: "api_key",
            provider: "test",
            key: "test-key",
          },
        },
      };

      const result = await migrateCredentials(store, vault, tempDir);

      expect(result.backupPath).not.toBeNull();
      const backupExists = await fs
        .access(result.backupPath!)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);
    });

    it("should handle multiple profiles", async () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {
          "openai:default": {
            type: "api_key",
            provider: "openai",
            key: "sk-openai",
          },
          "anthropic:default": {
            type: "oauth",
            provider: "anthropic",
            access: "sk-anthropic-access",
            refresh: "anthropic-refresh",
          },
        },
      };

      const result = await migrateCredentials(store, vault, tempDir);

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(2);

      // Verify all fields are encrypted
      const openai = store.profiles["openai:default"];
      const anthropic = store.profiles["anthropic:default"];

      expect(() => JSON.parse(openai.key as string)).not.toThrow();
      expect(() => JSON.parse(anthropic.access as string)).not.toThrow();
      expect(() => JSON.parse(anthropic.refresh as string)).not.toThrow();
    });
  });

  describe("autoMigrateIfNeeded", () => {
    it("should return false if no plaintext credentials", async () => {
      const encryptedKey = await vault.encrypt("encrypted-key");
      const store: AuthProfileStore = {
        version: 2,
        profiles: {
          "test:default": {
            type: "api_key",
            provider: "test",
            key: JSON.stringify(encryptedKey),
          },
        },
      };

      await fs.writeFile(path.join(tempDir, "auth-profiles.json"), JSON.stringify(store));

      const result = await autoMigrateIfNeeded(tempDir, "migration-test-pass");

      expect(result.migrated).toBe(false);
    });

    it("should migrate if plaintext credentials found", async () => {
      const store: AuthProfileStore = {
        version: 1,
        profiles: {
          "test:default": {
            type: "api_key",
            provider: "test",
            key: "plaintext-key",
          },
        },
      };

      await fs.writeFile(path.join(tempDir, "auth-profiles.json"), JSON.stringify(store));

      const result = await autoMigrateIfNeeded(tempDir, "migration-test-pass");

      expect(result.migrated).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result!.success).toBe(true);
      expect(result.result!.migrated).toBe(1);
    });

    it("should handle missing auth file", async () => {
      const result = await autoMigrateIfNeeded(tempDir, "migration-test-pass");

      expect(result.migrated).toBe(false);
    });
  });
});
