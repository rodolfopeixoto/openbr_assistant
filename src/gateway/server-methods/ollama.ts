import type { GatewayRequestHandlers } from "./types.js";
import { getOllamaManager } from "../../services/ollama-manager.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export interface OllamaFullStatus {
  enabled: boolean;
  installed: boolean;
  running: boolean;
  available: boolean;
  version: string | null;
  platform: string;
  resources: {
    cpu: number;
    memory: number;
    memoryGB: string;
    gpu?: number;
    gpuVRAM?: string;
  };
  models: Array<{
    name: string;
    size: string;
    sizeBytes: number;
    modified: string;
    digest: string;
    details: {
      format: string;
      family: string;
      families: string[];
      parameterSize: string;
      quantizationLevel: string;
    };
  }>;
  config: {
    defaultModel: string;
    autoStart: boolean;
    gpuAcceleration: boolean;
    port: number;
  };
  featureFlag: {
    enabled: boolean;
    defaultState: boolean;
    ramUsage: string;
  };
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
  percent?: number;
}

// Configuration
let featureFlagEnabled = false; // Default OFF to save RAM
let config = {
  defaultModel: "llama3.2:3b",
  autoStart: false,
  gpuAcceleration: true,
  port: 11434,
};

// Active pull operations with progress tracking
const activePulls: Map<
  string,
  {
    progress: PullProgress;
    callbacks: ((progress: PullProgress) => void)[];
  }
> = new Map();

