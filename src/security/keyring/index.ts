import type { KeyringAdapter } from "./adapter.js";
import { MacOSKeychainAdapter, unlockKeychain } from "./macos.js";

export { type KeyringAdapter } from "./adapter.js";
export { MacOSKeychainAdapter, unlockKeychain } from "./macos.js";

// Fallback adapter that stores in memory (not persistent)
class MemoryKeyringAdapter implements KeyringAdapter {
  private storage = new Map<string, string>();

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getPassword(service?: string, account?: string): Promise<string | null> {
    const key = `${service || "default"}/${account || "default"}`;
    return this.storage.get(key) || null;
  }

  async setPassword(service?: string, account?: string, password?: string): Promise<boolean> {
    if (!password) {
      return false;
    }
    const key = `${service || "default"}/${account || "default"}`;
    this.storage.set(key, password);
    return true;
  }

  async deletePassword(service?: string, account?: string): Promise<boolean> {
    const key = `${service || "default"}/${account || "default"}`;
    return this.storage.delete(key);
  }

  async diagnose(): Promise<{
    available: boolean;
    canRead: boolean;
    canWrite: boolean;
    existingPassword: boolean;
    errors: string[];
  }> {
    return {
      available: true,
      canRead: true,
      canWrite: true,
      existingPassword: this.storage.size > 0,
      errors: ["WARNING: Using memory-only storage. Passwords will NOT persist!"],
    };
  }
}

import * as crypto from "node:crypto";
// File-based fallback adapter
import * as fs from "node:fs";
import * as path from "node:path";

class FileKeyringAdapter implements KeyringAdapter {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.env.HOME || "/tmp", ".openclaw", "keyring");
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o700 });
    }
  }

  private getFilePath(service: string, account: string): string {
    const hash = crypto.createHash("sha256").update(`${service}/${account}`).digest("hex");
    return path.join(this.baseDir, `${hash}.key`);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getPassword(service?: string, account?: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(service || "default", account || "default");
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      return parsed.password || null;
    } catch {
      return null;
    }
  }

  async setPassword(service?: string, account?: string, password?: string): Promise<boolean> {
    if (!password) {
      return false;
    }

    try {
      const filePath = this.getFilePath(service || "default", account || "default");
      const data = JSON.stringify(
        {
          service: service || "default",
          account: account || "default",
          password,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      );

      fs.writeFileSync(filePath, data, { mode: 0o600 });
      return true;
    } catch {
      return false;
    }
  }

  async deletePassword(service?: string, account?: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(service || "default", account || "default");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch {
      return false;
    }
  }

  async diagnose(): Promise<{
    available: boolean;
    canRead: boolean;
    canWrite: boolean;
    existingPassword: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      this.ensureDir();
      const testFile = path.join(this.baseDir, ".test");
      fs.writeFileSync(testFile, "test", { mode: 0o600 });
      fs.unlinkSync(testFile);
    } catch (e: any) {
      errors.push(`Cannot write to ${this.baseDir}: ${e.message}`);
      return {
        available: true,
        canRead: false,
        canWrite: false,
        existingPassword: false,
        errors,
      };
    }

    const files = fs.readdirSync(this.baseDir).filter((f) => f.endsWith(".key"));

    return {
      available: true,
      canRead: true,
      canWrite: true,
      existingPassword: files.length > 0,
      errors: [
        "WARNING: Using file-based storage. Consider using system keychain for better security!",
      ],
    };
  }
}

// Smart adapter that tries keychain first, then falls back to file
export class SmartKeyringAdapter implements KeyringAdapter {
  private primary: KeyringAdapter;
  private fallback: KeyringAdapter;
  private usingFallback = false;

  constructor() {
    // Try to use platform-native keyring
    if (process.platform === "darwin") {
      this.primary = new MacOSKeychainAdapter();
    } else {
      this.primary = new MemoryKeyringAdapter(); // No native support yet
    }

    // Always have file fallback
    this.fallback = new FileKeyringAdapter();
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available (has fallback)
  }

  async getPassword(service?: string, account?: string): Promise<string | null> {
    // Try primary first
    try {
      const result = await this.primary.getPassword(service, account);
      if (result !== null) {
        this.usingFallback = false;
        return result;
      }
    } catch (e) {
      console.warn("[Keyring] Primary adapter failed:", e);
    }

    // Fall back to file
    this.usingFallback = true;
    return this.fallback.getPassword(service, account);
  }

  async setPassword(service?: string, account?: string, password?: string): Promise<boolean> {
    // Try primary first
    let primarySuccess = false;
    try {
      primarySuccess = await this.primary.setPassword(service, account, password);
      if (primarySuccess) {
        this.usingFallback = false;
        // Also save to fallback as backup
        await this.fallback.setPassword(service, account, password);
        return true;
      }
    } catch (e) {
      console.warn("[Keyring] Primary adapter failed:", e);
    }

    // Fall back to file
    this.usingFallback = true;
    console.warn(
      "[Keyring] Using fallback file storage. Consider checking your keychain permissions.",
    );
    return this.fallback.setPassword(service, account, password);
  }

  async deletePassword(service?: string, account?: string): Promise<boolean> {
    // Delete from both
    const primaryResult = await this.primary.deletePassword(service, account).catch(() => false);
    const fallbackResult = await this.fallback.deletePassword(service, account);
    return primaryResult || fallbackResult;
  }

  async diagnose(): Promise<{
    available: boolean;
    canRead: boolean;
    canWrite: boolean;
    existingPassword: boolean;
    errors: string[];
  }> {
    const primaryDiag = await this.primary.diagnose();
    const fallbackDiag = await this.fallback.diagnose();

    return {
      available: true,
      canRead: primaryDiag.canRead || fallbackDiag.canRead,
      canWrite: primaryDiag.canWrite || fallbackDiag.canWrite,
      existingPassword: primaryDiag.existingPassword || fallbackDiag.existingPassword,
      errors: [
        ...primaryDiag.errors,
        ...fallbackDiag.errors,
        ...(this.usingFallback
          ? ["Currently using fallback storage. Check primary keychain."]
          : []),
      ],
    };
  }

  isUsingFallback(): boolean {
    return this.usingFallback;
  }
}

// Backward compatibility
export function getPlatformKeyring(): KeyringAdapter {
  return new SmartKeyringAdapter();
}

// Create default instance
export const defaultKeyring = new SmartKeyringAdapter();
