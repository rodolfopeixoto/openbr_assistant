import { spawn, exec } from "child_process";
import { platform } from "os";
import { promisify } from "util";
import { createSubsystemLogger } from "../logging/subsystem.js";

const execAsync = promisify(exec);
const logger = createSubsystemLogger("ollama");

// Modelos small otimizados para Ollama
export const OLLAMA_MODELS = {
  llama3_2: {
    name: "llama3.2:3b",
    displayName: "Llama 3.2 3B",
    description: "Meta's Llama 3.2 - Fast and efficient (3B params)",
    size: "~2.0 GB",
    tags: ["instruct", "3b", "meta", "recommended"],
    recommended: true,
  },
  gemma2_2b: {
    name: "gemma2:2b",
    displayName: "Gemma 2 2B",
    description: "Google's Gemma 2 - Ultra small and fast (2B params)",
    size: "~1.6 GB",
    tags: ["instruct", "2b", "google", "small"],
    recommended: false,
  },
  phi4_mini: {
    name: "phi4:mini-q3",
    displayName: "Phi-4 Mini Q3",
    description: "Microsoft Phi-4 Mini - Great for coding (Q3 quantized)",
    size: "~1.8 GB",
    tags: ["instruct", "3.8b", "microsoft", "coding"],
    recommended: false,
  },
};

export type ModelKey = keyof typeof OLLAMA_MODELS;

export interface OllamaModelStatus {
  name: string;
  installed: boolean;
  size?: string;
}

export interface OllamaServiceStatus {
  available: boolean;
  installed: boolean;
  running: boolean;
  version?: string;
  models: OllamaModelStatus[];
  currentModel?: string;
  error?: string;
}

/**
 * Ollama Integrated Service
 * Auto-detects and manages Ollama installation
 */
export class OllamaIntegratedService {
  private baseUrl = "http://localhost:11434";
  private isAutoStarted = false;
  private currentModel?: string;

  /**
   * Check if Ollama is available (installed and running)
   */
  async checkStatus(): Promise<OllamaServiceStatus> {
    const status: OllamaServiceStatus = {
      available: false,
      installed: false,
      running: false,
      models: [],
    };

    try {
      // Check if installed
      status.installed = await this.isInstalled();

      if (!status.installed) {
        logger.info("[Ollama] Not installed");
        return status;
      }

      // Check if running
      status.running = await this.isRunning();

      if (!status.running) {
        logger.info("[Ollama] Installed but not running");
        return status;
      }

      // Check API availability
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        status.available = true;
        const data = await response.json();

        // Get version
        try {
          const versionRes = await fetch(`${this.baseUrl}/api/version`, {
            signal: AbortSignal.timeout(3000),
          });
          if (versionRes.ok) {
            const versionData = await versionRes.json();
            status.version = versionData.version;
          }
        } catch {
          // Ignore version check errors
        }

        // Check our models
        const installedModels = data.models || [];
        status.models = Object.values(OLLAMA_MODELS).map((model) => {
          const installed = installedModels.find(
            (m: any) => m.name === model.name || m.name.startsWith(model.name.split(":")[0]),
          );
          return {
            name: model.name,
            installed: !!installed,
            size: installed ? this.formatSize(installed.size) : undefined,
          };
        });

        status.currentModel = this.currentModel;
        logger.info(
          `[Ollama] Available with ${status.models.filter((m) => m.installed).length} models`,
        );
      }
    } catch (error) {
      logger.debug(
        "[Ollama] Status check failed: " + (error instanceof Error ? error.message : String(error)),
      );
      status.error = error instanceof Error ? error.message : "Unknown error";
    }

