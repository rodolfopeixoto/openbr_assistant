import type { AppViewState } from "../app-view-state.js";

export type RoutingTier = "simple" | "medium" | "complex";

export interface TierConfig {
  name: string;
  models: string[];
  criteria: {
    maxTokens?: number;
    minTokens?: number;
    toolsAllowed: string[];
    complexity: "low" | "medium" | "high";
  };
  costPer1kTokens: {
    input: number;
    output: number;
  };
  priority: number;
}

export interface RoutingStats {
  totalRouted: number;
  simpleTierRouted: number;
  mediumTierRouted: number;
  complexTierRouted: number;
  costSavings: number;
  avgLatency: number;
  fallbackCount: number;
  errors: number;
  lastRoutedAt: number | null;
  savingsPercentage?: number;
}

export interface ModelRoutingStatus {
  enabled: boolean;
  currentTier: RoutingTier | null;
  tiers: {
    simple: TierConfig;
    medium: TierConfig;
    complex: TierConfig;
  };
  fallback: {
    enabled: boolean;
    maxRetries: number;
    fallbackDelayMs: number;
  };
  stats: RoutingStats;
}

export interface TestRoutingResult {
  tier: RoutingTier;
  model: string;
  reason: string;
  estimatedCost: number;
  fallbackChain: string[];
  complexity: string;
  estimatedTokens: number;
}

export async function loadModelRoutingStatus(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.modelRoutingLoading = true;
  state.modelRoutingError = null;

  try {
    const result = (await state.client.request("model-routing.status")) as ModelRoutingStatus;
    state.modelRoutingStatus = result as unknown as Record<string, unknown>;
  } catch (err) {
    state.modelRoutingError = err instanceof Error ? err.message : "Failed to load model routing";
    console.error("[ModelRouting] Failed to load:", err);
  } finally {
    state.modelRoutingLoading = false;
  }
}

export async function toggleModelRouting(state: AppViewState, enabled: boolean): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("model-routing.configure", { enabled });
    await loadModelRoutingStatus(state);
  } catch (err) {
    console.error("[ModelRouting] Failed to toggle:", err);
    throw err;
  }
}

export async function testRouting(
  state: AppViewState,
  prompt: string,
  tools: string[] = []
): Promise<TestRoutingResult | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("model-routing.test", {
      prompt,
      tools,
    })) as TestRoutingResult;
    return result;
  } catch (err) {
    console.error("[ModelRouting] Failed to test:", err);
    return null;
  }
}

export async function addModelToTier(
  state: AppViewState,
  tier: RoutingTier,
  model: string
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("model-routing.tier.add-model", { tier, model });
    await loadModelRoutingStatus(state);
  } catch (err) {
    console.error("[ModelRouting] Failed to add model:", err);
    throw err;
  }
}

export async function removeModelFromTier(
  state: AppViewState,
  tier: RoutingTier,
  index: number
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("model-routing.tier.remove-model", { tier, index });
    await loadModelRoutingStatus(state);
  } catch (err) {
    console.error("[ModelRouting] Failed to remove model:", err);
    throw err;
  }
}

export async function reorderModelsInTier(
  state: AppViewState,
  tier: RoutingTier,
  fromIndex: number,
  toIndex: number
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("model-routing.tier.reorder", {
      tier,
      fromIndex,
      toIndex,
    });
    await loadModelRoutingStatus(state);
  } catch (err) {
    console.error("[ModelRouting] Failed to reorder:", err);
    throw err;
  }
}

export async function resetModelRouting(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("model-routing.reset");
    await loadModelRoutingStatus(state);
  } catch (err) {
    console.error("[ModelRouting] Failed to reset:", err);
    throw err;
  }
}