export const ollamaHandlers: GatewayRequestHandlers = {
  "ollama.status": async ({ respond }) => {
    try {
      const manager = getOllamaManager();
      const systemInfo = await manager.getSystemInfo();
      const models = systemInfo.running ? await manager.listModels() : [];

      const status: OllamaFullStatus = {
        enabled: featureFlagEnabled,
        installed: systemInfo.installed,
        running: systemInfo.running,
        available: systemInfo.running,
        version: systemInfo.version,
        platform: systemInfo.platform,
        resources: systemInfo.resources,
        models: models.map((m) => ({
          name: m.name,
          size: m.size,
          sizeBytes: m.sizeBytes,
          modified: m.modified,
          digest: m.digest,
          details: {
            format: m.details?.format || "gguf",
            family: m.details?.family || "unknown",
            families: m.details?.families || [],
            parameterSize: m.details?.parameter_size || "unknown",
            quantizationLevel: m.details?.quantization_level || "unknown",
          },
        })),
        config,
        featureFlag: {
          enabled: featureFlagEnabled,
          defaultState: false,
          ramUsage: "~2GB RAM",
        },
      };

      respond(true, status);
    } catch (err) {
      console.error("[Ollama] Status error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get Ollama status",
        ),
      );
    }
  },

  "ollama.feature-toggle": async ({ params, respond }) => {
    try {
      const { enabled } = params as { enabled: boolean };
      featureFlagEnabled = enabled;

      if (enabled) {
        // Auto-start if enabled and configured
        const manager = getOllamaManager();
        if (config.autoStart && !(await manager.isRunning())) {
          try {
            await manager.start();
          } catch (err) {
            console.error("[Ollama] Auto-start failed:", err);
          }
        }
      }

      respond(true, {
        ok: true,
        enabled: featureFlagEnabled,
        message: enabled
          ? "Ollama enabled. Uses ~2GB RAM when running."
          : "Ollama disabled. RAM freed.",
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to toggle feature",
        ),
      );
    }
  },

  "ollama.install": async ({ respond }) => {
    try {
      const manager = getOllamaManager();
      const result = await manager.install();
      respond(true, result);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to install Ollama",
        ),
      );
    }
  },

  "ollama.uninstall": async ({ respond }) => {
    try {
      const manager = getOllamaManager();
      const result = await manager.uninstall();
      respond(true, result);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to uninstall Ollama",
        ),
      );
    }
  },

  "ollama.start": async ({ respond }) => {
    try {
      if (!featureFlagEnabled) {
        respond(false, undefined, {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Ollama feature is disabled. Enable it first.",
        });
        return;
      }

      const manager = getOllamaManager();
      await manager.start();
      respond(true, { ok: true, running: true });
    } catch (err) {
      console.error("[Ollama] Start error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to start Ollama",
        ),
      );
    }
  },

  "ollama.stop": async ({ respond }) => {
    try {
      const manager = getOllamaManager();
      await manager.stop();
      respond(true, { ok: true, running: false });
    } catch (err) {
      console.error("[Ollama] Stop error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to stop Ollama",
        ),
      );
    }
  },

  "ollama.models": async ({ respond }) => {
    try {
      const manager = getOllamaManager();
      const available = await manager.isAvailable();

      if (!available) {
        respond(true, { models: [] });
        return;
      }

      const models = await manager.listModels();
      respond(true, {
        models: models.map((m) => ({
          name: m.name,
          size: m.size,
          sizeBytes: m.sizeBytes,
          modified: m.modified,
          digest: m.digest,
          details: {
            format: m.details?.format || "gguf",
            family: m.details?.family || "unknown",
            families: m.details?.families || [],
            parameterSize: m.details?.parameter_size || "unknown",
            quantizationLevel: m.details?.quantization_level || "unknown",
          },
        })),
      });
    } catch (err) {
      console.error("[Ollama] Models error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to list models",
        ),
      );
    }
  },

  "ollama.pull": async ({ params, respond }) => {
    const { model } = params as { model: string };
    try {
      if (!featureFlagEnabled) {
        respond(false, undefined, {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Ollama feature is disabled. Enable it first.",
        });
        return;
      }

      const manager = getOllamaManager();

      // Initialize progress tracking
      activePulls.set(model, {
        progress: { status: "starting", percent: 0 },
        callbacks: [],
      });

      // Start pull in background with progress tracking
      manager
        .pullModel(model, (progress) => {
          const pullInfo = activePulls.get(model);
          if (pullInfo) {
            pullInfo.progress = progress;
          }
        })
        .then(() => {
          const pullInfo = activePulls.get(model);
          if (pullInfo) {
            pullInfo.progress = { status: "completed", percent: 100 };
          }
        })
        .catch((err) => {
          console.error(`[Ollama] Pull failed for ${model}:`, err);
          const pullInfo = activePulls.get(model);
          if (pullInfo) {
            pullInfo.progress = { status: "error", percent: 0 };
          }
        });

      respond(true, {
        ok: true,
        model,
        status: "downloading",
        progress: 0,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to pull model",
        ),
      );
    }
  },

  "ollama.pull-progress": async ({ params, respond }) => {
    const { model } = params as { model: string };
    const pullInfo = activePulls.get(model);

    if (!pullInfo) {
      respond(true, { status: "not_found", percent: 0 });
      return;
    }

    respond(true, pullInfo.progress);
  },

  "ollama.remove": async ({ params, respond }) => {
    const { model } = params as { model: string };
    try {
      const manager = getOllamaManager();
      await manager.deleteModel(model);
      respond(true, { ok: true, model });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to remove model",
        ),
      );
    }
  },

  "ollama.configure": async ({ params, respond }) => {
    try {
      const { defaultModel, autoStart, gpuAcceleration, port } = params as {
        defaultModel?: string;
        autoStart?: boolean;
        gpuAcceleration?: boolean;
        port?: number;
      };

      if (defaultModel) {
        config.defaultModel = defaultModel;
      }
      if (autoStart !== undefined) {
        config.autoStart = autoStart;
      }
      if (gpuAcceleration !== undefined) {
        config.gpuAcceleration = gpuAcceleration;
      }
      if (port) {
        config.port = port;
      }

      respond(true, { ok: true, config });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to configure Ollama",
        ),
      );
    }
  },

  "ollama.resources": async ({ respond }) => {
    try {
      const manager = getOllamaManager();
      const resources = await manager.getResourceUsage();
      respond(true, resources);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get resource usage",
        ),
      );
    }
  },
};
