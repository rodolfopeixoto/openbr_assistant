import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it, expect } from "vitest";
import { APISecurity, createSecurityMiddleware } from "./api-security.js";

describe("APISecurity", () => {
  describe("sanitizeInput", () => {
    it("should remove script tags", () => {
      const security = new APISecurity();
      const input = '<script>alert("xss")</script>Hello';
      expect(security.sanitizeInput(input)).toBe("Hello");
    });

    it("should remove javascript: protocol", () => {
      const security = new APISecurity();
      const input = 'javascript:alert("xss")';
      const result = security.sanitizeInput(input);
      // Protocol removed and quotes escaped for SQL safety
      expect(result).toContain("alert");
      expect(result).not.toContain("javascript:");
    });

    it("should remove event handlers", () => {
      const security = new APISecurity();
      const input = '<div onclick=alert("xss")>Click</div>';
      const result = security.sanitizeInput(input);
      // Event handler removed and quotes escaped
      expect(result).toContain("<div");
      expect(result).toContain("Click");
      expect(result).not.toContain("onclick");
    });

    it("should escape SQL special characters", () => {
      const security = new APISecurity();
      const input = "'; DROP TABLE users; --";
      const sanitized = security.sanitizeInput(input);
      // SQL special characters should be escaped
      expect(sanitized).toContain("\\'");
      // SQL comments should be removed
      expect(sanitized).not.toContain("--");
    });

    it("should remove path traversal sequences", () => {
      const security = new APISecurity();
      const input = "../../../etc/passwd";
      expect(security.sanitizeInput(input)).toBe("etc/passwd");
    });

    it("should remove home directory expansion", () => {
      const security = new APISecurity();
      const input = "~/.ssh/id_rsa";
      expect(security.sanitizeInput(input)).toBe(".ssh/id_rsa");
    });
  });

  describe("validateJSON", () => {
    it("should return true for valid JSON", () => {
      const security = new APISecurity();
      expect(security.validateJSON('{"key": "value"}')).toBe(true);
    });

    it("should return false for invalid JSON", () => {
      const security = new APISecurity();
      expect(security.validateJSON('{"key": "value')).toBe(false);
    });

    it("should return true for empty object", () => {
      const security = new APISecurity();
      expect(security.validateJSON("{}")).toBe(true);
    });

    it("should return true for empty array", () => {
      const security = new APISecurity();
      expect(security.validateJSON("[]")).toBe(true);
    });
  });

  describe("middleware", () => {
    it("should sanitize URL", async () => {
      const security = new APISecurity();
      const middleware = security.middleware();

      const req = {
        url: "/api/test<script>alert(1)</script>",
        method: "GET",
        headers: {},
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: () => {},
      } as unknown as ServerResponse;

      let nextCalled = false;
      await middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      // Script tags removed
      expect(req.url).not.toContain("<script>");
      expect(req.url).not.toContain("</script>");
    });

    it("should reject unknown content types for POST", async () => {
      const security = new APISecurity();
      const middleware = security.middleware();

      const req = {
        url: "/api/test",
        method: "POST",
        headers: { "content-type": "text/plain" },
      } as unknown as IncomingMessage;

      let endCalled = false;
      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: (body: string) => {
          endCalled = true;
          expect(res.statusCode).toBe(415);
          expect(JSON.parse(body)).toEqual({ error: "Unsupported Media Type" });
        },
      } as unknown as ServerResponse;

      let nextCalled = false;
      await middleware(req, res, () => {
        nextCalled = true;
      });

      expect(endCalled).toBe(true);
      expect(nextCalled).toBe(false);
    });

    it("should allow application/json content type", async () => {
      const security = new APISecurity();
      const middleware = security.middleware();

      const req = {
        url: "/api/test",
        method: "POST",
        headers: { "content-type": "application/json" },
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: () => {},
      } as unknown as ServerResponse;

      let nextCalled = false;
      await middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it("should allow multipart/form-data content type", async () => {
      const security = new APISecurity();
      const middleware = security.middleware();

      const req = {
        url: "/api/test",
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=----WebKitFormBoundary" },
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: () => {},
      } as unknown as ServerResponse;

      let nextCalled = false;
      await middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });
  });
});

describe("createSecurityMiddleware", () => {
  it("should create a middleware function", () => {
    const middleware = createSecurityMiddleware();
    expect(typeof middleware).toBe("function");
  });
});
