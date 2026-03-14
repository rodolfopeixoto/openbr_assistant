/**
 * Local Storage Backend Implementation
 * Stores files on the local filesystem
 */

import { createHash } from "crypto";
import { createWriteStream, promises as fs } from "fs";
import { dirname, join } from "path";
import type { StorageBackend, StorageObject, StorageMetadata } from "../types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";

const log = createSubsystemLogger("ralph:storage:local");

export class LocalStorageBackend implements StorageBackend {
  readonly name: string;
  readonly type = "local" as const;
  private basePath: string;

  constructor(name: string, basePath: string) {
    this.name = name;
    this.basePath = basePath;
  }

  async upload(key: string, data: Buffer | NodeJS.ReadableStream): Promise<void> {
    const filePath = this.getFilePath(key);

    log.info(`Uploading to ${key}`);

    // Ensure directory exists
    await fs.mkdir(dirname(filePath), { recursive: true });

    if (Buffer.isBuffer(data)) {
      await fs.writeFile(filePath, data);
    } else {
      // Stream
      const writeStream = createWriteStream(filePath);

      return new Promise((resolve, reject) => {
        data.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    }
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);

    log.info(`Downloading from ${key}`);

    try {
      return await fs.readFile(filePath);
    } catch (err) {
      log.error(`Failed to download ${key}`, { error: String(err) });
      throw new Error(`File not found: ${key}`, { cause: err });
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);

    log.info(`Deleting ${key}`);

    try {
      await fs.unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        log.error(`Failed to delete ${key}`, { error: String(err) });
        throw err;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<StorageObject[]> {
    const searchPath = join(this.basePath, prefix);
    const objects: StorageObject[] = [];

    try {
      const stat = await fs.stat(searchPath);

      if (stat.isDirectory()) {
        const files = await this.listDirectoryRecursive(searchPath);

        for (const file of files) {
          const relativePath = file.substring(this.basePath.length + 1);
          const stats = await fs.stat(file);

          objects.push({
            key: relativePath,
            size: stats.size,
            lastModified: stats.mtime,
            etag: await this.calculateETag(file),
          });
        }
      } else {
        const relativePath = searchPath.substring(this.basePath.length + 1);

        objects.push({
          key: relativePath,
          size: stat.size,
          lastModified: stat.mtime,
          etag: await this.calculateETag(searchPath),
        });
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    return objects;
  }

  async getMetadata(key: string): Promise<StorageMetadata> {
    const filePath = this.getFilePath(key);

    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath);

    // Read metadata from sidecar file if it exists
    const metadataPath = `${filePath}.meta.json`;
    let tags: Record<string, string> = {};

    try {
      const metadataContent = await fs.readFile(metadataPath, "utf8");
      const metadata = JSON.parse(metadataContent);
      tags = metadata.tags || {};
    } catch {
      // No metadata file, use defaults
    }

    return {
      size: stats.size,
      contentType: this.getContentType(key),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      checksum: createHash("sha256").update(content).digest("hex"),
      tags,
    };
  }

  async setMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void> {
    const filePath = this.getFilePath(key);
    const metadataPath = `${filePath}.meta.json`;

    // Read existing metadata
    let existing: Record<string, unknown> = {};

    try {
      const existingContent = await fs.readFile(metadataPath, "utf8");
      existing = JSON.parse(existingContent);
    } catch {
      // No existing metadata
    }

    // Merge and save
    const newMetadata = {
      ...existing,
      ...metadata,
    };

    await fs.writeFile(metadataPath, JSON.stringify(newMetadata, null, 2));
  }

  async getSignedUrl(_key: string, _expiresIn: number): Promise<string> {
    throw new Error("Signed URLs not supported for local storage");
  }

  private getFilePath(key: string): string {
    // Sanitize key to prevent directory traversal
    const sanitized = key.replace(/\.{2,}/g, ".").replace(/^\//, "");
    return join(this.basePath, sanitized);
  }

  private async listDirectoryRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await this.listDirectoryRecursive(fullPath)));
      } else if (!entry.name.endsWith(".meta.json")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async calculateETag(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return createHash("md5").update(content).digest("hex");
  }

  private getContentType(key: string): string {
    const ext = key.split(".").pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      txt: "text/plain",
      json: "application/json",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      ts: "application/typescript",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      zip: "application/zip",
      tar: "application/x-tar",
      gz: "application/gzip",
    };

    return mimeTypes[ext || ""] || "application/octet-stream";
  }
}
