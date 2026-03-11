import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Provider } from "../types/providers.js";
import "./ProviderCard.js";

export type ViewMode = "grid" | "list";
export type FilterStatus = "all" | "configured" | "unconfigured" | "error";

@customElement("providers-list")
export class ProvidersList extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .container {
      padding: 24px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title {
      font-size: 24px;
      font-weight: 600;
      color: var(--text, #fff);
      margin: 0;
    }

    .subtitle {
      font-size: 14px;
      color: var(--muted, #888);
      margin-top: 4px;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-select {
      padding: 8px 12px;
      background: var(--bg, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text, #fff);
      cursor: pointer;
      outline: none;
    }

    .filter-select:focus {
      border-color: var(--accent, #6366f1);
    }

    .view-toggle {
      display: flex;
      gap: 4px;
      background: var(--bg, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      padding: 4px;
    }

    .view-btn {
      background: none;
      border: none;
      color: var(--muted, #888);
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .view-btn:hover {
      color: var(--text, #fff);
      background: var(--bg-hover, #252540);
    }

    .view-btn.active {
      color: var(--text, #fff);
      background: var(--bg-accent, #2d2d44);
    }

    .search-box {
      position: relative;
    }

    .search-input {
      padding: 8px 12px 8px 36px;
      background: var(--bg, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text, #fff);
      width: 240px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--accent, #6366f1);
    }

    .search-input::placeholder {
      color: var(--muted, #666);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted, #888);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .list provider-card::part(card) {
      max-width: none;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      color: var(--muted, #888);
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text, #fff);
      margin-bottom: 8px;
    }

    .empty-desc {
      font-size: 14px;
      color: var(--muted, #888);
    }

    .stats-bar {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
      padding: 16px 20px;
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 10px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 600;
      color: var(--text, #fff);
    }

    .stat-label {
      font-size: 13px;
      color: var(--muted, #888);
    }

    .loading-state {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .skeleton-card {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      padding: 20px;
      height: 280px;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        align-items: flex-start;
      }

      .search-input {
        width: 100%;
      }

      .grid {
        grid-template-columns: 1fr;
      }

      .stats-bar {
        flex-wrap: wrap;
        gap: 16px;
      }
    }
  `;

  @property({ type: Array }) providers: Provider[] = [];
  @property({ type: Boolean }) loading = false;
  
  @state() private viewMode: ViewMode = "grid";
  @state() private filterStatus: FilterStatus = "all";
  @state() private searchQuery = "";

  private get filteredProviders(): Provider[] {
    let filtered = this.providers;

    // Filter by status
    if (this.filterStatus !== "all") {
      filtered = filtered.filter(p => p.status === this.filterStatus);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  private get stats() {
    const total = this.providers.length;
    const configured = this.providers.filter(p => p.status === "configured").length;
    const withErrors = this.providers.filter(p => p.status === "error").length;
    const totalModels = this.providers.reduce((sum, p) => sum + p.modelsCount, 0);

    return { total, configured, withErrors, totalModels };
  }

  private handleConfigure(e: CustomEvent) {
    this.dispatchEvent(
      new CustomEvent("configure", {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleManage(e: CustomEvent) {
    this.dispatchEvent(
      new CustomEvent("manage", {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderStatsBar() {
    const { total, configured, withErrors, totalModels } = this.stats;

    return html`
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-value">${total}</span>
          <span class="stat-label">Total Providers</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" style="color: #22c55e;">${configured}</span>
          <span class="stat-label">Configured</span>
        </div>
        ${withErrors > 0 ? html`
          <div class="stat-item">
            <span class="stat-value" style="color: #ef4444;">${withErrors}</span>
            <span class="stat-label">Errors</span>
          </div>
        ` : null}
        <div class="stat-item">
          <span class="stat-value">${totalModels}</span>
          <span class="stat-label">Available Models</span>
        </div>
      </div>
    `;
  }

  private renderControls() {
    return html`
      <div class="controls">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            class="search-input"
            placeholder="Search providers..."
            .value=${this.searchQuery}
            @input=${(e: Event) => this.searchQuery = (e.target as HTMLInputElement).value}
          />
        </div>

        <select 
          class="filter-select"
          .value=${this.filterStatus}
          @change=${(e: Event) => this.filterStatus = (e.target as HTMLSelectElement).value as FilterStatus}
        >
          <option value="all">All Status</option>
          <option value="configured">Configured</option>
          <option value="unconfigured">Not Configured</option>
          <option value="error">Error</option>
        </select>

        <div class="view-toggle">
          <button 
            class="view-btn ${this.viewMode === "grid" ? "active" : ""}"
            @click=${() => this.viewMode = "grid"}
            title="Grid view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
          <button 
            class="view-btn ${this.viewMode === "list" ? "active" : ""}"
            @click=${() => this.viewMode = "list"}
            title="List view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private renderLoading() {
    return html`
      <div class="loading-state">
        ${[1, 2, 3, 4, 5, 6].map(() => html`
          <div class="skeleton-card"></div>
        `)}
      </div>
    `;
  }

  private renderEmpty() {
    return html`
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <div class="empty-title">No providers found</div>
        <div class="empty-desc">
          ${this.searchQuery || this.filterStatus !== "all" 
            ? "Try adjusting your filters" 
            : "No AI providers are available at the moment"}
        </div>
      </div>
    `;
  }

  private renderProviderGrid() {
    const providers = this.filteredProviders;

    if (providers.length === 0) {
      return this.renderEmpty();
    }

    return html`
      <div class="grid">
        ${providers.map(provider => html`
          <providers-card
            .provider=${provider}
            @configure=${this.handleConfigure}
            @manage=${this.handleManage}
          ></providers-card>
        `)}
      </div>
    `;
  }

  private renderProviderList() {
    const providers = this.filteredProviders;

    if (providers.length === 0) {
      return this.renderEmpty();
    }

    return html`
      <div class="list">
        ${providers.map(provider => html`
          <providers-card
            .provider=${provider}
            @configure=${this.handleConfigure}
            @manage=${this.handleManage}
          ></providers-card>
        `)}
      </div>
    `;
  }

  render() {
    return html`
      <div class="container">
        <div class="header">
          <div>
            <h1 class="title">AI Providers</h1>
            <div class="subtitle">Manage your AI model providers and credentials</div>
          </div>
          ${this.renderControls()}
        </div>

        ${this.renderStatsBar()}

        ${this.loading 
          ? this.renderLoading() 
          : this.viewMode === "grid" 
            ? this.renderProviderGrid() 
            : this.renderProviderList()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "providers-list": ProvidersList;
  }
}
