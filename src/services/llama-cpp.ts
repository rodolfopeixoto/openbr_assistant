/**
 * Direct Llama.cpp Service - Optimized for Llama 3.2:3b
 * No Ollama overhead - uses llama.cpp directly via subprocess
 * RAM usage: ~1.5-1.8GB (vs 2GB+ with Ollama)
 */

import { spawn, ChildProcess } from "child_process";
import { existsSync, mkdirSync, createWriteStream, renameSync, statSync, rmSync } from "fs";
import { platform, homedir, cpus } from "os";
import { join } from "path";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("llama");

// Llama 3.2:3b - Primary model - Official Meta model
export const PRIMARY_MODEL = {
  name: "llama-3.2-3b",
  displayName: "Llama 3.2:3b",
  // Using unsloth's optimized version for best performance
  ggufUrl:
    "https://huggingface.co/unsloth/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
  filename: "llama-3.2-3b-instruct-q4_k_m.gguf",
  sizeBytes: 2019376992, // ~1.9GB
  quantization: "Q4_K_M",
  contextLength: 8192,
  description: "Meta's Llama 3.2 3B - Fast, efficient & optimized",
  tags: ["instruct", "fast", "3b", "meta"],
  recommended: true,
};

// Alternative models
export const ALTERNATIVE_MODELS = [
  {
    name: "phi-4-mini",
    displayName: "Phi-4 Mini",
    ggufUrl:
      "https://huggingface.co/bartowski/Phi-4-mini-instruct-GGUF/resolve/main/Phi-4-mini-instruct-Q4_K_M.gguf",
    filename: "phi-4-mini-q4_k_m.gguf",
    sizeBytes: 2500000000, // ~2.4GB
    quantization: "Q4_K_M",
    contextLength: 4096,
    description: "Microsoft Phi-4 Mini - Great performance",
    tags: ["instruct", "3.8b", "microsoft"],
    recommended: false,
  },
  {
    name: "gemma-2b",
    displayName: "Gemma 2B",
    ggufUrl:
      "https://huggingface.co/lmstudio-ai/gemma-2b-it-GGUF/resolve/main/gemma-2b-it-q4_k_m.gguf",
    filename: "gemma-2b-q4_k_m.gguf",
    sizeBytes: 1500000000, // ~1.4GB
    quantization: "Q4_K_M",
    contextLength: 4096,
    description: "Google Gemma 2B - Ultra small & fast",
    tags: ["instruct", "2b", "google", "ultra-small"],
    recommended: false,
  },
];

// All available models
export const ALL_MODELS = [PRIMARY_MODEL, ...ALTERNATIVE_MODELS];

export interface LlamaModel {
  name: string;
  displayName: string;
  filename: string;
  sizeBytes: number;
  quantization: string;
  contextLength: number;
  installed: boolean;
  path: string;
  downloadProgress?: DownloadProgress;
}

export interface RequestMetrics {
  tokensGenerated: number;
  responseTimeMs: number;
  timestamp: number;
}

export interface LlamaStatus {
  enabled: boolean;
  installed: boolean;
  running: boolean;
  ready: boolean;
  currentModel: string | null;
  modelLoaded: boolean;
  loadingModel: boolean;
  error: string | null;
  resources: {
    memoryMB: number;
    memoryGB: string;
    cpuUsage: number;
  };
  serverPid?: number;
  lastStartedAt?: number;
  metrics: {
    tokensPerSecond: number;
    avgResponseTime: number;
    totalRequests: number;
    lastRequestAt?: number;
  };
}

export interface DownloadProgress {
  status: "idle" | "downloading" | "completed" | "error" | "verifying";
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: string;
  eta?: string;
  error?: string;
}

export class LlamaCppService {
  private modelsDir: string;
  private llamaCppDir: string;
  private serverProcess: ChildProcess | null = null;
  private downloadProgressMap: Map<string, DownloadProgress> = new Map();
  private currentModel: string | null = null;
  private featureEnabled: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private loadingModel: boolean = false;
  private lastError: string | null = null;
  private lastStartedAt: number | null = null;
  private requestMetrics: RequestMetrics[] = [];
  private maxMetricsHistory = 100;

  // Rate limiting
  private rateLimitConfig = {
    enabled: true,
    requestsPerMinute: 30,
    burstSize: 5,
  };
  private requestTimestamps: number[] = [];

  // Context management for chat sessions
  private chatContexts: Map<string, Array<{ role: string; content: string }>> = new Map();
  private maxContextLength = 10; // Keep last 10 messages
  private maxContextTokens = 6000; // Approximate token limit

