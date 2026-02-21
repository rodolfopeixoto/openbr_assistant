/**
 * Tests for ContainerPanel component types and interfaces
 */

import { describe, it, expect } from "vitest";

// Test type definitions
interface ContainerInfo {
  containerId: string;
  state: "pending" | "running" | "stopped" | "error";
  startedAt?: Date;
  finishedAt?: Date;
  exitCode?: number;
  error?: string;
  sessionId?: string;
  agentId?: string;
}

interface RuntimeInfo {
  type: "docker" | "apple-container" | "podman" | null;
  version: string;
  path: string;
}

describe("ContainerPanel Types", () => {
  describe("ContainerInfo interface", () => {
    it("should accept valid running container", () => {
      const container: ContainerInfo = {
        containerId: "abc123",
        state: "running",
        startedAt: new Date(),
        sessionId: "session-1",
        agentId: "agent-1",
      };
      
      expect(container.state).toBe("running");
      expect(container.containerId).toBe("abc123");
    });

    it("should accept valid stopped container", () => {
      const container: ContainerInfo = {
        containerId: "xyz789",
        state: "stopped",
        startedAt: new Date(Date.now() - 60000),
        finishedAt: new Date(),
        exitCode: 0,
      };
      
      expect(container.state).toBe("stopped");
      expect(container.exitCode).toBe(0);
    });

    it("should accept valid error container", () => {
      const container: ContainerInfo = {
        containerId: "error456",
        state: "error",
        error: "Container crashed",
      };
      
      expect(container.state).toBe("error");
      expect(container.error).toBe("Container crashed");
    });
  });

  describe("RuntimeInfo interface", () => {
    it("should accept docker runtime", () => {
      const runtime: RuntimeInfo = {
        type: "docker",
        version: "24.0.0",
        path: "/usr/bin/docker",
      };
      
      expect(runtime.type).toBe("docker");
      expect(runtime.version).toBe("24.0.0");
    });

    it("should accept podman runtime", () => {
      const runtime: RuntimeInfo = {
        type: "podman",
        version: "4.0.0",
        path: "/usr/bin/podman",
      };
      
      expect(runtime.type).toBe("podman");
    });

    it("should accept apple-container runtime", () => {
      const runtime: RuntimeInfo = {
        type: "apple-container",
        version: "1.0.0",
        path: "/usr/local/bin/container",
      };
      
      expect(runtime.type).toBe("apple-container");
    });

    it("should accept null runtime", () => {
      const runtime: RuntimeInfo = {
        type: null,
        version: "",
        path: "",
      };
      
      expect(runtime.type).toBeNull();
    });
  });

  describe("formatDuration helper", () => {
    const formatDuration = (startedAt: Date): string => {
      const seconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    };

    it("should format seconds correctly", () => {
      const startedAt = new Date(Date.now() - 45000); // 45 seconds ago
      expect(formatDuration(startedAt)).toMatch(/^\d+s$/);
    });

    it("should format minutes correctly", () => {
      const startedAt = new Date(Date.now() - 125000); // 2 minutes 5 seconds ago
      expect(formatDuration(startedAt)).toMatch(/^\d+m \d+s$/);
    });

    it("should format hours correctly", () => {
      const startedAt = new Date(Date.now() - 3665000); // 1 hour 1 minute 5 seconds ago
      expect(formatDuration(startedAt)).toMatch(/^\d+h \d+m$/);
    });
  });
});
