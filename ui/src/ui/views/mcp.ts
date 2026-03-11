import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

// Category colors for UI
const CATEGORY_COLORS: Record<string, string> = {
  browser: "#3b82f6",
  database: "#10b981",
  cloud: "#f59e0b",
  development: "#8b5cf6",
  communication: "#ec4899",
  search: "#06b6d4",
  productivity: "#f97316",
  ai: "#a855f7",
  monitoring: "#ef4444",
  security: "#dc2626",
  data: "#14b8a6",
  api: "#6366f1",
  media: "#d946ef",
  "version-control": "#0ea5e9",
  testing: "#22c55e",
  other: "#6b7280",
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  browser: "Browser Automation",
  database: "Databases",
  cloud: "Cloud & DevOps",
  development: "Development Tools",
  communication: "Communication",
  search: "Search & Info",
  productivity: "Productivity",
  ai: "AI & ML",
  monitoring: "Monitoring",
  security: "Security",
  data: "Data & Analytics",
  api: "APIs & Integration",
  media: "Media & Content",
  "version-control": "Version Control",
  testing: "Testing",
  other: "Other",
};

export function renderMcpView(state: AppViewState) {
  const filteredServers = getFilteredServers(state);

  return html`
    <div class="mcp-view">
      ${renderHeader(state)}
      ${renderToolbar(state)}
      ${state.mcpLoading
        ? renderLoading()
        : state.mcpError
          ? renderError(state.mcpError, () => state.handleMcpLoad())
          : renderContent(state, filteredServers)}
      ${renderAddModal(state)}
      ${renderMarketplaceModal(state)}
    </div>
  `;
}

