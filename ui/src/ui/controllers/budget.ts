import type { AppViewState } from "../app-view-state.js";

export interface BudgetConfig {
  daily: {
    limit: number;
    alertThresholds: number[];
    hardStop: boolean;
  };
  monthly: {
    limit: number;
    alertThresholds: number[];
    hardStop: boolean;
  };
  notifications: {
    desktop: boolean;
    email: boolean;
    emailAddress?: string;
  };
}

export interface BudgetAlert {
  triggered: boolean;
  type: "daily" | "monthly";
  threshold: number;
  message: string;
}

export interface BudgetStatus {
  daily: {
    spent: number;
    limit: number;
    remaining: number;
    percentage: number;
    projected: number;
  };
  monthly: {
    spent: number;
    limit: number;
    remaining: number;
    percentage: number;
    projected: number;
  };
  alerts: BudgetAlert[];
}

export interface BudgetBreakdown {
  byModel: Array<{
    model: string;
    provider: string;
    cost: number;
    tokens: number;
  }>;
  byProvider: Array<{
    provider: string;
    cost: number;
    tokens: number;
  }>;
}

export async function loadBudget(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.budgetLoading = true;
  state.budgetError = null;

  try {
    const result = (await state.client.request("budget.status")) as BudgetStatus;
    state.budgetStatus = result as unknown as Record<string, unknown>;
  } catch (err) {
    state.budgetError = err instanceof Error ? err.message : "Failed to load budget";
    console.error("[Budget] Failed to load:", err);
  } finally {
    state.budgetLoading = false;
  }
}

export async function configureBudget(
  state: AppViewState,
  config: Partial<BudgetConfig>
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.budgetLoading = true;
  state.budgetError = null;

  try {
    await state.client.request("budget.config.set", config);
    await loadBudget(state);
  } catch (err) {
    state.budgetError = err instanceof Error ? err.message : "Failed to configure budget";
    console.error("[Budget] Failed to configure:", err);
    throw err;
  } finally {
    state.budgetLoading = false;
  }
}

export async function resetBudget(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.budgetLoading = true;
  state.budgetError = null;

  try {
    await state.client.request("budget.reset");
    await loadBudget(state);
  } catch (err) {
    state.budgetError = err instanceof Error ? err.message : "Failed to reset budget";
    console.error("[Budget] Failed to reset:", err);
    throw err;
  } finally {
    state.budgetLoading = false;
  }
}

export async function getBudgetBreakdown(
  state: AppViewState,
  period: "today" | "month" | "custom" = "today",
  startDate?: string,
  endDate?: string
): Promise<BudgetBreakdown | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("budget.breakdown", {
      period,
      startDate,
      endDate,
    })) as BudgetBreakdown;
    return result;
  } catch (err) {
    console.error("[Budget] Failed to get breakdown:", err);
    return null;
  }
}

export async function exportBudgetCSV(state: AppViewState): Promise<string | null> {
  if (!state.client?.connected) {
    return null;
  }

  try {
    const result = (await state.client.request("budget.export")) as { csv: string };
    return result.csv;
  } catch (err) {
    console.error("[Budget] Failed to export:", err);
    return null;
  }
}

export async function checkBudgetLimit(state: AppViewState): Promise<{
  blocked: boolean;
  reason?: string;
}> {
  if (!state.client?.connected) {
    return { blocked: false };
  }

  try {
    const result = (await state.client.request("budget.check")) as {
      blocked: boolean;
      reason?: string;
    };
    return result;
  } catch (err) {
    console.error("[Budget] Failed to check limit:", err);
    return { blocked: false };
  }
}
