import type { AppViewState } from "../app-view-state.js";

export interface OllamaModel {
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
}

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
  models: OllamaModel[];
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

// Track active pulls
const activePulls: Map<string, PullProgress> = new Map();

export async function loadOllamaStatus(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    const result = (await state.client.request("ollama.status")) as OllamaFullStatus;
    state.ollamaStatus = result as unknown as Record<string, unknown>;
  } catch (err) {
    state.ollamaError = err instanceof Error ? err.message : "Failed to load Ollama";
    console.error("[Ollama] Failed to load:", err);
  } finally {
    state.ollamaLoading = false;
  }
}

export async function toggleOllamaFeature(
  state: AppViewState,
  enabled: boolean
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    await state.client.request("ollama.feature-toggle", { enabled });
    await loadOllamaStatus(state);
  } catch (err) {
    state.ollamaError = err instanceof Error ? err.message : "Failed to toggle feature";
    console.error("[Ollama] Failed to toggle:", err);
    throw err;
  } finally {
    state.ollamaLoading = false;
  }
}

export async function installOllama(
  state: AppViewState
): Promise<{ success: boolean; message: string }> {
  if (!state.client?.connected) {
    return { success: false, message: "Not connected" };
  }

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    const result = (await state.client.request("ollama.install")) as {
      success: boolean;
      message: string;
    };
    await loadOllamaStatus(state);
    return result;
  } catch (err) {
    state.ollamaError = err instanceof Error ? err.message : "Failed to install";
    console.error("[Ollama] Failed to install:", err);
    throw err;
  } finally {
    state.ollamaLoading = false;
  }
}

export async function uninstallOllama(
  state: AppViewState
): Promise<{ success: boolean; message: string }> {
  if (!state.client?.connected) {
    return { success: false, message: "Not connected" };
  }

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    const result = (await state.client.request("ollama.uninstall")) as {
      success: boolean;
      message: string;
    };
    await loadOllamaStatus(state);
    return result;
  } catch (err) {
    state.ollamaError = err instanceof Error ? err.message : "Failed to uninstall";
    console.error("[Ollama] Failed to uninstall:", err);
    throw err;
  } finally {
    state.ollamaLoading = false;
  }
}

export async function startOllama(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    await state.client.request("ollama.start");
    await loadOllamaStatus(state);
  } catch (err) {
    state.ollamaError = err instanceof Error ? err.message : "Failed to start";
    console.error("[Ollama] Failed to start:", err);
    throw err;
  } finally {
    state.ollamaLoading = false;
  }
}

export async function stopOllama(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    await state.client.request("ollama.stop");
    await loadOllamaStatus(state);
  } catch (err) {
    state.ollamaError = err instanceof Error ? err.message : "Failed to stop";
    console.error("[Ollama] Failed to stop:", err);
    throw err;
  } finally {
    state.ollamaLoading = false;
  }
}

export async function pullModel(
  state: AppViewState,
  model: string
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  // Initialize progress tracking
  activePulls.set(model, { status: "starting", percent: 0 });

  try {
    await state.client.request("ollama.pull", { model });

    // Start polling progress
    pollPullProgress(state, model);
  } catch (err) {
    console.error("[Ollama] Failed to pull model:", err);
    activePulls.delete(model);
    throw err;
  }
}

async function pollPullProgress(state: AppViewState, model: string): Promise<void> {
  const poll = async () => {
    try {
      const progress = (await state.client!.request("ollama.pull-progress", {
        model,
      })) as PullProgress;

      activePulls.set(model, progress);

      // Update state if component is tracking this
      if (state.ollamaPullProgress?.model === model) {
        state.ollamaPullProgress.progress = progress;
      }

      // Continue polling if not completed or errored
      if (progress.status !== "completed" && progress.status !== "error") {
        setTimeout(() => poll(), 1000);
      } else {
        // Refresh model list when done
        await loadOllamaStatus(state);
      }
    } catch {
      // Stop polling on error
      activePulls.delete(model);
    }
  };

  poll();
}

export function getPullProgress(model: string): PullProgress | undefined {
  return activePulls.get(model);
}

export function isPulling(model: string): boolean {
  const progress = activePulls.get(model);
  return !!progress && progress.status !== "completed" && progress.status !== "error";
}

export async function removeModel(
  state: AppViewState,
  model: string
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.ollamaLoading = true;
  state.ollamaError = null;

  try {
    await state.client.request("ollama.remove", { model });
    await loadOllamaStatus(state);
  } catch (err) {
    state.ollamaError = err instanceof Error ? err.message : "Failed to remove model";
    console.error("[Ollama] Failed to remove:", err);
    throw err;
  } finally {
    state.ollamaLoading = false;
  }
}

export async function configureOllama(
  state: AppViewState,
  config: {
    defaultModel?: string;
    autoStart?: boolean;
    gpuAcceleration?: boolean;
    port?: number;
  }
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("ollama.configure", config);
    await loadOllamaStatus(state);
  } catch (err) {
    console.error("[Ollama] Failed to configure:", err);
    throw err;
  }
}

export async function getResourceUsage(
  state: AppViewState
): Promise<{
  cpu: number;
  memory: number;
  memoryGB: string;
  gpu?: number;
  gpuVRAM?: string;
} | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    return (await state.client.request("ollama.resources")) as {
      cpu: number;
      memory: number;
      memoryGB: string;
      gpu?: number;
      gpuVRAM?: string;
    };
  } catch (err) {
    console.error("[Ollama] Failed to get resources:", err);
    return null;
  }
}

// Recommended models with Llama 3.2:3b as primary
export const RECOMMENDED_MODELS = [
  {
    name: "llama3.2:3b",
    description: "Fast & efficient (Recommended)",
    size: "~2GB",
    tags: ["fast", "efficient", "default"],
  },
  {
    name: "llama3.2:1b",
    description: "Ultra lightweight",
    size: "~1GB",
    tags: ["lightweight"],
  },
  {
    name: "codellama:7b",
    description: "Code generation",
    size: "~4GB",
    tags: ["coding"],
  },
  {
    name: "mistral:7b",
    description: "General purpose",
    size: "~4GB",
    tags: ["balanced"],
  },
  {
    name: "phi3:mini",
    description: "Microsoft Phi-3",
    size: "~2GB",
    tags: ["microsoft"],
  },
];
