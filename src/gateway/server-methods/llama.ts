import type { GatewayRequestHandlers } from "./types.js";
import { getLlamaService, PRIMARY_MODEL } from "../../services/llama-cpp.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export interface LlamaFullStatus {
  enabled: boolean;
  installed: boolean;
  running: boolean;
  ready: boolean;
  currentModel: string | null;
  modelLoaded: boolean;
  resources: {
    memoryMB: number;
    memoryGB: string;
    cpuUsage: number;
  };
  models: Array<{
    name: string;
    displayName: string;
    sizeBytes: number;
    installed: boolean;
    quantization: string;
    contextLength: number;
  }>;
  primaryModel: {
    name: string;
    displayName: string;
    sizeBytes: number;
    description: string;
    tags: string[];
    installed: boolean;
  };
  featureFlag: {
    enabled: boolean;
    defaultState: boolean;
    ramUsage: string;
  };
  metrics?: {
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

// Active download tracking
const activeDownloads: Map<string, DownloadProgress> = new Map();

export const llamaHandlers: GatewayRequestHandlers = {
  "llama.status": async ({ respond }) => {
    try {
      const service = getLlamaService();
      const status = await service.getStatus();
      const models = service.listModels();

      const fullStatus: LlamaFullStatus = {
        enabled: status.enabled,
        installed: status.installed,
        running: status.running,
        ready: status.ready,
        currentModel: status.currentModel,
        modelLoaded: status.modelLoaded,
        resources: status.resources,
        models: models.map((m) => ({
          name: m.name,
          displayName: m.displayName,
          sizeBytes: m.sizeBytes,
          installed: m.installed,
          quantization: m.quantization,
          contextLength: m.contextLength,
        })),
        primaryModel: {
          name: PRIMARY_MODEL.name,
          displayName: PRIMARY_MODEL.displayName,
          sizeBytes: PRIMARY_MODEL.sizeBytes,
          description: PRIMARY_MODEL.description,
          tags: PRIMARY_MODEL.tags,
          installed: models.find((m) => m.name === PRIMARY_MODEL.name)?.installed || false,
        },
        featureFlag: {
          enabled: status.enabled,
          defaultState: false,
          ramUsage: "~1.8GB RAM (vs ~2.5GB with Ollama)",
        },
      };

      respond(true, fullStatus);
    } catch (err) {
      console.error("[Llama] Status error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get status",
        ),
      );
    }
  },

  "llama.feature-toggle": async ({ params, respond }) => {
    try {
      const { enabled } = params as { enabled: boolean };
      const service = getLlamaService();
      service.setEnabled(enabled);

      respond(true, {
        ok: true,
        enabled,
        message: enabled
          ? "Llama feature enabled. Uses ~1.8GB RAM."
          : "Llama feature disabled. RAM freed.",
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

  "llama.install": async ({ respond }) => {
    try {
      const service = getLlamaService();
      const result = await service.install();
      respond(true, result);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to install",
        ),
      );
    }
  },

  "llama.uninstall": async ({ respond }) => {
    try {
      const service = getLlamaService();
      const result = await service.uninstall();
      respond(true, result);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to uninstall",
        ),
      );
    }
  },

  "llama.start": async ({ params, respond }) => {
    try {
      const { model } = params as { model?: string };
      const service = getLlamaService();
      await service.start(model || PRIMARY_MODEL.name);
      respond(true, { ok: true, running: true, model: model || PRIMARY_MODEL.name });
    } catch (err) {
      console.error("[Llama] Start error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to start server",
        ),
      );
    }
  },

  "llama.stop": async ({ respond }) => {
    try {
      const service = getLlamaService();
      await service.stop();
      respond(true, { ok: true, running: false });
    } catch (err) {
      console.error("[Llama] Stop error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to stop server",
        ),
      );
    }
  },

  "llama.models": async ({ respond }) => {
    try {
      const service = getLlamaService();
      const models = service.listModels();
      respond(true, { models });
    } catch (err) {
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

  "llama.download": async ({ params, respond }) => {
    const { model } = params as { model: string };
    try {
      const service = getLlamaService();

      // Initialize progress tracking
      activeDownloads.set(model, {
        status: "downloading",
        percent: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: "0 MB/s",
      });

      // Start download in background
      service
        .downloadModel(model, (progress) => {
          activeDownloads.set(model, progress);
        })
        .then(() => {
          activeDownloads.set(model, {
            status: "completed",
            percent: 100,
            downloadedBytes: 0,
            totalBytes: 0,
            speed: "0 MB/s",
          });
        })
        .catch((err) => {
          console.error(`[Llama] Download failed for ${model}:`, err);
          activeDownloads.set(model, {
            status: "error",
            percent: 0,
            downloadedBytes: 0,
            totalBytes: 0,
            speed: "0 MB/s",
          });
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
          err instanceof Error ? err.message : "Failed to download model",
        ),
      );
    }
  },

  "llama.download-progress": async ({ params, respond }) => {
    const { model } = params as { model: string };
    const progress = activeDownloads.get(model);

    if (!progress) {
      respond(true, { status: "not_found", percent: 0 });
      return;
    }

    respond(true, progress);
  },

  "llama.remove": async ({ params, respond }) => {
    const { model } = params as { model: string };
    try {
      const service = getLlamaService();
      await service.deleteModel(model);
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

  "llama.generate": async ({ params, respond }) => {
    const { prompt, sessionId, temperature, maxTokens, systemPrompt } = params as {
      prompt: string;
      sessionId?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    };

    try {
      const service = getLlamaService();

      // Try to generate with local model
      const result = await service.generate(prompt, {
        sessionId,
        temperature,
        maxTokens,
        systemPrompt,
      });

      respond(true, {
        text: result.text,
        tokensGenerated: result.tokensGenerated,
        responseTimeMs: result.responseTimeMs,
        fromCache: result.fromCache,
      });
    } catch (err: any) {
      // Check if it's a local LLM availability error for fallback
      if (
        err.message?.startsWith("LOCAL_LLM_UNAVAILABLE") ||
        err.message?.includes("feature is disabled") ||
        err.message?.includes("not installed")
      ) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, err.message, { retryable: true, retryAfterMs: 5000 }),
        );
        return;
      }

      // Check if it's a rate limit error
      if (err.message?.includes("Rate limit exceeded")) {
        const retryAfter = parseInt(err.message.match(/Retry after (\d+)s/)?.[1] || "60");
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, err.message, {
            retryable: true,
            retryAfterMs: retryAfter * 1000,
          }),
        );
        return;
      }

      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Generation failed",
        ),
      );
    }
  },

  "llama.rate-limit.config": async ({ params, respond }) => {
    const { enabled, requestsPerMinute, burstSize } = params as {
      enabled?: boolean;
      requestsPerMinute?: number;
      burstSize?: number;
    };

    try {
      const service = getLlamaService();
      service.configureRateLimit({ enabled, requestsPerMinute, burstSize });
      respond(true, { ok: true });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to configure rate limit",
        ),
      );
    }
  },

  "llama.hardware.config": async ({ params, respond }) => {
    const { useGPU, gpuLayers, threads, useMetal, useCUDA } = params as {
      useGPU?: boolean;
      gpuLayers?: number;
      threads?: number;
      useMetal?: boolean;
      useCUDA?: boolean;
    };

    try {
      const service = getLlamaService();
      service.configureHardware({ useGPU, gpuLayers, threads, useMetal, useCUDA });
      respond(true, { ok: true, config: service.getHardwareConfig() });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to configure hardware",
        ),
      );
    }
  },

  "llama.hardware.detect": async ({ respond }) => {
    try {
      const service = getLlamaService();
      await service.detectGPU();
      respond(true, { ok: true, config: service.getHardwareConfig() });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to detect hardware",
        ),
      );
    }
  },

  "llama.context.clear": async ({ params, respond }) => {
    const { sessionId } = params as { sessionId: string };

    try {
      const service = getLlamaService();
      service.clearChatContext(sessionId);
      respond(true, { ok: true, sessionId });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to clear context",
        ),
      );
    }
  },

  "llama.context.get": async ({ params, respond }) => {
    const { sessionId } = params as { sessionId: string };

    try {
      const service = getLlamaService();
      const context = service.getChatContext(sessionId);
      respond(true, { sessionId, context });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get context",
        ),
      );
    }
  },

  "llama.chat": async ({ params, respond }) => {
    const { message, model: _model } = params as { message: string; model?: string };
    try {
      const service = getLlamaService();
      const status = await service.getStatus();

      if (!status.running) {
        respond(false, undefined, {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Server not running. Start it first.",
        });
        return;
      }

      // Call llama.cpp server API
      const response = await fetch("http://127.0.0.1:11434/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          max_tokens: 2048,
          temperature: 0.7,
          stop: ["</s>", "User:", "Human:"],
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      const data = await response.json();
      respond(true, {
        response: data.content || data.text || "",
        model: status.currentModel,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Chat request failed",
        ),
      );
    }
  },
};
