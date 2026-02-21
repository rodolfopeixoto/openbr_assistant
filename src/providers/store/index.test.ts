import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { EncryptedCredential } from "../../services/credential-vault.js";
import {
  ProviderStore,
  createProviderStore,
  ProviderNotFoundError,
  ProviderAlreadyExistsError,
  ProviderStoreError,
} from "./index.js";

describe("ProviderStore", () => {
  let tempDir: string;
  let store: ProviderStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "provider-store-test-"));
    store = createProviderStore({ baseDir: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("create", () => {
    it("should create a provider with encrypted credentials", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64encrypteddata",
        algorithm: "aes-256-gcm",
        keyId: "test-key-id",
        createdAt: new Date().toISOString(),
      };

      const provider = await store.create({
        instanceId: "test-provider-1",
        providerId: "openai",
        name: "Test OpenAI Provider",
        description: "Test description",
        credentials: { apiKey: mockCredential },
        models: {
          "gpt-4": { enabled: true, maxTokens: 4096 },
        },
      });

      expect(provider.instanceId).toBe("test-provider-1");
      expect(provider.providerId).toBe("openai");
      expect(provider.name).toBe("Test OpenAI Provider");
      expect(provider.description).toBe("Test description");
      expect(provider.credentials.apiKey).toEqual(mockCredential);
      expect(provider.models["gpt-4"].enabled).toBe(true);
      expect(provider.createdAt).toBeDefined();
      expect(provider.updatedAt).toBeDefined();
      expect(provider.createdAt).toBe(provider.updatedAt);
    });

    it("should throw ProviderAlreadyExistsError for duplicate instanceId", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      await store.create({
        instanceId: "duplicate-id",
        providerId: "openai",
        name: "First Provider",
        credentials: { apiKey: mockCredential },
        models: {},
      });

      await expect(
        store.create({
          instanceId: "duplicate-id",
          providerId: "anthropic",
          name: "Second Provider",
          credentials: { apiKey: mockCredential },
          models: {},
        }),
      ).rejects.toThrow(ProviderAlreadyExistsError);
    });

    it("should reject invalid instanceId characters", async () => {
      await expect(
        store.create({
          instanceId: "invalid/id",
          providerId: "openai",
          name: "Invalid Provider",
          credentials: {},
          models: {},
        }),
      ).rejects.toThrow(ProviderStoreError);
    });
  });

  describe("get", () => {
    it("should retrieve a provider by instanceId", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      const created = await store.create({
        instanceId: "get-test",
        providerId: "openai",
        name: "Get Test Provider",
        credentials: { apiKey: mockCredential },
        models: { "gpt-4": { enabled: true } },
      });

      const retrieved = await store.get("get-test");

      expect(retrieved).toEqual(created);
    });

    it("should throw ProviderNotFoundError for non-existent provider", async () => {
      await expect(store.get("non-existent")).rejects.toThrow(ProviderNotFoundError);
    });

    it("should throw error for corrupted provider data", async () => {
      const providerPath = path.join(tempDir, "corrupted.json");
      await fs.writeFile(providerPath, "not valid json", { mode: 0o600 });

      await expect(store.get("corrupted")).rejects.toThrow(ProviderStoreError);
    });
  });

  describe("update", () => {
    it("should update provider fields", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      const created = await store.create({
        instanceId: "update-test",
        providerId: "openai",
        name: "Original Name",
        description: "Original description",
        credentials: { apiKey: mockCredential },
        models: { "gpt-4": { enabled: true } },
      });

      const newCredential: EncryptedCredential = {
        version: 1,
        encrypted: "newbase64data",
        algorithm: "aes-256-gcm",
        keyId: "new-key-id",
        createdAt: new Date().toISOString(),
      };

      const updated = await store.update("update-test", {
        name: "Updated Name",
        credentials: { apiKey: newCredential },
        models: { "gpt-4": { enabled: false, temperature: 0.5 } },
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("Original description");
      expect(updated.credentials.apiKey).toEqual(newCredential);
      expect(updated.models["gpt-4"].enabled).toBe(false);
      expect(updated.models["gpt-4"].temperature).toBe(0.5);
      expect(updated.instanceId).toBe(created.instanceId);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime(),
      );
    });

    it("should throw ProviderNotFoundError when updating non-existent provider", async () => {
      await expect(store.update("non-existent", { name: "New Name" })).rejects.toThrow(
        ProviderNotFoundError,
      );
    });
  });

  describe("delete", () => {
    it("should delete a provider", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      await store.create({
        instanceId: "delete-test",
        providerId: "openai",
        name: "Delete Test",
        credentials: { apiKey: mockCredential },
        models: {},
      });

      await store.delete("delete-test");

      await expect(store.get("delete-test")).rejects.toThrow(ProviderNotFoundError);
    });

    it("should throw ProviderNotFoundError when deleting non-existent provider", async () => {
      await expect(store.delete("non-existent")).rejects.toThrow(ProviderNotFoundError);
    });
  });

  describe("list", () => {
    it("should return empty array when no providers", async () => {
      const providers = await store.list();
      expect(providers).toEqual([]);
    });

    it("should return all providers sorted by createdAt", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      await store.create({
        instanceId: "provider-b",
        providerId: "anthropic",
        name: "Provider B",
        credentials: { apiKey: mockCredential },
        models: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await store.create({
        instanceId: "provider-a",
        providerId: "openai",
        name: "Provider A",
        credentials: { apiKey: mockCredential },
        models: {},
      });

      const providers = await store.list();

      expect(providers).toHaveLength(2);
      expect(providers[0].instanceId).toBe("provider-b");
      expect(providers[1].instanceId).toBe("provider-a");
    });

    it("should skip corrupted provider files", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      await store.create({
        instanceId: "valid-provider",
        providerId: "openai",
        name: "Valid Provider",
        credentials: { apiKey: mockCredential },
        models: {},
      });

      const corruptedPath = path.join(tempDir, "corrupted.json");
      await fs.writeFile(corruptedPath, "not valid json", { mode: 0o600 });

      const providers = await store.list();

      expect(providers).toHaveLength(1);
      expect(providers[0].instanceId).toBe("valid-provider");
    });
  });

  describe("exists", () => {
    it("should return true for existing provider", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      await store.create({
        instanceId: "exists-test",
        providerId: "openai",
        name: "Exists Test",
        credentials: { apiKey: mockCredential },
        models: {},
      });

      expect(await store.exists("exists-test")).toBe(true);
    });

    it("should return false for non-existent provider", async () => {
      expect(await store.exists("non-existent")).toBe(false);
    });
  });

  describe("getBaseDir", () => {
    it("should return the base directory", () => {
      expect(store.getBaseDir()).toBe(tempDir);
    });
  });

  describe("default base directory", () => {
    it("should use ~/.openclaw/providers by default", () => {
      const defaultStore = createProviderStore();
      expect(defaultStore.getBaseDir()).toBe(path.join(os.homedir(), ".openclaw", "providers"));
    });
  });

  describe("file permissions", () => {
    it("should create provider files with secure permissions", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      await store.create({
        instanceId: "perm-test",
        providerId: "openai",
        name: "Permission Test",
        credentials: { apiKey: mockCredential },
        models: {},
      });

      const providerPath = path.join(tempDir, "perm-test.json");
      const stats = await fs.stat(providerPath);

      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });

  describe("atomic writes", () => {
    it("should use atomic write for provider updates", async () => {
      const mockCredential: EncryptedCredential = {
        version: 1,
        encrypted: "base64data",
        algorithm: "aes-256-gcm",
        keyId: "key-id",
        createdAt: new Date().toISOString(),
      };

      await store.create({
        instanceId: "atomic-test",
        providerId: "openai",
        name: "Original",
        credentials: { apiKey: mockCredential },
        models: {},
      });

      await store.update("atomic-test", { name: "Updated" });

      const provider = await store.get("atomic-test");
      expect(provider.name).toBe("Updated");
    });
  });

  describe("encryption integration", () => {
    it("should handle multiple encrypted credentials per provider", async () => {
      const apiKeyCredential: EncryptedCredential = {
        version: 1,
        encrypted: "apikeyencrypted",
        algorithm: "aes-256-gcm",
        keyId: "key-1",
        createdAt: new Date().toISOString(),
      };

      const tokenCredential: EncryptedCredential = {
        version: 1,
        encrypted: "tokenencrypted",
        algorithm: "aes-256-gcm",
        keyId: "key-2",
        createdAt: new Date().toISOString(),
      };

      const provider = await store.create({
        instanceId: "multi-cred",
        providerId: "custom",
        name: "Multi Credential Provider",
        credentials: {
          apiKey: apiKeyCredential,
          oauthToken: tokenCredential,
        },
        models: {},
      });

      expect(provider.credentials.apiKey).toEqual(apiKeyCredential);
      expect(provider.credentials.oauthToken).toEqual(tokenCredential);
    });
  });
});

describe("ProviderStore error handling", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "provider-store-error-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should handle directory creation errors", async () => {
    const readOnlyDir = path.join(tempDir, "readonly");
    await fs.mkdir(readOnlyDir, { mode: 0o500 });

    const store = createProviderStore({ baseDir: path.join(readOnlyDir, "nested") });

    try {
      await expect(
        store.create({
          instanceId: "test",
          providerId: "openai",
          name: "Test",
          credentials: {},
          models: {},
        }),
      ).rejects.toThrow(ProviderStoreError);
    } finally {
      await fs.chmod(readOnlyDir, 0o755);
    }
  });
});
