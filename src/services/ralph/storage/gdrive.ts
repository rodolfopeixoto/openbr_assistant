/**
 * Google Drive Storage Backend Implementation
 * Stores files in Google Drive folders
 */

import type { StorageBackend, StorageObject, StorageMetadata } from "../types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";

const log = createSubsystemLogger("ralph:storage:gdrive");

interface GDriveConfig {
  accessToken: string;
  folderId: string;
}

interface GDriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime: string;
  createdTime: string;
  mimeType: string;
  md5Checksum?: string;
}

export class GoogleDriveStorageBackend implements StorageBackend {
  readonly name: string;
  readonly type = "gdrive" as const;
  private config: GDriveConfig;
  private fileCache: Map<string, string> = new Map(); // key -> fileId

  constructor(name: string, config: GDriveConfig) {
    this.name = name;
    this.config = config;
  }

  async upload(key: string, data: Buffer | NodeJS.ReadableStream): Promise<void> {
    log.info(`Uploading to Google Drive: ${key}`);

    let buffer: Buffer;

    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else {
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    const fileName = this.sanitizeFileName(key);
    const existingId = await this.findFileByName(fileName);

    if (existingId) {
      // Update existing file
      await this.updateFile(existingId, buffer);
    } else {
      // Create new file
      await this.createFile(fileName, buffer);
    }

    log.info(`Upload complete: ${key}`);
  }

  async download(key: string): Promise<Buffer> {
    log.info(`Downloading from Google Drive: ${key}`);

    const fileName = this.sanitizeFileName(key);
    const fileId = await this.findFileByName(fileName);

    if (!fileId) {
      throw new Error(`File not found: ${key}`);
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${await response.text()}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    log.info(`Deleting from Google Drive: ${key}`);

    const fileName = this.sanitizeFileName(key);
    const fileId = await this.findFileByName(fileName);

    if (!fileId) {
      return;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Delete failed: ${await response.text()}`);
    }

    this.fileCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const fileName = this.sanitizeFileName(key);
    const fileId = await this.findFileByName(fileName);
    return fileId !== null;
  }

  async list(prefix: string): Promise<StorageObject[]> {
    log.info(`Listing files in Google Drive folder with prefix: ${prefix}`);

    const query = `'${this.config.folderId}' in parents and trashed = false and name contains '${prefix}'`;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,modifiedTime,md5Checksum)`,
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`List failed: ${await response.text()}`);
    }

    const data = await response.json();

    return data.files.map((file: GDriveFile) => ({
      key: file.name,
      size: parseInt(file.size || "0", 10),
      lastModified: new Date(file.modifiedTime),
      etag: file.md5Checksum || "",
    }));
  }

  async getMetadata(key: string): Promise<StorageMetadata> {
    const fileName = this.sanitizeFileName(key);
    const fileId = await this.findFileByName(fileName);

    if (!fileId) {
      throw new Error(`File not found: ${key}`);
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,mimeType,createdTime,modifiedTime,md5Checksum`,
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Get metadata failed: ${await response.text()}`);
    }

    const file = await response.json();

    return {
      size: parseInt(file.size || "0", 10),
      contentType: file.mimeType || "application/octet-stream",
      createdAt: new Date(file.createdTime),
      modifiedAt: new Date(file.modifiedTime),
      checksum: file.md5Checksum || "",
      tags: {},
    };
  }

  async setMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void> {
    const fileName = this.sanitizeFileName(key);
    const fileId = await this.findFileByName(fileName);

    if (!fileId) {
      throw new Error(`File not found: ${key}`);
    }

    // Google Drive doesn't support custom metadata directly
    // We could store metadata in a separate description field or use properties
    log.warn(`Google Drive metadata updates limited for ${key}`);

    if (metadata.tags) {
      // Could use appProperties to store tags
      log.info(`Tags would be stored as properties for ${key}`, { tags: metadata.tags });
    }
  }

  async getSignedUrl(_key: string, _expiresIn: number): Promise<string> {
    throw new Error("Signed URLs not supported for Google Drive");
  }

  private sanitizeFileName(key: string): string {
    // Replace path separators with underscores
    return key.replace(/[/\\]/g, "_");
  }

  private async findFileByName(fileName: string): Promise<string | null> {
    // Check cache first
    if (this.fileCache.has(fileName)) {
      return this.fileCache.get(fileName)!;
    }

    const query = `'${this.config.folderId}' in parents and name = '${fileName}' and trashed = false`;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.files && data.files.length > 0) {
      const fileId = data.files[0].id;
      this.fileCache.set(fileName, fileId);
      return fileId;
    }

    return null;
  }

  private async createFile(fileName: string, buffer: Buffer): Promise<string> {
    // Create metadata
    const metadata = {
      name: fileName,
      parents: [this.config.folderId],
    };

    // Use multipart upload
    const boundary = `----RalphBoundary${Date.now()}`;
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/octet-stream",
      "",
      buffer.toString("binary"),
      `--${boundary}--`,
    ].join("\r\n");

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!response.ok) {
      throw new Error(`Create file failed: ${await response.text()}`);
    }

    const file = await response.json();
    this.fileCache.set(fileName, file.id);
    return file.id;
  }

  private async updateFile(fileId: string, buffer: Buffer): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: buffer.toString("binary"),
      },
    );

    if (!response.ok) {
      throw new Error(`Update file failed: ${await response.text()}`);
    }
  }
}
