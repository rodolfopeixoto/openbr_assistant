/**
 * Budget Tracker Service
 * Tracks API costs with daily/monthly budgets and alerts
 */

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("budget");

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

export interface BudgetTransaction {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  sessionKey?: string;
  cost: number;
  tokensInput: number;
  tokensOutput: number;
  description?: string;
}

export type BudgetTransactionInput = Omit<BudgetTransaction, "id" | "timestamp">;

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
  alerts: {
    triggered: boolean;
    type: "daily" | "monthly";
    threshold: number;
    message: string;
  }[];
}

export interface BudgetHistory {
  date: string;
  totalCost: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  transactions: number;
}

// Default configuration
const DEFAULT_CONFIG: BudgetConfig = {
  daily: {
    limit: 5,
    alertThresholds: [0.75],
    hardStop: false,
  },
  monthly: {
    limit: 200,
    alertThresholds: [0.75],
    hardStop: false,
  },
  notifications: {
    desktop: true,
    email: false,
  },
};

export class BudgetTracker {
  private config: BudgetConfig = { ...DEFAULT_CONFIG };
  private transactions: BudgetTransaction[] = [];
  private alertsTriggered: Set<string> = new Set();
  private enabled: boolean = true;

  constructor() {
    this.loadConfig();
    this.loadTransactions();
  }

  private loadConfig(): void {
    try {
      const stored = process.env.BUDGET_CONFIG;
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      log.warn("Failed to load budget config, using defaults");
    }
  }

  private saveConfig(): void {
    try {
      process.env.BUDGET_CONFIG = JSON.stringify(this.config);
    } catch {
      log.warn("Failed to save budget config");
    }
  }

  private loadTransactions(): void {
    try {
      const stored = process.env.BUDGET_TRANSACTIONS;
      if (stored) {
        this.transactions = JSON.parse(stored);
      }
    } catch {
      this.transactions = [];
    }
  }

  private saveTransactions(): void {
    try {
      // Keep only last 30 days in memory
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      this.transactions = this.transactions.filter((t) => t.timestamp > cutoff);
      process.env.BUDGET_TRANSACTIONS = JSON.stringify(this.transactions);
    } catch {
      log.warn("Failed to save budget transactions");
    }
  }

