/**
 * Tests for RuntimeDetector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RuntimeDetector } from "../runtime-detector.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("RuntimeDetector", () => {
  let detector: RuntimeDetector;

  beforeEach(() => {
    detector = new RuntimeDetector();
    vi.clearAllMocks();
  });

  describe("checkDocker", () => {
    it("should return true when Docker is available", async () => {
      mockedExeca.mockResolvedValueOnce({ stdout: "Docker version 24.0.0" } as any);

      const result = await detector.checkDocker();

      expect(result).toBe(true);
      expect(mockedExeca).toHaveBeenCalledWith("docker", ["version"], { timeout: 5000 });
    });

    it("should return false when Docker is not available", async () => {
      mockedExeca.mockRejectedValueOnce(new Error("Command not found"));

      const result = await detector.checkDocker();

      expect(result).toBe(false);
    });
  });

  describe("checkPodman", () => {
    it("should return true when Podman is available", async () => {
      mockedExeca.mockResolvedValueOnce({ stdout: "podman version 4.0.0" } as any);

      const result = await detector.checkPodman();

      expect(result).toBe(true);
      expect(mockedExeca).toHaveBeenCalledWith("podman", ["version"], { timeout: 5000 });
    });

    it("should return false when Podman is not available", async () => {
      mockedExeca.mockRejectedValueOnce(new Error("Command not found"));

      const result = await detector.checkPodman();

      expect(result).toBe(false);
    });
  });

  describe("checkAppleContainer", () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
      });
    });

    it("should return false on non-macOS platforms", async () => {
      Object.defineProperty(process, "platform", {
        value: "linux",
      });

      const result = await detector.checkAppleContainer();

      expect(result).toBe(false);
      expect(mockedExeca).not.toHaveBeenCalled();
    });

    it("should return true when Apple Container is available on macOS", async () => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
      });
      mockedExeca.mockResolvedValueOnce({ stdout: "container version 1.0.0" } as any);

      const result = await detector.checkAppleContainer();

      expect(result).toBe(true);
      expect(mockedExeca).toHaveBeenCalledWith("container", ["--version"], { timeout: 5000 });
    });

    it("should return false when Apple Container is not available on macOS", async () => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
      });
      mockedExeca.mockRejectedValueOnce(new Error("Command not found"));

      const result = await detector.checkAppleContainer();

      expect(result).toBe(false);
    });
  });

  describe("detect", () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
      });
    });

    it("should prefer Apple Container on macOS", async () => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
      });

      mockedExeca
        .mockResolvedValueOnce({ stdout: "container version 1.0.0" } as any)
        .mockResolvedValueOnce({ stdout: "Docker version 24.0.0" } as any);

      const result = await detector.detect();

      expect(result).toBe("apple-container");
    });

    it("should fallback to Docker on macOS when Apple Container not available", async () => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
      });

      mockedExeca
        .mockRejectedValueOnce(new Error("Not found"))
        .mockResolvedValueOnce({ stdout: "Docker version 24.0.0" } as any);

      const result = await detector.detect();

      expect(result).toBe("docker");
    });

    it("should fallback to Podman on macOS when Docker not available", async () => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
      });

      mockedExeca
        .mockRejectedValueOnce(new Error("Not found"))
        .mockRejectedValueOnce(new Error("Not found"))
        .mockResolvedValueOnce({ stdout: "podman version 4.0.0" } as any);

      const result = await detector.detect();

      expect(result).toBe("podman");
    });

    it("should prefer Docker on Linux", async () => {
      Object.defineProperty(process, "platform", {
        value: "linux",
      });

      mockedExeca
        .mockResolvedValueOnce({ stdout: "Docker version 24.0.0" } as any)
        .mockResolvedValueOnce({ stdout: "podman version 4.0.0" } as any);

      const result = await detector.detect();

      expect(result).toBe("docker");
    });

    it("should fallback to Podman on Linux when Docker not available", async () => {
      Object.defineProperty(process, "platform", {
        value: "linux",
      });

      mockedExeca
        .mockRejectedValueOnce(new Error("Not found"))
        .mockResolvedValueOnce({ stdout: "podman version 4.0.0" } as any);

      const result = await detector.detect();

      expect(result).toBe("podman");
    });

    it("should return null when no runtime is available", async () => {
      Object.defineProperty(process, "platform", {
        value: "linux",
      });

      mockedExeca
        .mockRejectedValueOnce(new Error("Not found"))
        .mockRejectedValueOnce(new Error("Not found"));

      const result = await detector.detect();

      expect(result).toBeNull();
    });
  });

  describe("getRuntimeInfo", () => {
    it("should return Docker info", async () => {
      mockedExeca
        .mockResolvedValueOnce({ stdout: "24.0.0" } as any)
        .mockResolvedValueOnce({ stdout: "/usr/bin/docker" } as any);

      const info = await detector.getRuntimeInfo("docker");

      expect(info).toEqual({
        type: "docker",
        version: "24.0.0",
        path: "/usr/bin/docker",
      });
    });

    it("should return Podman info", async () => {
      mockedExeca
        .mockResolvedValueOnce({ stdout: "4.0.0" } as any)
        .mockResolvedValueOnce({ stdout: "/usr/bin/podman" } as any);

      const info = await detector.getRuntimeInfo("podman");

      expect(info).toEqual({
        type: "podman",
        version: "4.0.0",
        path: "/usr/bin/podman",
      });
    });

    it("should return Apple Container info", async () => {
      mockedExeca
        .mockResolvedValueOnce({ stdout: "container version 1.0.0" } as any)
        .mockResolvedValueOnce({ stdout: "/usr/local/bin/container" } as any);

      const info = await detector.getRuntimeInfo("apple-container");

      expect(info).toEqual({
        type: "apple-container",
        version: "1.0.0",
        path: "/usr/local/bin/container",
      });
    });

    it("should cache runtime info", async () => {
      mockedExeca
        .mockResolvedValueOnce({ stdout: "24.0.0" } as any)
        .mockResolvedValueOnce({ stdout: "/usr/bin/docker" } as any);

      // First call
      await detector.getRuntimeInfo("docker");

      // Second call should use cache
      const info = await detector.getRuntimeInfo("docker");

      expect(info).toEqual({
        type: "docker",
        version: "24.0.0",
        path: "/usr/bin/docker",
      });

      // Should only have been called twice (not four times)
      expect(mockedExeca).toHaveBeenCalledTimes(2);
    });

    it("should return null for null runtime", async () => {
      const info = await detector.getRuntimeInfo(null);
      expect(info).toBeNull();
    });
  });

  describe("clearCache", () => {
    it("should clear the cache", async () => {
      mockedExeca
        .mockResolvedValueOnce({ stdout: "24.0.0" } as any)
        .mockResolvedValueOnce({ stdout: "/usr/bin/docker" } as any)
        .mockResolvedValueOnce({ stdout: "25.0.0" } as any)
        .mockResolvedValueOnce({ stdout: "/usr/local/bin/docker" } as any);

      // First call
      await detector.getRuntimeInfo("docker");

      // Clear cache
      detector.clearCache();

      // Second call should fetch again
      const _info = await detector.getRuntimeInfo("docker");

      expect(mockedExeca).toHaveBeenCalledTimes(4);
    });
  });
});
