import type { IncomingMessage, ServerResponse } from "node:http";
import { LRUCache } from "lru-cache";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: IncomingMessage) => string;
}

export class RateLimiter {
  private cache: LRUCache<string, number[]>;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => req.socket.remoteAddress || "unknown",
      ...config,
    };

    this.cache = new LRUCache({
      max: 10000,
      ttl: this.config.windowMs,
    });
  }

  check(req: IncomingMessage): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const timestamps = this.cache.get(key) || [];
    const recentTimestamps = timestamps.filter((t) => t > windowStart);

    const remaining = Math.max(0, this.config.maxRequests - recentTimestamps.length);
    const resetTime =
      timestamps.length > 0
        ? Math.min(...timestamps) + this.config.windowMs
        : now + this.config.windowMs;

    if (recentTimestamps.length >= this.config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime };
    }

    recentTimestamps.push(now);
    this.cache.set(key, recentTimestamps);

    return { allowed: true, remaining: remaining - 1, resetTime };
  }

  middleware() {
    return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const result = this.check(req);

      res.setHeader("X-RateLimit-Limit", this.config.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString());

      if (!result.allowed) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", Math.ceil(this.config.windowMs / 1000).toString());
        res.end(
          JSON.stringify({
            error: "Too Many Requests",
            code: "RATE_LIMIT_EXCEEDED",
          }),
        );
        return;
      }

      next();
    };
  }
}
