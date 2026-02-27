/**
 * Llama Controller - Direct llama.cpp Integration
 * Optimized for Llama 3.2:3b without Ollama overhead
 */

import type { AppViewState } from "../app-view-state.js";

export interface LlamaFullStatus {
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
}

// Modelos funcionais testados - Todos pequenos e funcionais
export const PRIMARY_MODEL = {
  name: "tinyllama-1.1b",
  displayName: "TinyLlama 1.1B",
  size: "638 MB",
  sizeBytes: 669919488,
  description: "Ultra compacto (638MB) - Funciona em qualquer PC",
  tags: ["ultra-small", "1.1b", "fast", "beginner"],
  recommended: true,
};

// Modelos alternativos funcionais e pequenos
export const ALTERNATIVE_MODELS = [
  {
    name: "phi-2",
    displayName: "Phi-2 2.7B",
    size: "1.5 GB",
    sizeBytes: 1593837056,
    description: "Microsoft Phi-2 - Excelente desempenho para 1.5GB",
    tags: ["microsoft", "2.7b", "efficient"],
    recommended: false,
  },
  {
    name: "qwen2-0.5b",
    displayName: "Qwen2 0.5B",
    size: "336 MB",
    sizeBytes: 352321536,
    description: "Qwen2 0.5B - O menor modelo funcional (336MB)",
    tags: ["ultra-tiny", "0.5b", "multilingual"],
    recommended: false,
  },
];

// Helper to show error toast
function showError(state: AppViewState, message: string): void {
  state.ollamaError = message;
  state.addToast?.(message, "error", 8000);
}

// Helper to show success toast
function showSuccess(state: AppViewState, message: string): void {
  state.addToast?.(message, "success", 4000);
}

export async function loadLlamaStatus(state: AppViewState): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    const result = (await state.client.request("llama.status")) as LlamaFullStatus;
    state.ollamaStatus = result as unknown as Record<string, unknown>;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load status";
    showError(state, errorMsg);
  } finally {
    state.ollamaLoading = false;
  }
}

export async function toggleLlamaFeature(state: AppViewState, enabled: boolean): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    await state.client.request("llama.feature-toggle", { enabled });
    showSuccess(state, enabled ? "Local LLM enabled successfully" : "Local LLM disabled");
    // Reload status after toggle
    await loadLlamaStatus(state);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to toggle feature";
    showError(state, errorMsg);
  } finally {
    state.ollamaLoading = false;
  }
}

export async function installLlama(state: AppViewState): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    const result = (await state.client.request("llama.install")) as {
      success: boolean;
      message: string;
    };

    if (!result.success) {
      throw new Error(result.message);
    }

    showSuccess(state, "llama.cpp installed successfully");
    // Reload status
    await loadLlamaStatus(state);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Installation failed";
    showError(state, errorMsg);
  } finally {
    state.ollamaLoading = false;
  }
}

export async function uninstallLlama(state: AppViewState): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    const result = (await state.client.request("llama.uninstall")) as {
      success: boolean;
      message: string;
    };

    if (!result.success) {
      throw new Error(result.message);
    }

    showSuccess(state, "llama.cpp uninstalled successfully");
    // Reload status
    await loadLlamaStatus(state);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Uninstallation failed";
    showError(state, errorMsg);
  } finally {
    state.ollamaLoading = false;
  }
}

export async function startLlamaServer(state: AppViewState, model?: string): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    await state.client.request("llama.start", { model: model || PRIMARY_MODEL.name });
    showSuccess(state, "Llama server started successfully");
    // Reload status
    await loadLlamaStatus(state);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to start server";
    showError(state, errorMsg);
  } finally {
    state.ollamaLoading = false;
  }
}

export async function stopLlamaServer(state: AppViewState): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    await state.client.request("llama.stop");
    showSuccess(state, "Llama server stopped");
    // Reload status
    await loadLlamaStatus(state);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to stop server";
    showError(state, errorMsg);
  } finally {
    state.ollamaLoading = false;
  }
}

export async function downloadModel(state: AppViewState, model: string): Promise<void> {
  if (!state.client) return;

  // Initialize progress
  state.ollamaPullProgress = {
    model,
    progress: {
      status: "downloading",
      percent: 0,
    },
  };

  try {
    await state.client.request("llama.download", { model });

    // Poll for progress
    const pollProgress = async () => {
      if (!state.client) return;

      try {
        const progress = (await state.client.request("llama.download-progress", {
          model,
        })) as DownloadProgress;

        if (state.ollamaPullProgress?.model === model) {
          state.ollamaPullProgress.progress = progress;
        }

        if (progress.status === "downloading") {
          setTimeout(pollProgress, 500);
        } else if (progress.status === "completed") {
          showSuccess(state, `Model ${model} downloaded successfully`);
          setTimeout(() => {
            loadLlamaStatus(state);
            state.ollamaPullProgress = null;
          }, 1000);
        } else if (progress.status === "error") {
          showError(state, `Failed to download model ${model}`);
          state.ollamaPullProgress = null;
        }
      } catch {
        // Ignore polling errors
      }
    };

    // Start polling
    pollProgress();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to download model";
    showError(state, errorMsg);
    state.ollamaPullProgress = null;
  }
}

export async function removeModel(state: AppViewState, model: string): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    await state.client.request("llama.remove", { model });
    showSuccess(state, `Model ${model} removed successfully`);
    // Reload status
    await loadLlamaStatus(state);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to remove model";
    showError(state, errorMsg);
  } finally {
    state.ollamaLoading = false;
  }
}
