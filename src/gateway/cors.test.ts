import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it, expect } from "vitest";
import { createCorsHandler, type CorsConfig } from "./cors.js";

describe("createCorsHandler", () => {
  function createMockReq(method = "GET"): Partial<IncomingMessage> {
    return {
      method,
      headers: {},
    } as Partial<IncomingMessage>;
  }

  function createMockRes(): Partial<ServerResponse> {
    const headers: Record<string, string> = {};
    const res = {
      statusCode: 200,
      setHeader(name: string, value: string) {
        headers[name] = value;
      },
      getHeader(name: string) {
        return headers[name];
      },
      end: () => {},
      headers,
    };
    return res;
  }

  it("should block unauthorized origin", () => {
    const config: CorsConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      allowCredentials: false,
      maxAge: 86400,
    };

    const handler = createCorsHandler(config);
    const req = createMockReq() as IncomingMessage;
    const res = createMockRes() as ServerResponse;

    const result = handler(req, res, "https://unauthorized.com");

    expect(result).toBe(false);
  });

  it("should allow authorized origin", () => {
    const config: CorsConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      allowCredentials: false,
      maxAge: 86400,
    };

    const handler = createCorsHandler(config);
    const req = createMockReq() as IncomingMessage;
    const res = createMockRes() as ServerResponse;

    const result = handler(req, res, "https://example.com");

    expect(result).toBe(true);
    expect(res.getHeader("Access-Control-Allow-Origin")).toBe("https://example.com");
    expect(res.getHeader("Access-Control-Allow-Methods")).toBe("GET, POST");
    expect(res.getHeader("Access-Control-Allow-Headers")).toBe("Content-Type");
  });

  it("should support wildcard matching", () => {
    const config: CorsConfig = {
      allowedOrigins: ["https://*.example.com"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      allowCredentials: false,
      maxAge: 86400,
    };

    const handler = createCorsHandler(config);
    const req = createMockReq() as IncomingMessage;
    const res = createMockRes() as ServerResponse;

    expect(handler(req, res, "https://api.example.com")).toBe(true);
    expect(handler(req, res, "https://admin.example.com")).toBe(true);
    expect(handler(req, res, "https://example.com")).toBe(false);
  });

  it("should handle preflight OPTIONS request", () => {
    const config: CorsConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
      allowCredentials: false,
      maxAge: 86400,
    };

    const handler = createCorsHandler(config);
    const req = createMockReq("OPTIONS") as IncomingMessage;
    const res = createMockRes() as ServerResponse;

    const result = handler(req, res, "https://example.com");

    expect(result).toBe(true);
    expect(res.statusCode).toBe(204);
  });

  it("should set Allow-Credentials header when configured", () => {
    const config: CorsConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      allowCredentials: true,
      maxAge: 86400,
    };

    const handler = createCorsHandler(config);
    const req = createMockReq() as IncomingMessage;
    const res = createMockRes() as ServerResponse;

    handler(req, res, "https://example.com");

    expect(res.getHeader("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("should support wildcard * origin", () => {
    const config: CorsConfig = {
      allowedOrigins: ["*"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      allowCredentials: false,
      maxAge: 86400,
    };

    const handler = createCorsHandler(config);
    const req = createMockReq() as IncomingMessage;
    const res = createMockRes() as ServerResponse;

    expect(handler(req, res, "https://any-origin.com")).toBe(true);
    expect(handler(req, res, "https://another.com")).toBe(true);
  });

  it("should return false when allowedOrigins is empty", () => {
    const config: CorsConfig = {
      allowedOrigins: [],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      allowCredentials: false,
      maxAge: 86400,
    };

    const handler = createCorsHandler(config);
    const req = createMockReq() as IncomingMessage;
    const res = createMockRes() as ServerResponse;

    const result = handler(req, res, "https://example.com");

    expect(result).toBe(false);
  });
});
