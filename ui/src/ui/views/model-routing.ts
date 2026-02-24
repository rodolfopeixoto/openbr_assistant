import { html } from "lit";
import type { AppViewState } from "../app-view-state";

export function renderModelRoutingView(state: AppViewState) {
  return html`
    <div class="model-routing-view">
      <section class="content-header">
        <div>
          <div class="page-title">Model Routing</div>
          <div class="page-sub">Intelligent model routing with 3-tier system</div>
        </div>
      </section>

      <div class="model-routing-content">
        ${state.modelRoutingLoading
          ? html`<div class="loading">Loading...</div>`
          : state.modelRoutingError
            ? html`<div class="error">${state.modelRoutingError}</div>`
            : html`
              <div class="routing-status">
                <h3>Routing Status</h3>
                <div class="status-grid">
                  <div class="status-card">
                    <div class="status-label">Current Tier</div>
                    <div class="status-value">${state.modelRoutingStatus?.currentTier || "N/A"}</div>
                  </div>
                  <div class="status-card">
                    <div class="status-label">Total Routed</div>
                    <div class="status-value">${state.modelRoutingStatus?.stats?.totalRouted || 0}</div>
                  </div>
                  <div class="status-card">
                    <div class="status-label">Cost Savings</div>
                    <div class="status-value">$${(state.modelRoutingStatus?.stats?.costSavings || 0).toFixed(4)}</div>
                  </div>
                  <div class="status-card">
                    <div class="status-label">Avg Latency</div>
                    <div class="status-value">${state.modelRoutingStatus?.stats?.avgLatency?.toFixed(2) || 0}ms</div>
                  </div>
                </div>
              </div>

              <div class="tiers-section">
                <h3>Tier Configuration</h3>
                <div class="tiers-grid">
                  <div class="tier-card tier-simple">
                    <div class="tier-header">
                      <span class="tier-icon">🟢</span>
                      <span class="tier-name">Simple</span>
                    </div>
                    <div class="tier-body">
                      <p>Prompts < 100 tokens</p>
                      <p>No complex tools</p>
                      <div class="tier-models">
                        <strong>Models:</strong> ollama/llama3.2:3b, gpt-4o-mini
                      </div>
                      <div class="tier-cost">
                        <strong>Cost:</strong> $0.0001/1K tokens
                      </div>
                    </div>
                  </div>

                  <div class="tier-card tier-medium">
                    <div class="tier-header">
                      <span class="tier-icon">🟡</span>
                      <span class="tier-name">Medium</span>
                    </div>
                    <div class="tier-body">
                      <p>Prompts 100-1000 tokens</p>
                      <p>Standard tools allowed</p>
                      <div class="tier-models">
                        <strong>Models:</strong> gpt-4o, claude-sonnet-3.5
                      </div>
                      <div class="tier-cost">
                        <strong>Cost:</strong> $0.0025/1K tokens
                      </div>
                    </div>
                  </div>

                  <div class="tier-card tier-complex">
                    <div class="tier-header">
                      <span class="tier-icon">🔴</span>
                      <span class="tier-name">Complex</span>
                    </div>
                    <div class="tier-body">
                      <p>Prompts > 1000 tokens</p>
                      <p>Complex tools (code, analysis)</p>
                      <div class="tier-models">
                        <strong>Models:</strong> gpt-4.5, claude-opus-3, o1
                      </div>
                      <div class="tier-cost">
                        <strong>Cost:</strong> $0.015/1K tokens
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="routing-actions">
                <button @click=${() => state.handleModelRoutingLoad()}>Refresh</button>
              </div>
            `}
      </div>
    </div>
  `;
}
