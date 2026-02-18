import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AudioValidator,
  AudioValidationRateLimiter,
  AudioValidationConfig,
} from "./audio-validator.js";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Mock fs and child_process
vi.mock("node:fs/promises", () => ({
  default: {
    stat: vi.fn(),
    open: vi.fn(),
  },
}));

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:util", () => ({
  promisify: vi.fn((fn) => fn),
}));

describe("AudioValidator", () => {
  let validator: AudioValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new AudioValidator();
  });

  describe("file size validation", () => {
    it("should reject files exceeding max size", async () => {
      const mockStat = { size: 100 * 1024 * 1024 }; // 100MB
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);

      const result = await validator.validate("/test/audio.mp3");

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("File too large");
    });

    it("should accept files within size limit", async () => {
      const mockStat = { size: 10 * 1024 * 1024 }; // 10MB
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);

      // Mock file signature check
      const mockFile = {
        read: vi.fn().mockResolvedValue({}),
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFile as any);

      // Mock ffprobe response
      vi.mocked(execFile).mockImplementation((cmd, args, cb) => {
        if (cb) {
          cb(null, {
            stdout: JSON.stringify({
              format: {
                duration: "60",
                format_name: "mp3",
                bit_rate: "128000",
              },
              streams: [{
                channels: 2,
                sample_rate: "44100",
              }],
            }),
            stderr: "",
          });
        }
        return {} as any;
      });

      const result = await validator.validate("/test/audio.mp3");

      expect(result.isValid).toBe(true);
    });
  });

  describe("file signature validation", () => {
    it("should reject files with invalid signatures", async () => {
      const mockStat = { size: 1024 * 1024 }; // 1MB
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);

      // Mock file with invalid signature
      const mockBuffer = Buffer.alloc(16);
      mockBuffer.write("INVALID", 0);

      const mockFile = {
        read: vi.fn().mockImplementation((buf, offset, length, position) => {
          mockBuffer.copy(buf, offset, 0, length);
          return Promise.resolve({ bytesRead: length });
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFile as any);

      const result = await validator.validate("/test/invalid.bin");

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Invalid file signature");
    });

    it("should accept OGG files", async () => {
      const mockStat = { size: 1024 * 1024 };
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);

      const mockBuffer = Buffer.alloc(16);
      mockBuffer.write("OggS", 0);

      const mockFile = {
        read: vi.fn().mockImplementation((buf, offset, length, position) => {
          mockBuffer.copy(buf, offset, 0, length);
          return Promise.resolve({ bytesRead: length });
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFile as any);

      vi.mocked(execFile).mockImplementation((cmd, args, cb) => {
        if (cb) {
          cb(null, {
            stdout: JSON.stringify({
              format: {
                duration: "30",
                format_name: "ogg",
                bit_rate: "128000",
              },
              streams: [{
                channels: 2,
                sample_rate: "44100",
              }],
            }),
            stderr: "",
          });
        }
        return {} as any;
      });

      const result = await validator.validate("/test/audio.ogg");

      expect(result.isValid).toBe(true);
    });
  });

  describe("duration validation", () => {
    it("should reject files exceeding max duration", async () => {
      const mockStat = { size: 1024 * 1024 };
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);

      const mockBuffer = Buffer.alloc(16);
      mockBuffer.write("OggS", 0);

      const mockFile = {
        read: vi.fn().mockImplementation((buf, offset, length, position) => {
          mockBuffer.copy(buf, offset, 0, length);
          return Promise.resolve({ bytesRead: length });
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFile as any);

      // Return duration exceeding 10 minutes
      vi.mocked(execFile).mockImplementation((cmd, args, cb) => {
        if (cb) {
          cb(null, {
            stdout: JSON.stringify({
              format: {
                duration: "720", // 12 minutes
                format_name: "ogg",
                bit_rate: "128000",
              },
              streams: [{
                channels: 2,
                sample_rate: "44100",
              }],
            }),
            stderr: "",
          });
        }
        return {} as any;
      });

      const result = await validator.validate("/test/long-audio.ogg");

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Duration too long");
    });
  });

  describe("format validation", () => {
    it("should reject disallowed formats", async () => {
      const mockStat = { size: 1024 * 1024 };
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);

      const mockBuffer = Buffer.alloc(16);
      mockBuffer.write("OggS", 0);

      const mockFile = {
        read: vi.fn().mockImplementation((buf, offset, length, position) => {
          mockBuffer.copy(buf, offset, 0, length);
          return Promise.resolve({ bytesRead: length });
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFile as any);

      vi.mocked(execFile).mockImplementation((cmd, args, cb) => {
        if (cb) {
          cb(null, {
            stdout: JSON.stringify({
              format: {
                duration: "30",
                format_name: "flac", // Not in allowed list
                bit_rate: "128000",
              },
              streams: [{
                channels: 2,
                sample_rate: "44100",
              }],
            }),
            stderr: "",
          });
        }
        return {} as any;
      });

      const result = await validator.validate("/test/audio.flac");

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Format not allowed");
    });
  });

  describe("custom configuration", () => {
    it("should respect custom max size", async () => {
      const customValidator = new AudioValidator({
        maxSizeBytes: 5 * 1024 * 1024, // 5MB
      });

      const mockStat = { size: 10 * 1024 * 1024 }; // 10MB
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);

      const result = await customValidator.validate("/test/audio.mp3");

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("File too large");
    });

    it("should respect custom allowed formats", async () => {
      const customValidator = new AudioValidator({
        allowedFormats: ["wav"],
      });

      const mockStat = { size: 1024 * 1024 };
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);

      const mockBuffer = Buffer.alloc(16);
      mockBuffer.write("RIFF", 0);
      mockBuffer.write("WAVE", 8);

      const mockFile = {
        read: vi.fn().mockImplementation((buf, offset, length, position) => {
          mockBuffer.copy(buf, offset, 0, length);
          return Promise.resolve({ bytesRead: length });
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFile as any);

      vi.mocked(execFile).mockImplementation((cmd, args, cb) => {
        if (cb) {
          cb(null, {
            stdout: JSON.stringify({
              format: {
                duration: "30",
                format_name: "wav",
                bit_rate: "128000",
              },
              streams: [{
                channels: 2,
                sample_rate: "44100",
              }],
            }),
            stderr: "",
          });
        }
        return {} as any;
      });

      const result = await customValidator.validate("/test/audio.wav");
      expect(result.isValid).toBe(true);
    });
  });
});

describe("AudioValidationRateLimiter", () => {
  let limiter: AudioValidationRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new AudioValidationRateLimiter({
      maxRequests: 3,
      windowMs: 60000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow requests within limit", () => {
    expect(limiter.canProcess("user1")).toBe(true);
    limiter.recordRequest("user1");
    expect(limiter.canProcess("user1")).toBe(true);
    limiter.recordRequest("user1");
    expect(limiter.canProcess("user1")).toBe(true);
    limiter.recordRequest("user1");
    expect(limiter.canProcess("user1")).toBe(false);
  });

  it("should reset after window expires", () => {
    limiter.recordRequest("user1");
    limiter.recordRequest("user1");
    limiter.recordRequest("user1");
    expect(limiter.canProcess("user1")).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61000);

    expect(limiter.canProcess("user1")).toBe(true);
    expect(limiter.getRemainingRequests("user1")).toBe(3);
  });

  it("should track different users separately", () => {
    limiter.recordRequest("user1");
    limiter.recordRequest("user1");
    limiter.recordRequest("user1");

    expect(limiter.canProcess("user1")).toBe(false);
    expect(limiter.canProcess("user2")).toBe(true);
    expect(limiter.getRemainingRequests("user2")).toBe(3);
  });

  it("should report remaining requests correctly", () => {
    expect(limiter.getRemainingRequests("user1")).toBe(3);
    limiter.recordRequest("user1");
    expect(limiter.getRemainingRequests("user1")).toBe(2);
    limiter.recordRequest("user1");
    expect(limiter.getRemainingRequests("user1")).toBe(1);
    limiter.recordRequest("user1");
    expect(limiter.getRemainingRequests("user1")).toBe(0);
  });
});