function renderHeader(state: AppViewState) {
  const connectedCount = state.mcpServers.filter((s) => s.status === "connected").length;

  return html`
    <div class="mcp-header">
      <div class="mcp-header-content">
        <div class="mcp-title-wrapper">
          <div class="mcp-icon">${icons.tool}</div>
          <div>
            <h1>MCP Servers</h1>
            <p class="subtitle">Manage Model Context Protocol servers and tools</p>
          </div>
        </div>

        <div class="mcp-stats">
          <div class="stat-card">
            <span class="stat-value">${state.mcpServers.length}</span>
            <span class="stat-label">Servers</span>
          </div>
          <div class="stat-card connected">
            <span class="stat-value">${connectedCount}</span>
            <span class="stat-label">Active</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderToolbar(state: AppViewState) {
  return html`
    <div class="mcp-toolbar">
      <div class="mcp-search">
        <div class="search-icon">${icons.search}</div>
        <input
          type="text"
          placeholder="Search MCP servers..."
          .value="${state.mcpSearchQuery}"
          @input="${(e: InputEvent) => state.handleMcpSearchChange((e.target as HTMLInputElement).value)}"
        />
        ${state.mcpSearchQuery
          ? html`
              <button class="clear-search" @click="${() => state.handleMcpSearchChange("")}">
                ${icons.x}
              </button>
            `
          : nothing}
      </div>

      <div class="mcp-actions">
        <button class="btn-secondary" @click="${() => state.handleMcpShowMarketplace()}">
          <span class="btn-icon">${icons.download}</span>
          Marketplace
        </button>

        <button class="btn-primary" @click="${() => state.handleMcpOpenAddModal()}">
          <span class="btn-icon">${icons.plus}</span>
          Add Server
        </button>
      </div>
    </div>
  `;
}

function renderLoading() {
  return html`
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading MCP servers...</p>
    </div>
  `;
}

function renderError(error: string, onRetry: () => void) {
  return html`
    <div class="error-state">
      <div class="error-icon">${icons.alertTriangle}</div>
      <p>${error}</p>
      <button @click="${onRetry}" class="btn-primary">Retry</button>
    </div>
  `;
}

function renderContent(state: AppViewState, filteredServers: typeof state.mcpServers) {
  return html`
    <div class="mcp-content">
      ${renderCategoryFilters(state)}
      ${filteredServers.length === 0 ? renderEmptyState(state) : renderServersGrid(state, filteredServers)}
    </div>
  `;
}

function renderCategoryFilters(state: AppViewState) {
  // Get categories with counts from installed servers
  const categories = getCategoriesWithCounts(state.mcpServers);

  return html`
    <div class="category-filters">
      <button
        class="category-filter ${!state.mcpSelectedCategory ? "active" : ""}"
        @click="${() => state.handleMcpCategoryChange(null)}"
      >
        <span class="filter-icon">${icons.grid}</span>
        <span class="filter-label">All</span>
        <span class="filter-count">${state.mcpServers.length}</span>
      </button>

      ${categories.map(({ key, count }) => {
        const color = CATEGORY_COLORS[key] || "#6b7280";
        return html`
          <button
            class="category-filter ${state.mcpSelectedCategory === key ? "active" : ""}"
            @click="${() => state.handleMcpCategoryChange(key)}"
            style="--category-color: ${color}"
          >
            <span class="filter-dot" style="background: ${color}"></span>
            <span class="filter-label">${CATEGORY_LABELS[key] || key}</span>
            <span class="filter-count">${count}</span>
          </button>
        `;
      })}
    </div>
  `;
}

function renderEmptyState(state: AppViewState) {
  return html`
    <div class="empty-state">
      <div class="empty-icon">${icons.package}</div>
      <h3>${state.mcpSearchQuery ? "No servers found" : "No MCP servers"}</h3>
      <p>
        ${state.mcpSearchQuery
          ? "Try adjusting your search or filters"
          : "Add an MCP server to extend agent capabilities with external tools."}
      </p>
      ${!state.mcpSearchQuery
        ? html`
            <div class="empty-actions">
              <button @click="${() => state.handleMcpShowMarketplace()}" class="btn-primary">
                Browse Marketplace
              </button>
              <button @click="${() => state.handleMcpOpenAddModal()}" class="btn-secondary">
                Add Custom Server
              </button>
            </div>
          `
        : nothing}
    </div>
  `;
}

function renderServersGrid(state: AppViewState, servers: typeof state.mcpServers) {
  return html`
    <div class="mcp-servers-grid">
      ${servers.map((server) => {
        const categoryColor = CATEGORY_COLORS[server.category || "other"] || "#6b7280";
        const isConnected = server.status === "connected";

        return html`
          <div class="mcp-server-card ${server.status}" data-server-id="${server.id}">
            <div class="server-card-header">
              <div class="server-icon-wrapper" style="background: ${categoryColor}">
                ${icons.tool}
              </div>

              <div class="server-toggle">
                <label class="toggle-switch">
                  <input
                    type="checkbox"
                    .checked="${isConnected}"
                    @change="${(e: InputEvent) =>
                      state.handleMcpToggleServer(server.id, (e.target as HTMLInputElement).checked)}"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="server-info">
              <h3>${server.name}</h3>
              ${server.category
                ? html`
                    <span class="server-category" style="color: ${categoryColor}; background: ${categoryColor}15">
                      ${CATEGORY_LABELS[server.category] || server.category}
                    </span>
                  `
                : nothing}
              ${server.description
                ? html` <p class="server-description">${server.description}</p> `
                : nothing}
            </div>

            <div class="server-card-footer">
              <div class="server-status">
                <span class="status-dot ${server.status}"></span>
                <span class="status-text">${formatStatus(server.status)}</span>
              </div>
              <button
                class="action-btn remove"
                title="Remove server"
                @click="${() => {
                  if (confirm(`Remove ${server.name}?`)) {
                    state.handleMcpRemoveServer(server.id);
                  }
                }}"
              >
                ${icons.trash}
              </button>
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

function renderAddModal(state: AppViewState) {
  if (!state.mcpShowAddModal) return nothing;

  return html`
    <div class="modal-overlay" @click="${() => state.handleMcpCloseAddModal()}">
      <div class="modal-content" @click="${(e: Event) => e.stopPropagation()}">
        <div class="modal-header">
          <h2>Add MCP Server</h2>
          <button class="modal-close" @click="${() => state.handleMcpCloseAddModal()}">
            ${icons.x}
          </button>
        </div>

        <div class="modal-body">
          ${state.mcpError
            ? html`
                <div class="modal-error">
                  ${icons.alertCircle}
                  <span>${state.mcpError}</span>
                </div>
              `
            : nothing}

          <div class="form-group">
            <label for="server-name">Server Name *</label>
            <input
              type="text"
              id="server-name"
              placeholder="e.g., My Database Server"
              .value="${state.mcpNewServerName}"
              @input="${(e: InputEvent) => state.handleMcpUpdateNewServerName((e.target as HTMLInputElement).value)}"
            />
          </div>

          <div class="form-group">
            <label for="server-url">Server URL *</label>
            <input
              type="text"
              id="server-url"
              placeholder="e.g., stdio://my-server or https://api.example.com"
              .value="${state.mcpNewServerUrl}"
              @input="${(e: InputEvent) => state.handleMcpUpdateNewServerUrl((e.target as HTMLInputElement).value)}"
            />
            <p class="form-hint">Use stdio:// for local commands or https:// for HTTP endpoints</p>
          </div>

          <div class="form-group">
            <label for="server-category">Category</label>
            <select
              id="server-category"
              .value="${state.mcpNewServerCategory}"
              @change="${(e: InputEvent) => state.handleMcpUpdateNewServerCategory((e.target as HTMLSelectElement).value)}"
            >
              ${Object.entries(CATEGORY_LABELS).map(([key, label]) => html` <option value="${key}">${label}</option> `)}
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="${() => state.handleMcpCloseAddModal()}">
            Cancel
          </button>
          <button
            class="btn-primary"
            @click="${() =>
              state.handleMcpAddServer(
                state.mcpNewServerName,
                state.mcpNewServerUrl,
                "stdio",
                state.mcpNewServerCategory,
              )}"
            ?disabled="${!state.mcpNewServerName || !state.mcpNewServerUrl}"
          >
            Add Server
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderMarketplaceModal(state: AppViewState) {
  if (!state.mcpShowMarketplace) return nothing;

  const hasActiveFilters =
    state.mcpMarketplaceSearchQuery ||
    state.mcpMarketplaceSelectedCategory ||
    state.mcpMarketplaceSelectedTag ||
    state.mcpMarketplaceOfficialOnly;

  return html`
    <div class="modal-overlay" @click="${() => state.handleMcpCloseMarketplace()}">
      <div class="modal-content modal-large" @click="${(e: Event) => e.stopPropagation()}">
        <div class="modal-header">
          <div class="modal-header-left">
            <h2>MCP Marketplace</h2>
            <span class="marketplace-count">${state.mcpMarketplace.length} servers</span>
          </div>
          <button class="modal-close" @click="${() => state.handleMcpCloseMarketplace()}">
            ${icons.x}
          </button>
        </div>

        <div class="marketplace-filters">
          <div class="marketplace-search">
            <div class="search-icon">${icons.search}</div>
            <input
              type="text"
              placeholder="Search marketplace..."
              .value="${state.mcpMarketplaceSearchQuery}"
              @input="${(e: InputEvent) =>
                state.handleMcpMarketplaceSearchChange((e.target as HTMLInputElement).value)}"
            />
          </div>

          <div class="filter-row">
            <select
              class="filter-select"
              .value="${state.mcpMarketplaceSelectedCategory || "all"}"
              @change="${(e: InputEvent) => {
                const value = (e.target as HTMLSelectElement).value;
                state.handleMcpMarketplaceCategoryChange(value === "all" ? null : value);
              }}"
            >
              <option value="all">All Categories</option>
              ${state.mcpMarketplaceCategories.map(
                (cat) => html` <option value="${cat.id}">${cat.name} (${cat.count})</option> `,
              )}
            </select>

            <select
              class="filter-select"
              .value="${state.mcpMarketplaceSelectedTag || ""}"
              @change="${(e: InputEvent) => {
                const value = (e.target as HTMLSelectElement).value;
                state.handleMcpMarketplaceTagChange(value || null);
              }}"
            >
              <option value="">All Tags</option>
              ${state.mcpMarketplaceTags.map((tag) => html` <option value="${tag}">${tag}</option> `)}
            </select>

            <label class="official-toggle">
              <input
                type="checkbox"
                .checked="${state.mcpMarketplaceOfficialOnly}"
                @change="${() => state.handleMcpMarketplaceOfficialToggle()}"
              />
              <span>Official only</span>
            </label>

            ${hasActiveFilters
              ? html`
                  <button class="btn-text" @click="${() => state.handleMcpResetMarketplaceFilters()}">
                    Clear filters
                  </button>
                `
              : nothing}
          </div>
        </div>

        <div class="modal-body">
          ${state.mcpMarketplaceLoading
            ? html`
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Loading marketplace...</p>
                </div>
              `
            : state.mcpMarketplace.length === 0
              ? html`
                  <div class="empty-state">
                    <div class="empty-icon">${icons.package}</div>
                    <h3>No servers found</h3>
                    <p>Try adjusting your search or filters.</p>
                  </div>
                `
              : html`
                  <div class="marketplace-grid">
                    ${state.mcpMarketplace.map((server) => renderMarketplaceItem(server, state),
                    )}
                  </div>
                `}
        </div>
      </div>
    </div>
  `;
}

function renderMarketplaceItem(
  server: {
    id: string;
    name: string;
    description: string;
    url: string;
    transport: string;
    category: string;
    installCommand?: string;
    tags?: string[];
    official?: boolean;
  },
  state: AppViewState,
) {
  const color = CATEGORY_COLORS[server.category] || "#6b7280";
  const isInstalled = state.mcpServers.some((s) => s.name === server.name);

  return html`
    <div class="marketplace-item">
      <div class="marketplace-item-header">
        <div class="marketplace-icon" style="background: ${color}">
          ${icons.tool}
        </div>
        <div class="marketplace-info">
          <div class="marketplace-title-row">
            <h4>${server.name}</h4>
            ${server.official
              ? html` <span class="official-badge">Official</span> `
              : nothing}
          </div>
          <span class="marketplace-category" style="color: ${color}">
            ${CATEGORY_LABELS[server.category] || server.category}
          </span>
        </div>
      </div>

      <p class="marketplace-description">${server.description}</p>

      ${server.tags?.length
        ? html`
            <div class="marketplace-tags">
              ${server.tags.slice(0, 3).map((tag) => html` <span class="tag">${tag}</span> `)}
              ${server.tags.length > 3 ? html` <span class="tag">+${server.tags.length - 3}</span> ` : nothing}
            </div>
          `
        : nothing}

      <div class="marketplace-footer">
        <div class="marketplace-meta">
          <code class="marketplace-transport">${server.transport}</code>
          ${server.installCommand
            ? html`
                <button
                  class="btn-icon-only"
                  title="Copy install command"
                  @click="${() => navigator.clipboard.writeText(server.installCommand!)}"
                >
                  ${icons.copy}
                </button>
              `
            : nothing}
        </div>

        ${isInstalled
          ? html` <button class="btn-secondary" disabled>Installed</button> `
          : html`
              <button
                class="btn-primary"
                @click="${() => state.handleMcpInstallFromMarketplace(server.id)}"
              >
                ${icons.plus}
                Install
              </button>
            `}
      </div>
    </div>
  `;
}

function getFilteredServers(state: AppViewState) {
  let servers = state.mcpServers;

  // Filter by category
  if (state.mcpSelectedCategory) {
    servers = servers.filter((s) => s.category === state.mcpSelectedCategory);
  }

  // Filter by search query
  if (state.mcpSearchQuery) {
    const query = state.mcpSearchQuery.toLowerCase();
    servers = servers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.url.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query),
    );
  }

  return servers;
}

function getCategoriesWithCounts(servers: Array<{ category?: string }>) {
  const counts = new Map<string, number>();

  servers.forEach((server) => {
    const category = server.category || "other";
    counts.set(category, (counts.get(category) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    connected: "Connected",
    disconnected: "Disconnected",
    connecting: "Connecting...",
    error: "Error",
  };
  return statusMap[status] || status;
}
