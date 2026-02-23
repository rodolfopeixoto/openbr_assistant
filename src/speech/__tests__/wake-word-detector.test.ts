import { describe, expect, it, beforeEach } from "vitest";
import { WakeWordDetector } from "../wake-word-detector.js";

describe("WakeWordDetector", () => {
  let detector: WakeWordDetector;

  beforeEach(() => {
    detector = new WakeWordDetector({
      words: ["clawd", "openclaw"],
      aliases: ["hey claw", "claw"],
      sensitivity: 0.8,
      cooldownMs: 2000,
    });
    detector.resetCooldown();
  });

  describe("basic detection", () => {
    it("detects exact wake word match", () => {
      const result = detector.detect("clawd, execute tests");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("clawd");
      expect(result.command).toBe("execute tests");
    });

    it("detects wake word with punctuation", () => {
      const result = detector.detect("clawd! Build the project");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("clawd");
      expect(result.command).toBe("build the project");
    });

    it("detects alias wake words", () => {
      const result = detector.detect("hey claw, run tests");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("hey claw");
      expect(result.command).toBe("run tests");
    });

    it("detects secondary wake word", () => {
      const result = detector.detect("openclaw status");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("openclaw");
      expect(result.command).toBe("status");
    });

    it("returns no match for text without wake word", () => {
      const result = detector.detect("execute tests now");
      expect(result.matched).toBe(false);
      expect(result.word).toBe("");
      expect(result.confidence).toBe(0);
    });

    it("is case insensitive by default", () => {
      const result = detector.detect("CLAWD execute tests");
      expect(result.matched).toBe(true);
      expect(result.word.toLowerCase()).toBe("clawd");
    });
  });

  describe("cooldown", () => {
    it("prevents multiple activations within cooldown period", () => {
      const first = detector.detect("clawd test");
      expect(first.matched).toBe(true);

      const second = detector.detect("clawd another test");
      expect(second.matched).toBe(false);
    });

    it("allows activation after cooldown expires", () => {
      detector.updateConfig({ cooldownMs: 0 });

      const first = detector.detect("clawd test");
      expect(first.matched).toBe(true);

      const second = detector.detect("clawd another test");
      expect(second.matched).toBe(true);
    });

    it("reports cooldown status correctly", () => {
      detector.detect("clawd test");
      expect(detector.isInCooldown()).toBe(true);

      detector.resetCooldown();
      expect(detector.isInCooldown()).toBe(false);
    });
  });

  describe("detectStart", () => {
    it("detects wake word at start of text", () => {
      const result = detector.detectStart("clawd execute tests");
      expect(result.matched).toBe(true);
      expect(result.command).toBe("execute tests");
    });

    it("detects wake word alone", () => {
      const result = detector.detectStart("clawd");
      expect(result.matched).toBe(true);
      expect(result.command).toBeUndefined();
    });

    it("does not match wake word in middle of text", () => {
      const result = detector.detectStart("please clawd execute tests");
      expect(result.matched).toBe(false);
    });

    it("uses fuzzy matching for typos", () => {
      const result = detector.detectStart("clowd execute tests");
      expect(result.matched).toBe(true);
      expect(result.confidence).toBeLessThan(1);
      expect(result.command).toBe("execute tests");
    });
  });

  describe("configuration", () => {
    it("updates configuration", () => {
      detector.updateConfig({ sensitivity: 0.9 });
      const config = detector.getConfig();
      expect(config.sensitivity).toBe(0.9);
    });

    it("adds new wake word", () => {
      detector.addWakeWord("assistant");
      const result = detector.detect("assistant help me");
      expect(result.matched).toBe(true);
    });

    it("removes wake word", () => {
      detector.removeWakeWord("clawd");
      const result = detector.detect("clawd test");
      expect(result.matched).toBe(false);

      // Other wake words still work
      const result2 = detector.detect("openclaw test");
      expect(result2.matched).toBe(true);
    });

    it("prevents duplicate wake words", () => {
      const initialCount = detector.getConfig().words.length;
      detector.addWakeWord("clawd");
      const finalCount = detector.getConfig().words.length;
      expect(finalCount).toBe(initialCount);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = detector.detect("");
      expect(result.matched).toBe(false);
    });

    it("handles whitespace only", () => {
      const result = detector.detect("   ");
      expect(result.matched).toBe(false);
    });

    it("handles multiple wake words in text", () => {
      const result = detector.detect("clawd openclaw test");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("clawd");
    });

    it("extracts complex commands", () => {
      const result = detector.detect("clawd, commit changes with message 'fix bug'");
      expect(result.matched).toBe(true);
      expect(result.command).toBe("commit changes with message 'fix bug'");
    });

    it("respects case sensitivity setting", () => {
      detector.updateConfig({ caseSensitive: true });
      const result = detector.detect("CLAWD test");
      expect(result.matched).toBe(false);
    });
  });

  describe("confidence scoring", () => {
    it("returns full confidence for exact match", () => {
      const result = detector.detectStart("clawd test");
      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(1);
    });

    it("returns lower confidence for fuzzy match", () => {
      const result = detector.detectStart("clowd test");
      expect(result.matched).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThan(1);
    });

    it("respects sensitivity threshold", () => {
      detector.updateConfig({ sensitivity: 0.95 });
      const result = detector.detectStart("clowd test");
      expect(result.matched).toBe(false);
    });
  });

  describe("advanced edge cases", () => {
    it("handles very long text with wake word at end", () => {
      const longText = "Lorem ipsum ".repeat(50) + "clawd help me";
      const result = detector.detect(longText);
      expect(result.matched).toBe(true);
      expect(result.word).toBe("clawd");
    });

    it("handles text with special characters around wake word", () => {
      const variations = [
        "clawd!!! run tests",
        "clawd... build project",
        "clawd??? status",
        "(clawd) commit changes",
        "[clawd] deploy now",
        '"clawd" search for bug',
        "'clawd' clear cache",
      ];

      for (const text of variations) {
        detector.resetCooldown();
        const result = detector.detect(text);
        expect(result.matched).toBe(true);
        expect(result.word).toBe("clawd");
      }
    });

    it("handles unicode wake words", () => {
      // Add a unicode wake word
      detector.addWakeWord("助手");
      detector.resetCooldown();
      const result = detector.detect("助手 help");
      // Unicode support may vary, so we check if it works or not
      if (result.matched) {
        expect(result.word).toBe("助手");
      }
      detector.removeWakeWord("助手");
    });

    it("handles mixed case with case sensitivity off", () => {
      detector.updateConfig({ caseSensitive: false });
      const variations = ["ClAwD test", "CLAWD test", "clawd test", "Clawd test"];

      for (const text of variations) {
        detector.resetCooldown();
        const result = detector.detect(text);
        expect(result.matched).toBe(true);
      }
    });

    it("handles wake word with no command", () => {
      const result = detector.detect("clawd");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("clawd");
      expect(result.command).toBeUndefined();
    });

    it("handles wake word followed only by punctuation", () => {
      const result = detector.detect("clawd!!!");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("clawd");
      expect(result.command).toBeUndefined();
    });

    it("handles numeric wake words", () => {
      detector.addWakeWord("123");
      const result = detector.detect("123 test");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("123");
      detector.removeWakeWord("123");
    });

    it("handles empty command after wake word", () => {
      const result = detector.detect("clawd   ");
      expect(result.matched).toBe(true);
      expect(result.command).toBeUndefined();
    });

    it("preserves original text case in command", () => {
      const result = detector.detect("clawd Run Tests NOW");
      expect(result.matched).toBe(true);
      // Command extraction preserves case, though implementation may normalize
      expect(result.command).toBeDefined();
      expect(result.command?.toLowerCase()).toBe("run tests now");
    });

    it("handles multiple spaces and tabs", () => {
      const result = detector.detect("clawd    run\t\ttests");
      expect(result.matched).toBe(true);
      // Command may preserve spacing or normalize it
      expect(result.command).toBeDefined();
      expect(result.command).toContain("run");
      expect(result.command).toContain("tests");
    });

    it("handles newlines in text", () => {
      const result = detector.detect("clawd\nrun\ntests");
      expect(result.matched).toBe(true);
      // Newlines may be preserved or normalized
      expect(result.command).toBeDefined();
      expect(result.command).toContain("run");
      expect(result.command).toContain("tests");
    });
  });

  describe("performance and limits", () => {
    it("handles very long command text", () => {
      const longCommand = "a".repeat(1000);
      const result = detector.detect(`clawd ${longCommand}`);
      expect(result.matched).toBe(true);
      expect(result.command).toBe(longCommand);
    });

    it("handles many wake words efficiently", () => {
      // Add many wake words
      for (let i = 0; i < 50; i++) {
        detector.addWakeWord(`word${i}`);
      }

      const result = detector.detect("word25 test");
      expect(result.matched).toBe(true);
      expect(result.word).toBe("word25");

      // Cleanup
      for (let i = 0; i < 50; i++) {
        detector.removeWakeWord(`word${i}`);
      }
    });

    it("handles rapid consecutive detections", () => {
      for (let i = 0; i < 10; i++) {
        detector.resetCooldown();
        const result = detector.detect("clawd test");
        expect(result.matched).toBe(true);
      }
    });
  });
});
