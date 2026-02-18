import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface AuditEvent {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "critical";
  category: "auth" | "access" | "data" | "system" | "security";
  action: string;
  actor: {
    type: "user" | "system" | "api" | "unknown";
    id?: string;
    ip?: string;
    userAgent?: string;
  };
  resource: {
    type: string;
    id?: string;
    path?: string;
  };
  result: "success" | "failure" | "blocked";
  reason?: string;
  details: Record<string, unknown>;
}

export interface AuditLoggerConfig {
  bufferSize: number;
  flushInterval: number;
  logDir: string;
  encrypt: boolean;
  encryptionKey?: Buffer;
}

export class AuditLogger {
  private buffer: AuditEvent[] = [];
  private config: AuditLoggerConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private logStream: fs.WriteStream | null = null;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = {
      bufferSize: 1000,
      flushInterval: 5000,
      logDir: "./logs/audit",
      encrypt: false,
      ...config,
    };

    this.initLogStream();
    this.startFlushTimer();
  }

  async log(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void> {
    const fullEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
    };

    // Sanitize sensitive data
    const sanitized = this.sanitizeEvent(fullEvent);

    this.buffer.push(sanitized);

    if (this.buffer.length >= this.config.bufferSize) {
      await this.flush();
    }
  }

  private sanitizeEvent(event: AuditEvent): AuditEvent {
    const sensitiveKeys = ["password", "token", "secret", "apiKey", "privateKey"];
    const sanitized = { ...event };

    for (const key of sensitiveKeys) {
      if (sanitized.details[key]) {
        sanitized.details[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.logStream) {
      return;
    }

    const events = [...this.buffer];
    this.buffer = [];

    for (const event of events) {
      const line = JSON.stringify(event) + "\n";
      await new Promise<void>((resolve, reject) => {
        this.logStream!.write(line, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  private initLogStream(): void {
    // Ensure log directory exists
    if (!fs.existsSync(this.config.logDir)) {
      try {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      } catch (err) {
        // Directory may have been created by another process
        if (!fs.existsSync(this.config.logDir)) {
          throw err;
        }
      }
    }

    const date = new Date().toISOString().split("T")[0];
    const logFile = path.join(this.config.logDir, `audit-${date}.log`);

    this.logStream = fs.createWriteStream(logFile, { flags: "a" });
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    if (this.logStream) {
      await new Promise<void>((resolve) => {
        this.logStream!.end(() => resolve());
      });
      this.logStream = null;
    }
  }
}
