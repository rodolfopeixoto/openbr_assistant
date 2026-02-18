import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { RateLimiter } from "./rate-limiter.js";

function createMockResponse() {
  const setHeader = vi.fn();
  const end = vi.fn();
  return {
    setHeader,
    statusCode: 0,
    end,
  } as unknown as ServerResponse;
}

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 3,
    });
  });

  it("allows requests under the limit", () => {
    const mockReq = {
      socket: { remoteAddress: "192.168.1.1" },
    } as IncomingMessage;

    const result1 = limiter.check(mockReq);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = limiter.check(mockReq);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = limiter.check(mockReq);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const mockReq = {
      socket: { remoteAddress: "192.168.1.1" },
    } as IncomingMessage;

    // Make max requests
    limiter.check(mockReq);
    limiter.check(mockReq);
    limiter.check(mockReq);

    // Fourth request should be blocked
    const result = limiter.check(mockReq);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different clients separately", () => {
    const mockReq1 = {
      socket: { remoteAddress: "192.168.1.1" },
    } as IncomingMessage;
    const mockReq2 = {
      socket: { remoteAddress: "192.168.1.2" },
    } as IncomingMessage;

    // Make max requests from first client
    limiter.check(mockReq1);
    limiter.check(mockReq1);
    limiter.check(mockReq1);

    // First client is now blocked
    expect(limiter.check(mockReq1).allowed).toBe(false);

    // Second client should still be allowed
    expect(limiter.check(mockReq2).allowed).toBe(true);
    expect(limiter.check(mockReq2).allowed).toBe(true);
    expect(limiter.check(mockReq2).allowed).toBe(true);
    expect(limiter.check(mockReq2).allowed).toBe(false);
  });

  it("resets counter after window expires", async () => {
    const shortWindowLimiter = new RateLimiter({
      windowMs: 50,
      maxRequests: 2,
    });

    const mockReq = {
      socket: { remoteAddress: "192.168.1.1" },
    } as IncomingMessage;

    shortWindowLimiter.check(mockReq);
    shortWindowLimiter.check(mockReq);
    expect(shortWindowLimiter.check(mockReq).allowed).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Should be allowed again
    expect(shortWindowLimiter.check(mockReq).allowed).toBe(true);
  });

  it("uses custom key generator when provided", () => {
    const customLimiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 2,
      keyGenerator: (req) => (req.headers["x-api-key"] as string) || "unknown",
    });

    const mockReq1 = {
      socket: { remoteAddress: "192.168.1.1" },
      headers: { "x-api-key": "key1" },
    } as unknown as IncomingMessage;

    const mockReq2 = {
      socket: { remoteAddress: "192.168.1.2" },
      headers: { "x-api-key": "key1" },
    } as unknown as IncomingMessage;

    // Same API key should share limit
    customLimiter.check(mockReq1);
    customLimiter.check(mockReq1);

    // Same key from different IP should be blocked
    expect(customLimiter.check(mockReq2).allowed).toBe(false);
  });

  it("handles missing remote address", () => {
    const mockReq = {
      socket: {},
    } as IncomingMessage;

    // Should not throw and should use "unknown" as key
    const result = limiter.check(mockReq);
    expect(result.allowed).toBe(true);
  });

  describe("middleware", () => {
    it("sets rate limit headers on allowed request", () => {
      const mockReq = {
        socket: { remoteAddress: "192.168.1.1" },
      } as IncomingMessage;

      const mockRes = createMockResponse();
      const middleware = limiter.middleware();
      let nextCalled = false;

      middleware(mockReq, mockRes, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "3");
      expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "2");
      expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
    });

    it("returns 429 with Retry-After header when rate limited", () => {
      const mockReq = {
        socket: { remoteAddress: "192.168.1.1" },
      } as IncomingMessage;

      const mockRes = createMockResponse();
      const middleware = limiter.middleware();

      // Make max requests
      for (let i = 0; i < 3; i++) {
        middleware(mockReq, mockRes, () => {});
      }

      // Reset mocks for the blocked request
      vi.clearAllMocks();

      let nextCalled = false;
      middleware(mockReq, mockRes, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(mockRes.statusCode).toBe(429);
      expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "application/json");
      expect(mockRes.setHeader).toHaveBeenCalledWith("Retry-After", "1");
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          error: "Too Many Requests",
          code: "RATE_LIMIT_EXCEEDED",
        }),
      );
    });

    it("includes rate limit headers even when blocked", () => {
      const mockReq = {
        socket: { remoteAddress: "192.168.1.1" },
      } as unknown as IncomingMessage;

      const mockRes = createMockResponse();
      const middleware = limiter.middleware();

      // Make max requests + 1 blocked
      for (let i = 0; i < 4; i++) {
        middleware(mockReq, mockRes, () => {});
      }

      // Check all calls - headers should be set before blocking
      const allCalls = vi.mocked(mockRes.setHeader).mock.calls;
      const hasLimitHeader = allCalls.some(([name]) => name === "X-RateLimit-Limit");
      const hasRemainingHeader = allCalls.some(([name]) => name === "X-RateLimit-Remaining");
      const hasResetHeader = allCalls.some(([name]) => name === "X-RateLimit-Reset");

      // Should have rate limit headers set
      expect(hasLimitHeader).toBe(true);
      expect(hasRemainingHeader).toBe(true);
      expect(hasResetHeader).toBe(true);
    });
  });
});
