import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";

const execFileAsync = promisify(execFile);

export interface AudioValidationConfig {
  maxSizeBytes: number;
  maxDurationSeconds: number;
  allowedFormats: string[];
  scanForMalware: boolean;
}

const DEFAULT_CONFIG: AudioValidationConfig = {
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  maxDurationSeconds: 600, // 10 minutes
  allowedFormats: ["opus", "ogg", "oga", "mp3", "wav", "m4a"],
  scanForMalware: true,
};

export interface AudioMetadata {
  format: string;
  duration: number;
  bitrate: number;
  channels: number;
  sampleRate: number;
  isValid: boolean;
  errors: string[];
}

export class AudioValidator {
  private config: AudioValidationConfig;

  constructor(config: Partial<AudioValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async validate(filePath: string): Promise<AudioMetadata> {
    const errors: string[] = [];

    // 1. Check file size
    const stats = await fs.stat(filePath);
    if (stats.size > this.config.maxSizeBytes) {
      errors.push(`File too large: ${stats.size} bytes`);
      return this.createInvalidMetadata(errors);
    }

    // 2. Check magic bytes
    const isValidSignature = await this.validateFileSignature(filePath);
    if (!isValidSignature) {
      errors.push("Invalid file signature - possible polyglot file");
      return this.createInvalidMetadata(errors);
    }

    // 3. Probe with ffprobe
    try {
      const metadata = await this.probeWithFfprobe(filePath);

      if (metadata.duration > this.config.maxDurationSeconds) {
        errors.push(`Duration too long: ${metadata.duration}s`);
      }

      if (!this.config.allowedFormats.includes(metadata.format)) {
        errors.push(`Format not allowed: ${metadata.format}`);
      }

      return {
        ...metadata,
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return this.createInvalidMetadata(errors);
    }
  }

  private createInvalidMetadata(errors: string[]): AudioMetadata {
    return {
      format: "unknown",
      duration: 0,
      bitrate: 0,
      channels: 0,
      sampleRate: 0,
      isValid: false,
      errors,
    };
  }

  private async validateFileSignature(filePath: string): Promise<boolean> {
    const file = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(16);

    try {
      await file.read(buffer, 0, 16, 0);

      // OGG
      if (buffer.toString("ascii", 0, 4) === "OggS") return true;
      // MP3
      if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return true;
      // RIFF/WAVE
      if (buffer.toString("ascii", 0, 4) === "RIFF" &&
          buffer.toString("ascii", 8, 12) === "WAVE") return true;
      // M4A/MP4
      if (buffer.toString("ascii", 4, 8) === "ftyp") return true;

      return false;
    } finally {
      await file.close();
    }
  }

  private async probeWithFfprobe(filePath: string): Promise<Omit<AudioMetadata, "isValid" | "errors">> {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration,format_name,bit_rate:stream=channels,sample_rate",
      "-of", "json",
      filePath,
    ]);

    const data = JSON.parse(stdout);

    return {
      format: data.format?.format_name?.split(",")[0] ?? "unknown",
      duration: parseFloat(data.format?.duration ?? "0"),
      bitrate: parseInt(data.format?.bit_rate ?? "0"),
      channels: data.streams?.[0]?.channels ?? 0,
      sampleRate: data.streams?.[0]?.sample_rate ?? 0,
    };
  }
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export class AudioValidationRateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      maxRequests: 10,
      windowMs: 60000, // 1 minute
      ...config,
    };
  }

  canProcess(key: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry) {
      return true;
    }

    if (now > entry.resetTime) {
      return true;
    }

    return entry.count < this.config.maxRequests;
  }

  recordRequest(key: string): void {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || now > entry.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
    } else {
      entry.count++;
    }
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || now > entry.resetTime) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - entry.count);
  }
}
