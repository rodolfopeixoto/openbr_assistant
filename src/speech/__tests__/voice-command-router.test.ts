import { describe, expect, it, beforeEach } from "vitest";
import type { WakeWordMatch } from "../wake-word-detector.js";
import { VoiceCommandRouter, type CommandContext } from "../voice-command-router.js";

describe("VoiceCommandRouter", () => {
  let router: VoiceCommandRouter;
  const mockContext: CommandContext = {
    userId: "test-user",
    sessionId: "test-session",
    currentDirectory: "/home/user/project",
    gitBranch: "main",
  };

  beforeEach(() => {
    router = new VoiceCommandRouter();
  });

  describe("route", () => {
    it("executes test command", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "run tests",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.message).toContain("Running tests");
      expect(result.data).toHaveProperty("command", "npm test");
    });

    it("executes build command", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "build project",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.message).toContain("Building");
      expect(result.data).toHaveProperty("command", "npm run build");
    });

    it("executes commit command with message", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "commit with message fix bug",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.message).toContain("fix bug");
      expect(result.data).toHaveProperty("command", 'git commit -m "fix bug"');
    });

    it("executes status command", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "show status",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("directory", mockContext.currentDirectory);
      expect(result.data).toHaveProperty("branch", mockContext.gitBranch);
    });

    it("executes search command", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "search for authentication",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.message).toContain("authentication");
      expect(result.data).toHaveProperty("query", "authentication");
    });

    it("executes deploy command", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "deploy to staging",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.message).toContain("staging");
      expect(result.data).toHaveProperty("environment", "staging");
    });

    it("executes clear command", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "clear cache",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("command", "npm run clean");
    });

    it("returns error for unmatched command", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "do something weird",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown command");
    });

    it("returns error when no command provided", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: undefined,
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain("No command detected");
    });

    it("returns error when wake word not matched", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: false,
        word: "",
        confidence: 0,
        command: "test",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain("No command detected");
    });
  });

  describe("command registration", () => {
    it("registers custom command", () => {
      router.register({
        name: "custom",
        description: "Custom test command",
        patterns: ["^custom test$"],
        action: async () => ({
          success: true,
          message: "Custom executed",
        }),
      });

      const commands = router.listCommands();
      expect(commands.some((cmd) => cmd.name === "custom")).toBe(true);
    });

    it("unregisters command", () => {
      const initialCount = router.listCommands().length;
      router.unregister("test");
      const finalCount = router.listCommands().length;
      expect(finalCount).toBe(initialCount - 1);
    });

    it("lists all registered commands", () => {
      const commands = router.listCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]).toHaveProperty("name");
      expect(commands[0]).toHaveProperty("description");
      expect(commands[0]).toHaveProperty("patterns");
    });
  });

  describe("command variations", () => {
    it("matches 'run test' variation", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "run test",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
    });

    it("matches 'execute tests' variation", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "execute tests",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
    });

    it("matches 'compile' for build", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "compile",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("command", "npm run build");
    });

    it("matches 'find' for search", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "find router",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("query", "router");
    });

    it("matches 'ship to' for deploy", async () => {
      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "ship to production",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("environment", "production");
    });
  });

  describe("error handling", () => {
    it("handles command action errors gracefully", async () => {
      router.register({
        name: "failing",
        description: "Failing command",
        patterns: ["^fail$"],
        action: async () => {
          throw new Error("Intentional failure");
        },
      });

      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "fail",
      };

      const result = await router.route(wakeMatch, mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Command failed");
      expect(result.message).toContain("Intentional failure");
    });
  });

  describe("context usage", () => {
    it("uses current directory from context", async () => {
      const customContext: CommandContext = {
        ...mockContext,
        currentDirectory: "/custom/path",
      };

      const wakeMatch: WakeWordMatch = {
        matched: true,
        word: "clawd",
        confidence: 1,
        command: "show status",
      };

      const result = await router.route(wakeMatch, customContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("directory", "/custom/path");
    });
  });
});
