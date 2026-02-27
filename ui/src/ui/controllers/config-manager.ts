import type { AppViewState } from "../app-view-state.js";

export interface ConfigManagerState {
  config: Record<string, unknown> | null;
  history: Array<{
    timestamp: number;
    comment?: string;
  }>;
  loading: boolean;
  saving: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  editMode: 'form' | 'json';
  editedConfig: string;
  selectedTab: 'general' | 'ai' | 'channels' | 'security' | 'logging';
}

export async function loadConfigManager(state: AppViewState): Promise<void> {
  if (!state.client) return;

  state.configManagerLoading = true;
  try {
    const result = await state.client.request("config.get") as { config: Record<string, unknown> };
    const historyResult = await state.client.request("config.history", { limit: 10 }) as { history: Array<{ timestamp: number; comment?: string }> };
    
    state.configManagerState = {
      ...state.configManagerState,
      config: result.config,
      history: historyResult.history || [],
    };
  } catch (err) {
    state.configManagerState = {
      ...state.configManagerState,
      config: null,
    };
    state.addToast?.(err instanceof Error ? err.message : "Failed to load configuration", "error");
  } finally {
    state.configManagerLoading = false;
  }
}

export async function validateConfig(state: AppViewState, config: unknown): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
  if (!state.client) return { valid: false, errors: ["Not connected"] };

  try {
    const result = await state.client.request("config.validate", { config });
    return {
      valid: result.valid as boolean,
      errors: result.errors as string[] | undefined,
      warnings: result.warnings as string[] | undefined,
    };
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : "Validation failed"],
    };
  }
}

export async function updateConfig(
  state: AppViewState, 
  config: Record<string, unknown>, 
  comment?: string
): Promise<boolean> {
  if (!state.client) return false;

  state.configManagerSaving = true;
  try {
    const result = await state.client.request("config.update", { config, comment });
    
    if (result.success) {
      state.configManagerState = {
        ...state.configManagerState,
        config: result.config as Record<string, unknown>,
        validationErrors: [],
      };
      state.addToast?.("Configuration updated successfully", "success");
      
      // Reload history
      const historyResult = await state.client.request("config.history", { limit: 10 });
      state.configManagerState = {
        ...state.configManagerState,
        history: (historyResult.history || []) as Array<{ timestamp: number; comment?: string }>,
      };
      
      return true;
    } else {
      state.configManagerState = {
        ...state.configManagerState,
        validationErrors: (result.errors || []) as string[],
      };
      state.addToast?.("Configuration validation failed", "error");
      return false;
    }
  } catch (err) {
    state.addToast?.(err instanceof Error ? err.message : "Failed to update configuration", "error");
    return false;
  } finally {
    state.configManagerSaving = false;
  }
}

export async function rollbackConfig(state: AppViewState, index: number): Promise<boolean> {
  if (!state.client) return false;

  state.configManagerSaving = true;
  try {
    const result = await state.client.request("config.rollback", { index });
    
    if (result.success) {
      state.configManagerState = {
        ...state.configManagerState,
        config: result.config as Record<string, unknown>,
      };
      state.addToast?.("Configuration rolled back successfully", "success");
      
      // Reload history
      const historyResult = await state.client.request("config.history", { limit: 10 });
      state.configManagerState = {
        ...state.configManagerState,
        history: (historyResult.history || []) as Array<{ timestamp: number; comment?: string }>,
      };
      
      return true;
    } else {
      state.addToast?.("Rollback failed", "error");
      return false;
    }
  } catch (err) {
    state.addToast?.(err instanceof Error ? err.message : "Failed to rollback", "error");
    return false;
  } finally {
    state.configManagerSaving = false;
  }
}

export async function exportConfig(state: AppViewState): Promise<string | null> {
  if (!state.client) return null;

  try {
    const result = await state.client.request("config.export");
    return result.json as string;
  } catch (err) {
    state.addToast?.(err instanceof Error ? err.message : "Failed to export", "error");
    return null;
  }
}

export async function importConfig(state: AppViewState, json: string): Promise<boolean> {
  if (!state.client) return false;

  state.configManagerSaving = true;
  try {
    const result = await state.client.request("config.import", { json, comment: "Import from file" });
    
    if (result.success) {
      state.configManagerState = {
        ...state.configManagerState,
        config: result.config as Record<string, unknown>,
      };
      state.addToast?.("Configuration imported successfully", "success");
      
      // Reload history
      const historyResult = await state.client.request("config.history", { limit: 10 });
      state.configManagerState = {
        ...state.configManagerState,
        history: (historyResult.history || []) as Array<{ timestamp: number; comment?: string }>,
      };
      
      return true;
    } else {
      state.configManagerState = {
        ...state.configManagerState,
        validationErrors: (result.errors || []) as string[],
      };
      state.addToast?.("Import validation failed", "error");
      return false;
    }
  } catch (err) {
    state.addToast?.(err instanceof Error ? err.message : "Failed to import", "error");
    return false;
  } finally {
    state.configManagerSaving = false;
  }
}

export async function resetConfig(state: AppViewState): Promise<boolean> {
  if (!state.client) return false;

  state.configManagerSaving = true;
  try {
    const result = await state.client.request("config.reset");
    
    state.configManagerState = {
      ...state.configManagerState,
      config: result.config as Record<string, unknown>,
    };
    state.addToast?.("Configuration reset to defaults", "success");
    
    // Reload history
    const historyResult = await state.client.request("config.history", { limit: 10 });
    state.configManagerState = {
      ...state.configManagerState,
      history: (historyResult.history || []) as Array<{ timestamp: number; comment?: string }>,
    };
    
    return true;
  } catch (err) {
    state.addToast?.(err instanceof Error ? err.message : "Failed to reset", "error");
    return false;
  } finally {
    state.configManagerSaving = false;
  }
}
