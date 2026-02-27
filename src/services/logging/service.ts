import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("logging");

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  source?: string;
  correlationId?: string;
  userId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LogQuery {
  level?: LogLevel;
  source?: string;
  userId?: string;
  correlationId?: string;
  startTime?: Date;
  endTime?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  sources: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface LogExport {
  entries: LogEntry[];
  exportedAt: Date;
  filters: LogQuery;
}

/**
 * Structured Logging Service
 * Centralized logging with filtering, aggregation, and export
 */
export class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private logBuffer: LogEntry[] = [];
  private flushInterval = 5000; // 5 seconds
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private subscribers: Array<(entry: LogEntry) => void> = [];

  constructor() {
    this.startFlushTimer();
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushBuffer();
  }

  /**
   * Flush buffer to main logs
   */
  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    this.logs.push(...this.logBuffer);
    this.logBuffer = [];

    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Log entry
   */
  log(entry: Omit<LogEntry, "id" | "timestamp">): void {
    const fullEntry: LogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.logBuffer.push(fullEntry);

    // Notify subscribers
    this.subscribers.forEach((callback) => callback(fullEntry));

    // Log to subsystem logger
    const message = `[${fullEntry.source || "unknown"}] ${fullEntry.message}`;
    switch (entry.level) {
      case "debug":
        log.debug(message);
        break;
      case "info":
        log.info(message);
        break;
      case "warn":
        log.warn(message);
        break;
      case "error":
      case "fatal":
        log.error(message);
        break;
    }
  }

  /**
   * Convenience methods for log levels
   */
  debug(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log({ level: "debug", message, context, source });
  }

  info(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log({ level: "info", message, context, source });
  }

  warn(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log({ level: "warn", message, context, source });
  }

  error(message: string, error?: Error, context?: Record<string, unknown>, source?: string): void {
    this.log({
      level: "error",
      message,
      context,
      source,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>, source?: string): void {
    this.log({
      level: "fatal",
      message,
      context,
      source,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Query logs
   */
  query(query: LogQuery): { entries: LogEntry[]; total: number } {
    this.flushBuffer();

    let filtered = [...this.logs];

    if (query.level) {
      filtered = filtered.filter((l) => l.level === query.level);
    }

    if (query.source) {
      filtered = filtered.filter((l) => l.source === query.source);
    }

    if (query.userId) {
      filtered = filtered.filter((l) => l.userId === query.userId);
    }

    if (query.correlationId) {
      filtered = filtered.filter((l) => l.correlationId === query.correlationId);
    }

    if (query.startTime) {
      filtered = filtered.filter((l) => l.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      filtered = filtered.filter((l) => l.timestamp <= query.endTime!);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.message.toLowerCase().includes(search) ||
          JSON.stringify(l.context).toLowerCase().includes(search),
      );
    }

    const total = filtered.length;

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query.offset) {
      filtered = filtered.slice(query.offset);
    }

    if (query.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return { entries: filtered, total };
  }

  /**
   * Get log statistics
   */
  getStats(): LogStats {
    this.flushBuffer();

    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    const sources = new Set<string>();

    this.logs.forEach((log) => {
      byLevel[log.level]++;
      if (log.source) {
        sources.add(log.source);
      }
    });

    const timestamps = this.logs.map((l) => l.timestamp.getTime());
    const timeRange =
      timestamps.length > 0
        ? {
            start: new Date(Math.min(...timestamps)),
            end: new Date(Math.max(...timestamps)),
          }
        : { start: new Date(), end: new Date() };

    return {
      total: this.logs.length,
      byLevel,
      sources: Array.from(sources),
      timeRange,
    };
  }

  /**
   * Export logs
   */
  export(query: LogQuery): LogExport {
    const { entries } = this.query(query);

    return {
      entries,
      exportedAt: new Date(),
      filters: query,
    };
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.logs = [];
    this.logBuffer = [];
    log.info("Logs cleared");
  }

  /**
   * Subscribe to new logs
   */
  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get log sources
   */
  getSources(): string[] {
    this.flushBuffer();
    const sources = new Set<string>();
    this.logs.forEach((log) => {
      if (log.source) {
        sources.add(log.source);
      }
    });
    return Array.from(sources);
  }

  /**
   * Get recent logs
   */
  getRecent(count = 100): LogEntry[] {
    this.flushBuffer();
    return this.logs.slice(-count).reverse();
  }
}

// Singleton instance
let loggingService: LoggingService | null = null;

export function getLoggingService(): LoggingService {
  if (!loggingService) {
    loggingService = new LoggingService();
  }
  return loggingService;
}
