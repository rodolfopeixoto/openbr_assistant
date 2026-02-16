import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { AuthProfileStore } from "../agents/auth-profiles/types.js";
import { CredentialVault } from "./credential-vault.js";

export interface LegacyCredential {
  type: "api_key" | "oauth" | "token";
  provider: string;
  key?: string;
  access?: string;
  refresh?: string;
  token?: string;
  [key: string]: unknown;
}

export interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: Array<{ profile: string; error: string }>;
  backupPath: string | null;
}

/**
 * Detect if there are plaintext credentials in the store
 */
export function detectPlaintextCredentials(store: AuthProfileStore): boolean {
  for (const [_, profile] of Object.entries(store.profiles)) {
    if (isPlaintextCredential(profile)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a credential is in plaintext format
 */
function isPlaintextCredential(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  const p = profile as LegacyCredential;

  // Check for plaintext API key
  if (p.key && typeof p.key === "string" && !isEncryptedCredential(p.key)) {
    return true;
  }

  // Check for plaintext OAuth tokens
  if (p.access && typeof p.access === "string" && !isEncryptedCredential(p.access)) {
    return true;
  }

  if (p.refresh && typeof p.refresh === "string" && !isEncryptedCredential(p.refresh)) {
    return true;
  }

  if (p.token && typeof p.token === "string" && !isEncryptedCredential(p.token)) {
    return true;
  }

  return false;
}

/**
 * Check if a string is an encrypted credential
 */
function isEncryptedCredential(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 1 &&
      parsed.algorithm === "aes-256-gcm"
    );
  } catch {
    return false;
  }
}

/**
 * Extract sensitive fields from a legacy credential
 */
function extractSensitiveFields(
  profile: LegacyCredential,
): Array<{ field: string; value: string }> {
  const fields: Array<{ field: string; value: string }> = [];

  if (profile.key && typeof profile.key === "string") {
    fields.push({ field: "key", value: profile.key });
  }
  if (profile.access && typeof profile.access === "string") {
    fields.push({ field: "access", value: profile.access });
  }
  if (profile.refresh && typeof profile.refresh === "string") {
    fields.push({ field: "refresh", value: profile.refresh });
  }
  if (profile.token && typeof profile.token === "string") {
    fields.push({ field: "token", value: profile.token });
  }

  return fields;
}

/**
 * Migrate plaintext credentials to encrypted format
 */
export async function migrateCredentials(
  store: AuthProfileStore,
  vault: CredentialVault,
  agentDir: string,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrated: 0,
    skipped: 0,
    errors: [],
    backupPath: null,
  };

  // Create backup first
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(agentDir, `auth-profiles-backup-${timestamp}.json`);

  try {
    await fs.writeFile(backupPath, JSON.stringify(store, null, 2), { mode: 0o600 });
    result.backupPath = backupPath;
    console.log(`[Migration] Backup created at: ${backupPath}`);
  } catch (error) {
    console.error("[Migration] Failed to create backup:", error);
    result.errors.push({
      profile: "backup",
      error: `Failed to create backup: ${error}`,
    });
    result.success = false;
    return result;
  }

  // Process each profile
  for (const [profileId, profile] of Object.entries(store.profiles)) {
    try {
      if (!isPlaintextCredential(profile)) {
        console.log(
          `[Migration] Profile ${profileId} already encrypted or no credentials, skipping`,
        );
        result.skipped++;
        continue;
      }

      console.log(`[Migration] Encrypting profile: ${profileId}`);
      const sensitiveFields = extractSensitiveFields(profile as LegacyCredential);

      // Encrypt each sensitive field
      for (const { field, value } of sensitiveFields) {
        if (!isEncryptedCredential(value)) {
          const encrypted = await vault.encrypt(value);
          (profile as Record<string, unknown>)[field] = JSON.stringify(encrypted);
        }
      }

      result.migrated++;
      console.log(`[Migration] Profile ${profileId} encrypted successfully`);
    } catch (error) {
      console.error(`[Migration] Failed to encrypt profile ${profileId}:`, error);
      result.errors.push({
        profile: profileId,
        error: String(error),
      });
      result.success = false;
    }
  }

  // Update store version
  store.version = Math.max(store.version || 1, 2);

  console.log(
    `[Migration] Completed: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors.length} errors`,
  );

  return result;
}

/**
 * Rollback migration using backup
 */
export async function rollbackMigration(backupPath: string, agentDir: string): Promise<void> {
  try {
    const backup = await fs.readFile(backupPath, "utf-8");
    const store: AuthProfileStore = JSON.parse(backup);

    const authPath = path.join(agentDir, "auth-profiles.json");
    await fs.writeFile(authPath, JSON.stringify(store, null, 2), { mode: 0o600 });

    console.log(`[Migration] Rolled back to backup: ${backupPath}`);
  } catch (error) {
    console.error("[Migration] Failed to rollback:", error);
    throw new Error(`Rollback failed: ${error}`, { cause: error });
  }
}

/**
 * Auto-migrate credentials if needed
 */
export async function autoMigrateIfNeeded(
  agentDir: string,
  passphrase?: string,
): Promise<{ migrated: boolean; result?: MigrationResult }> {
  const authPath = path.join(agentDir, "auth-profiles.json");

  try {
    const data = await fs.readFile(authPath, "utf-8");
    const store: AuthProfileStore = JSON.parse(data);

    if (!detectPlaintextCredentials(store)) {
      console.log("[Migration] No plaintext credentials detected");
      return { migrated: false };
    }

    console.log("[Migration] Plaintext credentials detected, starting migration...");

    const vault = await CredentialVault.initialize({
      agentDir,
      usePassphrase: !!passphrase,
      passphrase,
    });

    const result = await migrateCredentials(store, vault, agentDir);

    // Save migrated store
    await fs.writeFile(authPath, JSON.stringify(store, null, 2), { mode: 0o600 });

    vault.destroy();

    return { migrated: true, result };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // No auth file exists yet, nothing to migrate
      return { migrated: false };
    }
    throw error;
  }
}
