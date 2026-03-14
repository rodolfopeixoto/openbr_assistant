import type { AppViewState } from "../app-view-state.js";

export interface Container {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "error";
  ports: Array<{ host: number; container: number }>;
  createdAt: string;
  cpu?: number;
  memory?: number;
}

export async function loadContainers(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.containersLoading = true;
  state.containersError = null;

  try {
    const result = (await state.client.request("system.containers.list")) as {
      containers: Container[];
    };
    state.containers = result.containers || [];
  } catch (err) {
    state.containersError = err instanceof Error ? err.message : "Failed to load containers";
    console.error("[Containers] Failed to load:", err);
  } finally {
    state.containersLoading = false;
  }
}

export async function startContainer(state: AppViewState, containerId: string): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("system.container.start", { containerId });
    await loadContainers(state);
  } catch (err) {
    console.error(`[Containers] Failed to start ${containerId}:`, err);
    throw err;
  }
}

export async function stopContainer(state: AppViewState, containerId: string): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("system.container.stop", { containerId });
    await loadContainers(state);
  } catch (err) {
    console.error(`[Containers] Failed to stop ${containerId}:`, err);
    throw err;
  }
}

export async function restartContainer(state: AppViewState, containerId: string): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("system.container.restart", { containerId });
    await loadContainers(state);
  } catch (err) {
    console.error(`[Containers] Failed to restart ${containerId}:`, err);
    throw err;
  }
}

export async function getContainerLogs(state: AppViewState, containerId: string): Promise<string> {
  if (!state.client?.connected) {
    return "";
  }

  try {
    const result = (await state.client.request("system.container.logs", { containerId })) as {
      logs: string;
    };
    return result.logs || "";
  } catch (err) {
    console.error(`[Containers] Failed to get logs ${containerId}:`, err);
    return "";
  }
}
