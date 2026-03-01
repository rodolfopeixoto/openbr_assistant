import type { AppViewState } from "../app-view-state.js";
import type { GatewayBrowserClient } from "../gateway.js";

export interface OpenCodeTask {
  id: string;
  prompt: string;
  status: 'pending_approval' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  containerId?: string;
  workspacePath?: string;
  approvedBy?: string;
  approvedAt?: string;
  result?: string;
  error?: string;
  securityFlags?: string[];
}

export interface OpenCodeStatus {
  enabled: boolean;
  runtimeAvailable: boolean;
  runtimeType: 'docker' | 'podman' | 'apple' | null;
  activeTasks: number;
  totalTasks: number;
  pendingApprovals: number;
}

export interface OpenCodeAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user?: string;
  taskId?: string;
  details: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export async function loadOpencodeStatus(state: AppViewState): Promise<void> {
  if (!state.client?.connected) return;
  
  try {
    const result = await state.client.request("opencode.status");
    state.opencodeStatus = result as unknown as OpenCodeStatus;
  } catch (err) {
    console.error("Failed to load OpenCode status:", err);
    state.opencodeStatus = null;
  }
}

export async function loadOpencodeTasks(state: AppViewState): Promise<void> {
  if (!state.client?.connected) return;
  
  try {
    const result = await state.client.request("opencode.task.list");
    state.opencodeTasks = (result as { tasks: OpenCodeTask[] }).tasks || [];
  } catch (err) {
    console.error("Failed to load OpenCode tasks:", err);
    state.opencodeTasks = [];
  }
}

export async function createOpencodeTask(state: AppViewState, prompt: string): Promise<void> {
  if (!state.client?.connected) return;
  
  state.opencodeTaskCreating = true;
  try {
    await state.client.request("opencode.task.create", { prompt });
    await loadOpencodeTasks(state);
    await loadOpencodeStatus(state);
    state.opencodeTaskInput = "";
  } catch (err) {
    console.error("Failed to create OpenCode task:", err);
    throw err;
  } finally {
    state.opencodeTaskCreating = false;
  }
}

export async function approveOpencodeTask(state: AppViewState, taskId: string): Promise<void> {
  if (!state.client?.connected) return;
  
  try {
    await state.client.request("opencode.task.approve", { taskId });
    await loadOpencodeTasks(state);
    await loadOpencodeStatus(state);
  } catch (err) {
    console.error("Failed to approve OpenCode task:", err);
    throw err;
  }
}

export async function cancelOpencodeTask(state: AppViewState, taskId: string): Promise<void> {
  if (!state.client?.connected) return;
  
  try {
    await state.client.request("opencode.task.cancel", { taskId });
    await loadOpencodeTasks(state);
    await loadOpencodeStatus(state);
  } catch (err) {
    console.error("Failed to cancel OpenCode task:", err);
    throw err;
  }
}

export async function loadOpencodeConfig(state: AppViewState): Promise<void> {
  if (!state.client?.connected) return;
  
  state.opencodeConfigLoading = true;
  state.opencodeConfigError = null;
  
  try {
    const result = await state.client.request("opencode.config.get");
    state.opencodeConfig = (result as { config: Record<string, unknown> }).config || {};
    state.opencodeConfigDirty = false;
  } catch (err) {
    console.error("Failed to load OpenCode config:", err);
    state.opencodeConfigError = err instanceof Error ? err.message : String(err);
  } finally {
    state.opencodeConfigLoading = false;
  }
}

export async function saveOpencodeConfig(state: AppViewState): Promise<void> {
  if (!state.client?.connected) return;
  
  state.opencodeConfigSaving = true;
  try {
    await state.client.request("config.set", { opencode: state.opencodeConfig });
    state.opencodeConfigDirty = false;
  } catch (err) {
    console.error("Failed to save OpenCode config:", err);
    throw err;
  } finally {
    state.opencodeConfigSaving = false;
  }
}

export function updateOpencodeConfigValue(state: AppViewState, key: string, value: unknown): void {
  const keys = key.split('.');
  let current = state.opencodeConfig as Record<string, unknown>;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
      current[k] = {};
    }
    current = current[k] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
  state.opencodeConfig = { ...state.opencodeConfig };
  state.opencodeConfigDirty = true;
}

export async function loadOpencodeSecurity(state: AppViewState): Promise<void> {
  if (!state.client?.connected) return;
  
  try {
    const result = await state.client.request("opencode.config.get");
    const config = (result as { config: Record<string, unknown> }).config || {};
    state.opencodeSecurityConfig = (config.security as Record<string, unknown>) || {};
  } catch (err) {
    console.error("Failed to load OpenCode security:", err);
  }
}

export async function saveOpencodeSecurity(state: AppViewState): Promise<void> {
  if (!state.client?.connected) return;
  
  state.opencodeSecuritySaving = true;
  try {
    await state.client.request("config.set", { 
      opencode: {
        ...state.opencodeConfig,
        security: state.opencodeSecurityConfig 
      } 
    });
    state.opencodeSecurityDirty = false;
  } catch (err) {
    console.error("Failed to save OpenCode security:", err);
    throw err;
  } finally {
    state.opencodeSecuritySaving = false;
  }
}

export function updateOpencodeSecurityValue(state: AppViewState, key: string, value: unknown): void {
  state.opencodeSecurityConfig = { ...state.opencodeSecurityConfig, [key]: value };
  state.opencodeSecurityDirty = true;
}

export async function loadOpencodeAudit(state: AppViewState): Promise<void> {
  if (!state.client?.connected) return;
  
  state.opencodeAuditLoading = true;
  try {
    const result = await state.client.request("opencode.audit.list");
    state.opencodeAuditLog = (result as { entries: OpenCodeAuditEntry[] }).entries || [];
  } catch (err) {
    console.error("Failed to load OpenCode audit:", err);
    state.opencodeAuditLog = [];
  } finally {
    state.opencodeAuditLoading = false;
  }
}

export async function exportOpencodeAudit(state: AppViewState): Promise<void> {
  const entries = state.opencodeAuditLog;
  const csv = [
    "Timestamp,Action,User,Task ID,Details,Severity",
    ...entries.map(e => 
      `"${e.timestamp}","${e.action}","${e.user || ''}","${e.taskId || ''}","${e.details}","${e.severity}"`
    )
  ].join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `opencode-audit-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}