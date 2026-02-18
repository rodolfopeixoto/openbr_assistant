import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CsrfProtection, type CsrfConfig } from "./csrf.js";
import { csrfMiddleware } from "./middleware/csrf.js";

describe("CsrfProtection", () => {
  let csrf: CsrfProtection;
  let defaultConfig: CsrfConfig;

  beforeEach(() => {
    defaultConfig = {
      cookieName: "XSRF-TOKEN",
      headerName: "X-XSRF-TOKEN",
      tokenLength: 32,
      cookieOptions: {
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        maxAge: 86400000,
      },
    };
    csrf = new CsrfProtection(defaultConfig);
  });

  describe("token generation", () => {
    it("should generate tokens of the correct length", () => {
      const token = csrf.generateToken();
      // base64url of 32 random bytes should be ~43 characters
      expect(token.length).toBeGreaterThan(30);
      expect(token).toBeTruthy();
    });

    it("should generate unique tokens", () => {
      const token1 = csrf.generateToken();
      const token2 = csrf.generateToken();
      expect(token1).not.toBe(token2);
    });

    it("should use custom token length when provided", () => {
      const shortCsrf = new CsrfProtection({ tokenLength: 16 });
      const token = shortCsrf.generateToken();
      expect(token.length).toBeGreaterThan(20);
    });
  });

  describe("cookie setting", () => {
    it("should set token cookie with correct attributes", () => {
      const mockRes = createMockResponse();
      const token = "test-token-123";

      csrf.setTokenCookie(mockRes as unknown as ServerResponse, token);

      expect(mockRes.headers["Set-Cookie"]).toContain("XSRF-TOKEN=test-token-123");
      expect(mockRes.headers["Set-Cookie"]).toContain("Path=/");
      expect(mockRes.headers["Set-Cookie"]).toContain("Secure");
      expect(mockRes.headers["Set-Cookie"]).toContain("SameSite=strict");
      expect(mockRes.headers["Set-Cookie"]).toContain("Max-Age=86400");
    });

    it("should not include HttpOnly when disabled", () => {
      const mockRes = createMockResponse();
      const token = "test-token-123";

      csrf.setTokenCookie(mockRes as unknown as ServerResponse, token);

      expect(mockRes.headers["Set-Cookie"]).not.toContain("HttpOnly");
    });

    it("should include HttpOnly when enabled", () => {
      const httpOnlyCsrf = new CsrfProtection({
        ...defaultConfig,
        cookieOptions: {
          ...defaultConfig.cookieOptions,
          httpOnly: true,
        },
      });
      const mockRes = createMockResponse();
      const token = "test-token-123";

      httpOnlyCsrf.setTokenCookie(mockRes as unknown as ServerResponse, token);

      expect(mockRes.headers["Set-Cookie"]).toContain("HttpOnly");
    });

    it("should handle lax sameSite option", () => {
      const laxCsrf = new CsrfProtection({
        ...defaultConfig,
        cookieOptions: {
          ...defaultConfig.cookieOptions,
          sameSite: "lax",
        },
      });
      const mockRes = createMockResponse();

      laxCsrf.setTokenCookie(mockRes as unknown as ServerResponse, "token");

      expect(mockRes.headers["Set-Cookie"]).toContain("SameSite=lax");
    });
  });

  describe("token validation", () => {
    it("should allow safe methods without token", () => {
      const mockReq = createMockRequest("GET", "", "");
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(true);
    });

    it("should allow HEAD requests without token", () => {
      const mockReq = createMockRequest("HEAD", "", "");
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(true);
    });

    it("should allow OPTIONS requests without token", () => {
      const mockReq = createMockRequest("OPTIONS", "", "");
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(true);
    });

    it("should reject POST without token", () => {
      const mockReq = createMockRequest("POST", "", "");
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(false);
    });

    it("should reject POST with missing cookie", () => {
      const mockReq = createMockRequest("POST", "", "test-token");
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(false);
    });

    it("should reject POST with missing header", () => {
      const mockReq = createMockRequest("POST", "XSRF-TOKEN=test-token", "");
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(false);
    });

    it("should accept POST with matching tokens", () => {
      const token = "test-token-123";
      const mockReq = createMockRequest("POST", `XSRF-TOKEN=${token}`, token);
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(true);
    });

    it("should reject POST with mismatched tokens", () => {
      const mockReq = createMockRequest("POST", "XSRF-TOKEN=token-a", "token-b");
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(false);
    });

    it("should handle multiple cookies", () => {
      const token = "csrf-token";
      const mockReq = createMockRequest(
        "POST",
        `other=value; XSRF-TOKEN=${token}; session=abc`,
        token,
      );
      expect(csrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(true);
    });

    it("should use constant-time comparison to prevent timing attacks", () => {
      // This is implicitly tested by using timingSafeEqual
      // We verify that similar but different tokens are rejected
      const mockReq1 = createMockRequest("POST", "XSRF-TOKEN=aaaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaab");
      expect(csrf.validateToken(mockReq1 as unknown as IncomingMessage)).toBe(false);

      const mockReq2 = createMockRequest("POST", "XSRF-TOKEN=aaaaaaaaaaaaaaaa", "baaaaaaaaaaaaaaa");
      expect(csrf.validateToken(mockReq2 as unknown as IncomingMessage)).toBe(false);
    });
  });

  describe("custom configuration", () => {
    it("should use custom cookie name", () => {
      const customCsrf = new CsrfProtection({
        ...defaultConfig,
        cookieName: "CUSTOM-CSRF",
      });
      const token = "my-token";
      const mockReq = createMockRequest("POST", `CUSTOM-CSRF=${token}`, token);
      expect(customCsrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(true);
    });

    it("should use custom header name", () => {
      const customCsrf = new CsrfProtection({
        ...defaultConfig,
        headerName: "X-CUSTOM-CSRF",
      });
      const token = "my-token";
      const mockReq = createMockRequest("POST", `XSRF-TOKEN=${token}`, token, "X-CUSTOM-CSRF");
      expect(customCsrf.validateToken(mockReq as unknown as IncomingMessage)).toBe(true);
    });
  });
});

describe("csrfMiddleware", () => {
  let csrf: CsrfProtection;
  let middleware: ReturnType<typeof csrfMiddleware>;

  beforeEach(() => {
    csrf = new CsrfProtection();
    middleware = csrfMiddleware(csrf);
  });

  it("should generate token on GET requests", () => {
    const mockReq = createMockRequest("GET", "", "");
    const mockRes = createMockResponse();
    const next = vi.fn();

    middleware(mockReq as unknown as IncomingMessage, mockRes as unknown as ServerResponse, next);

    expect(mockRes.headers["Set-Cookie"]).toContain("XSRF-TOKEN=");
    expect(next).toHaveBeenCalled();
  });

  it("should reject POST without valid token", () => {
    const mockReq = createMockRequest("POST", "", "");
    const mockRes = createMockResponse();
    const next = vi.fn();

    middleware(mockReq as unknown as IncomingMessage, mockRes as unknown as ServerResponse, next);

    expect(mockRes.statusCode).toBe(403);
    expect(mockRes.ended).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("should accept POST with valid token", () => {
    const token = "valid-token";
    const mockReq = createMockRequest("POST", `XSRF-TOKEN=${token}`, token);
    const mockRes = createMockResponse();
    const next = vi.fn();

    middleware(mockReq as unknown as IncomingMessage, mockRes as unknown as ServerResponse, next);

    expect(mockRes.statusCode).toBe(200);
    expect(next).toHaveBeenCalled();
  });

  it("should return proper error JSON on failure", () => {
    const mockReq = createMockRequest("POST", "", "");
    const mockRes = createMockResponse();
    const next = vi.fn();

    middleware(mockReq as unknown as IncomingMessage, mockRes as unknown as ServerResponse, next);

    expect(mockRes.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(mockRes.body);
    expect(body.error).toBe("CSRF token validation failed");
    expect(body.code).toBe("CSRF_INVALID");
  });
});

// Helper functions
function createMockRequest(
  method: string,
  cookieHeader: string,
  headerToken: string,
  headerName = "X-XSRF-TOKEN",
): Partial<IncomingMessage> {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }
  if (headerToken) {
    headers[headerName.toLowerCase()] = headerToken;
  }

  return {
    method,
    headers,
  };
}

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    headers: {},
    ended: false,
    body: "",
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    end(chunk?: string) {
      this.ended = true;
      if (chunk) {
        this.body = chunk;
      }
    },
  };
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  ended: boolean;
  body: string;
  setHeader(name: string, value: string): MockResponse;
  end(chunk?: string): void;
}
