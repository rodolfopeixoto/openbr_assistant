import type { GatewayRequestHandlers } from "./types.js";

export interface BudgetConfig {
  enabled: boolean;
  monthlyLimit: number;
  currency: string;
  alertThresholds: number[];
  resetDay: number;
}

export interface BudgetStatus {
  enabled: boolean;
  currentMonth: string;
  spent: number;
  remaining: number;
  limit: number;
  percentageUsed: number;
  nextReset: string;
  history: MonthlyBudget[];
  alerts: BudgetAlert[];
}

export interface MonthlyBudget {
  month: string;
  spent: number;
  limit: number;
  overBudget: boolean;
}

export interface BudgetAlert {
  id: string;
  type: "threshold" | "over_budget";
  threshold?: number;
  triggeredAt: string;
  acknowledged: boolean;
}

let config: BudgetConfig = {
  enabled: false,
  monthlyLimit: 100,
  currency: "USD",
  alertThresholds: [50, 80, 95],
  resetDay: 1,
};

let currentMonth = new Date().toISOString().slice(0, 7);
let spent = 0;
let history: MonthlyBudget[] = [];
let alerts: BudgetAlert[] = [];

export const budgetHandlers: GatewayRequestHandlers = {
  "budget.status": async ({ respond }) => {
    const remaining = config.monthlyLimit - spent;
    const percentageUsed = config.monthlyLimit > 0 ? (spent / config.monthlyLimit) * 100 : 0;

    respond(true, {
      enabled: config.enabled,
      currentMonth,
      spent,
      remaining: Math.max(0, remaining),
      limit: config.monthlyLimit,
      percentageUsed,
      nextReset: `${currentMonth}-${String(config.resetDay).padStart(2, "0")}`,
      history,
      alerts: alerts.filter((a) => !a.acknowledged),
    });
  },

  "budget.configure": async ({ params, respond }) => {
    const { enabled, monthlyLimit, currency, alertThresholds, resetDay } =
      params as Partial<BudgetConfig>;
    if (enabled !== undefined) {
      config.enabled = enabled;
    }
    if (monthlyLimit !== undefined) {
      config.monthlyLimit = monthlyLimit;
    }
    if (currency) {
      config.currency = currency;
    }
    if (alertThresholds) {
      config.alertThresholds = alertThresholds;
    }
    if (resetDay !== undefined) {
      config.resetDay = resetDay;
    }
    respond(true, { ok: true, config });
  },

  "budget.report": async ({ params, respond }) => {
    const { cost } = params as { cost: number };
    spent += cost;

    const percentageUsed = (spent / config.monthlyLimit) * 100;

    for (const threshold of config.alertThresholds) {
      if (percentageUsed >= threshold) {
        const existing = alerts.find(
          (a) => a.type === "threshold" && a.threshold === threshold && !a.acknowledged,
        );
        if (!existing) {
          alerts.push({
            id: `alert_${Date.now()}`,
            type: "threshold",
            threshold,
            triggeredAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
      }
    }

    if (spent > config.monthlyLimit) {
      const existing = alerts.find((a) => a.type === "over_budget" && !a.acknowledged);
      if (!existing) {
        alerts.push({
          id: `overbudget_${Date.now()}`,
          type: "over_budget",
          triggeredAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    }

    respond(true, { ok: true, spent, remaining: Math.max(0, config.monthlyLimit - spent) });
  },

  "budget.history": async ({ respond }) => {
    respond(true, { history });
  },

  "budget.acknowledge-alert": async ({ params, respond }) => {
    const { alertId } = params as { alertId: string };
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
    respond(true, { ok: true });
  },

  "budget.reset": async ({ respond }) => {
    history.push({
      month: currentMonth,
      spent,
      limit: config.monthlyLimit,
      overBudget: spent > config.monthlyLimit,
    });
    currentMonth = new Date().toISOString().slice(0, 7);
    spent = 0;
    alerts = [];
    respond(true, { ok: true });
  },
};
