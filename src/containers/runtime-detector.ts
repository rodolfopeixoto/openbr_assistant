/**
 * RuntimeDetector - Detects available container runtimes
 *
 * Supports Docker, Apple Container (macOS), and Podman
 * Auto-detects the best available runtime for the current platform
 */

import { execa } from "execa";

export type ContainerRuntime = "docker" | "apple-container" | "podman" | null;

export interface RuntimeInfo {
  type: ContainerRuntime;
  version: string;
  path: string;
}

export class RuntimeDetector {
  private cache: Map<string, RuntimeInfo | null> = new Map();
  private cacheExpiry = 60000; // 1 minute
  private cacheTimestamp: number = 0;

  /**
   * Detect the best available container runtime for the current platform
   */
  async detect(): Promise<ContainerRuntime> {
    const platform = process.platform;

    if (platform === "darwin") {
      // macOS: Prefer Apple Container, fallback to Docker/Colima, then Podman
      if (await this.checkAppleContainer()) {
        return "apple-container";
      }
      if (await this.checkDocker()) {
        return "docker";
      }
      if (await this.checkPodman()) {
        return "podman";
      }
    } else if (platform === "linux") {
      // Linux: Docker or Podman
      if (await this.checkDocker()) {
        return "docker";
      }
      if (await this.checkPodman()) {
        return "podman";
      }
    }

    return null;
  }

  /**
   * Get detailed info about a runtime
   */
  async getRuntimeInfo(type: ContainerRuntime): Promise<RuntimeInfo | null> {
    const now = Date.now();

    // Check cache
    if (this.cache.has(type!) && now - this.cacheTimestamp < this.cacheExpiry) {
      return this.cache.get(type!) || null;
    }

    let info: RuntimeInfo | null = null;

    switch (type) {
      case "docker":
        info = await this.getDockerInfo();
        break;
      case "apple-container":
        info = await this.getAppleContainerInfo();
        break;
      case "podman":
        info = await this.getPodmanInfo();
        break;
    }

    // Update cache
    this.cache.set(type!, info);
    this.cacheTimestamp = now;

    return info;
  }

  /**
   * Check if Docker is available
   */
  async checkDocker(): Promise<boolean> {
    try {
      await execa("docker", ["version"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Podman is available
   */
  async checkPodman(): Promise<boolean> {
    try {
      await execa("podman", ["version"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Apple Container is available (macOS only)
   */
  async checkAppleContainer(): Promise<boolean> {
    if (process.platform !== "darwin") {
      return false;
    }
    try {
      await execa("container", ["--version"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Docker version and path info
   */
  private async getDockerInfo(): Promise<RuntimeInfo | null> {
    try {
      const { stdout } = await execa("docker", ["version", "--format", "{{.Server.Version}}"], {
        timeout: 5000,
      });
      const { stdout: pathStdout } = await execa("which", ["docker"], { timeout: 5000 });

      return {
        type: "docker",
        version: stdout.trim(),
        path: pathStdout.trim(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get Podman version and path info
   */
  private async getPodmanInfo(): Promise<RuntimeInfo | null> {
    try {
      const { stdout } = await execa("podman", ["version", "--format", "{{.Version}}"], {
        timeout: 5000,
      });
      const { stdout: pathStdout } = await execa("which", ["podman"], { timeout: 5000 });

      return {
        type: "podman",
        version: stdout.trim(),
        path: pathStdout.trim(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get Apple Container version and path info
   */
  private async getAppleContainerInfo(): Promise<RuntimeInfo | null> {
    try {
      const { stdout } = await execa("container", ["--version"], { timeout: 5000 });
      const { stdout: pathStdout } = await execa("which", ["container"], { timeout: 5000 });

      // Parse version from output like "container version 1.0.0"
      const versionMatch = stdout.match(/version\s+(\d+\.\d+\.\d+)/);

      return {
        type: "apple-container",
        version: versionMatch ? versionMatch[1] : "unknown",
        path: pathStdout.trim(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Clear the runtime cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp = 0;
  }
}

// Singleton instance
export const runtimeDetector = new RuntimeDetector();
