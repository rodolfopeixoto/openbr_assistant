import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

export function renderAnalyticsView(state: AppViewState) {
  const budget = state.analyticsBudget;
  const metrics = state.analyticsMetrics;

  // Auto-load analytics data on first render
  if (!budget && !metrics && !state.analyticsLoading && !state.analyticsError && state.connected) {
    console.log("[Analytics View] Auto-loading analytics data...");
    state.handleAnalyticsLoad();
  }

  return html`
    <div class="analytics-view">
      <section class="content-header">
        <div>
          <div class="page-title">${icons.barChart} Analytics</div>
          <div class="page-sub">Unified budget tracking and usage metrics</div>
        </div>
        <div class="page-meta">
          <button
            class="btn-secondary btn-small"
            @click=${() => state.handleAnalyticsExport()}
            ?disabled="${state.analyticsLoading}"
          >
            ${icons.download} Export
          </button>
          <button
            class="btn-secondary btn-small"
            @click=${() => state.handleAnalyticsLoad()}
            ?disabled="${state.analyticsLoading}"
          >
            ${state.analyticsLoading ? html`${icons.loader} Refreshing...` : html`${icons.refreshCw} Refresh`}
          </button>
        </div>
      </section>

      <!-- Time Range Selector -->
      <div class="analytics-filters">
        <div class="filter-group">
          <label>Period</label>
          <div class="toggle-group">
            ${renderPeriodToggle("1h", "1 Hour", state)}
            ${renderPeriodToggle("24h", "24 Hours", state)}
            ${renderPeriodToggle("7d", "7 Days", state)}
            ${renderPeriodToggle("30d", "30 Days", state)}
          </div>
        </div>
      </div>

      ${state.analyticsLoading && !budget && !metrics
        ? html`<div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading analytics...</p>
          </div>`
        : state.analyticsError
          ? html`<div class="error-container">
              <div class="error-icon">${icons.alertTriangle}</div>
              <p>${state.analyticsError}</p>
              <button @click=${() => state.handleAnalyticsLoad()} class="btn-primary">Retry</button>
            </div>`
          : html`
              <!-- Overview Cards -->
              <div class="analytics-overview">
                ${renderOverviewCards(budget, metrics, state)}
              </div>

              <div class="analytics-grid">
                <!-- Budget Section -->
                <div class="analytics-section">
                  <div class="section-header">
                    <h3>${icons.dollarSign} Budget</h3>
                    <button class="btn-text" @click=${() => state.handleBudgetConfigOpen()}>
                      ${icons.settings} Configure
                    </button>
                  </div>
                  ${renderBudgetSection(budget, state)}
                </div>

                <!-- Metrics Section -->
                <div class="analytics-section">
                  <div class="section-header">
                    <h3>${icons.activity} Usage Metrics</h3>
                  </div>
                  ${renderMetricsSection(metrics, state)}
                </div>
              </div>

              <!-- Model Breakdown -->
              <div class="analytics-section full-width">
                <div class="section-header">
                  <h3>${icons.layers} Usage by Model</h3>
                </div>
                ${renderModelBreakdown(metrics, state)}
              </div>

              <!-- Cost Breakdown -->
              <div class="analytics-section full-width">
                <div class="section-header">
                  <h3>${icons.pieChart} Cost Breakdown</h3>
                </div>
                ${renderCostBreakdown(budget, metrics, state)}
              </div>
            `}
    </div>
  `;
}

function renderPeriodToggle(value: string, label: string, state: AppViewState) {
  const isActive = state.analyticsPeriod === value;
  return html`
    <button
      class="toggle-btn ${isActive ? "active" : ""}"
      @click=${() => state.handleAnalyticsPeriodChange(value)}
    >
      ${label}
    </button>
  `;
}

function renderOverviewCards(budget: any, metrics: any, state: AppViewState) {
  const totalSpent = budget?.monthly?.spent || 0;
  const totalBudget = budget?.monthly?.limit || 0;
  const budgetPercent = budget?.monthly?.percentage || 0;
  const totalRequests = metrics?.summary?.totalRequests || 0;
  const totalCost = metrics?.summary?.totalCost || 0;
  const avgCost = metrics?.summary?.avgCostPerRequest || 0;
  const topModel = metrics?.byModel?.[0]?.model || "N/A";

  return html`
    <div class="overview-grid">
      <div class="overview-card budget">
        <div class="card-icon">${icons.wallet}</div>
        <div class="card-content">
          <div class="card-label">Monthly Budget</div>
          <div class="card-value">$${totalSpent.toFixed(2)} <span class="card-unit">/ $${totalBudget}</span></div>
          <div class="card-progress">
            <div class="progress-bar">
              <div class="progress-fill ${budgetPercent > 90 ? "danger" : budgetPercent > 70 ? "warning" : "success"}" 
                   style="width: ${Math.min(budgetPercent, 100)}%"></div>
            </div>
            <span class="progress-text">${budgetPercent.toFixed(1)}% used</span>
          </div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-icon">${icons.activity}</div>
        <div class="card-content">
          <div class="card-label">Total Requests</div>
          <div class="card-value">${totalRequests.toLocaleString()}</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-icon">${icons.dollarSign}</div>
        <div class="card-content">
          <div class="card-label">Total Cost</div>
          <div class="card-value">$${totalCost.toFixed(2)}</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-icon">${icons.zap}</div>
        <div class="card-content">
          <div class="card-label">Avg Cost/Request</div>
          <div class="card-value">$${avgCost.toFixed(4)}</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-icon">${icons.cpu}</div>
        <div class="card-content">
          <div class="card-label">Top Model</div>
          <div class="card-value">${topModel}</div>
        </div>
      </div>
    </div>
  `;
}

