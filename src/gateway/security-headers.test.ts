import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { securityHeadersMiddleware, type SecurityHeadersConfig } from "./security-headers.js";

describe("securityHeadersMiddleware", () => {
  function createMockRes(): ServerResponse {
    const headers: Record<string, string> = {};
    return {
      setHeader: vi.fn((name: string, value: string) => {
        headers[name] = value;
        return {} as ServerResponse;
      }),
      getHeader: vi.fn((name: string) => headers[name]),
    } as unknown as ServerResponse;
  }

  function createMockReq(): IncomingMessage {
    return {} as IncomingMessage;
  }

  it("should apply all default security headers", () => {
    const middleware = securityHeadersMiddleware();
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Referrer-Policy",
      "strict-origin-when-cross-origin",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
    expect(next).toHaveBeenCalled();
  });

  it("should allow CSP to be disabled", () => {
    const middleware = securityHeadersMiddleware({ contentSecurityPolicy: false });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith("Content-Security-Policy", expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it("should allow custom CSP value", () => {
    const customCsp = "default-src 'none'";
    const middleware = securityHeadersMiddleware({ contentSecurityPolicy: customCsp });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Security-Policy", customCsp);
    expect(next).toHaveBeenCalled();
  });

  it("should allow X-Frame-Options to be disabled", () => {
    const middleware = securityHeadersMiddleware({ xFrameOptions: false });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith("X-Frame-Options", expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it("should allow SAMEORIGIN for X-Frame-Options", () => {
    const middleware = securityHeadersMiddleware({ xFrameOptions: "SAMEORIGIN" });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "SAMEORIGIN");
    expect(next).toHaveBeenCalled();
  });

  it("should allow X-Content-Type-Options to be disabled", () => {
    const middleware = securityHeadersMiddleware({ xContentTypeOptions: false });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(next).toHaveBeenCalled();
  });

  it("should allow X-XSS-Protection to be disabled", () => {
    const middleware = securityHeadersMiddleware({ xXssProtection: false });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith("X-XSS-Protection", expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it("should allow Referrer-Policy to be disabled", () => {
    const middleware = securityHeadersMiddleware({ referrerPolicy: false });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith("Referrer-Policy", expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it("should allow custom Referrer-Policy", () => {
    const customPolicy = "no-referrer";
    const middleware = securityHeadersMiddleware({ referrerPolicy: customPolicy });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Referrer-Policy", customPolicy);
    expect(next).toHaveBeenCalled();
  });

  it("should allow Permissions-Policy to be disabled", () => {
    const middleware = securityHeadersMiddleware({ permissionsPolicy: false });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith("Permissions-Policy", expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it("should allow custom Permissions-Policy", () => {
    const customPolicy = "camera=(self), microphone=(self)";
    const middleware = securityHeadersMiddleware({ permissionsPolicy: customPolicy });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Permissions-Policy", customPolicy);
    expect(next).toHaveBeenCalled();
  });

  it("should allow HSTS to be disabled", () => {
    const middleware = securityHeadersMiddleware({ strictTransportSecurity: false });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith("Strict-Transport-Security", expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it("should allow custom HSTS value", () => {
    const customHsts = "max-age=86400";
    const middleware = securityHeadersMiddleware({ strictTransportSecurity: customHsts });
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Strict-Transport-Security", customHsts);
    expect(next).toHaveBeenCalled();
  });

  it("should allow multiple overrides", () => {
    const config: Partial<SecurityHeadersConfig> = {
      contentSecurityPolicy: "default-src 'none'",
      xFrameOptions: "SAMEORIGIN",
      referrerPolicy: "no-referrer",
    };
    const middleware = securityHeadersMiddleware(config);
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      config.contentSecurityPolicy,
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", config.xFrameOptions);
    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
    expect(res.setHeader).toHaveBeenCalledWith("Referrer-Policy", config.referrerPolicy);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
    expect(next).toHaveBeenCalled();
  });
});
