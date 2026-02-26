/**
 * Enhanced Ollama Service with Resource Monitoring
 * Manages Ollama installation, models, and resource usage
 */

import { exec } from "child_process";
import { platform } from "os";
import { promisify } from "util";
import { createSubsystemLogger } from "../logging/subsystem.js";

const execAsync = promisify(exec);
const log = createSubsystemLogger("ollama");

export interface OllamaModel {
  name: string;
  size: string;
  sizeBytes: number;
  modified: string;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
  percent?: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  memoryGB: string;
  gpu?: number;
  gpuVRAM?: string;
}

export interface OllamaSystemInfo {
  installed: boolean;
  running: boolean;
  version: string | null;
  platform: string;
  resources: ResourceUsage;
}

export class OllamaManager {
  private baseUrl: string;
  private pullProgressCallbacks: Map<string, ((progress: PullProgress) => void)[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;

  constructor(baseUrl: string = "http://localhost:11434") {
    this.baseUrl = baseUrl;
    this.startHeartbeat();
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const isAvailable = await this.isAvailable();
        this.lastHeartbeat = Date.now();
        if (isAvailable) {
          log.debug("Ollama heartbeat: OK");
        }
      } catch {
        log.debug("Ollama heartbeat: Not available");
      }
    }, 300000); // 5 minutes
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get time since last heartbeat
   */
  getLastHeartbeat(): number {
    return this.lastHeartbeat;
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List all installed models
   */
  async listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error("Failed to list models");
    }

    const data = await response.json();
    return data.models.map((m: any) => ({
      name: m.name,
      size: this.formatSize(m.size),
      sizeBytes: m.size,
      modified: m.modified_at,
      digest: m.digest,
      details: m.details,
    }));
  }

  /**
   * Pull a model with progress tracking
   */
  async pullModel(modelName: string, onProgress?: (progress: PullProgress) => void): Promise<void> {
    // Register callback for this model
    if (onProgress) {
      if (!this.pullProgressCallbacks.has(modelName)) {
        this.pullProgressCallbacks.set(modelName, []);
      }
      this.pullProgressCallbacks.get(modelName)!.push(onProgress);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error("Failed to pull model");
      }
      if (!response.body) {
        throw new Error("No response body");
      }

      // Stream progress
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          try {
            const progress = JSON.parse(line);
            if (progress.completed && progress.total) {
              progress.percent = Math.round((progress.completed / progress.total) * 100);
            }

            // Notify all callbacks
            const callbacks = this.pullProgressCallbacks.get(modelName) || [];
            callbacks.forEach((cb) => cb(progress));
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      // Clean up callbacks
      this.pullProgressCallbacks.delete(modelName);
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete model");
    }
  }

  /**
   * Get Ollama version
   */
  async getVersion(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/version`);
    if (!response.ok) {
      throw new Error("Failed to get version");
    }
    const data = await response.json();
    return data.version;
  }

  /**
   * Check if Ollama is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      if (platform() === "darwin" || platform() === "linux") {
        await execAsync("which ollama");
        return true;
      } else if (platform() === "win32") {
        await execAsync("where ollama");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if Ollama service is running
   */
  async isRunning(): Promise<boolean> {
    try {
      if (platform() === "darwin" || platform() === "linux") {
        await execAsync("pgrep -x ollama");
        return true;
      } else if (platform() === "win32") {
        await execAsync('tasklist /FI "IMAGENAME eq ollama.exe"');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Start Ollama service
   */
  async start(): Promise<void> {
    if (await this.isRunning()) {
      throw new Error("Ollama is already running");
    }

    try {
      if (platform() === "darwin" || platform() === "linux") {
        exec("ollama serve > /dev/null 2>&1 &");
      } else if (platform() === "win32") {
        exec("start ollama serve");
      }

      // Wait for service to be ready
      await this.waitForReady(30000);
      log.info("Ollama started successfully");
    } catch (err: any) {
      throw new Error(`Failed to start Ollama: ${err.message || err}`, { cause: err });
    }
  }

  /**
   * Stop Ollama service
   */
  async stop(): Promise<void> {
    try {
      if (platform() === "darwin" || platform() === "linux") {
        await execAsync("pkill -x ollama");
      } else if (platform() === "win32") {
        await execAsync("taskkill /F /IM ollama.exe");
      }
      log.info("Ollama stopped");
    } catch (err: any) {
      throw new Error(`Failed to stop Ollama: ${err.message || err}`, { cause: err });
    }
  }

  /**
   * Get resource usage
   */
  async getResourceUsage(): Promise<ResourceUsage> {
    const os = platform();

    try {
      if (os === "darwin") {
        // macOS
        const { stdout: memInfo } = await execAsync(
          "ps -o pid,ppid,pcpu,pmem,rss,vsz -p $(pgrep ollama) 2>/dev/null || echo ''",
        );
        const memMatch = memInfo.match(/(\d+)\s+(\d+)/);
        const memKB = memMatch ? parseInt(memMatch[2]) : 0;

        return {
          cpu: 0,
          memory: memKB * 1024,
          memoryGB: this.formatSize(memKB * 1024),
        };
      } else if (os === "linux") {
        // Linux
        const { stdout: memInfo } = await execAsync(
          "cat /proc/$(pgrep ollama)/status 2>/dev/null | grep VmRSS || echo ''",
        );
        const memMatch = memInfo.match(/(\d+)\s+kB/);
        const memKB = memMatch ? parseInt(memMatch[1]) : 0;

        return {
          cpu: 0,
          memory: memKB * 1024,
          memoryGB: this.formatSize(memKB * 1024),
        };
      }
    } catch {
      // Ignore errors
    }

    return {
      cpu: 0,
      memory: 0,
      memoryGB: "N/A",
    };
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<OllamaSystemInfo> {
    const [installed, running, version, resources] = await Promise.all([
      this.isInstalled(),
      this.isRunning(),
      this.isAvailable()
        .then(() => this.getVersion().catch(() => null))
        .catch(() => null),
      this.getResourceUsage(),
    ]);

    return {
      installed,
      running,
      version,
      platform: platform(),
      resources,
    };
  }

  /**
   * Install Ollama (OS-specific)
   */
  async install(): Promise<{ success: boolean; message: string }> {
    const os = platform();

    try {
      if (os === "darwin") {
        // macOS - use Homebrew
        await execAsync("brew install ollama");
        return { success: true, message: "Ollama installed via Homebrew" };
      } else if (os === "linux") {
        // Linux - use official installer
        await execAsync("curl -fsSL https://ollama.com/install.sh | sh");
        return { success: true, message: "Ollama installed successfully" };
      } else if (os === "win32") {
        // Windows - use winget
        await execAsync("winget install Ollama.Ollama");
        return { success: true, message: "Ollama installed via winget" };
      }

      return {
        success: false,
        message: "Unsupported platform for automatic installation",
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Installation failed: ${err.message || err}`,
      };
    }
  }

  /**
   * Uninstall Ollama
   */
  async uninstall(): Promise<{ success: boolean; message: string }> {
    const os = platform();

    try {
      // Stop first
      if (await this.isRunning()) {
        await this.stop();
      }

      if (os === "darwin") {
        await execAsync("brew uninstall ollama");
        return { success: true, message: "Ollama uninstalled" };
      } else if (os === "linux") {
        // Remove binary
        await execAsync("rm -f $(which ollama)");
        return { success: true, message: "Ollama uninstalled" };
      } else if (os === "win32") {
        await execAsync("winget uninstall Ollama.Ollama");
        return { success: true, message: "Ollama uninstalled" };
      }

      return {
        success: false,
        message: "Unsupported platform for automatic uninstallation",
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Uninstallation failed: ${err.message || err}`,
      };
    }
  }

  /**
   * Wait for Ollama to be ready
   */
  private async waitForReady(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const response = await fetch(`${this.baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          return;
        }
      } catch {
        // Wait and retry
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    throw new Error("Timeout waiting for Ollama to start");
  }

  /**
   * Format bytes to human readable
   */
  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }
}

// Singleton instance
let ollamaManager: OllamaManager | null = null;

export function getOllamaManager(): OllamaManager {
  if (!ollamaManager) {
    ollamaManager = new OllamaManager();
  }
  return ollamaManager;
}

export function resetOllamaManager(): void {
  if (ollamaManager) {
    ollamaManager.stopHeartbeat();
    ollamaManager = null;
  }
}