  // Hardware configuration
  private hardwareConfig = {
    useGPU: true,
    gpuLayers: 99, // Use all layers on GPU if available
    threads: Math.min(4, cpus().length),
    useMetal: platform() === "darwin" && cpus()[0]?.model?.includes("Apple"),
    useCUDA: false, // Will be auto-detected
  };

  constructor() {
    const baseDir = join(homedir(), ".openclaw", "llama");
    this.modelsDir = join(baseDir, "models");
    this.llamaCppDir = join(baseDir, "llama-cpp");

    // Ensure directories exist
    this.ensureDirectories();
    this.startHeartbeat();

    // Check if already running on startup
    this.checkExistingProcess();
  }

  private ensureDirectories(): void {
    [this.modelsDir, this.llamaCppDir].forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        log.info(`Created directory: ${dir}`);
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      this.lastHeartbeat = Date.now();

      if (this.serverProcess && !this.serverProcess.killed) {
        // Check if process is actually running
        try {
          process.kill(this.serverProcess.pid!, 0);
          log.debug("Llama heartbeat: OK");
        } catch {
          log.warn("Llama server process died unexpectedly");
          this.serverProcess = null;
          this.currentModel = null;
          this.loadingModel = false;
        }
      }
    }, 30000); // Check every 30 seconds
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if there's an existing llama.cpp process
   */
  private async checkExistingProcess(): Promise<void> {
    try {
      const { execSync } = await import("child_process");
      const os = platform();

      let cmd: string;
      if (os === "darwin" || os === "linux") {
        cmd = "pgrep -x llama-server || true";
      } else if (os === "win32") {
        cmd =
          'tasklist /FI "IMAGENAME eq llama-server.exe" 2>nul | findstr llama-server || echo ""';
      } else {
        return;
      }

      const result = execSync(cmd, { encoding: "utf8" }).trim();
      if (result) {
        log.info(`Found existing llama.cpp process: ${result}`);
        // Try to connect to it
        try {
          const response = await fetch("http://127.0.0.1:11434/health", {
            signal: AbortSignal.timeout(2000),
          });
          if (response.ok) {
            log.info("Connected to existing llama.cpp server");
            // Mark as running (we don't have the PID but server is responding)
            this.lastStartedAt = Date.now();
          }
        } catch {
          log.warn("Existing process not responding, will ignore");
        }
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if llama.cpp binary is installed
   */
  isInstalled(): boolean {
    const binName = platform() === "win32" ? "llama-server.exe" : "llama-server";
    const binaryPath = join(this.llamaCppDir, binName);
    const installed = existsSync(binaryPath);

    if (installed) {
      // Verify binary is executable
      try {
        statSync(binaryPath);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Check if server is running and responding
   */
  async isRunning(): Promise<boolean> {
    if (!this.serverProcess || this.serverProcess.killed) {
      // Check if external server is responding
      try {
        const response = await fetch("http://127.0.0.1:11434/health", {
          signal: AbortSignal.timeout(1000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if server is ready (responding to health checks)
   */
  async isReady(): Promise<boolean> {
    try {
      const response = await fetch("http://127.0.0.1:11434/health", {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current status with full information
   */
  async getStatus(): Promise<LlamaStatus> {
    const [isRunning, isReady, resources] = await Promise.all([
      this.isRunning(),
      this.isReady(),
      this.getResourceUsage(),
    ]);

    // Calculate metrics from recent requests
    const recentMetrics = this.getRecentMetrics(50); // Last 50 requests
    const avgResponseTime =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum: number, m: RequestMetrics) => sum + m.responseTimeMs, 0) /
          recentMetrics.length
        : 0;
    const totalTokens = recentMetrics.reduce(
      (sum: number, m: RequestMetrics) => sum + m.tokensGenerated,
      0,
    );
    const totalTime = recentMetrics.reduce(
      (sum: number, m: RequestMetrics) => sum + m.responseTimeMs,
      0,
    );
    const tokensPerSecond = totalTime > 0 ? totalTokens / (totalTime / 1000) : 0;

    return {
      enabled: this.featureEnabled,
      installed: this.isInstalled(),
      running: isRunning,
      ready: isReady,
      currentModel: this.currentModel,
      modelLoaded: isReady && this.currentModel !== null,
      loadingModel: this.loadingModel,
      error: this.lastError,
      resources,
      serverPid: this.serverProcess?.pid,
      lastStartedAt: this.lastStartedAt || undefined,
      metrics: {
        tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime),
        totalRequests: this.requestMetrics.length,
        lastRequestAt: this.requestMetrics[this.requestMetrics.length - 1]?.timestamp,
      },
    };
  }

  /**
   * Toggle feature on/off
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.featureEnabled = enabled;
    log.info(`Llama feature ${enabled ? "enabled" : "disabled"}`);

    if (!enabled) {
      this.lastError = null;
      if (await this.isRunning()) {
        await this.stop();
      }
    }
  }

  /**
   * Get binary path
   */
  private getBinaryPath(): string {
    const binName = platform() === "win32" ? "llama-server.exe" : "llama-server";
    return join(this.llamaCppDir, binName);
  }

  /**
   * Install llama.cpp with platform detection
   */
  async install(): Promise<{ success: boolean; message: string }> {
    const os = platform();
    const arch = process.arch;

    log.info(`Installing llama.cpp for ${os} (${arch})...`);
    this.lastError = null;

    try {
      // Map platform/arch to correct binary
      const version = "b3748";
      let downloadUrl: string;
      let binaryName: string;

      if (os === "darwin") {
        binaryName = "llama-server";
        if (arch === "arm64") {
          // Apple Silicon
          downloadUrl = `https://github.com/ggerganov/llama.cpp/releases/download/${version}/llama-${version}-bin-macos-arm64.zip`;
        } else {
          // Intel Mac
          downloadUrl = `https://github.com/ggerganov/llama.cpp/releases/download/${version}/llama-${version}-bin-macos-x64.zip`;
        }
      } else if (os === "linux") {
        binaryName = "llama-server";
        if (arch === "arm64") {
          downloadUrl = `https://github.com/ggerganov/llama.cpp/releases/download/${version}/llama-${version}-bin-ubuntu-aarch64.zip`;
        } else {
          downloadUrl = `https://github.com/ggerganov/llama.cpp/releases/download/${version}/llama-${version}-bin-ubuntu-x64.zip`;
        }
      } else if (os === "win32") {
        binaryName = "llama-server.exe";
        // Use CUDA version for best performance on Windows
        downloadUrl = `https://github.com/ggerganov/llama.cpp/releases/download/${version}/llama-${version}-bin-win-cuda-cu12.4-x64.zip`;
      } else {
        throw new Error(`Unsupported platform: ${os} ${arch}`);
      }

      log.info(`Downloading llama.cpp from ${downloadUrl}...`);

      // Download to temp file
      const tempZip = join(this.llamaCppDir, "download.zip");
      await this.downloadFile(downloadUrl, tempZip, (progress) => {
        log.info(`Download progress: ${progress.percent}%`);
      });

      log.info("Extracting llama.cpp...");

      // Extract
      const { execSync } = await import("child_process");
      if (os === "win32") {
        execSync(
          `powershell -command "Expand-Archive -Path '${tempZip}' -DestinationPath '${this.llamaCppDir}' -Force"`,
          {
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
      } else {
        execSync(`unzip -o "${tempZip}" -d "${this.llamaCppDir}"`, {
          stdio: ["ignore", "pipe", "pipe"],
        });
      }

      // Make binary executable on Unix
      if (os !== "win32") {
        const binaryPath = join(this.llamaCppDir, binaryName);
        execSync(`chmod +x "${binaryPath}"`);

        // Verify binary works
        try {
          execSync(`"${binaryPath}" --version`, { stdio: "pipe" });
          log.info("Binary verified successfully");
        } catch {
          log.warn("Binary verification failed, but continuing anyway");
        }
      }

      // Clean up
      rmSync(tempZip, { force: true });

      log.info("llama.cpp installed successfully");
      return { success: true, message: "llama.cpp installed successfully" };
    } catch (err: any) {
      const message = `Installation failed: ${err.message || err}`;
      log.error(message);
      this.lastError = message;
      return { success: false, message };
    }
  }

  /**
   * Start the server with a specific model - Optimized settings
   */
  async start(modelName: string = PRIMARY_MODEL.name): Promise<void> {
    if (!this.featureEnabled) {
      throw new Error("Feature is disabled. Enable it first in settings.");
    }

    // Check if already running
    const alreadyRunning = await this.isRunning();
    if (alreadyRunning) {
      if (this.currentModel === modelName) {
        log.info("Server already running with this model");
        return;
      }
      // Stop current server to switch model
      log.info(`Switching model from ${this.currentModel} to ${modelName}`);
      await this.stop();
    }

    // Find and validate model
    const model = ALL_MODELS.find((m) => m.name === modelName);
    if (!model) {
      throw new Error(`Model "${modelName}" not found`);
    }

    const modelPath = join(this.modelsDir, model.filename);
    if (!existsSync(modelPath)) {
      throw new Error(`Model "${model.displayName}" not installed. Please download it first.`);
    }

    const binaryPath = this.getBinaryPath();
    if (!existsSync(binaryPath)) {
      throw new Error("llama.cpp not installed. Please run installation first.");
    }

    log.info(`Starting llama.cpp server with ${model.displayName}...`);
    this.loadingModel = true;
    this.lastError = null;
    this.lastStartedAt = Date.now();

    try {
      // Optimized args for Llama 3.2:3b
      const numThreads = Math.min(4, cpus().length);
      const args = [
        "-m",
        modelPath,
        "--host",
        "127.0.0.1",
        "--port",
        "11434",
        "-c",
        model.contextLength.toString(),
        "--ctx-size",
        model.contextLength.toString(),
        "-n",
        "2048", // Max tokens to generate
        "--parallel",
        "1",
        "--batch-size",
        "512",
        "--ubatch-size",
        "512",
        "--threads",
        numThreads.toString(),
        "--threads-batch",
        numThreads.toString(),
        "--mlock", // Lock memory
        "--flash-attn", // Flash attention for speed
        "--metrics", // Enable metrics endpoint
      ];

      // Add Metal GPU support for macOS
      if (platform() === "darwin") {
        args.push("-ngl", "99"); // Use all GPU layers on Apple Silicon
      }

      log.info(`Starting with args: ${args.join(" ")}`);

      this.serverProcess = spawn(binaryPath, args, {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
        cwd: this.llamaCppDir,
      });

      this.currentModel = modelName;

      // Capture output for debugging
      let startupOutput = "";
      this.serverProcess.stdout?.on("data", (data) => {
        const line = data.toString().trim();
        startupOutput += line + "\n";
        if (startupOutput.length > 5000) {
          startupOutput = startupOutput.slice(-5000); // Keep last 5KB
        }
        log.debug(`[llama.cpp] ${line}`);
      });

      this.serverProcess.stderr?.on("data", (data) => {
        const line = data.toString().trim();
        startupOutput += line + "\n";
        if (startupOutput.length > 5000) {
          startupOutput = startupOutput.slice(-5000);
        }
        log.debug(`[llama.cpp] ${line}`);
      });

      // Handle unexpected exit
      this.serverProcess.on("exit", (code, signal) => {
        const wasLoading = this.loadingModel;
        this.loadingModel = false;
        this.serverProcess = null;

        if (this.currentModel === modelName) {
          this.currentModel = null;
        }

        if (code !== 0 && code !== null) {
          const error = `llama.cpp server exited with code ${code}. Output: ${startupOutput.slice(-1000)}`;
          log.error(error);
          if (wasLoading) {
            this.lastError = `Server failed to start (code ${code}). Check logs for details.`;
          }
        } else {
          log.info(`llama.cpp server stopped (signal: ${signal})`);
        }
      });

      // Wait for server to be ready with timeout
      log.info("Waiting for server to be ready...");
      await this.waitForReady(45000);

      this.loadingModel = false;
      log.info("llama.cpp server is ready and responding");
    } catch (err: any) {
      this.loadingModel = false;
      this.serverProcess = null;
      this.currentModel = null;
      this.lastError = err.message || "Failed to start server";
      throw err;
    }
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    if (!this.serverProcess && !(await this.isRunning())) {
      log.debug("Server already stopped");
      return;
    }

    log.info("Stopping llama.cpp server...");
    this.loadingModel = false;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        log.warn("Server didn't stop gracefully, forcing kill...");
        try {
          this.serverProcess?.kill("SIGKILL");
        } catch {
          // Ignore
        }
        this.serverProcess = null;
        this.currentModel = null;
        resolve();
      }, 8000);

      if (this.serverProcess) {
        this.serverProcess.once("exit", () => {
          clearTimeout(timeout);
          this.serverProcess = null;
          this.currentModel = null;
          log.info("Server stopped successfully");
          resolve();
        });

        // Try graceful shutdown first
        this.serverProcess.kill("SIGTERM");
      } else {
        // External server, can't stop it
        clearTimeout(timeout);
        this.currentModel = null;
        resolve();
      }
    });
  }

  /**
   * Download a model with progress tracking
   */
  async downloadModel(
    modelName: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    const model = ALL_MODELS.find((m) => m.name === modelName);
    if (!model) {
      throw new Error(`Model "${modelName}" not found`);
    }

    const modelPath = join(this.modelsDir, model.filename);
    const tempPath = `${modelPath}.download`;

    // Check if already exists and is complete
    if (existsSync(modelPath)) {
      try {
        const stats = statSync(modelPath);
        if (stats.size >= model.sizeBytes * 0.95) {
          // Allow 5% tolerance
          log.info(`Model ${model.displayName} already exists (${this.formatSize(stats.size)})`);
          return;
        } else {
          log.warn(
            `Model file incomplete (${stats.size} vs ${model.sizeBytes}), re-downloading...`,
          );
          rmSync(modelPath, { force: true });
        }
      } catch {
        // Continue with download
      }
    }

    // Clean up any partial download
    if (existsSync(tempPath)) {
      rmSync(tempPath, { force: true });
    }

    log.info(`Starting download of ${model.displayName} (${this.formatSize(model.sizeBytes)})...`);

    // Initialize progress
    const progress: DownloadProgress = {
      status: "downloading",
      percent: 0,
      downloadedBytes: 0,
      totalBytes: model.sizeBytes,
      speed: "0 MB/s",
    };
    this.downloadProgressMap.set(modelName, progress);

    try {
      const _startTime = Date.now();
      const response = await fetch(model.ggufUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OpenClaw/1.0)",
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
      }

      const totalBytes = parseInt(response.headers.get("content-length") || "0") || model.sizeBytes;
      progress.totalBytes = totalBytes;

      const fileStream = createWriteStream(tempPath);
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("No response body available");
      }

      let downloadedBytes = 0;
      let lastUpdate = Date.now();
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        fileStream.write(Buffer.from(value));
        downloadedBytes += value.length;

        // Update progress every 200ms
        const now = Date.now();
        if (now - lastUpdate > 200) {
          const elapsed = (now - lastUpdate) / 1000;
          const bytesDiff = downloadedBytes - lastBytes;
          const speed = bytesDiff / elapsed / (1024 * 1024); // MB/s
          const remaining = totalBytes - downloadedBytes;
          const etaSeconds = speed > 0 ? remaining / (speed * 1024 * 1024) : 0;

          progress.downloadedBytes = downloadedBytes;
          progress.percent = Math.min(99, Math.round((downloadedBytes / totalBytes) * 100));
          progress.speed = `${speed.toFixed(1)} MB/s`;
          progress.eta =
            etaSeconds > 60
              ? `${Math.round(etaSeconds / 60)}m ${Math.round(etaSeconds % 60)}s`
              : `${Math.round(etaSeconds)}s`;

          onProgress?.(progress);
          lastUpdate = now;
          lastBytes = downloadedBytes;
        }
      }

      // Close file stream
      await new Promise((resolve, reject) => {
        fileStream.end(() => resolve(undefined));
        fileStream.on("error", reject);
      });

      // Verify file size
      const finalStats = statSync(tempPath);
      if (finalStats.size < totalBytes * 0.95) {
        throw new Error(
          `Download incomplete: ${finalStats.size} bytes downloaded, expected ${totalBytes}`,
        );
      }

      // Move temp file to final location
      progress.status = "verifying";
      progress.percent = 100;
      onProgress?.(progress);

      renameSync(tempPath, modelPath);

      progress.status = "completed";
      onProgress?.(progress);

      log.info(
        `Downloaded ${model.displayName} successfully (${this.formatSize(finalStats.size)})`,
      );
    } catch (err: any) {
      progress.status = "error";
      progress.error = err.message || "Download failed";
      this.downloadProgressMap.set(modelName, progress);

      // Clean up temp file
      try {
        if (existsSync(tempPath)) {
          rmSync(tempPath, { force: true });
        }
      } catch {
        // Ignore cleanup errors
      }

      throw err;
    } finally {
      // Keep progress for a bit, then clean up
      setTimeout(() => {
        this.downloadProgressMap.delete(modelName);
      }, 30000);
    }
  }

  /**
   * Get download progress for a model
   */
  getDownloadProgress(modelName: string): DownloadProgress | null {
    return this.downloadProgressMap.get(modelName) || null;
  }

  /**
   * List all available models with installation status
   */
  listModels(): LlamaModel[] {
    return ALL_MODELS.map((m) => {
      const modelPath = join(this.modelsDir, m.filename);
      let installed = false;
      let actualSize = 0;

      try {
        if (existsSync(modelPath)) {
          const stats = statSync(modelPath);
          installed = stats.size >= m.sizeBytes * 0.95;
          actualSize = stats.size;
        }
      } catch {
        // File doesn't exist or can't be accessed
      }

      return {
        name: m.name,
        displayName: m.displayName,
        filename: m.filename,
        sizeBytes: actualSize || m.sizeBytes,
        quantization: m.quantization,
        contextLength: m.contextLength,
        installed,
        path: modelPath,
        downloadProgress: this.downloadProgressMap.get(m.name),
      };
    });
  }

  /**
   * Delete a model file
   */
  async deleteModel(modelName: string): Promise<void> {
    const model = ALL_MODELS.find((m) => m.name === modelName);
    if (!model) {
      throw new Error(`Model "${modelName}" not found`);
    }

    const modelPath = join(this.modelsDir, model.filename);
    if (!existsSync(modelPath)) {
      throw new Error(`Model "${model.displayName}" not found`);
    }

    // Stop server if using this model
    if (this.currentModel === modelName && (await this.isRunning())) {
      log.info(`Stopping server before removing model ${model.displayName}...`);
      await this.stop();
    }

    try {
      rmSync(modelPath, { force: true });
      log.info(`Deleted model ${model.displayName}`);
    } catch (err: any) {
      throw new Error(`Failed to delete model: ${err.message}`, { cause: err });
    }
  }

  /**
   * Get resource usage of the server process
   */
  private async getResourceUsage(): Promise<{
    memoryMB: number;
    memoryGB: string;
    cpuUsage: number;
  }> {
    const os = platform();

    try {
      // Try to get PID from our process first, then check external
      let pid: number | undefined;

      if (this.serverProcess?.pid) {
        pid = this.serverProcess.pid;
      } else {
        // Try to find external llama-server process
        const { execSync } = await import("child_process");
        if (os === "darwin" || os === "linux") {
          try {
            const result = execSync("pgrep -x llama-server", { encoding: "utf8" }).trim();
            if (result) {
              pid = parseInt(result.split("\n")[0]);
            }
          } catch {
            // No process found
          }
        }
      }

      if (pid) {
        if (os === "darwin" || os === "linux") {
          const { execSync } = await import("child_process");
          // Get RSS memory in KB
          const stdout = execSync(`ps -o rss= -p ${pid}`, { encoding: "utf8" });
          const memKB = parseInt(stdout.trim()) || 0;
          const memMB = Math.round(memKB / 1024);

          return {
            memoryMB: memMB,
            memoryGB: `${(memMB / 1024).toFixed(2)} GB`,
            cpuUsage: 0, // Could add CPU monitoring later
          };
        }
      }
    } catch {
      // Ignore errors
    }

    return {
      memoryMB: 0,
      memoryGB: "0 GB",
      cpuUsage: 0,
    };
  }

  /**
   * Record request metrics
   */
  recordRequestMetrics(tokensGenerated: number, responseTimeMs: number): void {
    this.requestMetrics.push({
      tokensGenerated,
      responseTimeMs,
      timestamp: Date.now(),
    });

    // Keep only recent metrics
    if (this.requestMetrics.length > this.maxMetricsHistory) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get recent metrics
   */
  private getRecentMetrics(count: number): RequestMetrics[] {
    return this.requestMetrics.slice(-count);
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(): { allowed: boolean; retryAfter?: number } {
    if (!this.rateLimitConfig.enabled) {
      return { allowed: true };
    }

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute ago

    // Remove old timestamps outside the window
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > windowStart);

    // Check burst limit (immediate requests)
    const recentRequests = this.requestTimestamps.filter((ts) => ts > now - 1000).length;
    if (recentRequests >= this.rateLimitConfig.burstSize) {
      return { allowed: false, retryAfter: 1 };
    }

    // Check rate limit (requests per minute)
    if (this.requestTimestamps.length >= this.rateLimitConfig.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const retryAfter = Math.ceil((oldestRequest + 60000 - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Record this request
    this.requestTimestamps.push(now);
    return { allowed: true };
  }

  /**
   * Configure rate limiting
   */
  configureRateLimit(config: {
    enabled?: boolean;
    requestsPerMinute?: number;
    burstSize?: number;
  }): void {
    if (config.enabled !== undefined) {
      this.rateLimitConfig.enabled = config.enabled;
    }
    if (config.requestsPerMinute !== undefined) {
      this.rateLimitConfig.requestsPerMinute = config.requestsPerMinute;
    }
    if (config.burstSize !== undefined) {
      this.rateLimitConfig.burstSize = config.burstSize;
    }
    log.info(
      `Rate limit configured: ${this.rateLimitConfig.requestsPerMinute} req/min, burst: ${this.rateLimitConfig.burstSize}`,
    );
  }

  /**
   * Auto-detect GPU capabilities
   */
  async detectGPU(): Promise<void> {
    const os = platform();

    // macOS Metal detection
    if (os === "darwin") {
      try {
        const { execSync } = await import("child_process");
        const result = execSync('system_profiler SPDisplaysDataType | grep "Metal"', {
          encoding: "utf8",
        });
        this.hardwareConfig.useMetal = result.includes("Metal");
        log.info(`Metal GPU ${this.hardwareConfig.useMetal ? "detected" : "not detected"}`);
      } catch {
        this.hardwareConfig.useMetal = false;
      }
    }

    // CUDA detection (Linux/Windows)
    if (os === "linux" || os === "win32") {
      try {
        const { execSync } = await import("child_process");
        if (os === "linux") {
          execSync("nvidia-smi", { stdio: "ignore" });
          this.hardwareConfig.useCUDA = true;
          log.info("CUDA GPU detected");
        } else {
          execSync("nvidia-smi", { stdio: "ignore" });
          this.hardwareConfig.useCUDA = true;
          log.info("CUDA GPU detected on Windows");
        }
      } catch {
        this.hardwareConfig.useCUDA = false;
      }
    }
  }

  /**
   * Configure hardware settings
   */
  configureHardware(config: {
    useGPU?: boolean;
    gpuLayers?: number;
    threads?: number;
    useMetal?: boolean;
    useCUDA?: boolean;
  }): void {
    if (config.useGPU !== undefined) {
      this.hardwareConfig.useGPU = config.useGPU;
    }
    if (config.gpuLayers !== undefined) {
      this.hardwareConfig.gpuLayers = config.gpuLayers;
    }
    if (config.threads !== undefined) {
      this.hardwareConfig.threads = config.threads;
    }
    if (config.useMetal !== undefined) {
      this.hardwareConfig.useMetal = config.useMetal;
    }
    if (config.useCUDA !== undefined) {
      this.hardwareConfig.useCUDA = config.useCUDA;
    }

    // Restart server if running to apply changes
    this.isRunning().then((running) => {
      if (running) {
        log.info("Hardware config changed, restarting server...");
        this.stop().then(() => {
          if (this.currentModel) {
            this.start(this.currentModel);
          }
        });
      }
    });
  }

  /**
   * Get hardware configuration
   */
  getHardwareConfig() {
    return { ...this.hardwareConfig };
  }

  /**
   * Get chat context for a session
   */
  getChatContext(sessionId: string): Array<{ role: string; content: string }> {
    return this.chatContexts.get(sessionId) || [];
  }

  /**
   * Set chat context for a session
   */
  setChatContext(sessionId: string, context: Array<{ role: string; content: string }>): void {
    // Trim context to max length
    let trimmedContext = context;
    if (context.length > this.maxContextLength) {
      trimmedContext = context.slice(-this.maxContextLength);
    }

    // Estimate tokens (rough approximation: ~4 chars per token)
    let totalChars = trimmedContext.reduce((sum, msg) => sum + msg.content.length, 0);
    while (totalChars > this.maxContextTokens * 4 && trimmedContext.length > 1) {
      trimmedContext.shift();
      totalChars = trimmedContext.reduce((sum, msg) => sum + msg.content.length, 0);
    }

    this.chatContexts.set(sessionId, trimmedContext);

    // Clean up old sessions (keep only last 50)
    if (this.chatContexts.size > 50) {
      const oldestKey = this.chatContexts.keys().next().value;
      if (oldestKey) {
        this.chatContexts.delete(oldestKey);
      }
    }
  }

  /**
   * Clear chat context for a session
   */
  clearChatContext(sessionId: string): void {
    this.chatContexts.delete(sessionId);
  }

  /**
   * Generate text with context
   */
  async generate(
    prompt: string,
    options?: {
      sessionId?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    },
  ): Promise<{
    text: string;
    tokensGenerated: number;
    responseTimeMs: number;
    fromCache?: boolean;
  }> {
    // Check rate limit
    const rateCheck = this.checkRateLimit();
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}s`);
    }

    // Ensure server is running
    if (!(await this.isRunning())) {
      if (!this.featureEnabled) {
        throw new Error("Local LLM feature is disabled");
      }
      if (!this.isInstalled()) {
        throw new Error("llama.cpp is not installed");
      }
      if (!this.isPrimaryModelInstalled()) {
        throw new Error("Llama 3.2:3b model is not installed");
      }

      // Auto-start if possible
      log.info("Server not running, auto-starting...");
      await this.start();
    }

    const startTime = Date.now();
    const sessionId = options?.sessionId || "default";

    // Get context
    let context = this.getChatContext(sessionId);

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];

    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    } else {
      messages.push({
        role: "system",
        content: "You are a helpful AI assistant. Be concise and accurate.",
      });
    }

    // Add context history
    messages.push(...context);

    // Add current prompt
    messages.push({ role: "user", content: prompt });

    try {
      // Call llama.cpp server
      const response = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.currentModel || PRIMARY_MODEL.name,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000), // 2 minute timeout
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Generation failed: ${error}`);
      }

      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || "";
      const tokensGenerated = data.usage?.completion_tokens || Math.ceil(generatedText.length / 4);

      const responseTimeMs = Date.now() - startTime;

      // Update context with the exchange
      context.push({ role: "user", content: prompt });
      context.push({ role: "assistant", content: generatedText });
      this.setChatContext(sessionId, context);

      // Record metrics
      this.recordRequestMetrics(tokensGenerated, responseTimeMs);

      return {
        text: generatedText,
        tokensGenerated,
        responseTimeMs,
      };
    } catch (err: any) {
      // Check if it's a timeout or connection error - mark for fallback
      if (err.name === "TimeoutError" || err.message?.includes("fetch failed")) {
        throw new Error(`LOCAL_LLM_UNAVAILABLE: ${err.message}`, { cause: err });
      }
      throw err;
    }
  }

  /**
   * Wait for server to be ready with retries
   */
  private async waitForReady(timeoutMs: number): Promise<void> {
    const start = Date.now();
    const checkInterval = 500; // Check every 500ms
    let lastError: string | null = null;

    while (Date.now() - start < timeoutMs) {
      try {
        const response = await fetch("http://127.0.0.1:11434/health", {
          signal: AbortSignal.timeout(checkInterval),
        });

        if (response.ok) {
          // Also check if model is loaded by calling completions endpoint
          try {
            const testResponse = await fetch("http://127.0.0.1:11434/v1/models", {
              signal: AbortSignal.timeout(1000),
            });
            if (testResponse.ok) {
              return;
            }
          } catch {
            // Model not loaded yet, continue waiting
          }
        }
      } catch (err: any) {
        lastError = err.message;
      }

      await new Promise((r) => setTimeout(r, checkInterval));
    }

    throw new Error(
      `Server failed to become ready within ${timeoutMs}ms. Last error: ${lastError || "timeout"}`,
    );
  }

  /**
   * Download file with progress
   */
  private async downloadFile(
    url: string,
    dest: string,
    onProgress?: (progress: { percent: number; speed: string }) => void,
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    const totalBytes = parseInt(response.headers.get("content-length") || "0");
    const fileStream = createWriteStream(dest);
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("No response body");
    }

    let downloadedBytes = 0;
    let lastUpdate = Date.now();
    let lastBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      fileStream.write(Buffer.from(value));
      downloadedBytes += value.length;

      const now = Date.now();
      if (now - lastUpdate > 1000 && totalBytes > 0) {
        const elapsed = (now - lastUpdate) / 1000;
        const speed = (downloadedBytes - lastBytes) / elapsed / (1024 * 1024);
        const percent = Math.round((downloadedBytes / totalBytes) * 100);

        onProgress?.({ percent, speed: `${speed.toFixed(1)} MB/s` });
        lastUpdate = now;
        lastBytes = downloadedBytes;
      }
    }

    await new Promise((resolve, reject) => {
      fileStream.end(() => resolve(undefined));
      fileStream.on("error", reject);
    });
  }

  /**
   * Uninstall llama.cpp completely
   */
  async uninstall(): Promise<{ success: boolean; message: string }> {
    try {
      log.info("Uninstalling llama.cpp...");

      // Stop server if running
      if (await this.isRunning()) {
        await this.stop();
      }

      // Remove binary directory
      if (existsSync(this.llamaCppDir)) {
        rmSync(this.llamaCppDir, { recursive: true, force: true });
      }

      this.lastError = null;
      log.info("llama.cpp uninstalled");
      return { success: true, message: "llama.cpp uninstalled successfully" };
    } catch (err: any) {
      const message = `Uninstall failed: ${err.message || err}`;
      log.error(message);
      return { success: false, message };
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) {
      return "0 B";
    }
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(0)} MB`;
    }
    return `${bytes} B`;
  }

  /**
   * Check if primary model (Llama 3.2:3b) is installed
   */
  isPrimaryModelInstalled(): boolean {
    const modelPath = join(this.modelsDir, PRIMARY_MODEL.filename);
    try {
      if (existsSync(modelPath)) {
        const stats = statSync(modelPath);
        return stats.size >= PRIMARY_MODEL.sizeBytes * 0.95;
      }
    } catch {
      // Ignore
    }
    return false;
  }

  /**
   * Get primary model status
   */
  getPrimaryModelStatus(): { installed: boolean; size: number; path: string } {
    const modelPath = join(this.modelsDir, PRIMARY_MODEL.filename);
    let size = 0;
    let installed = false;

    try {
      if (existsSync(modelPath)) {
        const stats = statSync(modelPath);
        size = stats.size;
        installed = size >= PRIMARY_MODEL.sizeBytes * 0.95;
      }
    } catch {
      // Ignore
    }

    return { installed, size, path: modelPath };
  }
}

// Singleton instance
let llamaService: LlamaCppService | null = null;

export function getLlamaService(): LlamaCppService {
  if (!llamaService) {
    llamaService = new LlamaCppService();
  }
  return llamaService;
}

export function resetLlamaService(): void {
  if (llamaService) {
    llamaService.stop();
    llamaService.stopHeartbeat();
    llamaService = null;
  }
}
