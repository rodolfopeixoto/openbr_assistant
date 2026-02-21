import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { EncryptedCredential } from "../../security/credential-vault.js";

export interface ModelConfig {
  enabled: boolean;
  defaultParams?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface ConfiguredProvider {
  instanceId: string;
  providerId: string;
  name: string;
  description?: string;
  credentials: EncryptedCredentials;
  models: { [modelId: string]: ModelConfig };
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedCredentials {
  [key: string]: EncryptedCredential;
}

export interface ProviderStoreConfig {
  baseDir: string;
}

export class ProviderStoreError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ProviderStoreError";
  }
}

export class ProviderNotFoundError extends ProviderStoreError {
  constructor(instanceId: string) {
    super(`Provider with instanceId "${instanceId}" not found`, "PROVIDER_NOT_FOUND");
    this.name = "ProviderNotFoundError";
  }
}

export class ProviderAlreadyExistsError extends ProviderStoreError {
  constructor(instanceId: string) {
    super(`Provider with instanceId "${instanceId}" already exists`, "PROVIDER_ALREADY_EXISTS");
    this.name = "ProviderAlreadyExistsError";
  }
}

export class DiskFullError extends ProviderStoreError {
  constructor(cause?: Error) {
    super("Disk full: unable to write provider data", "DISK_FULL", cause);
    this.name = "DiskFullError";
  }
}

export class PermissionDeniedError extends ProviderStoreError {
  constructor(path: string, cause?: Error) {
    super(`Permission denied: unable to access ${path}`, "PERMISSION_DENIED", cause);
    this.name = "PermissionDeniedError";
  }
}

const DEFAULT_BASE_DIR = path.join(os.homedir(), ".openclaw", "providers");

export class ProviderStore {
  private baseDir: string;

  constructor(config?: ProviderStoreConfig) {
    this.baseDir = config?.baseDir || DEFAULT_BASE_DIR;
  }

  private getProviderPath(instanceId: string): string {
    const sanitizedId = instanceId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitizedId !== instanceId) {
      throw new ProviderStoreError(
        `Invalid instanceId: "${instanceId}". Only alphanumeric characters, hyphens, and underscores are allowed.`,
        "INVALID_INSTANCE_ID",
      );
    }
    return path.join(this.baseDir, `${sanitizedId}.json`);
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true, mode: 0o700 });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "EACCES") {
        throw new PermissionDeniedError(this.baseDir, err);
      }
      throw new ProviderStoreError(
        `Failed to create providers directory: ${err.message}`,
        "DIRECTORY_CREATE_FAILED",
        err,
      );
    }
  }

  async create(
    provider: Omit<ConfiguredProvider, "createdAt" | "updatedAt">,
  ): Promise<ConfiguredProvider> {
    await this.ensureDir();

    const existing = await this.get(provider.instanceId).catch(() => null);
    if (existing) {
      throw new ProviderAlreadyExistsError(provider.instanceId);
    }

    const now = new Date().toISOString();
    const fullProvider: ConfiguredProvider = {
      ...provider,
      createdAt: now,
      updatedAt: now,
    };

    const providerPath = this.getProviderPath(provider.instanceId);

    try {
      await this.atomicWrite(providerPath, JSON.stringify(fullProvider, null, 2));
    } catch (error) {
      this.handleWriteError(error, providerPath);
    }

    return fullProvider;
  }

  async get(instanceId: string): Promise<ConfiguredProvider> {
    const providerPath = this.getProviderPath(instanceId);

    try {
      const data = await fs.readFile(providerPath, "utf8");
      return JSON.parse(data) as ConfiguredProvider;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        throw new ProviderNotFoundError(instanceId);
      }
      if (err.code === "EACCES") {
        throw new PermissionDeniedError(providerPath, err);
      }
      if (err instanceof SyntaxError) {
        throw new ProviderStoreError(
          `Corrupted provider data for "${instanceId}": ${err.message}`,
          "CORRUPTED_DATA",
          err,
        );
      }
      throw new ProviderStoreError(
        `Failed to read provider "${instanceId}": ${err.message}`,
        "READ_FAILED",
        err,
      );
    }
  }

  async update(
    instanceId: string,
    updates: Partial<Omit<ConfiguredProvider, "instanceId" | "createdAt" | "updatedAt">>,
  ): Promise<ConfiguredProvider> {
    const existing = await this.get(instanceId);

    const updated: ConfiguredProvider = {
      ...existing,
      ...updates,
      instanceId: existing.instanceId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const providerPath = this.getProviderPath(instanceId);

    try {
      await this.atomicWrite(providerPath, JSON.stringify(updated, null, 2));
    } catch (error) {
      this.handleWriteError(error, providerPath);
    }

    return updated;
  }

  async delete(instanceId: string): Promise<void> {
    const providerPath = this.getProviderPath(instanceId);

    try {
      await fs.unlink(providerPath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        throw new ProviderNotFoundError(instanceId);
      }
      if (err.code === "EACCES") {
        throw new PermissionDeniedError(providerPath, err);
      }
      throw new ProviderStoreError(
        `Failed to delete provider "${instanceId}": ${err.message}`,
        "DELETE_FAILED",
        err,
      );
    }
  }

  async list(): Promise<ConfiguredProvider[]> {
    await this.ensureDir();

    try {
      const entries = await fs.readdir(this.baseDir);
      const providers: ConfiguredProvider[] = [];

      for (const entry of entries) {
        if (!entry.endsWith(".json")) {
          continue;
        }

        const instanceId = entry.slice(0, -5);
        try {
          const provider = await this.get(instanceId);
          providers.push(provider);
        } catch (error) {
          if (error instanceof ProviderStoreError && error.code === "CORRUPTED_DATA") {
            console.warn(`[ProviderStore] Skipping corrupted provider file: ${entry}`);
            continue;
          }
          throw error;
        }
      }

      return [...providers].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch (error) {
      if (error instanceof ProviderStoreError) {
        throw error;
      }
      const err = error as NodeJS.ErrnoException;
      throw new ProviderStoreError(`Failed to list providers: ${err.message}`, "LIST_FAILED", err);
    }
  }

  async exists(instanceId: string): Promise<boolean> {
    try {
      await this.get(instanceId);
      return true;
    } catch (error) {
      if (error instanceof ProviderNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    try {
      await fs.writeFile(tempPath, content, { mode: 0o600 });
      await fs.rename(tempPath, filePath);
    } catch (error) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private handleWriteError(error: unknown, path: string): never {
    const err = error as NodeJS.ErrnoException;

    if (err.code === "ENOSPC") {
      throw new DiskFullError(err);
    }
    if (err.code === "EACCES") {
      throw new PermissionDeniedError(path, err);
    }

    throw new ProviderStoreError(
      `Failed to write provider data: ${err.message}`,
      "WRITE_FAILED",
      err,
    );
  }

  getBaseDir(): string {
    return this.baseDir;
  }
}

export function createProviderStore(config?: ProviderStoreConfig): ProviderStore {
  return new ProviderStore(config);
}

export default ProviderStore;
