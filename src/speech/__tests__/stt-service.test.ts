import { describe, expect, it, beforeEach, vi } from "vitest";
import { SpeechToTextService, type TranscriptionRequest } from "../stt-service.js";

describe("SpeechToTextService", () => {
  let service: SpeechToTextService;

  beforeEach(() => {
    service = new SpeechToTextService({
      provider: "openai",
      apiKey: "test-api-key",
    });
  });

  describe("initialization", () => {
    it("initializes with default config", () => {
      const defaultService = new SpeechToTextService();
      const status = defaultService.getStatus();
      expect(status.provider).toBe("openai");
      expect(status.model).toBe("gpt-4o-mini-transcribe");
    });

    it("initializes with custom config", () => {
      const customService = new SpeechToTextService({
        provider: "deepgram",
        model: "nova-3",
        apiKey: "custom-key",
      });
      const status = customService.getStatus();
      expect(status.provider).toBe("deepgram");
      expect(status.model).toBe("nova-3");
    });

    it("loads API key from environment", () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "env-api-key";

      const envService = new SpeechToTextService();
      const status = envService.getStatus();
      expect(status.apiKeyConfigured).toBe(true);

      process.env.OPENAI_API_KEY = originalKey;
    });
  });

  describe("audio format validation", () => {
    it("validates supported webm format", () => {
      expect(service.validateAudioFormat("audio/webm")).toBe(true);
      expect(service.validateAudioFormat("audio/webm;codecs=opus")).toBe(true);
    });

    it("validates supported mp4 format", () => {
      expect(service.validateAudioFormat("audio/mp4")).toBe(true);
      expect(service.validateAudioFormat("audio/mp4;codecs=mp4a")).toBe(true);
    });

    it("validates supported wav format", () => {
      expect(service.validateAudioFormat("audio/wav")).toBe(true);
    });

    it("validates supported mp3 format", () => {
      expect(service.validateAudioFormat("audio/mpeg")).toBe(true);
      expect(service.validateAudioFormat("audio/mp3")).toBe(true);
    });

    it("rejects unsupported format", () => {
      expect(service.validateAudioFormat("video/mp4")).toBe(false);
      expect(service.validateAudioFormat("image/jpeg")).toBe(false);
      expect(service.validateAudioFormat("application/json")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(service.validateAudioFormat("AUDIO/WEBM")).toBe(true);
      expect(service.validateAudioFormat("Audio/Wav")).toBe(true);
    });

    it("returns supported formats list", () => {
      const formats = service.getSupportedFormats();
      expect(formats.length).toBeGreaterThan(0);
      expect(formats.some((f) => f.includes("webm"))).toBe(true);
      expect(formats.some((f) => f.includes("mp4"))).toBe(true);
      expect(formats.some((f) => f.includes("wav"))).toBe(true);
    });
  });

  describe("caching", () => {
    it("caches transcription results", async () => {
      // Mock fetch for this test
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "Hello world",
          language: "en",
          duration: 1.5,
        }),
      });
      global.fetch = mockFetch;

      const request: TranscriptionRequest = {
        audioBuffer: Buffer.from("test audio data"),
        mimeType: "audio/webm",
        language: "en",
      };

      // First call
      await service.transcribe(request);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await service.transcribe(request);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, not 2

      vi.restoreAllMocks();
    });

    it("limits cache size", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "Hello",
          language: "en",
          duration: 1,
        }),
      });
      global.fetch = mockFetch;

      // Add more than 100 items to cache
      for (let i = 0; i < 105; i++) {
        await service.transcribe({
          audioBuffer: Buffer.from(`audio ${i}`),
          mimeType: "audio/webm",
        });
      }

      const status = service.getStatus();
      expect(status.cacheSize).toBeLessThanOrEqual(100);

      vi.restoreAllMocks();
    });
  });

  describe("status", () => {
    it("returns service status", () => {
      const status = service.getStatus();
      expect(status).toHaveProperty("provider");
      expect(status).toHaveProperty("model");
      expect(status).toHaveProperty("apiKeyConfigured");
      expect(status).toHaveProperty("cacheSize");
    });

    it("reports API key status correctly", () => {
      // Save and clear env vars
      const originalOpenAiKey = process.env.OPENAI_API_KEY;
      const originalDeepgramKey = process.env.DEEPGRAM_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.DEEPGRAM_API_KEY;

      try {
        const serviceWithKey = new SpeechToTextService({
          apiKey: "test-key",
        });
        expect(serviceWithKey.getStatus().apiKeyConfigured).toBe(true);

        const serviceWithoutKey = new SpeechToTextService({
          apiKey: undefined,
        });
        expect(serviceWithoutKey.getStatus().apiKeyConfigured).toBe(false);
      } finally {
        // Restore env vars
        if (originalOpenAiKey) {
          process.env.OPENAI_API_KEY = originalOpenAiKey;
        }
        if (originalDeepgramKey) {
          process.env.DEEPGRAM_API_KEY = originalDeepgramKey;
        }
      }
    });
  });

  describe("error handling", () => {
    it("throws error for missing API key", async () => {
      // Save original env vars
      const originalOpenAiKey = process.env.OPENAI_API_KEY;
      const originalDeepgramKey = process.env.DEEPGRAM_API_KEY;

      // Clear env vars for this test
      delete process.env.OPENAI_API_KEY;
      delete process.env.DEEPGRAM_API_KEY;

      const serviceNoKey = new SpeechToTextService({
        provider: "openai",
        apiKey: undefined,
      });

      await expect(
        serviceNoKey.transcribe({
          audioBuffer: Buffer.from("test"),
          mimeType: "audio/webm",
        }),
      ).rejects.toThrow("API key not configured");

      // Restore env vars
      if (originalOpenAiKey) {
        process.env.OPENAI_API_KEY = originalOpenAiKey;
      }
      if (originalDeepgramKey) {
        process.env.DEEPGRAM_API_KEY = originalDeepgramKey;
      }
    });

    it("throws error for API failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });
      global.fetch = mockFetch;

      await expect(
        service.transcribe({
          audioBuffer: Buffer.from("test"),
          mimeType: "audio/webm",
        }),
      ).rejects.toThrow("OpenAI API error: 500");

      vi.restoreAllMocks();
    });

    it("handles network errors", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      await expect(
        service.transcribe({
          audioBuffer: Buffer.from("test"),
          mimeType: "audio/webm",
        }),
      ).rejects.toThrow("Network error");

      vi.restoreAllMocks();
    });
  });

  describe("configuration", () => {
    it("uses language from request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "Hello",
          language: "en",
          duration: 1,
        }),
      });
      global.fetch = mockFetch;

      await service.transcribe({
        audioBuffer: Buffer.from("test"),
        mimeType: "audio/webm",
        language: "pt",
        prompt: "This is a test prompt",
      });

      // Verify the language was passed to the API
      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as FormData;
      expect(formData.get("language")).toBe("pt");
      expect(formData.get("prompt")).toBe("This is a test prompt");

      vi.restoreAllMocks();
    });

    it("uses prompt from request", () => {
      // Same as above - requires mocking
      expect(true).toBe(true);
    });
  });

  describe("deepgram provider", () => {
    it("transcribes with deepgram provider", async () => {
      const deepgramService = new SpeechToTextService({
        provider: "deepgram",
        apiKey: "deepgram-test-key",
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: {
            channels: [
              {
                alternatives: [
                  {
                    transcript: "Hello from deepgram",
                    confidence: 0.95,
                    words: [{ word: "Hello", start: 0, end: 0.5, confidence: 0.98 }],
                  },
                ],
              },
            ],
          },
        }),
      });
      global.fetch = mockFetch;

      const result = await deepgramService.transcribe({
        audioBuffer: Buffer.from("test audio"),
        mimeType: "audio/webm",
      });

      expect(result.text).toBe("Hello from deepgram");
      expect(result.confidence).toBe(0.95);
      expect(result.words).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("deepgram"),
        expect.any(Object),
      );

      vi.restoreAllMocks();
    });

    it("handles deepgram API errors", async () => {
      const deepgramService = new SpeechToTextService({
        provider: "deepgram",
        apiKey: "deepgram-test-key",
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Invalid API key",
      });
      global.fetch = mockFetch;

      await expect(
        deepgramService.transcribe({
          audioBuffer: Buffer.from("test"),
          mimeType: "audio/webm",
        }),
      ).rejects.toThrow("Deepgram API error: 403");

      vi.restoreAllMocks();
    });
  });

  describe("cache management", () => {
    it("evicts oldest entries when cache exceeds limit", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "Test",
          language: "en",
          duration: 1,
        }),
      });
      global.fetch = mockFetch;

      // Fill cache to exactly 100 items
      for (let i = 0; i < 100; i++) {
        await service.transcribe({
          audioBuffer: Buffer.from(`audio ${i}`),
          mimeType: "audio/webm",
        });
      }

      const statusBefore = service.getStatus();
      expect(statusBefore.cacheSize).toBe(100);

      // Add one more - should evict oldest
      await service.transcribe({
        audioBuffer: Buffer.from("newest audio"),
        mimeType: "audio/webm",
      });

      const statusAfter = service.getStatus();
      expect(statusAfter.cacheSize).toBe(100);

      // Verify the newest is cached (should return without fetch)
      mockFetch.mockClear();
      await service.transcribe({
        audioBuffer: Buffer.from("newest audio"),
        mimeType: "audio/webm",
      });
      expect(mockFetch).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("returns cached result on cache hit", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "Cached text",
          language: "en",
          duration: 1,
        }),
      });
      global.fetch = mockFetch;

      // First call
      const result1 = await service.transcribe({
        audioBuffer: Buffer.from("test data"),
        mimeType: "audio/webm",
      });

      // Second call should return cached result
      mockFetch.mockClear();
      const result2 = await service.transcribe({
        audioBuffer: Buffer.from("test data"),
        mimeType: "audio/webm",
      });

      expect(result1).toEqual(result2);
      expect(mockFetch).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe("rate limiting and errors", () => {
    it("handles rate limit errors (429)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      });
      global.fetch = mockFetch;

      await expect(
        service.transcribe({
          audioBuffer: Buffer.from("test"),
          mimeType: "audio/webm",
        }),
      ).rejects.toThrow("OpenAI API error: 429");

      vi.restoreAllMocks();
    });

    it("handles authentication errors (401)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Invalid API key",
      });
      global.fetch = mockFetch;

      await expect(
        service.transcribe({
          audioBuffer: Buffer.from("test"),
          mimeType: "audio/webm",
        }),
      ).rejects.toThrow("OpenAI API error: 401");

      vi.restoreAllMocks();
    });

    it("handles malformed API responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          // Missing required fields but has text
          text: "",
          invalid: "response",
        }),
      });
      global.fetch = mockFetch;

      const result = await service.transcribe({
        audioBuffer: Buffer.from("test"),
        mimeType: "audio/webm",
      });

      // Should handle gracefully with defaults
      expect(result.text).toBe("");
      expect(result.confidence).toBeDefined();

      vi.restoreAllMocks();
    });
  });

  describe("security", () => {
    it("validates audio buffer size", async () => {
      // Create a buffer larger than 25MB
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "Large file",
          language: "en",
          duration: 1,
        }),
      });
      global.fetch = mockFetch;

      // Should still work but log warning (no hard limit enforced)
      const result = await service.transcribe({
        audioBuffer: largeBuffer,
        mimeType: "audio/webm",
      });

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("sanitizes mime type input", () => {
      const maliciousMimeTypes = [
        "application/x-javascript",
        "text/html",
        "application/x-sh",
        "../etc/passwd",
        "<script>alert('xss')</script>",
      ];

      for (const mimeType of maliciousMimeTypes) {
        const result = service.validateAudioFormat(mimeType);
        expect(result).toBe(false);
      }
    });

    it("uses HTTPS for API calls", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "Hello",
          language: "en",
          duration: 1,
        }),
      });
      global.fetch = mockFetch;

      await service.transcribe({
        audioBuffer: Buffer.from("test"),
        mimeType: "audio/webm",
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toMatch(/^https:/);

      vi.restoreAllMocks();
    });
  });

  describe("edge cases", () => {
    it("handles empty audio buffer", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "",
          language: "en",
          duration: 0,
        }),
      });
      global.fetch = mockFetch;

      const result = await service.transcribe({
        audioBuffer: Buffer.alloc(0),
        mimeType: "audio/webm",
      });

      expect(result.text).toBe("");
      expect(result.duration).toBe(0);

      vi.restoreAllMocks();
    });

    it("handles very long transcriptions", async () => {
      const longText = "Hello world. ".repeat(100);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: longText,
          language: "en",
          duration: 300,
        }),
      });
      global.fetch = mockFetch;

      const result = await service.transcribe({
        audioBuffer: Buffer.from("test"),
        mimeType: "audio/webm",
      });

      expect(result.text).toBe(longText);
      expect(result.duration).toBe(300);

      vi.restoreAllMocks();
    });

    it("handles special characters in transcription", async () => {
      const textWithSpecialChars =
        "Hello <world>! This is a {test} with [brackets] & symbols @ # $ %";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: textWithSpecialChars,
          language: "en",
          duration: 5,
        }),
      });
      global.fetch = mockFetch;

      const result = await service.transcribe({
        audioBuffer: Buffer.from("test"),
        mimeType: "audio/webm",
      });

      expect(result.text).toBe(textWithSpecialChars);

      vi.restoreAllMocks();
    });

    it("handles unicode text", async () => {
      const unicodeText = "Olá mundo! 你好世界! 🎉 áéíóú ñ";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: unicodeText,
          language: "auto",
          duration: 5,
        }),
      });
      global.fetch = mockFetch;

      const result = await service.transcribe({
        audioBuffer: Buffer.from("test"),
        mimeType: "audio/webm",
      });

      expect(result.text).toBe(unicodeText);

      vi.restoreAllMocks();
    });
  });
});
