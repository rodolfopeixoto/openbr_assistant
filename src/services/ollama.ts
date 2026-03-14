import { exec } from "child_process";
import { platform } from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface OllamaModel {
  name: string;
  size: string;
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

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  available: boolean;
  version: string | null;
  models: OllamaModel[];
  baseUrl: string;
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
  percent?: number;
}

export interface GenerateParams {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, any>;
}

export interface GenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: { baseUrl?: string; timeout?: number } = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.timeout = config.timeout || 30000;
  }

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

  async listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error("Failed to list models");
    }

    const data = await response.json();
    return data.models.map((m: any) => ({
      name: m.name,
      size: this.formatSize(m.size),
      modified: m.modified_at,
      digest: m.digest,
      details: m.details,
    }));
  }

  async pullModel(modelName: string, onProgress?: (progress: PullProgress) => void): Promise<void> {
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
          onProgress?.(progress);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

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

  async getVersion(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/version`);
    if (!response.ok) {
      throw new Error("Failed to get version");
    }
    const data = await response.json();
    return data.version;
  }

  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to generate");
    }
    return response.json();
  }

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }
}

export class OllamaSystem {
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

  async start(): Promise<void> {
    if (await this.isRunning()) {
      throw new Error("Ollama is already running");
    }

    try {
      if (platform() === "darwin" || platform() === "linux") {
        // Start in background
        exec("ollama serve > /dev/null 2>&1 &");
      } else if (platform() === "win32") {
        exec("start ollama serve");
      }

      // Wait for service to be ready
      await this.waitForReady(10000);
    } catch (err: any) {
      throw new Error(`Failed to start Ollama: ${err.message || err}`, { cause: err });
    }
  }

  async stop(): Promise<void> {
    try {
      if (platform() === "darwin" || platform() === "linux") {
        await execAsync("pkill -x ollama");
      } else if (platform() === "win32") {
        await execAsync("taskkill /F /IM ollama.exe");
      }
    } catch (err: any) {
      throw new Error(`Failed to stop Ollama: ${err.message || err}`, { cause: err });
    }
  }

  private async waitForReady(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const response = await fetch("http://localhost:11434/api/tags", {
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

  async getResourceUsage(): Promise<{ cpu: string; memory: string; gpu: string }> {
    // Implementar baseado no sistema operacional
    return {
      cpu: "N/A",
      memory: "N/A",
      gpu: "N/A",
    };
  }
}

// Singleton instances
let ollamaClient: OllamaClient | null = null;
let ollamaSystem: OllamaSystem | null = null;

export function getOllamaClient(): OllamaClient {
  if (!ollamaClient) {
    ollamaClient = new OllamaClient();
  }
  return ollamaClient;
}

export function getOllamaSystem(): OllamaSystem {
  if (!ollamaSystem) {
    ollamaSystem = new OllamaSystem();
  }
  return ollamaSystem;
}
