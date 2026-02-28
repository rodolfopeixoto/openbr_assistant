import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

// Cache type colors
const CACHE_TYPE_COLORS: Record<string, string> = {
  memory: "#10b981",
  sqlite: "#3b82f6",
  file: "#f59e0b",
  redis: "#ef4444",
};

export function renderCacheView(state: AppViewState) {
  // Auto-load cache data on first render
  if (!state.cacheStatus && !state.cacheLoading && !state.cacheError && state.connected) {
    console.log("[Cache View] Auto-loading cache data...");
    state.handleCacheLoad();
  }

  const cacheStatus = state.cacheStatus as {
    caches?: Array<{
      name: string;
      type: string;
      size: number;
      maxSize: number;
      hitRate: number;
      missRate: number;
      ttl: number;
      entries?: number;
      bytesUsed?: number;
    }>;
    total?: {
      totalSize: number;
      totalBytes: number;
      avgHitRate: number;
      cacheCount: number;
    };
  } | null;

  const caches = cacheStatus?.caches || [];
  const total = cacheStatus?.total;

  return html`
    <div class="cache-view">
      <section class="content-header">
        <div>
          <div class="page-title">${icons.database} Cache Management</div>
          <div class="page-sub">Monitor and manage cache performance and configuration</div>
        </div>
        <div class="page-meta">
          <button
            class="btn-secondary btn-small"
            @click=${() => state.handleCacheLoad()}
            ?disabled="${state.cacheLoading}"
          >
            ${state.cacheLoading 
              ? html`${icons.loader} Refreshing...` 
              : html`${icons.refreshCw} Refresh`}
          </button>
          <button
            class="btn-danger btn-small"
            @click=${() => {
              if (confirm("Are you sure you want to clear all caches?")) {
                state.handleCacheClear();
              }
            }}
            ?disabled="${state.cacheLoading || caches.length === 0}"
          >
            ${icons.trash} Clear All
          </button>
        </div>
      </section>

      ${state.cacheLoading && !cacheStatus
        ? html`
          <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading cache data...</p>
          </div>
        `
        : state.cacheError
          ? html`
            <div class="error-container">
              <div class="error-icon">${icons.alertTriangle}</div>
              <p>${state.cacheError}</p>
              <button @click=${() => state.handleCacheLoad()} class="btn-primary">Retry</button>
            </div>
          `
          : html`
            ${total ? renderOverviewCards(total) : nothing}
            ${caches.length > 0 
              ? html`
                <div class="cache-section">
                  <div class="section-header">
                    <h3>${icons.server} Cache Instances</h3>
                    <span class="cache-count">${caches.length} active</span>
                  </div>
                  <div class="cache-grid">
                    ${caches.map((cache) => renderCacheCard(cache, state))}
                  </div>
                </div>
              `
              : html`
                <div class="empty-state">
                  <div class="empty-icon">${icons.database}</div>
                  <h3>No Caches</h3>
                  <p>No cache instances are currently configured.</p>
                </div>
              `}
          `}
    </div>
  `;
}

function renderOverviewCards(total: {
  totalSize: number;
  totalBytes: number;
  avgHitRate: number;
  cacheCount: number;
}) {
  return html`
    <div class="overview-grid">
      <div class="overview-card">
        <div class="card-icon">${icons.server}</div>
        <div class="card-content">
          <div class="card-label">Active Caches</div>
          <div class="card-value">${total.cacheCount}</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-icon">${icons.layers}</div>
        <div class="card-content">
          <div class="card-label">Total Size</div>
          <div class="card-value">${formatBytes(total.totalBytes)}</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-icon">${icons.activity}</div>
        <div class="card-content">
          <div class="card-label">Avg Hit Rate</div>
          <div class="card-value ${total.avgHitRate > 80 ? 'success' : total.avgHitRate > 50 ? 'warning' : 'danger'}">
            ${total.avgHitRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-icon">${icons.clock}</div>
        <div class="card-content">
          <div class="card-label">Memory Used</div>
          <div class="card-value">${(total.totalSize / 1024 / 1024).toFixed(1)} MB</div>
        </div>
      </div>
    </div>
  `;
}

function renderCacheCard(
  cache: {
    name: string;
    type: string;
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
    ttl: number;
    entries?: number;
    bytesUsed?: number;
  },
  state: AppViewState
) {
  const color = CACHE_TYPE_COLORS[cache.type] || "#6b7280";
  const usagePercent = cache.maxSize > 0 ? (cache.size / cache.maxSize) * 100 : 0;

  return html`
    <div class="cache-card">
      <div class="cache-card-header">
        <div class="cache-type-icon" style="background: ${color}">
          ${icons.database}
        </div>
        <div class="cache-info">
          <h4>${cache.name}</h4>
          <span class="cache-type" style="color: ${color}">${cache.type.toUpperCase()}</span>
        </div>
        <button 
          class="action-btn remove" 
          title="Clear cache"
          @click=${() => {
            if (confirm(`Clear cache "${cache.name}"?`)) {
              state.handleCacheClear(cache.name);
            }
          }}
        >
          ${icons.trash}
        </button>
      </div>

      <div class="cache-stats">
        <div class="stat-row">
          <span class="stat-label">Entries</span>
          <span class="stat-value">${cache.entries?.toLocaleString() || 0}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Size</span>
          <span class="stat-value">${formatBytes(cache.bytesUsed || 0)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Hit Rate</span>
          <span class="stat-value ${cache.hitRate > 80 ? 'success' : cache.hitRate > 50 ? 'warning' : 'danger'}">
            ${cache.hitRate.toFixed(1)}%
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label">TTL</span>
          <span class="stat-value">${formatTTL(cache.ttl)}</span>
        </div>
      </div>

      <div class="cache-usage">
        <div class="usage-bar">
          <div 
            class="usage-fill ${usagePercent > 90 ? 'danger' : usagePercent > 70 ? 'warning' : 'success'}"
            style="width: ${Math.min(usagePercent, 100)}%"
          ></div>
        </div>
        <span class="usage-text">${usagePercent.toFixed(1)}% used</span>
      </div>
    </div>
  `;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatTTL(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
