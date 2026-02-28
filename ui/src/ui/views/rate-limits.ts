import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

interface RateLimitStatus {
  enabled: boolean;
  currentThrottle: "none" | "light" | "heavy" | "blocked";
  queueSize: number;
  toolStatus: Record<string, {
    lastCall: number;
    callsInWindow: number;
    inCooldown: boolean;
    cooldownEnd: number | null;
  }>;
  recentHits: Array<{
    timestamp: number;
    tool: string;
    type: "throttle" | "429" | "cooldown";
    message: string;
  }>;
}

interface RateLimitConfig {
  global: {
    minTimeBetweenCalls: number;
  };
  perTool: Record<string, {
    minDelay: number;
    maxBatchSize: number;
    cooldownDuration: number;
    batchSimilarWork: boolean;
  }>;
}

export function renderRateLimitsView(state: AppViewState) {
  const status = state.rateLimitsStatus as RateLimitStatus | null;
  const config = state.rateLimitsConfig as RateLimitConfig | null;

  // Auto-load rate limits data on first render
  if (!status && !config && !state.rateLimitsLoading && !state.rateLimitsError && state.connected) {
    console.log("[RateLimits View] Auto-loading rate limits data...");
    state.handleRateLimitsLoad();
  }

  return html`
    <div class="rate-limits-view">
      <section class="content-header">
        <div>
          <div class="page-title">${icons.shield} Rate Limits</div>
          <div class="page-sub">Control API usage and prevent abuse</div>
        </div>
        <div class="page-meta">
          <button
            class="btn-secondary btn-small"
            @click=${() => state.handleRateLimitsLoad()}
            ?disabled="${state.rateLimitsLoading}"
          >
            ${state.rateLimitsLoading ? html`${icons.loader} Refreshing...` : html`${icons.refreshCw} Refresh`}
          </button>
          <button
            class="btn-primary btn-small"
            @click=${() => state.handleRateLimitsToggle(!status?.enabled)}
            ?disabled="${state.rateLimitsLoading}"
          >
            ${status?.enabled ? html`${icons.power} Disable` : html`${icons.power} Enable`}
          </button>
        </div>
      </section>

      <div class="rate-limits-content">
        ${state.rateLimitsLoading && !status
          ? html`<div class="loading-container">
              <div class="loading-spinner"></div>
              <p>Loading rate limits...</p>
            </div>`
          : state.rateLimitsError
            ? html`<div class="error-container">
                <div class="error-icon">${icons.alertTriangle}</div>
                <p>${state.rateLimitsError}</p>
                <button @click=${() => state.handleRateLimitsLoad()} class="btn-primary">Retry</button>
              </div>`
            : html`
              <div class="rate-limits-overview">
                <div class="rl-overview-card ${status?.enabled ? 'enabled' : 'disabled'}">
                  <div class="rl-card-icon">
                    ${status?.enabled ? icons.shield : icons.alertCircle}
                  </div>
                  <div class="rl-card-info">
                    <span class="rl-card-label">Status</span>
                    <span class="rl-card-value">${status?.enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>

                <div class="rl-overview-card">
                  <div class="rl-card-icon">${icons.activity}</div>
                  <div class="rl-card-info">
                    <span class="rl-card-label">Throttle Level</span>
                    <span class="rl-card-value ${status?.currentThrottle}">${status?.currentThrottle || 'none'}</span>
                  </div>
                </div>

                <div class="rl-overview-card">
                  <div class="rl-card-icon">${icons.layers}</div>
                  <div class="rl-card-info">
                    <span class="rl-card-label">Queue Size</span>
                    <span class="rl-card-value">${status?.queueSize || 0}</span>
                  </div>
                </div>

                ${status?.recentHits?.length ? html`
                  <div class="rl-overview-card warning">
                    <div class="rl-card-icon">${icons.alertTriangle}</div>
                    <div class="rl-card-info">
                      <span class="rl-card-label">Recent Hits</span>
                      <span class="rl-card-value">${status.recentHits.length}</span>
                    </div>
                  </div>
                ` : nothing}
              </div>

              ${config?.perTool ? html`
                <div class="rate-limits-section">
                  <h3>${icons.settings} Tool-Specific Configuration</h3>
                  <div class="tool-config-grid">
                    ${Object.entries(config.perTool).map(([toolName, toolConfig]) => {
                      const toolStatus = status?.toolStatus?.[toolName];
                      return html`
                        <div class="tool-config-card">
                          <div class="tool-config-header">
                            <span class="tool-name">${toolName}</span>
                            ${toolStatus?.inCooldown ? html`
                              <span class="tool-badge cooldown">Cooldown</span>
                            ` : toolStatus?.callsInWindow ? html`
                              <span class="tool-badge active">${toolStatus.callsInWindow} calls</span>
                            ` : nothing}
                          </div>
                          <div class="tool-config-details">
                            <div class="config-item">
                              <span class="config-label">Min Delay:</span>
                              <span class="config-value">${toolConfig.minDelay}ms</span>
                            </div>
                            <div class="config-item">
                              <span class="config-label">Max Batch:</span>
                              <span class="config-value">${toolConfig.maxBatchSize}</span>
                            </div>
                            <div class="config-item">
                              <span class="config-label">Cooldown:</span>
                              <span class="config-value">${Math.round(toolConfig.cooldownDuration / 1000)}s</span>
                            </div>
                            <div class="config-item">
                              <span class="config-label">Batch Work:</span>
                              <span class="config-value">${toolConfig.batchSimilarWork ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                </div>
              ` : nothing}

              ${status?.recentHits?.length ? html`
                <div class="rate-limits-section">
                  <h3>${icons.clock} Recent Rate Limit Events</h3>
                  <div class="hits-list">
                    ${status.recentHits.slice(-10).reverse().map(hit => html`
                      <div class="hit-item ${hit.type}">
                        <div class="hit-info">
                          <span class="hit-tool">${hit.tool}</span>
                          <span class="hit-type">${hit.type}</span>
                          <span class="hit-time">${new Date(hit.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <span class="hit-message">${hit.message}</span>
                      </div>
                    `)}
                  </div>
                </div>
              ` : nothing}

              <div class="rate-limits-actions">
                <button
                  class="btn-secondary"
                  @click=${() => state.handleRateLimitsReset()}
                  ?disabled="${state.rateLimitsLoading}"
                >
                  ${icons.refreshCw} Reset All Limits
                </button>
              </div>
            `}
      </div>
    </div>
  `;
}
