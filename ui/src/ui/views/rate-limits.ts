import { html } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

export function renderRateLimitsView(state: AppViewState) {
  return html`
    <div class="rate-limits-view">
      <section class="content-header">
        <div>
          <div class="page-title">Rate Limits</div>
          <div class="page-sub">Control API usage and prevent abuse</div>
        </div>
      </section>

      <div class="rate-limits-content">
        ${state.rateLimitsLoading
          ? html`<div class="loading">Loading...</div>`
          : state.rateLimitsError
            ? html`<div class="error">${state.rateLimitsError}</div>`
            : html`
              <div class="limits-status">
                <div class="status-card">
                  <div class="status-row">
                    <span class="status-label">Status:</span>
                    <span class="status-value ${state.rateLimitsStatus?.enabled ? 'enabled' : 'disabled'}">
                      ${state.rateLimitsStatus?.enabled ? html`${icons.check} Enabled` : html`${icons.x} Disabled`}
                    </span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Total Requests (This Minute):</span>
                    <span class="status-value">${state.rateLimitsStatus?.currentUsage?.totalRequests || 0}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Total Tokens (This Minute):</span>
                    <span class="status-value">${state.rateLimitsStatus?.currentUsage?.totalTokens || 0}</span>
                  </div>
                </div>
              </div>

              <div class="tool-limits">
                <h3>Tool-Specific Limits</h3>
                <div class="limits-grid">
                  <div class="limit-card">
                    <div class="limit-name">web_search</div>
                    <div class="limit-value">20 req/min</div>
                    <div class="limit-concurrent">3 concurrent</div>
                  </div>
                  <div class="limit-card">
                    <div class="limit-name">browser</div>
                    <div class="limit-value">30 req/min</div>
                    <div class="limit-concurrent">5 concurrent</div>
                  </div>
                  <div class="limit-card">
                    <div class="limit-name">code_interpreter</div>
                    <div class="limit-value">10 req/min</div>
                    <div class="limit-concurrent">2 concurrent</div>
                  </div>
                </div>
              </div>

              <div class="rate-limits-actions">
                <button @click=${() => state.handleRateLimitsLoad()}>Refresh</button>
              </div>
            `}
      </div>
    </div>
  `;
}
