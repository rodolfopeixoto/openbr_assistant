import type { AppViewState } from "../app-view-state.js";

export interface FeatureCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  features: DashboardFeature[];
}

export interface DashboardFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "enabled" | "disabled" | "needs_config" | "unavailable";
  configurable: boolean;
  hasConfigModal: boolean;
  configRoute?: string;
  icon: string;
  tags: string[];
  requires: string[];
  quickActions: QuickAction[];
  isNew?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  handler: "toggle" | "config" | "view";
}

export interface FeaturesDashboardResponse {
  categories: FeatureCategory[];
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    needsConfig: number;
    unavailable: number;
  };
}

// Note: featuresList is used to store categories for the features dashboard
// Cast to FeatureCategory[] when using in views

export async function loadFeaturesDashboard(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.featuresLoading = true;
  state.featuresError = null;

  try {
    console.log("[Features] Loading dashboard...");
    const result = (await state.client.request({
      method: "features.dashboard",
    })) as FeaturesDashboardResponse;

    console.log("[Features] Dashboard response:", result);
    console.log("[Features] Categories:", result?.categories?.length);
    console.log("[Features] Summary:", result?.summary);

    state.featuresList = result.categories || [];
    state.featuresSummary = result.summary || {
      total: 0,
      enabled: 0,
      disabled: 0,
      needsConfig: 0,
      unavailable: 0,
    };
  } catch (err) {
    state.featuresError = err instanceof Error ? err.message : "Failed to load features";
    console.error("[Features] Failed to load dashboard:", err);
  } finally {
    state.featuresLoading = false;
  }
}

export async function toggleFeature(
  state: AppViewState,
  featureId: string,
  enabled: boolean
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request({
      method: "features.toggle",
      params: { featureId, enabled },
    });

    // Reload dashboard to reflect changes
    await loadFeaturesDashboard(state);
  } catch (err) {
    console.error(`[Features] Failed to toggle ${featureId}:`, err);
    throw err;
  }
}

export async function configureFeature(
  state: AppViewState,
  featureId: string,
  config: Record<string, unknown>
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request({
      method: "features.configure",
      params: { featureId, config },
    });

    // Reload dashboard to reflect changes
    await loadFeaturesDashboard(state);
  } catch (err) {
    console.error(`[Features] Failed to configure ${featureId}:`, err);
    throw err;
  }
}

export function searchFeatures(state: AppViewState, query: string): void {
  state.featuresSearchQuery = query;
  // The filtering is done in the view based on this query
}

export function toggleCategory(state: AppViewState, categoryId: string): void {
  const currentExpanded = state.expandedCategories || [];
  if (currentExpanded.includes(categoryId)) {
    state.expandedCategories = currentExpanded.filter((id) => id !== categoryId);
  } else {
    state.expandedCategories = [...currentExpanded, categoryId];
  }
}

export function openFeatureConfigModal(state: AppViewState, featureId: string): void {
  state.featuresConfigModalOpen = true;
  state.featuresConfigModalFeature = featureId;
  state.featuresConfigFormData = {};
}

export function closeFeatureConfigModal(state: AppViewState): void {
  state.featuresConfigModalOpen = false;
  state.featuresConfigModalFeature = null;
  state.featuresConfigFormData = {};
}

export function updateConfigFormData(
  state: AppViewState,
  key: string,
  value: unknown
): void {
  state.featuresConfigFormData = {
    ...state.featuresConfigFormData,
    [key]: value,
  };
}
