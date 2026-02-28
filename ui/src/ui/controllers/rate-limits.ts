import type { AppViewState } from "../app-view-state.js";

export interface RateLimitToolConfig {
  minDelay: number;
  maxBatchSize: number;
  cooldownDuration: number;
  batchSimilarWork: boolean;
}

export interface RateLimitConfig {
  global: {
    minTimeBetweenCalls: number;
  };
  perTool: Record<string, RateLimitToolConfig>;
  errorHandling: {
    on429: {
      waitTime: number;
      retryAttempts: number;
      exponentialBackoff: boolean;
    };
  };
}

export interface RateLimitHit {
  timestamp: number;
  tool: string;
  type: "throttle" | "429" | "cooldown";
  message: string;
}

export interface ToolStatus {
  lastCall: number;
  callsInWindow: number;
  inCooldown: boolean;
  cooldownEnd: number | null;
}

export interface RateLimitStatus {
  enabled: boolean;
  currentThrottle: "none" | "light" | "heavy" | "blocked";
  recentHits: RateLimitHit[];
  queueSize: number;
  toolStatus: Record<string, ToolStatus>;
}

export async function loadRateLimits(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.rateLimitsLoading = true;
  state.rateLimitsError = null;

  try {
    const [statusResult, configResult] = await Promise.all([
      state.client.request("rate-limits.status") as Promise<RateLimitStatus>,
      state.client.request("rate-limits.config.get") as Promise<{ config: RateLimitConfig }>,
    ]);
    state.rateLimitsStatus = statusResult as unknown as Record<string, unknown>;
    state.rateLimitsConfig = configResult.config as unknown as Record<string, unknown>;
  } catch (err) {
    state.rateLimitsError = err instanceof Error ? err.message : "Failed to load rate limits";
    console.error("[RateLimits] Failed to load:", err);
  } finally {
    state.rateLimitsLoading = false;
  }
}

export async function configureRateLimits(
  state: AppViewState,
  config: Partial<RateLimitConfig>
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.rateLimitsLoading = true;
  state.rateLimitsError = null;

  try {
    await state.client.request("rate-limits.config.set", config);
    await loadRateLimits(state);
  } catch (err) {
    state.rateLimitsError = err instanceof Error ? err.message : "Failed to configure rate limits";
    console.error("[RateLimits] Failed to configure:", err);
    throw err;
  } finally {
    state.rateLimitsLoading = false;
  }
}

export async function resetRateLimits(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.rateLimitsLoading = true;
  state.rateLimitsError = null;

  try {
    await state.client.request("rate-limits.reset");
    await loadRateLimits(state);
  } catch (err) {
    state.rateLimitsError = err instanceof Error ? err.message : "Failed to reset rate limits";
    console.error("[RateLimits] Failed to reset:", err);
    throw err;
  } finally {
    state.rateLimitsLoading = false;
  }
}

export async function toggleRateLimits(state: AppViewState, enabled: boolean): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.rateLimitsLoading = true;
  state.rateLimitsError = null;

  try {
    await state.client.request("rate-limits.enable", { enabled });
    await loadRateLimits(state);
  } catch (err) {
    state.rateLimitsError = err instanceof Error ? err.message : "Failed to toggle rate limits";
    console.error("[RateLimits] Failed to toggle:", err);
    throw err;
  } finally {
    state.rateLimitsLoading = false;
  }
}
