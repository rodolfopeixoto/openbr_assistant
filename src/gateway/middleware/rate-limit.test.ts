import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createRateLimitMiddleware } from "./rate-limit.js";

function createMockResponse() {
  const setHeader = vi.fn();
  const end = vi.fn();
  return {
    setHeader,
    statusCode: 0,
    end,
  } as unknown as ServerResponse;
}

describe("createRateLimitMiddleware", () => {
  it("calls next when rate limiting is disabled", () => {
    const middleware = createRateLimitMiddleware({ enabled: false });

    const mockReq = {} as IncomingMessage;
    const mockRes = createMockResponse();
    let nextCalled = false;

    middleware(mockReq, mockRes, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  it("calls next when request is within rate limit", () => {
    const middleware = createRateLimitMiddleware({
      enabled: true,
      windowMs: 1000,
      maxRequests: 5,
    });

    const mockReq = {
      socket: { remoteAddress: "192.168.1.1" },
    } as unknown as IncomingMessage;

    const mockRes = createMockResponse();

    let nextCalled = false;

    middleware(mockReq, mockRes, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  it("blocks requests exceeding rate limit", () => {
    const middleware = createRateLimitMiddleware({
      enabled: true,
      windowMs: 1000,
      maxRequests: 2,
    });

    const mockReq = {
      socket: { remoteAddress: "192.168.1.1" },
    } as unknown as IncomingMessage;

    const mockRes = createMockResponse();

    // Make max requests
    for (let i = 0; i < 2; i++) {
      middleware(mockReq, mockRes, () => {});
    }

    // Reset mocks
    vi.clearAllMocks();

    let nextCalled = false;
    middleware(mockReq, mockRes, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(mockRes.statusCode).toBe(429);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it("uses default configuration when none provided", () => {
    const middleware = createRateLimitMiddleware();

    const mockReq = {
      socket: { remoteAddress: "192.168.1.1" },
    } as unknown as IncomingMessage;

    const mockRes = createMockResponse();

    let nextCalled = false;

    middleware(mockReq, mockRes, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    // Default is 100 requests per 60 seconds
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "100");
  });

  it("sets rate limit headers correctly", () => {
    const middleware = createRateLimitMiddleware({
      enabled: true,
      windowMs: 60000,
      maxRequests: 10,
    });

    const mockReq = {
      socket: { remoteAddress: "192.168.1.1" },
    } as unknown as IncomingMessage;

    const mockRes = createMockResponse();

    middleware(mockReq, mockRes, () => {});

    expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "9");
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
  });

  it("includes Retry-After header on 429 response", () => {
    const middleware = createRateLimitMiddleware({
      enabled: true,
      windowMs: 60000,
      maxRequests: 1,
    });

    const mockReq = {
      socket: { remoteAddress: "192.168.1.1" },
    } as unknown as IncomingMessage;

    const mockRes = createMockResponse();

    // First request passes
    middleware(mockReq, mockRes, () => {});

    vi.clearAllMocks();

    // Second request is blocked
    middleware(mockReq, mockRes, () => {});

    expect(mockRes.setHeader).toHaveBeenCalledWith("Retry-After", "60");
  });
});
