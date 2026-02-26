import type { AppViewState } from "../app-view-state.js";

export interface MemoryFile {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface MemorySession {
  date: string;
  fileName: string;
  summary: string;
  workedOn?: string;
  decisions?: string;
  leads?: string;
  blockers?: string;
  nextSteps?: string;
}

export interface MemoryFilesResponse {
  coreFiles: MemoryFile[];
  sessions: MemorySession[];
}

export interface MemoryConfig {
  autoLoad: {
    soul: boolean;
    user: boolean;
    identity: boolean;
    recentDays: number;
  };
  autoSummarize: boolean;
  summaryTemplate: string[];
  retentionDays: number;
}

export interface MemorySearchResult {
  file: string;
  snippet: string;
  relevance: number;
}

export async function loadMemoryFiles(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.memoryLoading = true;
  state.memoryError = null;

  try {
    const result = (await state.client.request("memory.session.files")) as MemoryFilesResponse;
    state.memoryFiles = result as unknown as Record<string, unknown>;
  } catch (err) {
    state.memoryError = err instanceof Error ? err.message : "Failed to load memory files";
    console.error("[Memory] Failed to load files:", err);
  } finally {
    state.memoryLoading = false;
  }
}

export async function getMemoryFile(
  state: AppViewState,
  name?: string,
  date?: string
): Promise<
  | (MemoryFile & { content: string })
  | MemorySession
  | null
> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("memory.session.file.get", { name, date })) as
      | (MemoryFile & { content: string })
      | MemorySession;
    return result;
  } catch (err) {
    console.error("[Memory] Failed to get file:", err);
    return null;
  }
}

export async function saveMemoryFile(
  state: AppViewState,
  name: string,
  content: string
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.memoryLoading = true;
  state.memoryError = null;

  try {
    await state.client.request("memory.session.file.save", { name, content });
    await loadMemoryFiles(state);
  } catch (err) {
    state.memoryError = err instanceof Error ? err.message : "Failed to save memory file";
    console.error("[Memory] Failed to save file:", err);
    throw err;
  } finally {
    state.memoryLoading = false;
  }
}

export async function saveSessionMemory(
  state: AppViewState,
  date: string,
  session: Record<string, unknown>
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.memoryLoading = true;
  state.memoryError = null;

  try {
    await state.client.request("memory.session.file.save", { date, session });
    await loadMemoryFiles(state);
  } catch (err) {
    state.memoryError = err instanceof Error ? err.message : "Failed to save session memory";
    console.error("[Memory] Failed to save session:", err);
    throw err;
  } finally {
    state.memoryLoading = false;
  }
}

export async function generateSummary(
  state: AppViewState,
  content: string
): Promise<Record<string, unknown> | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("memory.session.summary.generate", { content })) as Record<
      string,
      unknown
    >;
    return result;
  } catch (err) {
    console.error("[Memory] Failed to generate summary:", err);
    return null;
  }
}

export async function saveSummary(
  state: AppViewState,
  date: string,
  summary: Record<string, unknown>
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.memoryLoading = true;
  state.memoryError = null;

  try {
    await state.client.request("memory.session.summary.save", { date, summary });
    await loadMemoryFiles(state);
  } catch (err) {
    state.memoryError = err instanceof Error ? err.message : "Failed to save summary";
    console.error("[Memory] Failed to save summary:", err);
    throw err;
  } finally {
    state.memoryLoading = false;
  }
}

export async function searchMemories(
  state: AppViewState,
  query: string
): Promise<MemorySearchResult[]> {
  if (!state.client?.connected) {
    return [];
  }

  try {
    const result = (await state.client.request("memory.session.search", { query })) as {
      results: MemorySearchResult[];
    };
    return result.results;
  } catch (err) {
    console.error("[Memory] Failed to search:", err);
    return [];
  }
}

export async function getMemoryConfig(state: AppViewState): Promise<MemoryConfig | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("memory.session.config.get")) as MemoryConfig;
    return result;
  } catch (err) {
    console.error("[Memory] Failed to get config:", err);
    return null;
  }
}

export async function setMemoryConfig(
  state: AppViewState,
  config: Partial<MemoryConfig>
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.memoryLoading = true;
  state.memoryError = null;

  try {
    await state.client.request("memory.session.config.set", config);
  } catch (err) {
    state.memoryError = err instanceof Error ? err.message : "Failed to set memory config";
    console.error("[Memory] Failed to set config:", err);
    throw err;
  } finally {
    state.memoryLoading = false;
  }
}

export async function deleteSessionMemory(state: AppViewState, date: string): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.memoryLoading = true;
  state.memoryError = null;

  try {
    await state.client.request("memory.session.delete", { date });
    await loadMemoryFiles(state);
  } catch (err) {
    state.memoryError = err instanceof Error ? err.message : "Failed to delete session memory";
    console.error("[Memory] Failed to delete session:", err);
    throw err;
  } finally {
    state.memoryLoading = false;
  }
}

export async function cleanupOldMemories(state: AppViewState): Promise<number> {
  if (!state.client?.connected) {
    return 0;
  }

  try {
    const result = (await state.client.request("memory.session.cleanup")) as { deleted: number };
    await loadMemoryFiles(state);
    return result.deleted;
  } catch (err) {
    console.error("[Memory] Failed to cleanup:", err);
    return 0;
  }
}
