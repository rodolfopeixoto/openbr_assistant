import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AuditLogger, type AuditEvent } from "./audit-logger.js";

describe("AuditLogger", () => {
  let tempDir: string;
  let logger: AuditLogger;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-test-"));
  });

  afterEach(async () => {
    if (logger) {
      await logger.close();
      logger = null as unknown as AuditLogger;
    }
    // Small delay to ensure stream is fully closed
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("event logging", () => {
    it("should log events with generated id and timestamp", async () => {
      logger = new AuditLogger({ logDir: tempDir });

      await logger.log({
        level: "info",
        category: "auth",
        action: "user.login",
        actor: { type: "user", id: "user123" },
        resource: { type: "session" },
        result: "success",
        details: {},
      });

      await logger.close();

      const files = fs.readdirSync(tempDir);
      expect(files).toHaveLength(1);

      const content = fs.readFileSync(path.join(tempDir, files[0]!), "utf-8");
      const event = JSON.parse(content.trim()) as AuditEvent;

      expect(event.id).toBeDefined();
      expect(event.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(event.timestamp).toBeDefined();
      expect(event.level).toBe("info");
      expect(event.action).toBe("user.login");
    });

    it("should log multiple events to the same file", async () => {
      logger = new AuditLogger({ logDir: tempDir });

      await logger.log({
        level: "info",
        category: "auth",
        action: "user.login",
        actor: { type: "user" },
        resource: { type: "session" },
        result: "success",
        details: {},
      });

      await logger.log({
        level: "warn",
        category: "access",
        action: "resource.access",
        actor: { type: "api" },
        resource: { type: "file", path: "/data/secret.txt" },
        result: "blocked",
        reason: "insufficient_permissions",
        details: {},
      });

      await logger.close();

      const files = fs.readdirSync(tempDir);
      expect(files).toHaveLength(1);

      const content = fs.readFileSync(path.join(tempDir, files[0]!), "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(2);

      const event1 = JSON.parse(lines[0]!) as AuditEvent;
      const event2 = JSON.parse(lines[1]!) as AuditEvent;

      expect(event1.action).toBe("user.login");
      expect(event2.action).toBe("resource.access");
    });
  });

  describe("sanitization", () => {
    it("should redact sensitive fields", async () => {
      logger = new AuditLogger({ logDir: tempDir });

      await logger.log({
        level: "info",
        category: "auth",
        action: "user.login",
        actor: { type: "user" },
        resource: { type: "session" },
        result: "success",
        details: {
          username: "john_doe",
          password: "supersecret123",
          token: "bearer_token_abc",
          secret: "my_api_secret",
          apiKey: "sk-123456789",
          privateKey: "-----BEGIN RSA PRIVATE KEY-----",
          publicData: "this is fine",
        },
      });

      await logger.close();

      const files = fs.readdirSync(tempDir);
      const content = fs.readFileSync(path.join(tempDir, files[0]!), "utf-8");
      const event = JSON.parse(content.trim()) as AuditEvent;

      expect(event.details.username).toBe("john_doe");
      expect(event.details.password).toBe("[REDACTED]");
      expect(event.details.token).toBe("[REDACTED]");
      expect(event.details.secret).toBe("[REDACTED]");
      expect(event.details.apiKey).toBe("[REDACTED]");
      expect(event.details.privateKey).toBe("[REDACTED]");
      expect(event.details.publicData).toBe("this is fine");
    });
  });

  describe("file rotation", () => {
    it("should create files with date-based names", async () => {
      logger = new AuditLogger({ logDir: tempDir });

      await logger.log({
        level: "info",
        category: "system",
        action: "gateway.start",
        actor: { type: "system" },
        resource: { type: "gateway" },
        result: "success",
        details: {},
      });

      await logger.close();

      const files = fs.readdirSync(tempDir);
      expect(files).toHaveLength(1);

      const today = new Date().toISOString().split("T")[0];
      expect(files[0]).toBe(`audit-${today}.log`);
    });
  });

  describe("buffer flush", () => {
    it("should flush when buffer reaches configured size", async () => {
      logger = new AuditLogger({
        logDir: tempDir,
        bufferSize: 3,
        flushInterval: 60000, // Long interval to prevent auto-flush
      });

      // Log 2 events - should not flush yet
      await logger.log({
        level: "info",
        category: "auth",
        action: "user.login",
        actor: { type: "user" },
        resource: { type: "session" },
        result: "success",
        details: {},
      });

      await logger.log({
        level: "info",
        category: "auth",
        action: "user.logout",
        actor: { type: "user" },
        resource: { type: "session" },
        result: "success",
        details: {},
      });

      // Check file - should be empty or not exist yet
      const files = fs.readdirSync(tempDir);
      if (files.length > 0) {
        const content = fs.readFileSync(path.join(tempDir, files[0]!), "utf-8");
        expect(content.trim()).toBe("");
      }

      // Log 3rd event - should trigger flush
      await logger.log({
        level: "info",
        category: "access",
        action: "resource.read",
        actor: { type: "api" },
        resource: { type: "file" },
        result: "success",
        details: {},
      });

      // Give a small moment for async flush
      await new Promise((resolve) => setTimeout(resolve, 50));

      const finalContent = fs.readFileSync(
        path.join(tempDir, files[0] || fs.readdirSync(tempDir)[0]!),
        "utf-8",
      );
      const lines = finalContent
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
      expect(lines.length).toBe(3);
    });

    it("should flush on close", async () => {
      logger = new AuditLogger({
        logDir: tempDir,
        bufferSize: 100, // Large buffer
        flushInterval: 60000, // Long interval
      });

      await logger.log({
        level: "info",
        category: "auth",
        action: "user.login",
        actor: { type: "user" },
        resource: { type: "session" },
        result: "success",
        details: {},
      });

      // Close should flush
      await logger.close();

      // After close, file should have the event
      const files = fs.readdirSync(tempDir);
      expect(files.length).toBeGreaterThan(0);
      const content = fs.readFileSync(path.join(tempDir, files[0]!), "utf-8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
      expect(lines.length).toBe(1);
    });
  });

  describe("configuration", () => {
    it("should use default values when not configured", async () => {
      // Create logger with tempDir to avoid file system issues, then check defaults
      logger = new AuditLogger({ logDir: tempDir });

      // Access private config for testing
      // @ts-expect-error accessing private property for test
      expect(logger.config.bufferSize).toBe(1000);
      // @ts-expect-error accessing private property for test
      expect(logger.config.flushInterval).toBe(5000);
      // @ts-expect-error accessing private property for test
      expect(logger.config.encrypt).toBe(false);

      await logger.close();
    });

    it("should use custom configuration values", async () => {
      logger = new AuditLogger({
        logDir: tempDir,
        bufferSize: 500,
        flushInterval: 10000,
        encrypt: true,
      });

      // @ts-expect-error accessing private property for test
      expect(logger.config.bufferSize).toBe(500);
      // @ts-expect-error accessing private property for test
      expect(logger.config.flushInterval).toBe(10000);
      // @ts-expect-error accessing private property for test
      expect(logger.config.encrypt).toBe(true);
    });
  });
});
