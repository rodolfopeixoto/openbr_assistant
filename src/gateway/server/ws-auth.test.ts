import type { IncomingMessage } from "node:http";
import { describe, it, expect } from "vitest";
import { WebSocketAuth } from "./ws-auth.js";

describe("WebSocketAuth", () => {
  describe("generateChallenge", () => {
    it("should generate a valid challenge", () => {
      const auth = new WebSocketAuth();
      const challenge = auth.generateChallenge();
      const parsed = JSON.parse(challenge);

      expect(parsed).toHaveProperty("id");
      expect(parsed).toHaveProperty("nonce");
      expect(typeof parsed.id).toBe("string");
      expect(typeof parsed.nonce).toBe("string");
      expect(parsed.id.length).toBeGreaterThan(0);
      expect(parsed.nonce.length).toBeGreaterThan(0);
    });

    it("should generate unique challenges", () => {
      const auth = new WebSocketAuth();
      const challenge1 = auth.generateChallenge();
      const challenge2 = auth.generateChallenge();

      const parsed1 = JSON.parse(challenge1);
      const parsed2 = JSON.parse(challenge2);

      expect(parsed1.id).not.toBe(parsed2.id);
      expect(parsed1.nonce).not.toBe(parsed2.nonce);
    });
  });

  describe("validateChallenge", () => {
    it("should validate a correct challenge response", () => {
      const auth = new WebSocketAuth();
      const challenge = auth.generateChallenge();
      const { id, nonce } = JSON.parse(challenge);

      expect(auth.validateChallenge(id, nonce)).toBe(true);
    });

    it("should reject an invalid challenge response", () => {
      const auth = new WebSocketAuth();
      const challenge = auth.generateChallenge();
      const { id } = JSON.parse(challenge);

      expect(auth.validateChallenge(id, "invalid-nonce")).toBe(false);
    });

    it("should reject a non-existent challenge", () => {
      const auth = new WebSocketAuth();
      expect(auth.validateChallenge("non-existent-id", "some-nonce")).toBe(false);
    });

    it("should be single-use", () => {
      const auth = new WebSocketAuth();
      const challenge = auth.generateChallenge();
      const { id, nonce } = JSON.parse(challenge);

      expect(auth.validateChallenge(id, nonce)).toBe(true);
      expect(auth.validateChallenge(id, nonce)).toBe(false);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests under the limit", () => {
      const auth = new WebSocketAuth();
      const clientIp = "192.168.1.1";

      for (let i = 0; i < 10; i++) {
        expect(auth.checkRateLimit(clientIp)).toBe(true);
      }
    });

    it("should block requests over the limit", () => {
      const auth = new WebSocketAuth();
      const clientIp = "192.168.1.1";

      for (let i = 0; i < 10; i++) {
        auth.checkRateLimit(clientIp);
      }

      expect(auth.checkRateLimit(clientIp)).toBe(false);
    });

    it("should track different IPs separately", () => {
      const auth = new WebSocketAuth();

      for (let i = 0; i < 10; i++) {
        expect(auth.checkRateLimit("192.168.1.1")).toBe(true);
      }

      expect(auth.checkRateLimit("192.168.1.2")).toBe(true);
    });
  });

  describe("validateOrigin", () => {
    it("should allow matching origins", () => {
      const auth = new WebSocketAuth();
      const req = {
        headers: { origin: "https://example.com" },
      } as IncomingMessage;

      expect(auth.validateOrigin(req, ["https://example.com"])).toBe(true);
    });

    it("should reject non-matching origins", () => {
      const auth = new WebSocketAuth();
      const req = {
        headers: { origin: "https://evil.com" },
      } as IncomingMessage;

      expect(auth.validateOrigin(req, ["https://example.com"])).toBe(false);
    });

    it("should reject missing origins", () => {
      const auth = new WebSocketAuth();
      const req = {
        headers: {},
      } as IncomingMessage;

      expect(auth.validateOrigin(req, ["https://example.com"])).toBe(false);
    });

    it("should support wildcard origins", () => {
      const auth = new WebSocketAuth();
      const req = {
        headers: { origin: "https://subdomain.example.com" },
      } as IncomingMessage;

      expect(auth.validateOrigin(req, ["*.example.com"])).toBe(true);
    });

    it("should allow all origins with *", () => {
      const auth = new WebSocketAuth();
      const req = {
        headers: { origin: "https://anything.com" },
      } as IncomingMessage;

      expect(auth.validateOrigin(req, ["*"])).toBe(true);
    });
  });
});
