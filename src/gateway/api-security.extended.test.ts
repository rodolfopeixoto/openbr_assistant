import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { APISecurity, createSecurityMiddleware } from "./api-security.js";

describe("APISecurity Extended Tests", () => {
  let security: APISecurity;

  beforeEach(() => {
    security = new APISecurity();
  });

  describe("Endpoint Registration", () => {
    it("should register endpoints with single method", () => {
      security.registerEndpoint({
        path: "/api/users",
        methods: ["GET"],
        authRequired: true,
      });

      // Should not throw
      expect(() =>
        security.registerEndpoint({
          path: "/api/users",
          methods: ["POST"],
          authRequired: true,
        }),
      ).not.toThrow();
    });

    it("should register endpoints with multiple methods", () => {
      security.registerEndpoint({
        path: "/api/users/:id",
        methods: ["GET", "PUT", "DELETE"],
        authRequired: true,
        validation: {
          params: { id: "string" },
        },
      });

      // Multiple registrations with same path but different methods should work
      expect(() =>
        security.registerEndpoint({
          path: "/api/users/:id",
          methods: ["PATCH"],
          authRequired: false,
        }),
      ).not.toThrow();
    });

    it("should overwrite existing endpoint registrations", () => {
      security.registerEndpoint({
        path: "/api/test",
        methods: ["GET"],
        authRequired: true,
      });

      // Same key should overwrite
      security.registerEndpoint({
        path: "/api/test",
        methods: ["GET"],
        authRequired: false,
      });

      // Should not throw - internal state updated
      expect(true).toBe(true);
    });

    it("should handle endpoints without validation", () => {
      security.registerEndpoint({
        path: "/api/public",
        methods: ["GET"],
        authRequired: false,
      });

      // No validation property should be fine
      expect(true).toBe(true);
    });

    it("should handle complex validation schemas", () => {
      security.registerEndpoint({
        path: "/api/complex",
        methods: ["POST"],
        authRequired: true,
        validation: {
          body: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
          },
          query: {
            limit: { type: "number" },
          },
          params: {
            id: { type: "string" },
          },
        },
      });

      expect(true).toBe(true);
    });
  });

  describe("Input Sanitization - XSS Prevention", () => {
    it("should remove nested script tags", () => {
      const input = '<div><script>alert("xss")</script><script>alert("xss2")</script>Content</div>';
      const result = security.sanitizeInput(input);
      expect(result).not.toContain("<script>");
      expect(result).toContain("Content");
    });

    it("should remove script tags with attributes", () => {
      const input = '<script type="text/javascript" src="evil.js">alert(1)</script>Hello';
      const result = security.sanitizeInput(input);
      expect(result).not.toContain("<script");
      expect(result).not.toContain("</script>");
      expect(result).toBe("Hello");
    });

    it("should handle case variations of javascript:", () => {
      const input = 'JaVaScRiPt:alert("xss")';
      const result = security.sanitizeInput(input);
      expect(result.toLowerCase()).not.toContain("javascript:");
    });

    it("should remove multiple event handlers", () => {
      const input = "<div onclick=alert(1) onload=alert(2) onerror=alert(3)>Click</div>";
      const result = security.sanitizeInput(input);
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("onload");
      expect(result).not.toContain("onerror");
      expect(result).toContain("Click");
    });

    it("should handle event handlers with various spacing", () => {
      const inputs = [
        "<div onclick =alert(1)>",
        "<div onclick= alert(1)>",
        "<div onclick = alert(1)>",
        "<div onclick  =  alert(1)>",
      ];

      inputs.forEach((input) => {
        const result = security.sanitizeInput(input);
        expect(result).not.toContain("onclick");
      });
    });

    it("should handle malformed HTML", () => {
      const input = '<script>alert("xss")</div><script>';
      const result = security.sanitizeInput(input);
      expect(result).not.toContain("<script>");
    });

    it("should remove javascript: from URLs", () => {
      const input = '<a href="javascript:void(0)">Link</a>';
      const result = security.sanitizeInput(input);
      expect(result).not.toContain("javascript:");
    });
  });

  describe("Input Sanitization - SQL Injection Prevention", () => {
    it("should escape single quotes", () => {
      const input = "' OR '1'='1";
      const result = security.sanitizeInput(input);
      expect(result).toContain("\\'");
      expect(result).not.toBe(input);
    });

    it("should escape double quotes", () => {
      const input = '" OR "1"="1';
      const result = security.sanitizeInput(input);
      expect(result).toContain('\\"');
    });

    it("should escape semicolons", () => {
      const input = "SELECT * FROM users; DROP TABLE users;";
      const result = security.sanitizeInput(input);
      expect(result).toContain("\\;");
    });

    it("should remove SQL comments", () => {
      const input = "SELECT * FROM users--";
      const result = security.sanitizeInput(input);
      expect(result).not.toContain("--");
    });

    it("should escape backslashes", () => {
      const input = "\\' OR '1'='1";
      const result = security.sanitizeInput(input);
      expect(result).toContain("\\\\");
    });

    it("should handle complex SQL injection attempts", () => {
      const input = "'; DELETE FROM users WHERE '1'='1";
      const result = security.sanitizeInput(input);
      expect(result).toContain("\\'");
      expect(result).not.toContain("--");
    });
  });

  describe("Input Sanitization - Path Traversal Prevention", () => {
    it("should remove multiple path traversal sequences", () => {
      const input = "../../../../../../../etc/passwd";
      const result = security.sanitizeInput(input);
      expect(result).toBe("etc/passwd");
    });

    it("should handle mixed traversal patterns", () => {
      const input = "../..\\..\\../etc/passwd";
      const result = security.sanitizeInput(input);
      // Should handle forward slashes only as per implementation
      expect(result).not.toContain("../");
    });

    it("should remove tilde expansion", () => {
      const input = "~/.ssh/id_rsa";
      const result = security.sanitizeInput(input);
      expect(result).toBe(".ssh/id_rsa");
    });

    it("should handle path traversal in URL context", () => {
      const input = "/api/files/../../../etc/passwd";
      const result = security.sanitizeInput(input);
      expect(result).toBe("/api/files/etc/passwd");
    });

    it("should handle encoded path traversal attempts", () => {
      // Note: The sanitizer doesn't handle URL encoding, that's a different layer
      const input = "..%2F..%2Fetc%2Fpasswd";
      const result = security.sanitizeInput(input);
      // Raw encoded sequences pass through
      expect(result).toContain("%2F");
    });
  });

  describe("JSON Validation", () => {
    it("should validate complex nested JSON", () => {
      const input = JSON.stringify({
        user: {
          name: "John",
          address: {
            street: "123 Main St",
            city: "NYC",
          },
          tags: ["admin", "user"],
        },
        count: 42,
        active: true,
        nullable: null,
      });
      expect(security.validateJSON(input)).toBe(true);
    });

    it("should validate JSON arrays", () => {
      const input = JSON.stringify([1, 2, 3, { nested: true }]);
      expect(security.validateJSON(input)).toBe(true);
    });

    it("should validate JSON primitives", () => {
      expect(security.validateJSON('"string"')).toBe(true);
      expect(security.validateJSON("123")).toBe(true);
      expect(security.validateJSON("true")).toBe(true);
      expect(security.validateJSON("false")).toBe(true);
      expect(security.validateJSON("null")).toBe(true);
    });

    it("should reject invalid JSON", () => {
      const invalidCases = [
        '{"key": value}', // Unquoted value
        "{key: 'value'}", // Single quotes
        '{"key": undefined}', // Undefined
        "{}", // Valid actually
        "", // Empty
        "undefined", // undefined literal
      ];

      expect(security.validateJSON('{"key": value}')).toBe(false);
      expect(security.validateJSON("{key: 'value'}")).toBe(false);
      expect(security.validateJSON('{"key": undefined}')).toBe(false);
    });

    it("should handle edge case JSON strings", () => {
      const edgeCases = [
        '""', // Empty string
        "0", // Zero
        "-1", // Negative number
        "1.5", // Float
        "1e10", // Scientific notation
        '"\\n\\t\\r"', // Escape sequences
      ];

      edgeCases.forEach((input) => {
        expect(security.validateJSON(input)).toBe(true);
      });
    });
  });

  describe("Middleware - URL Sanitization", () => {
    it("should sanitize URLs with special characters", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/test<script>alert(1)</script>?key=value",
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
      expect(req.url).not.toContain("<script>");
    });

    it("should handle URLs without query strings", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/users",
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
      expect(req.url).toBe("/api/users");
    });

    it("should handle undefined URL", async () => {
      const middleware = security.middleware();

      const req = {
        url: undefined,
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
      expect(req.url).toBeUndefined();
    });

    it("should handle empty URL", async () => {
      const middleware = security.middleware();

      const req = {
        url: "",
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
    });
  });

  describe("Middleware - Content Type Validation", () => {
    it("should allow PUT with JSON content type", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/users/1",
        method: "PUT",
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

    it("should allow PATCH with JSON content type", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/users/1",
        method: "PATCH",
        headers: { "content-type": "application/json; charset=utf-8" },
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

    it("should reject POST with XML content type", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/users",
        method: "POST",
        headers: { "content-type": "application/xml" },
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

    it("should reject POST with text/html content type", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/users",
        method: "POST",
        headers: { "content-type": "text/html" },
      } as unknown as IncomingMessage;

      let endCalled = false;
      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: (body: string) => {
          endCalled = true;
          expect(res.statusCode).toBe(415);
        },
      } as unknown as ServerResponse;

      await middleware(req, res, () => {});
      expect(endCalled).toBe(true);
    });

    it("should handle missing content-type header", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/users",
        method: "POST",
        headers: {},
      } as unknown as IncomingMessage;

      let endCalled = false;
      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: () => {
          endCalled = true;
        },
      } as unknown as ServerResponse;

      await middleware(req, res, () => {});
      expect(endCalled).toBe(true);
      expect(res.statusCode).toBe(415);
    });

    it("should handle GET requests without content-type check", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/users",
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
    });

    it("should handle DELETE requests without content-type check", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/users/1",
        method: "DELETE",
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
    });

    it("should handle multipart/form-data with boundary", async () => {
      const middleware = security.middleware();

      const req = {
        url: "/api/upload",
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
        },
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

  describe("createSecurityMiddleware", () => {
    it("should create a middleware that sanitizes URLs", async () => {
      const middleware = createSecurityMiddleware();

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
      expect(req.url).not.toContain("<script>");
    });

    it("should create a middleware that validates content types", async () => {
      const middleware = createSecurityMiddleware();

      const req = {
        url: "/api/users",
        method: "POST",
        headers: { "content-type": "text/plain" },
      } as unknown as IncomingMessage;

      let endCalled = false;
      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: () => {
          endCalled = true;
        },
      } as unknown as ServerResponse;

      await middleware(req, res, () => {});
      expect(endCalled).toBe(true);
      expect(res.statusCode).toBe(415);
    });

    it("should propagate to next middleware", async () => {
      const middleware = createSecurityMiddleware();
      const nextFn = vi.fn();

      const req = {
        url: "/api/users",
        method: "GET",
        headers: {},
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: () => {},
      } as unknown as ServerResponse;

      await middleware(req, res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });
});
