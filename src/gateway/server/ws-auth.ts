import type { IncomingMessage } from "node:http";
import crypto from "node:crypto";

export interface WsAuthResult {
  authenticated: boolean;
  clientId: string;
  role: "client" | "node" | "webchat";
  permissions: string[];
  error?: string;
}

export class WebSocketAuth {
  private challenges = new Map<string, { nonce: string; timestamp: number }>();
  private rateLimiter = new Map<string, number[]>();

  generateChallenge(): string {
    const nonce = crypto.randomBytes(32).toString("base64url");
    const id = crypto.randomUUID();
    this.challenges.set(id, { nonce, timestamp: Date.now() });

    // Clean old challenges (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [key, value] of this.challenges) {
      if (value.timestamp < fiveMinutesAgo) {
        this.challenges.delete(key);
      }
    }

    return JSON.stringify({ id, nonce });
  }

  validateChallenge(id: string, nonce: string): boolean {
    const challenge = this.challenges.get(id);
    if (!challenge) {
      return false;
    }

    // Single use
    this.challenges.delete(id);

    // Check timestamp
    if (Date.now() - challenge.timestamp > 5 * 60 * 1000) {
      return false;
    }

    return challenge.nonce === nonce;
  }

  checkRateLimit(clientIp: string): boolean {
    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window

    const attempts = this.rateLimiter.get(clientIp) || [];
    const recentAttempts = attempts.filter((t) => t > windowStart);

    if (recentAttempts.length >= 10) {
      return false; // Rate limited
    }

    recentAttempts.push(now);
    this.rateLimiter.set(clientIp, recentAttempts);
    return true;
  }

  validateOrigin(req: IncomingMessage, allowedOrigins: string[]): boolean {
    const origin = req.headers.origin;
    if (!origin) {
      return false;
    }

    return allowedOrigins.some((allowed) => {
      if (allowed === "*") {
        return true;
      }
      return origin === allowed || origin.endsWith(allowed.replace("*.", ""));
    });
  }
}