  /**
   * Record a new transaction
   */
  recordTransaction(transaction: BudgetTransactionInput): BudgetTransaction {
    if (!this.enabled) {
      return { ...transaction, id: "", timestamp: Date.now() };
    }

    const tx: BudgetTransaction = {
      ...transaction,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.transactions.push(tx);
    this.saveTransactions();

    // Check for alerts
    this.checkAlerts();

    return tx;
  }

  /**
   * Get current budget status
   */
  getStatus(): BudgetStatus {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Calculate daily spending
    const dailySpent = this.transactions
      .filter((t) => t.timestamp >= startOfDay)
      .reduce((sum, t) => sum + t.cost, 0);

    // Calculate monthly spending
    const monthlySpent = this.transactions
      .filter((t) => t.timestamp >= startOfMonth)
      .reduce((sum, t) => sum + t.cost, 0);

    // Calculate projections (simple linear projection)
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyProjected = (dailySpent / (now.getHours() + 1)) * 24;
    const monthlyProjected = (monthlySpent / dayOfMonth) * daysInMonth;

    const status: BudgetStatus = {
      daily: {
        spent: dailySpent,
        limit: this.config.daily.limit,
        remaining: Math.max(0, this.config.daily.limit - dailySpent),
        percentage: (dailySpent / this.config.daily.limit) * 100,
        projected: dailyProjected,
      },
      monthly: {
        spent: monthlySpent,
        limit: this.config.monthly.limit,
        remaining: Math.max(0, this.config.monthly.limit - monthlySpent),
        percentage: (monthlySpent / this.config.monthly.limit) * 100,
        projected: monthlyProjected,
      },
      alerts: this.getActiveAlerts(dailySpent, monthlySpent),
    };

    return status;
  }

  /**
   * Check if spending should be blocked
   */
  shouldBlock(): { blocked: boolean; reason?: string } {
    if (!this.enabled) {
      return { blocked: false };
    }

    const status = this.getStatus();

    if (this.config.daily.hardStop && status.daily.spent >= this.config.daily.limit) {
      return { blocked: true, reason: "Daily budget exceeded" };
    }

    if (this.config.monthly.hardStop && status.monthly.spent >= this.config.monthly.limit) {
      return { blocked: true, reason: "Monthly budget exceeded" };
    }

    return { blocked: false };
  }

  /**
   * Get spending history
   */
  getHistory(days: number = 30): BudgetHistory[] {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    // Group transactions by date
    const byDate = new Map<string, BudgetTransaction[]>();

    for (const tx of this.transactions) {
      if (tx.timestamp < cutoff) {
        continue;
      }

      const date = new Date(tx.timestamp).toISOString().split("T")[0];
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date)!.push(tx);
    }

    // Build history entries
    const history: BudgetHistory[] = [];
    for (const [date, txs] of byDate.entries()) {
      const byProvider: Record<string, number> = {};
      const byModel: Record<string, number> = {};

      for (const tx of txs) {
        byProvider[tx.provider] = (byProvider[tx.provider] || 0) + tx.cost;
        byModel[tx.model] = (byModel[tx.model] || 0) + tx.cost;
      }

      history.push({
        date,
        totalCost: txs.reduce((sum, t) => sum + t.cost, 0),
        byProvider,
        byModel,
        transactions: txs.length,
      });
    }

    return history.toSorted((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get breakdown by model/provider
   */
  getBreakdown(
    period: "today" | "month" | "custom" = "today",
    startDate?: string,
    endDate?: string,
  ): {
    byModel: Array<{ model: string; provider: string; cost: number; tokens: number }>;
    byProvider: Array<{ provider: string; cost: number; tokens: number }>;
  } {
    const now = new Date();
    let start: number;
    let end: number = now.getTime();

    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (period === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else {
      start = startDate ? new Date(startDate).getTime() : 0;
      end = endDate ? new Date(endDate).getTime() : now.getTime();
    }

    const txs = this.transactions.filter((t) => t.timestamp >= start && t.timestamp <= end);

    // By model
    const modelMap = new Map<string, { provider: string; cost: number; tokens: number }>();
    for (const tx of txs) {
      const existing = modelMap.get(tx.model);
      if (existing) {
        existing.cost += tx.cost;
        existing.tokens += tx.tokensInput + tx.tokensOutput;
      } else {
        modelMap.set(tx.model, {
          provider: tx.provider,
          cost: tx.cost,
          tokens: tx.tokensInput + tx.tokensOutput,
        });
      }
    }

    // By provider
    const providerMap = new Map<string, { cost: number; tokens: number }>();
    for (const tx of txs) {
      const existing = providerMap.get(tx.provider);
      if (existing) {
        existing.cost += tx.cost;
        existing.tokens += tx.tokensInput + tx.tokensOutput;
      } else {
        providerMap.set(tx.provider, {
          cost: tx.cost,
          tokens: tx.tokensInput + tx.tokensOutput,
        });
      }
    }

    return {
      byModel: Array.from(modelMap.entries())
        .map(([model, data]) => ({ model, ...data }))
        .toSorted((a, b) => b.cost - a.cost),
      byProvider: Array.from(providerMap.entries())
        .map(([provider, data]) => ({ provider, ...data }))
        .toSorted((a, b) => b.cost - a.cost),
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): BudgetConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<BudgetConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      daily: { ...this.config.daily, ...config.daily },
      monthly: { ...this.config.monthly, ...config.monthly },
      notifications: { ...this.config.notifications, ...config.notifications },
    };

    // Reset alerts when config changes
    this.alertsTriggered.clear();

    this.saveConfig();
  }

  /**
   * Enable/disable budget tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.transactions = [];
    this.alertsTriggered.clear();
    this.saveTransactions();
  }

  /**
   * Export data as CSV
   */
  exportCSV(): string {
    const headers = [
      "timestamp",
      "provider",
      "model",
      "cost",
      "tokens_input",
      "tokens_output",
      "description",
    ].join(",");

    const rows = this.transactions
      .map((tx) => {
        return [
          new Date(tx.timestamp).toISOString(),
          tx.provider,
          tx.model,
          tx.cost.toFixed(4),
          tx.tokensInput,
          tx.tokensOutput,
          `"${tx.description || ""}"`,
        ].join(",");
      })
      .join("\n");

    return `${headers}\n${rows}`;
  }

  private checkAlerts(): void {
    const status = this.getStatus();

    // Check daily thresholds
    for (const threshold of this.config.daily.alertThresholds) {
      const key = `daily-${threshold}`;
      if (status.daily.percentage >= threshold * 100 && !this.alertsTriggered.has(key)) {
        this.alertsTriggered.add(key);
        log.warn(
          `Daily budget alert: ${status.daily.percentage.toFixed(1)}% of limit (${status.daily.spent.toFixed(2)}/${status.daily.limit})`,
        );
      }
    }

    // Check monthly thresholds
    for (const threshold of this.config.monthly.alertThresholds) {
      const key = `monthly-${threshold}`;
      if (status.monthly.percentage >= threshold * 100 && !this.alertsTriggered.has(key)) {
        this.alertsTriggered.add(key);
        log.warn(
          `Monthly budget alert: ${status.monthly.percentage.toFixed(1)}% of limit (${status.monthly.spent.toFixed(2)}/${status.monthly.limit})`,
        );
      }
    }
  }

  private getActiveAlerts(dailySpent: number, monthlySpent: number): BudgetStatus["alerts"] {
    const alerts: BudgetStatus["alerts"] = [];

    // Check daily thresholds
    for (const threshold of this.config.daily.alertThresholds) {
      if (dailySpent >= this.config.daily.limit * threshold) {
        alerts.push({
          triggered: true,
          type: "daily",
          threshold,
          message: `Daily budget at ${(threshold * 100).toFixed(0)}%: $${dailySpent.toFixed(2)} / $${this.config.daily.limit}`,
        });
      }
    }

    // Check monthly thresholds
    for (const threshold of this.config.monthly.alertThresholds) {
      if (monthlySpent >= this.config.monthly.limit * threshold) {
        alerts.push({
          triggered: true,
          type: "monthly",
          threshold,
          message: `Monthly budget at ${(threshold * 100).toFixed(0)}%: $${monthlySpent.toFixed(2)} / $${this.config.monthly.limit}`,
        });
      }
    }

    return alerts;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let budgetTracker: BudgetTracker | null = null;

export function getBudgetTracker(): BudgetTracker {
  if (!budgetTracker) {
    budgetTracker = new BudgetTracker();
  }
  return budgetTracker;
}
