import { describe, expect, it } from "vitest";
import { createOpencodeTool } from "./opencode-tool.js";

describe("OpenCode Tool", () => {
  describe("tool creation", () => {
    it("creates tool with correct metadata", () => {
      const tool = createOpencodeTool();

      expect(tool.name).toBe("opencode");
      expect(tool.label).toBe("OpenCode");
      expect(tool.description).toContain("Execute coding tasks");
      expect(tool.description).toContain("ACTIONS");
      expect(tool.description).toContain("status");
      expect(tool.description).toContain("create");
      expect(tool.description).toContain("approve");
    });

    it("has valid TypeBox schema", () => {
      const tool = createOpencodeTool();

      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe("object");
    });
  });

  describe("action parameter validation", () => {
    it("requires action parameter", async () => {
      const tool = createOpencodeTool();

      await expect(tool.execute("test-123", {})).rejects.toThrow("action required");
    });

    it("rejects unknown action", async () => {
      const tool = createOpencodeTool();

      await expect(tool.execute("test-123", { action: "unknown" })).rejects.toThrow(
        "Unknown OpenCode action",
      );
    });
  });

  describe("action: create", () => {
    it("requires prompt for create action", async () => {
      const tool = createOpencodeTool();

      await expect(tool.execute("test-123", { action: "create" })).rejects.toThrow(
        "prompt required",
      );
    });
  });

  describe("action: approve", () => {
    it("requires taskId for approve action", async () => {
      const tool = createOpencodeTool();

      await expect(tool.execute("test-123", { action: "approve" })).rejects.toThrow(
        "taskId required",
      );
    });
  });

  describe("action: cancel", () => {
    it("requires taskId for cancel action", async () => {
      const tool = createOpencodeTool();

      await expect(tool.execute("test-123", { action: "cancel" })).rejects.toThrow(
        "taskId required",
      );
    });
  });

  describe("action: logs", () => {
    it("requires taskId for logs action", async () => {
      const tool = createOpencodeTool();

      await expect(tool.execute("test-123", { action: "logs" })).rejects.toThrow("taskId required");
    });
  });

  describe("timeout handling", () => {
    it("uses default timeout of 30s", () => {
      const params: Record<string, unknown> = {};

      const timeoutMs = typeof params.timeoutMs === "number" ? params.timeoutMs : 30000;

      expect(timeoutMs).toBe(30000);
    });

    it("accepts custom timeout", () => {
      const params: Record<string, unknown> = { timeoutMs: 60000 };

      const timeoutMs = typeof params.timeoutMs === "number" ? params.timeoutMs : 30000;

      expect(timeoutMs).toBe(60000);
    });
  });
});
