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
import { CredentialVault } from "../credential-vault.js";

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
