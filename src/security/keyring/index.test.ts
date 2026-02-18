import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  SmartKeyringAdapter,
  MemoryKeyringAdapter,
  FileKeyringAdapter,
  getPlatformKeyring,
  defaultKeyring,
} from "./index.js";
import { MacOSKeychainAdapter } from "./macos.js";

describe("SmartKeyringAdapter", () => {
  let adapter: SmartKeyringAdapter;

  beforeEach(() => {
    adapter = new SmartKeyringAdapter();
  });

  describe("isAvailable", () => {
    it("should always return true", async () => {
      const result = await adapter.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe("setPassword and getPassword", () => {
    it("should store and retrieve a password", async () => {
      const service = "test-service";
      const account = "test-account";
      const password = "test-password-123";

      const setResult = await adapter.setPassword(service, account, password);
      expect(setResult).toBe(true);

      const retrieved = await adapter.getPassword(service, account);
      expect(retrieved).toBe(password);
    });

    it("should return null for non-existent password", async () => {
      const result = await adapter.getPassword("non-existent", "account");
      expect(result).toBeNull();
    });

    it("should not store empty password", async () => {
      const result = await adapter.setPassword("service", "account", "");
      expect(result).toBe(false);
    });

    it("should handle undefined service and account", async () => {
      const password = "test-password";

      const setResult = await adapter.setPassword(undefined, undefined, password);
      expect(setResult).toBe(true);

      const retrieved = await adapter.getPassword();
      expect(retrieved).toBe(password);
    });
  });

  describe("deletePassword", () => {
    it("should delete existing password", async () => {
      const service = "delete-test";
      const account = "account";
      const password = "password";

      await adapter.setPassword(service, account, password);
      const beforeDelete = await adapter.getPassword(service, account);
      expect(beforeDelete).toBe(password);

      const deleteResult = await adapter.deletePassword(service, account);
      expect(deleteResult).toBe(true);

      const afterDelete = await adapter.getPassword(service, account);
      expect(afterDelete).toBeNull();
    });

    it("should return true when deleting non-existent password", async () => {
      const result = await adapter.deletePassword("non-existent", "account");
      expect(result).toBe(true);
    });
  });

  describe("diagnose", () => {
    it("should return diagnostic information", async () => {
      const diag = await adapter.diagnose();

      expect(diag.available).toBe(true);
      expect(diag.canRead).toBe(true);
      expect(diag.canWrite).toBe(true);
      expect(Array.isArray(diag.errors)).toBe(true);
    });

    it("should detect existing passwords", async () => {
      await adapter.setPassword("diag-test", "account", "password");

      const diag = await adapter.diagnose();
      expect(diag.existingPassword).toBe(true);
    });
  });
});

describe("MemoryKeyringAdapter", () => {
  let adapter: MemoryKeyringAdapter;

  beforeEach(() => {
    adapter = new MemoryKeyringAdapter();
  });

  describe("basic operations", () => {
    it("should store password in memory", async () => {
      await adapter.setPassword("svc", "acc", "pwd");
      const result = await adapter.getPassword("svc", "acc");
      expect(result).toBe("pwd");
    });

    it("should isolate different service/account combinations", async () => {
      await adapter.setPassword("svc1", "acc1", "pwd1");
      await adapter.setPassword("svc2", "acc2", "pwd2");

      expect(await adapter.getPassword("svc1", "acc1")).toBe("pwd1");
      expect(await adapter.getPassword("svc2", "acc2")).toBe("pwd2");
    });

    it("should return true for isAvailable", async () => {
      expect(await adapter.isAvailable()).toBe(true);
    });
  });

  describe("diagnose", () => {
    it("should warn about memory-only storage", async () => {
      const diag = await adapter.diagnose();
      expect(diag.errors).toContain(
        "WARNING: Using memory-only storage. Passwords will NOT persist!",
      );
    });
  });
});

describe("FileKeyringAdapter", () => {
  let adapter: FileKeyringAdapter;
  let testDir: string;

  beforeEach(() => {
    // Use a temp directory for tests
    testDir = `/tmp/openclaw-test-${Date.now()}`;
    adapter = new FileKeyringAdapter(testDir);
  });

  afterEach(() => {
    // Cleanup
    try {
      const fs = require("node:fs");
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("basic operations", () => {
    it("should store password in file", async () => {
      const result = await adapter.setPassword("file-svc", "file-acc", "file-pwd");
      expect(result).toBe(true);

      const retrieved = await adapter.getPassword("file-svc", "file-acc");
      expect(retrieved).toBe("file-pwd");
    });

    it("should return null for non-existent password", async () => {
      const result = await adapter.getPassword("non-existent", "account");
      expect(result).toBeNull();
    });

    it("should persist across adapter instances", async () => {
      await adapter.setPassword("persist", "acc", "password123");

      // Create new adapter pointing to same directory
      const newAdapter = new FileKeyringAdapter(testDir);
      const retrieved = await newAdapter.getPassword("persist", "acc");

      expect(retrieved).toBe("password123");
    });
  });

  describe("deletePassword", () => {
    it("should delete password file", async () => {
      await adapter.setPassword("delete", "acc", "pwd");
      expect(await adapter.getPassword("delete", "acc")).toBe("pwd");

      await adapter.deletePassword("delete", "acc");
      expect(await adapter.getPassword("delete", "acc")).toBeNull();
    });
  });

  describe("diagnose", () => {
    it("should return proper diagnostics", async () => {
      const diag = await adapter.diagnose();

      expect(diag.available).toBe(true);
      expect(diag.canRead).toBe(true);
      expect(diag.canWrite).toBe(true);
      expect(diag.errors.length).toBeGreaterThan(0);
    });

    it("should detect write errors", async () => {
      // Create adapter with invalid path
      const invalidAdapter = new FileKeyringAdapter("/root/invalid/path");
      const diag = await invalidAdapter.diagnose();

      // Should still be available but with errors
      expect(diag.available).toBe(true);
      expect(diag.errors.length).toBeGreaterThan(0);
    });
  });
});

describe("getPlatformKeyring", () => {
  it("should return SmartKeyringAdapter instance", () => {
    const keyring = getPlatformKeyring();
    expect(keyring).toBeInstanceOf(SmartKeyringAdapter);
  });

  it("should return new instance on each call", () => {
    const keyring1 = getPlatformKeyring();
    const keyring2 = getPlatformKeyring();
    expect(keyring1).not.toBe(keyring2);
  });
});

describe("defaultKeyring", () => {
  it("should be defined", () => {
    expect(defaultKeyring).toBeDefined();
    expect(defaultKeyring).toBeInstanceOf(SmartKeyringAdapter);
  });
});

describe("MacOSKeychainAdapter (mocked)", () => {
  // Note: In test environment, MacOSKeychainAdapter should not access real keychain
  it("should detect test environment and not access real keychain", async () => {
    const adapter = new MacOSKeychainAdapter();

    // In test environment, these should return without accessing real keychain
    expect(await adapter.isAvailable()).toBe(true);
    expect(await adapter.getPassword()).toBeNull();
    expect(await adapter.setPassword("svc", "acc", "pwd")).toBe(true);
    expect(await adapter.deletePassword("svc", "acc")).toBe(true);
  });

  it("should return mock diagnostics in test environment", async () => {
    const adapter = new MacOSKeychainAdapter();
    const diag = await adapter.diagnose();

    expect(diag.available).toBe(true);
    expect(diag.errors).toContain("Running in test mode - keychain not actually accessed");
  });
});
