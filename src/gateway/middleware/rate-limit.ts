import type { IncomingMessage, ServerResponse } from "node:http";
import { RateLimiter } from "../rate-limiter.js";

export interface RateLimitMiddlewareConfig {
  enabled?: boolean;
  windowMs?: number;
  maxRequests?: number;
}

export function createRateLimitMiddleware(config: RateLimitMiddlewareConfig = {}) {
  const { enabled = true, windowMs = 60000, maxRequests = 100 } = config;

  if (!enabled) {
    return (_req: IncomingMessage, _res: ServerResponse, next: () => void) => {
      next();
    };
  }

  const limiter = new RateLimiter({
    windowMs,
    maxRequests,
  });

  return limiter.middleware();
}
