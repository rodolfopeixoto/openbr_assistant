import type { AppViewState } from "../app-view-state.js";

export interface OllamaIntegratedStatus {
  available: boolean;
  installed: boolean;
  running: boolean;
  version?: string;
  models: Array<{
    name: string;
    installed: boolean;
    size?: string;
  }>;
  error?: string;
}

// Logger helper
function addLog(state: AppViewState, message: string, level: 'info' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (!state.ollamaLogs) {
    state.ollamaLogs = [];
  }
  state.ollamaLogs.push(logEntry);
  
  // Keep only last 100 logs
  if (state.ollamaLogs.length > 100) {
    state.ollamaLogs = state.ollamaLogs.slice(-100);
  }
}

export async function loadOllamaIntegratedStatus(state: AppViewState): Promise<void> {
  if (!state.client) {
    addLog(state, 'Not connected to gateway', 'error');
    return;
  }

  addLog(state, 'Checking Ollama status...');
  
  try {
    const result = await state.client.request("ollama.status");
    state.ollamaIntegratedStatus = result as Record<string, unknown>;
    
    const status = result as OllamaIntegratedStatus;
    if (status.available) {
      addLog(state, `Ollama ready - ${status.models.filter(m => m.installed).length} models installed`);
    } else if (status.installed) {
      addLog(state, 'Ollama installed but not running');
    } else {
      addLog(state, 'Ollama not installed');
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to load status';
    addLog(state, `Status check failed: ${error}`, 'error');
    state.ollamaIntegratedStatus = {
      available: false,
      installed: false,
      running: false,
      models: [],
      error,
    } as Record<string, unknown>;
  }
}

export async function startOllamaIntegrated(state: AppViewState): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  addLog(state, 'Starting Ollama...');
  
  try {
    const result = await state.client.request("ollama.autostart") as { started: boolean; error?: string };
    
    if (result.started) {
      addLog(state, 'Ollama started successfully');
      state.addToast?.("Ollama started", "success");
    } else {
      addLog(state, `Failed to start: ${result.error || 'Unknown error'}`, 'error');
      state.addToast?.(result.error || "Failed to start Ollama", "error");
    }
    
    await loadOllamaIntegratedStatus(state);
  } catch (err) {
    const error = err instanceof Error ? err.message : "Failed to start";
    addLog(state, `Start failed: ${error}`, 'error');
    state.addToast?.(error, "error");
  } finally {
    state.ollamaLoading = false;
  }
}

export async function pullOllamaModel(state: AppViewState, modelKey: string): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  addLog(state, `Starting download of ${modelKey}...`);
  
  // Initialize progress
  state.ollamaPullProgress = {
    model: modelKey,
    progress: { status: 'downloading', percent: 0 },
  };
  
  try {
    await state.client.request("ollama.pull", { model: modelKey });
    addLog(state, `Download of ${modelKey} started`);
    state.addToast?.("Download started", "success");
    
    // Poll for completion
    pollProgress(state, modelKey);
  } catch (err) {
    const error = err instanceof Error ? err.message : "Download failed";
    addLog(state, `Download failed: ${error}`, 'error');
    state.addToast?.(error, "error");
    state.ollamaPullProgress = null;
    state.ollamaLoading = false;
  }
}

async function pollProgress(state: AppViewState, modelKey: string): Promise<void> {
  if (!state.client) return;
  
  const maxAttempts = 120; // 2 minutes
  let attempts = 0;
  
  const checkProgress = async () => {
    attempts++;
    
    try {
      await loadOllamaIntegratedStatus(state);
      
      const status = state.ollamaIntegratedStatus as unknown as OllamaIntegratedStatus;
      const model = status?.models?.find((m: any) => m.name.includes(modelKey) || modelKey.includes(m.name.split(':')[0]));
      
      if (model?.installed) {
        addLog(state, `${modelKey} downloaded and installed successfully`);
        state.ollamaPullProgress = null;
        state.ollamaLoading = false;
        state.addToast?.(`${modelKey} installed`, "success");
        return;
      }
      
      if (attempts < maxAttempts) {
        // Update progress based on attempts (simulated progress)
        const percent = Math.min(95, Math.round((attempts / maxAttempts) * 100));
        if (state.ollamaPullProgress) {
          state.ollamaPullProgress.progress = { 
            status: 'downloading...', 
            percent 
          };
        }
        setTimeout(checkProgress, 1000);
      } else {
        addLog(state, `Download timeout for ${modelKey}`, 'warn');
        state.ollamaPullProgress = null;
        state.ollamaLoading = false;
      }
    } catch (err) {
      addLog(state, `Progress check failed: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
      state.ollamaPullProgress = null;
      state.ollamaLoading = false;
    }
  };
  
  checkProgress();
}

export async function deleteOllamaModel(state: AppViewState, modelKey: string): Promise<void> {
  if (!state.client) return;

  state.ollamaLoading = true;
  addLog(state, `Removing ${modelKey}...`);
  
  try {
    await state.client.request("ollama.delete", { model: modelKey });
    addLog(state, `${modelKey} removed successfully`);
    await loadOllamaIntegratedStatus(state);
    state.addToast?.("Model removed", "success");
  } catch (err) {
    const error = err instanceof Error ? err.message : "Failed to remove";
    addLog(state, `Remove failed: ${error}`, 'error');
    state.addToast?.(error, "error");
  } finally {
    state.ollamaLoading = false;
  }
}
