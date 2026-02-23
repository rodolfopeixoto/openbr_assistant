import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { handleSpeechHttpRequest } from "../../gateway/routes/speech.js";
import { SpeechToTextService } from "../../speech/stt-service.js";
import { VoiceCommandRouter } from "../../speech/voice-command-router.js";
import { WakeWordDetector } from "../../speech/wake-word-detector.js";

describe("Speech Integration - End-to-End Flow", () => {
  let detector: WakeWordDetector;
  let router: VoiceCommandRouter;
  let sttService: SpeechToTextService;

  beforeEach(() => {
    detector = new WakeWordDetector({
      words: ["clawd", "openclaw"],
      aliases: ["hey claw"],
      sensitivity: 0.8,
      cooldownMs: 2000,
    });
    router = new VoiceCommandRouter();
    sttService = new SpeechToTextService({
      provider: "openai",
      apiKey: "test-api-key",
    });

    // Reset cooldown before each test
    detector.resetCooldown();
  });

  describe("Full voice command flow", () => {
    it("processes 'clawd run tests' from text to command execution", async () => {
      const text = "clawd run tests";

      // Step 1: Detect wake word
      const wakeResult = detector.detectStart(text);
      expect(wakeResult.matched).toBe(true);
      expect(wakeResult.word).toBe("clawd");
      expect(wakeResult.command).toBe("run tests");

      // Step 2: Route command
      const commandResult = await router.route(wakeResult, {
        userId: "test-user",
        sessionId: "test-session",
      });

      expect(commandResult.success).toBe(true);
      expect(commandResult.message).toContain("Running tests");
      expect(commandResult.data).toHaveProperty("command", "npm test");
    });

    it("processes 'openclaw build project' command", async () => {
      const text = "openclaw build project";

      const wakeResult = detector.detectStart(text);
      expect(wakeResult.matched).toBe(true);
      expect(wakeResult.word).toBe("openclaw");
      expect(wakeResult.command).toBe("build project");

      const commandResult = await router.route(wakeResult, {
        userId: "test-user",
        sessionId: "test-session",
      });

      expect(commandResult.success).toBe(true);
      expect(commandResult.data).toHaveProperty("command", "npm run build");
    });

    it("processes 'hey claw commit changes' command", async () => {
      const text = "hey claw commit changes";

      const wakeResult = detector.detect(text);
      expect(wakeResult.matched).toBe(true);
      expect(wakeResult.word).toBe("hey claw");
      expect(wakeResult.command).toBe("commit changes");

      const commandResult = await router.route(wakeResult, {
        userId: "test-user",
        sessionId: "test-session",
      });

      expect(commandResult.success).toBe(true);
    });

    it("handles text without wake word", async () => {
      const text = "run tests now";

      const wakeResult = detector.detect(text);
      expect(wakeResult.matched).toBe(false);

      const commandResult = await router.route(wakeResult, {
        userId: "test-user",
        sessionId: "test-session",
      });

      expect(commandResult.success).toBe(false);
      expect(commandResult.message).toContain("No command detected");
    });

    it("respects cooldown between commands", async () => {
      const text1 = "clawd run tests";
      const text2 = "clawd build project";

      // First command should work
      const result1 = detector.detect(text1);
      expect(result1.matched).toBe(true);

      // Second command during cooldown should fail
      const result2 = detector.detect(text2);
      expect(result2.matched).toBe(false);

      // After resetting cooldown, should work again
      detector.resetCooldown();
      const result3 = detector.detect(text2);
      expect(result3.matched).toBe(true);
    });
  });

  describe("API route integration", () => {
    it("handles transcribe endpoint structure", async () => {
      // Create mock request and response
      const mockReq = {
        url: "/api/v1/speech/status",
        method: "GET",
        headers: {
          authorization: "Bearer test-token",
        },
      } as unknown as IncomingMessage;

      const mockHeaders: Record<string, string> = {};
      const mockRes = {
        statusCode: 0,
        end: vi.fn(),
        setHeader: vi.fn((key: string, value: string) => {
          mockHeaders[key] = value;
        }),
      } as unknown as ServerResponse;

      const ctx = {
        auth: { userId: "test-user" },
        trustedProxies: [],
      };

      const handled = await handleSpeechHttpRequest(mockReq, mockRes, ctx);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.end).toHaveBeenCalled();

      const responseBody = JSON.parse((mockRes.end as any).mock.calls[0][0]);
      expect(responseBody.status).toBe("healthy");
      expect(responseBody.services).toHaveProperty("stt");
      expect(responseBody.services).toHaveProperty("wakeWord");
      expect(responseBody.services).toHaveProperty("commands");
    });
  });

  describe("Voice recorder component flow", () => {
    it("validates audio formats supported by STT service", () => {
      const supportedFormats = [
        "audio/webm",
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/wav",
        "audio/mpeg",
        "audio/mp3",
      ];

      for (const format of supportedFormats) {
        expect(sttService.validateAudioFormat(format)).toBe(true);
      }
    });

    it("rejects unsupported audio formats", () => {
      const unsupportedFormats = ["video/mp4", "image/jpeg", "application/json", "text/plain"];

      for (const format of unsupportedFormats) {
        expect(sttService.validateAudioFormat(format)).toBe(false);
      }
    });

    it("returns supported formats list", () => {
      const formats = sttService.getSupportedFormats();
      expect(formats.length).toBeGreaterThan(0);
      expect(formats.some((f) => f.includes("webm"))).toBe(true);
      expect(formats.some((f) => f.includes("wav"))).toBe(true);
    });
  });

  describe("Complete user scenario", () => {
    it("developer workflow: test → build → commit → deploy", async () => {
      const workflow = [
        { text: "clawd run tests", expectedCommand: "npm test" },
        { text: "clawd build project", expectedCommand: "npm run build" },
        { text: "openclaw commit changes", expectedCommand: "git commit" },
        { text: "clawd deploy to staging", expectedCommand: "deploy:staging" },
      ];

      for (const step of workflow) {
        // Reset cooldown for each step
        detector.resetCooldown();

        // Detect wake word
        const wakeResult = detector.detectStart(step.text);
        expect(wakeResult.matched).toBe(true);

        // Route and execute command
        const commandResult = await router.route(wakeResult, {
          userId: "developer",
          sessionId: "dev-session",
        });

        expect(commandResult.success).toBe(true);
        expect(commandResult.data).toBeDefined();
      }
    });

    it("handles fuzzy matching for typos", async () => {
      const typos = [
        { input: "clowd run tests", shouldMatch: true },
        { input: "clawd runn tests", shouldMatch: true },
        { input: "klawd run tests", shouldMatch: true },
      ];

      for (const typo of typos) {
        detector.resetCooldown();
        const result = detector.detectStart(typo.input);
        expect(result.matched).toBe(typo.shouldMatch);
        if (typo.shouldMatch) {
          // Fuzzy matches should have reasonable confidence
          expect(result.confidence).toBeGreaterThanOrEqual(0.7);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});
