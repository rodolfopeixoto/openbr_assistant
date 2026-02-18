import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { GatewayRequestHandlers } from "./types.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

// Environment variables storage
const ENV_FILE_NAME = ".env.ui";
const ENV_METADATA_FILE = ".env.ui.meta";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

interface EnvVarEntry {
  key: string;
  value: string;
  encrypted: boolean;
  createdAt: number;
  updatedAt: number;
  updatedBy?: string;
}

interface EnvMetadata {
  version: number;
  lastModified: number;
  modifiedBy: string;
  auditLog: EnvAuditEntry[];
}

interface EnvAuditEntry {
  action: "set" | "delete" | "list";
  key?: string;
  timestamp: number;
  sessionKey: string;
}

// Sensitive patterns that should be encrypted
const SENSITIVE_PATTERNS = [
  /token/i,
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /auth/i,
  /credential/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function encryptValue(value: string, secret: string): { encrypted: string; authTag: string } {
  const key = deriveKey(secret);
  const iv = randomBytes(16);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted: iv.toString("hex") + ":" + encrypted + ":" + authTag.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

function decryptValue(encryptedData: string, secret: string): string {
  const key = deriveKey(secret);
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  const [ivHex, encrypted, authTagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

async function getEnvFilePath(): Promise<string> {
  const stateDir = process.env.OPENCLAW_STATE_DIR || join(process.env.HOME || "", ".openclaw");
  await mkdir(stateDir, { recursive: true });
  return join(stateDir, ENV_FILE_NAME);
}

async function getMetadataFilePath(): Promise<string> {
  const stateDir = process.env.OPENCLAW_STATE_DIR || join(process.env.HOME || "", ".openclaw");
  await mkdir(stateDir, { recursive: true });
  return join(stateDir, ENV_METADATA_FILE);
}

async function loadEnvVars(): Promise<Record<string, EnvVarEntry>> {
  try {
    const filePath = await getEnvFilePath();
    await access(filePath);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveEnvVars(vars: Record<string, EnvVarEntry>): Promise<void> {
  const filePath = await getEnvFilePath();
  await writeFile(filePath, JSON.stringify(vars, null, 2), { mode: 0o600 });
}

async function loadMetadata(): Promise<EnvMetadata> {
  try {
    const filePath = await getMetadataFilePath();
    await access(filePath);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      version: 1,
      lastModified: Date.now(),
      modifiedBy: "system",
      auditLog: [],
    };
  }
}

async function saveMetadata(metadata: EnvMetadata): Promise<void> {
  const filePath = await getMetadataFilePath();
  await writeFile(filePath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
}

function addAuditEntry(
  metadata: EnvMetadata,
  action: "set" | "delete" | "list",
  sessionKey: string,
  key?: string,
): void {
  metadata.auditLog.push({
    action,
    key,
    timestamp: Date.now(),
    sessionKey,
  });

  // Keep only last 100 entries
  if (metadata.auditLog.length > 100) {
    metadata.auditLog = metadata.auditLog.slice(-100);
  }
}

export const envHandlers: GatewayRequestHandlers = {
  // List all environment variables (without sensitive values)
  "env.list": async ({ params, respond }) => {
    const { sessionKey } = params as { sessionKey?: string };

    if (!sessionKey) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "sessionKey is required"));
      return;
    }

    try {
      const vars = await loadEnvVars();
      const metadata = await loadMetadata();

      // Add audit entry
      addAuditEntry(metadata, "list", sessionKey);
      await saveMetadata(metadata);

      // Return vars without actual values for sensitive keys
      const safeVars = Object.entries(vars).map(([key, entry]) => ({
        key,
        encrypted: entry.encrypted,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        // Only show if value exists, but mask sensitive ones
        hasValue: !!entry.value,
        isSensitive: isSensitiveKey(key),
      }));

      respond(true, { vars: safeVars }, undefined);
    } catch (err) {
      console.error("[Env] Error listing env vars:", err);
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, "Failed to list environment variables"),
      );
    }
  },

  // Get a specific environment variable value
  "env.get": async ({ params, respond }) => {
    const { sessionKey, key } = params as { sessionKey?: string; key?: string };

    if (!sessionKey || !key) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "sessionKey and key are required"),
      );
      return;
    }

    try {
      const vars = await loadEnvVars();
      const entry = vars[key];

      if (!entry) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Environment variable '${key}' not found`),
        );
        return;
      }

      // Return metadata without the actual value for sensitive vars
      // The actual value should only be retrieved when needed (e.g., during agent execution)
      respond(
        true,
        {
          key,
          encrypted: entry.encrypted,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          isSensitive: isSensitiveKey(key),
        },
        undefined,
      );
    } catch (err) {
      console.error("[Env] Error getting env var:", err);
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, "Failed to get environment variable"),
      );
    }
  },

  // Set an environment variable
  "env.set": async ({ params, respond }) => {
    const { sessionKey, key, value, encrypt } = params as {
      sessionKey?: string;
      key?: string;
      value?: string;
      encrypt?: boolean;
    };

    if (!sessionKey || !key || value === undefined) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "sessionKey, key, and value are required"),
      );
      return;
    }

    // Validate key format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "Invalid key format. Use alphanumeric and underscore only.",
        ),
      );
      return;
    }

    // Check for reserved keys
    const RESERVED_KEYS = ["PATH", "HOME", "USER", "SHELL", "PWD", "OLDPWD"];
    if (RESERVED_KEYS.includes(key)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `Cannot modify reserved environment variable: ${key}`,
        ),
      );
      return;
    }

    try {
      const vars = await loadEnvVars();
      const metadata = await loadMetadata();
      const now = Date.now();

      // Auto-encrypt sensitive keys unless explicitly disabled
      const shouldEncrypt = encrypt !== false && (encrypt === true || isSensitiveKey(key));

      let storedValue = value;

      if (shouldEncrypt) {
        const encryptionSecret =
          process.env.OPENCLAW_ENV_ENCRYPTION_KEY ||
          process.env.SESSION_SECRET ||
          "default-secret-change-in-production";
        const encrypted = encryptValue(value, encryptionSecret);
        storedValue = encrypted.encrypted;
      }

      const isNew = !vars[key];

      vars[key] = {
        key,
        value: storedValue,
        encrypted: shouldEncrypt,
        createdAt: isNew ? now : vars[key].createdAt,
        updatedAt: now,
        updatedBy: sessionKey,
      };

      await saveEnvVars(vars);

      // Update metadata
      metadata.lastModified = now;
      metadata.modifiedBy = sessionKey;
      addAuditEntry(metadata, "set", sessionKey, key);
      await saveMetadata(metadata);

      // Also update process.env for immediate effect
      process.env[key] = value;

      respond(
        true,
        {
          key,
          encrypted: shouldEncrypt,
          createdAt: vars[key].createdAt,
          updatedAt: now,
          isSensitive: isSensitiveKey(key),
        },
        undefined,
      );
    } catch (err) {
      console.error("[Env] Error setting env var:", err);
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, "Failed to set environment variable"),
      );
    }
  },

  // Delete an environment variable
  "env.delete": async ({ params, respond }) => {
    const { sessionKey, key } = params as { sessionKey?: string; key?: string };

    if (!sessionKey || !key) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "sessionKey and key are required"),
      );
      return;
    }

    try {
      const vars = await loadEnvVars();

      if (!vars[key]) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Environment variable '${key}' not found`),
        );
        return;
      }

      delete vars[key];
      await saveEnvVars(vars);

      // Update metadata
      const metadata = await loadMetadata();
      metadata.lastModified = Date.now();
      metadata.modifiedBy = sessionKey;
      addAuditEntry(metadata, "delete", sessionKey, key);
      await saveMetadata(metadata);

      // Remove from process.env
      delete process.env[key];

      respond(true, { key, deleted: true }, undefined);
    } catch (err) {
      console.error("[Env] Error deleting env var:", err);
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, "Failed to delete environment variable"),
      );
    }
  },
};

// Helper function to decrypt and get env var value (for internal use)
export async function getDecryptedEnvVar(key: string): Promise<string | null> {
  try {
    const vars = await loadEnvVars();
    const entry = vars[key];

    if (!entry) {
      return null;
    }

    if (!entry.encrypted) {
      return entry.value;
    }

    const encryptionSecret =
      process.env.OPENCLAW_ENV_ENCRYPTION_KEY ||
      process.env.SESSION_SECRET ||
      "default-secret-change-in-production";
    return decryptValue(entry.value, encryptionSecret);
  } catch (err) {
    console.error("[Env] Error decrypting env var:", err);
    return null;
  }
}
