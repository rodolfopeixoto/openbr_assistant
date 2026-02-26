import type { AppViewState } from "../app-view-state.js";

export interface SecurityStatus {
  lastScan: string;
  vulnerabilities: Array<{
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    affected: string;
  }>;
  scanInProgress: boolean;
}

export async function loadSecurityStatus(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.securityLoading = true;
  state.securityError = null;

  try {
    const result = (await state.client.request("security.status")) as SecurityStatus;
    state.securityStatus = result as Record<string, unknown>;
  } catch (err) {
    state.securityError = err instanceof Error ? err.message : "Failed to load security status";
    console.error("[Security] Failed to load:", err);
  } finally {
    state.securityLoading = false;
  }
}

export async function runSecurityScan(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("security.scan");
    await loadSecurityStatus(state);
  } catch (err) {
    console.error("[Security] Failed to run scan:", err);
    throw err;
  }
}
