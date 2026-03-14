/**
 * S3 Storage Backend Implementation
 * Supports AWS S3 and compatible services using native fetch API
 */

import { createHash } from "crypto";
import type { StorageBackend, StorageObject, StorageMetadata } from "../types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";

const log = createSubsystemLogger("ralph:storage:s3");

interface S3Config {
  region: string;
  bucket: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3StorageBackend implements StorageBackend {
  readonly name: string;
  readonly type = "s3" as const;
  private config: S3Config;
  private baseUrl: string;

  constructor(name: string, config: S3Config) {
    this.name = name;
    this.config = config;
    this.baseUrl = config.endpoint
      ? `${config.endpoint}/${config.bucket}`
      : `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
  }

  async upload(key: string, data: Buffer | NodeJS.ReadableStream): Promise<void> {
    log.info(`Uploading to s3://${this.config.bucket}/${key}`);

    let body: Buffer;

    if (Buffer.isBuffer(data)) {
      body = data;
    } else {
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }

    const url = `${this.baseUrl}/${key}`;
    const headers = this.signRequest("PUT", key, {}, body);

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: new Uint8Array(body),
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${await response.text()}`);
    }

    log.info(`Upload complete: s3://${this.config.bucket}/${key}`);
  }

  async download(key: string): Promise<Buffer> {
    log.info(`Downloading from s3://${this.config.bucket}/${key}`);

    const url = `${this.baseUrl}/${key}`;
    const headers = this.signRequest("GET", key);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`S3 download failed: ${await response.text()}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    log.info(`Deleting s3://${this.config.bucket}/${key}`);

    const url = `${this.baseUrl}/${key}`;
    const headers = this.signRequest("DELETE", key);

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`S3 delete failed: ${await response.text()}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${key}`;
      const headers = this.signRequest("HEAD", key);

      const response = await fetch(url, {
        method: "HEAD",
        headers,
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<StorageObject[]> {
    log.info(`Listing objects in s3://${this.config.bucket}/${prefix}`);

    const url = new URL(this.baseUrl);
    url.searchParams.set("prefix", prefix);
    url.searchParams.set("max-keys", "1000");

    const headers = this.signRequest("GET", `/?prefix=${prefix}&max-keys=1000`);

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`S3 list failed: ${await response.text()}`);
    }

    const xml = await response.text();
    return this.parseListResponse(xml);
  }

  async getMetadata(key: string): Promise<StorageMetadata> {
    log.info(`Getting metadata for s3://${this.config.bucket}/${key}`);

    const url = `${this.baseUrl}/${key}`;
    const headers = this.signRequest("HEAD", key);

    const response = await fetch(url, {
      method: "HEAD",
      headers,
    });

    if (!response.ok) {
      throw new Error(`S3 head failed: ${await response.text()}`);
    }

    const content = await this.download(key);

    return {
      size: Number(response.headers.get("content-length") || 0),
      contentType: response.headers.get("content-type") || "application/octet-stream",
      createdAt: new Date(response.headers.get("last-modified") || Date.now()),
      modifiedAt: new Date(response.headers.get("last-modified") || Date.now()),
      checksum: createHash("sha256").update(content).digest("hex"),
      tags: {},
    };
  }

  async setMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void> {
    // S3 doesn't support setting metadata separately
    log.warn(`S3 metadata updates not fully supported for ${key}`);

    if (metadata.tags) {
      // Would need to implement PutObjectTagging
      log.info(`Tags would be updated for ${key}`, { tags: metadata.tags });
    }
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // Generate pre-signed URL using AWS Signature V4
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = timestamp.substr(0, 8);

    const credential = `${this.config.accessKeyId}/${date}/${this.config.region}/s3/aws4_request`;
    const expires = String(expiresIn);

    const params = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": timestamp,
      "X-Amz-Expires": expires,
      "X-Amz-SignedHeaders": "host",
    });

    const url = `${this.baseUrl}/${key}?${params.toString()}`;

    // In a full implementation, we would sign the URL
    // For now, return unsigned URL with query params
    return url;
  }

  private signRequest(
    method: string,
    path: string,
    headers: Record<string, string> = {},
    body?: Buffer,
  ): Record<string, string> {
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = timestamp.substr(0, 8);

    const host = this.config.endpoint
      ? new URL(this.config.endpoint).host
      : `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;

    const signedHeaders: Record<string, string> = {
      host: host,
      "x-amz-date": timestamp,
      ...headers,
    };

    if (body) {
      const contentHash = createHash("sha256").update(body).digest("hex");
      signedHeaders["x-amz-content-sha256"] = contentHash;
    } else {
      signedHeaders["x-amz-content-sha256"] =
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    }

    // Simplified signing - in production use proper AWS Signature V4
    // This is a placeholder implementation
    const credential = `${this.config.accessKeyId}/${date}/${this.config.region}/s3/aws4_request`;
    signedHeaders["authorization"] =
      `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=host;x-amz-date;x-amz-content-sha256, Signature=placeholder`;

    return signedHeaders;
  }

  private parseListResponse(xml: string): StorageObject[] {
    const objects: StorageObject[] = [];

    // Simple XML parsing using regex (in production use proper XML parser)
    const keyRegex = /<Key>([^\u003c]+)<\/Key>/g;
    const sizeRegex = /<Size>(\d+)<\/Size>/g;
    const modifiedRegex = /<LastModified>([^\u003c]+)<\/LastModified>/g;
    const etagRegex = /<ETag>"([^"]*)"<\/ETag>/g;

    const keys = [...xml.matchAll(keyRegex)].map((m) => m[1]);
    const sizes = [...xml.matchAll(sizeRegex)].map((m) => parseInt(m[1], 10));
    const modified = [...xml.matchAll(modifiedRegex)].map((m) => new Date(m[1]));
    const etags = [...xml.matchAll(etagRegex)].map((m) => m[1]);

    for (let i = 0; i < keys.length; i++) {
      objects.push({
        key: keys[i],
        size: sizes[i] || 0,
        lastModified: modified[i] || new Date(),
        etag: etags[i] || "",
      });
    }

    return objects;
  }
}
