import { html } from "lit";
import type { AppViewState } from "../app-view-state";

export function renderMetricsView(state: AppViewState) {
  return html`
    <div class="metrics-view">
      <section class="content-header">
        <div>
          <div class="page-title">Metrics</div>
          <div class="page-sub">Usage analytics and performance metrics</div>
        </div>
      </section>

      <div class="metrics-content">
        ${state.metricsLoading
          ? html`<div class="loading">Loading...</div>`
          : state.metricsError
            ? html`<div class="error">${state.metricsError}</div>`
            : html`
              <div class="metrics-overview">
                <div class="metrics-grid">
                  <div class="metric-card">
                    <div class="metric-label">Total Requests</div>
                    <div class="metric-value">${state.metricsStatus?.totalRequests || 0}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Total Tokens</div>
                    <div class="metric-value">${state.metricsStatus?.totalTokens || 0}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Total Cost</div>
                    <div class="metric-value">$${(state.metricsStatus?.totalCost || 0).toFixed(2)}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Avg Response Time</div>
                    <div class="metric-value">${state.metricsStatus?.avgResponseTime?.toFixed(0) || 0}ms</div>
                  </div>
                </div>
              </div>

              <div class="metrics-models">
                <h3>By Model</h3>
                <div class="models-table">
                  ${Object.entries(state.metricsStatus?.byModel || {}).map(([model, data]: [string, any]) => html`
                    <div class="model-row">
                      <span class="model-name">${model}</span>
                      <span class="model-requests">${data.requests} req</span>
                      <span class="model-tokens">${data.tokens} tokens</span>
                      <span class="model-cost">$${data.cost.toFixed(2)}</span>
                    </div>
                  `)}
                </div>
              </div>

              <div class="metrics-actions">
                <button @click=${() => state.handleMetricsLoad()}>Refresh</button>
              </div>
            `}
      </div>
    </div>
  `;
}
