import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { KeyringAdapter } from "./adapter.js";

const execFileAsync = promisify(execFile);

// Debug logger
function log(message: string) {
  if (process.env.OPENCLAW_KEYCHAIN_DEBUG) {
    console.log(`[Keychain] ${message}`);
  }
}

export class MacOSKeychainAdapter implements KeyringAdapter {
  private service: string;
  private account: string;
  private keychainPath?: string;

  constructor(options?: { service?: string; account?: string; keychainPath?: string }) {
    this.service = options?.service || "openclaw";
    this.account = options?.account || "master-key";
    this.keychainPath = options?.keychainPath;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync("which", ["security"]);
      return true;
    } catch {
      log("'security' command not found");
      return false;
    }
  }

  async getPassword(service?: string, account?: string): Promise<string | null> {
    const svc = service || this.service;
    const acc = account || this.account;

    log(`Getting password for service=${svc}, account=${acc}`);

    try {
      const args = ["find-generic-password", "-s", svc, "-a", acc, "-w"];

      if (this.keychainPath) {
        args.push(this.keychainPath);
      }

      const { stdout } = await execFileAsync("security", args);
      const password = stdout.trim();

      if (!password) {
        log("Empty password returned");
        return null;
      }

      log("Password retrieved successfully");
      return password;
    } catch (error: any) {
      // Check specific error codes
      const errorMsg = error.stderr || error.message || "";

      if (errorMsg.includes("The specified item could not be found in the keychain")) {
        log(`Password not found in keychain for ${svc}/${acc}`);
        return null;
      }

      if (errorMsg.includes("User canceled the operation")) {
        log("User canceled keychain dialog");
        return null;
      }

      log(`Error getting password: ${errorMsg}`);
      return null;
    }
  }

  async setPassword(service?: string, account?: string, password?: string): Promise<boolean> {
    const svc = service || this.service;
    const acc = account || this.account;
    const pwd = password || "";

    if (!pwd) {
      log("Cannot set empty password");
      return false;
    }

    log(`Setting password for service=${svc}, account=${acc}`);

    try {
      const args = [
        "add-generic-password",
        "-s",
        svc,
        "-a",
        acc,
        "-w",
        pwd,
        "-U", // Update if exists
      ];

      if (this.keychainPath) {
        args.push(this.keychainPath);
      }

      await execFileAsync("security", args);
      log("Password set successfully");
      return true;
    } catch (error: any) {
      const errorMsg = error.stderr || error.message || "";

      if (errorMsg.includes("User canceled the operation")) {
        log("User canceled keychain dialog");
        return false;
      }

      log(`Error setting password: ${errorMsg}`);
      return false;
    }
  }

  async deletePassword(service?: string, account?: string): Promise<boolean> {
    const svc = service || this.service;
    const acc = account || this.account;

    log(`Deleting password for service=${svc}, account=${acc}`);

    try {
      const args = ["delete-generic-password", "-s", svc, "-a", acc];

      if (this.keychainPath) {
        args.push(this.keychainPath);
      }

      await execFileAsync("security", args);
      log("Password deleted successfully");
      return true;
    } catch (error: any) {
      const errorMsg = error.stderr || error.message || "";

      if (errorMsg.includes("The specified item could not be found in the keychain")) {
        log("Password not found, nothing to delete");
        return true; // Already doesn't exist
      }

      log(`Error deleting password: ${errorMsg}`);
      return false;
    }
  }

  // Diagnostic function
  async diagnose(): Promise<{
    available: boolean;
    canRead: boolean;
    canWrite: boolean;
    existingPassword: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check if security command is available
    const available = await this.isAvailable();
    if (!available) {
      errors.push("'security' command not found. Is this macOS?");
      return { available: false, canRead: false, canWrite: false, existingPassword: false, errors };
    }

    // Test write
    let canWrite = false;
    const testPassword = `test-${Date.now()}`;
    try {
      canWrite = await this.setPassword(this.service, `${this.account}-test`, testPassword);
      if (!canWrite) {
        errors.push("Cannot write to keychain. Check permissions.");
      }
    } catch (e: any) {
      errors.push(`Write test failed: ${e.message}`);
    }

    // Test read
    let canRead = false;
    let existingPassword = false;
    if (canWrite) {
      try {
        const retrieved = await this.getPassword(this.service, `${this.account}-test`);
        canRead = retrieved === testPassword;
        if (!canRead) {
          errors.push("Cannot read from keychain. Password mismatch.");
        }
      } catch (e: any) {
        errors.push(`Read test failed: ${e.message}`);
      }

      // Cleanup test password
      await this.deletePassword(this.service, `${this.account}-test`);
    }

    // Check for existing password
    try {
      const existing = await this.getPassword();
      existingPassword = existing !== null;
    } catch {
      // Ignore errors here
    }

    return { available, canRead, canWrite, existingPassword, errors };
  }
}

// Utility to unlock keychain if needed
export async function unlockKeychain(password: string, keychainPath?: string): Promise<boolean> {
  try {
    const keychain = keychainPath || "login.keychain";
    await execFileAsync("security", ["unlock-keychain", "-p", password, keychain]);
    return true;
  } catch (error: any) {
    log(`Failed to unlock keychain: ${error.message}`);
    return false;
  }
}
