import { html } from "lit";
import type { AppViewState } from "../app-view-state";

export function renderCacheView(state: AppViewState) {
  return html`
    <div class="cache-view">
      <section class="content-header">
        <div>
          <div class="page-title">Cache</div>
          <div class="page-sub">Cache management and statistics</div>
        </div>
      </section>

      <div class="cache-content">
        ${state.cacheLoading
          ? html`<div class="loading">Loading...</div>`
          : state.cacheError
            ? html`<div class="error">${state.cacheError}</div>`
            : html`
              <div class="cache-status">
                <div class="status-grid">
                  <div class="status-card">
                    <div class="status-label">Entries</div>
                    <div class="status-value">${state.cacheStatus?.entries || 0}</div>
                  </div>
                  <div class="status-card">
                    <div class="status-label">Total Size</div>
                    <div class="status-value">${((state.cacheStatus?.totalSize || 0) / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <div class="status-card">
                    <div class="status-label">Hit Rate</div>
                    <div class="status-value">${(state.cacheStatus?.hitRate || 0).toFixed(1)}%</div>
                  </div>
                  <div class="status-card">
                    <div class="status-label">Miss Rate</div>
                    <div class="status-value">${(state.cacheStatus?.missRate || 0).toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div class="cache-config">
                <h3>Configuration</h3>
                <div class="config-grid">
                  <div class="config-row">
                    <span class="config-label">Max Size:</span>
                    <span class="config-value">${((state.cacheStatus?.config?.maxSize || 0) / 1024 / 1024).toFixed(0)} MB</span>
                  </div>
                  <div class="config-row">
                    <span class="config-label">TTL:</span>
                    <span class="config-value">${state.cacheStatus?.config?.ttl || 3600}s</span>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Compression:</span>
                    <span class="config-value">${state.cacheStatus?.config?.compression ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>

              <div class="cache-actions">
                <button @click=${() => state.handleCacheLoad()}>Refresh</button>
                <button @click=${() => state.handleCacheClear()} class="danger">Clear Cache</button>
              </div>
            `}
      </div>
    </div>
  `;
}