    return status;
  }

  /**
   * Auto-start Ollama if available
   * Called when gateway starts
   */
  async autoStart(): Promise<boolean> {
    try {
      const installed = await this.isInstalled();
      if (!installed) {
        logger.info("[Ollama] Not installed, skipping auto-start");
        return false;
      }

      const running = await this.isRunning();
      if (running) {
        logger.info("[Ollama] Already running");
        this.isAutoStarted = true;
        return true;
      }

      logger.info("[Ollama] Auto-starting...");
      await this.startOllama();

      // Wait for it to be ready
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const ready = await this.isRunning();
        if (ready) {
          this.isAutoStarted = true;
          logger.info("[Ollama] Auto-started successfully");
          return true;
        }
      }

      logger.warn("[Ollama] Auto-start timed out");
      return false;
    } catch (error) {
      logger.error(
        "[Ollama] Auto-start failed: " + (error instanceof Error ? error.message : String(error)),
      );
      return false;
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(
    modelKey: ModelKey,
    onProgress?: (progress: { percent: number; status: string }) => void,
  ): Promise<void> {
    const model = OLLAMA_MODELS[modelKey];
    if (!model) {
      throw new Error(`Unknown model: ${modelKey}`);
    }

    logger.info(`[Ollama] Pulling model: ${model.name}`);

    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model.name }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    // Stream progress
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.completed && data.total) {
            const percent = Math.round((data.completed / data.total) * 100);
            onProgress?.({ percent, status: data.status });
          } else {
            onProgress?.({ percent: 0, status: data.status });
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    logger.info(`[Ollama] Model ${model.name} pulled successfully`);
  }

  /**
   * Delete a model
   */
  async deleteModel(modelKey: ModelKey): Promise<void> {
    const model = OLLAMA_MODELS[modelKey];
    if (!model) {
      throw new Error(`Unknown model: ${modelKey}`);
    }

    logger.info(`[Ollama] Deleting model: ${model.name}`);

    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model.name }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.statusText}`);
    }

    logger.info(`[Ollama] Model ${model.name} deleted`);
  }

  /**
   * Generate text using a model
   */
  async generate(
    modelKey: ModelKey,
    prompt: string,
    options?: Record<string, any>,
  ): Promise<string> {
    const model = OLLAMA_MODELS[modelKey];
    if (!model) {
      throw new Error(`Unknown model: ${modelKey}`);
    }

    this.currentModel = model.name;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.name,
        prompt,
        stream: false,
        options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  /**
   * Check if Ollama is installed
   */
  private async isInstalled(): Promise<boolean> {
    try {
      const os = platform();
      if (os === "darwin" || os === "linux") {
        await execAsync("which ollama");
        return true;
      } else if (os === "win32") {
        await execAsync("where ollama");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if Ollama server is running
   */
  private async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start Ollama server
   */
  private async startOllama(): Promise<void> {
    const os = platform();

    if (os === "darwin" || os === "linux") {
      // Try to start via launchctl on macOS or systemd on Linux
      try {
        await execAsync("ollama serve &", { timeout: 5000 });
      } catch {
        // Fallback: spawn detached process
        const child = spawn("ollama", ["serve"], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
      }
    } else if (os === "win32") {
      // Windows
      exec("start ollama serve");
    }
  }

  /**
   * Install Ollama
   */
  async install(): Promise<{ success: boolean; message: string }> {
    const os = platform();
    logger.info(`[Ollama] Installing on ${os}...`);

    try {
      if (os === "darwin") {
        // macOS - try brew first, then official installer
        try {
          await execAsync("brew install ollama");
        } catch {
          // Fallback to official installer
          await execAsync("curl -fsSL https://ollama.com/install.sh | sh");
        }
      } else if (os === "linux") {
        // Linux
        await execAsync("curl -fsSL https://ollama.com/install.sh | sh");
      } else if (os === "win32") {
        // Windows - download and run installer
        return {
          success: false,
          message:
            "Windows installation requires manual download from https://ollama.com/download/windows",
        };
      }

      return { success: true, message: "Ollama installed successfully" };
    } catch (error) {
      logger.error(
        "[Ollama] Installation failed: " + (error instanceof Error ? error.message : String(error)),
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : "Installation failed",
      };
    }
  }

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }
}

// Singleton instance
let ollamaService: OllamaIntegratedService | null = null;

export function getOllamaService(): OllamaIntegratedService {
  if (!ollamaService) {
    ollamaService = new OllamaIntegratedService();
  }
  return ollamaService;
}