function renderBudgetSection(budget: any, state: AppViewState) {
  if (!budget) {
    return html`<div class="empty-state">
      <div class="empty-icon">${icons.barChart}</div>
      <p>No budget data available</p>
    </div>`;
  }

  const daily = budget.daily;
  const monthly = budget.monthly;

  return html`
    <div class="budget-details">
      <div class="budget-row">
        <div class="budget-item">
          <span class="budget-label">Daily Budget</span>
          <div class="budget-bar">
            <div class="budget-progress">
              <div class="budget-fill ${daily.percentage > 90 ? "danger" : daily.percentage > 70 ? "warning" : "success"}" 
                   style="width: ${Math.min(daily.percentage, 100)}%"></div>
            </div>
            <span class="budget-amount">$${daily.spent.toFixed(2)} / $${daily.limit}</span>
          </div>
        </div>
      </div>

      <div class="budget-row">
        <div class="budget-item">
          <span class="budget-label">Monthly Budget</span>
          <div class="budget-bar">
            <div class="budget-progress">
              <div class="budget-fill ${monthly.percentage > 90 ? "danger" : monthly.percentage > 70 ? "warning" : "success"}" 
                   style="width: ${Math.min(monthly.percentage, 100)}%"></div>
            </div>
            <span class="budget-amount">$${monthly.spent.toFixed(2)} / $${monthly.limit}</span>
          </div>
        </div>
      </div>

      ${budget.alerts?.length > 0 ? html`
        <div class="alerts-section">
          <h4>${icons.alertTriangle} Alerts</h4>
          ${budget.alerts.map((alert: any) => html`
            <div class="alert-item ${alert.type}">
              <span class="alert-message">${alert.message}</span>
            </div>
          `)}
        </div>
      ` : nothing}
    </div>
  `;
}

function renderMetricsSection(metrics: any, state: AppViewState) {
  if (!metrics) {
    return html`<div class="empty-state">
      <div class="empty-icon">${icons.activity}</div>
      <p>No metrics data available</p>
    </div>`;
  }

  const summary = metrics.summary;

  return html`
    <div class="metrics-details">
      <div class="metrics-row">
        <div class="metric-item">
          <span class="metric-label">Total Tokens</span>
          <span class="metric-value">${summary?.totalTokens?.toLocaleString() || 0}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Avg Tokens/Request</span>
          <span class="metric-value">${summary?.avgTokensPerRequest?.toFixed(0) || 0}</span>
        </div>
      </div>
      <div class="metrics-row">
        <div class="metric-item">
          <span class="metric-label">Avg Latency</span>
          <span class="metric-value">${metrics.avgLatency?.toFixed(0) || 0}ms</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value">${metrics.successRate?.toFixed(1) || 100}%</span>
        </div>
      </div>
    </div>
  `;
}

function renderModelBreakdown(metrics: any, state: AppViewState) {
  if (!metrics?.byModel || metrics.byModel.length === 0) {
    return html`<div class="empty-state">
      <div class="empty-icon">${icons.layers}</div>
      <p>No model usage data available</p>
    </div>`;
  }

  return html`
    <div class="models-table">
      <div class="table-header">
        <span class="col-model">Model</span>
        <span class="col-provider">Provider</span>
        <span class="col-requests">Requests</span>
        <span class="col-tokens">Tokens</span>
        <span class="col-cost">Cost</span>
        <span class="col-avg">Avg Latency</span>
      </div>
      ${metrics.byModel.map((model: any) => html`
        <div class="table-row">
          <span class="col-model">${model.model}</span>
          <span class="col-provider">${model.provider}</span>
          <span class="col-requests">${model.requests.toLocaleString()}</span>
          <span class="col-tokens">${model.tokens.toLocaleString()}</span>
          <span class="col-cost">$${model.cost.toFixed(2)}</span>
          <span class="col-avg">${model.avgLatency.toFixed(0)}ms</span>
        </div>
      `)}
    </div>
  `;
}

function renderCostBreakdown(budget: any, metrics: any, state: AppViewState) {
  const byProvider = metrics?.byProvider || [];

  if (byProvider.length === 0) {
    return html`<div class="empty-state">
      <div class="empty-icon">${icons.pieChart}</div>
      <p>No cost breakdown data available</p>
    </div>`;
  }

  const total = byProvider.reduce((sum: number, p: any) => sum + p.cost, 0);

  return html`
    <div class="cost-breakdown">
      <div class="breakdown-chart">
        ${byProvider.map((provider: any) => {
          const percentage = total > 0 ? (provider.cost / total) * 100 : 0;
          return html`
            <div class="breakdown-item">
              <div class="breakdown-bar">
                <div class="breakdown-fill" style="width: ${percentage}%"></div>
              </div>
              <div class="breakdown-info">
                <span class="breakdown-name">${provider.provider}</span>
                <span class="breakdown-value">$${provider.cost.toFixed(2)} (${percentage.toFixed(1)}%)</span>
              </div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
