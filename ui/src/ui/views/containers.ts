import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

// Status colors for containers
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", dot: "#10b981" },
  stopped: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", dot: "#ef4444" },
  paused: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", dot: "#f59e0b" },
  restarting: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", dot: "#3b82f6" },
  exited: { bg: "rgba(107, 114, 128, 0.15)", text: "#6b7280", dot: "#6b7280" },
};

export function renderContainersView(state: AppViewState) {
  // Auto-load containers on first render
  if (state.containers.length === 0 && !state.containersLoading && !state.containersError && state.connected) {
    console.log("[Containers View] Auto-loading containers...");
    state.handleContainersLoad();
  }

  const runningCount = state.containers.filter((c) => c.status === "running").length;
  const stoppedCount = state.containers.filter((c) => c.status === "stopped" || c.status === "exited").length;

  return html`
    <div class="containers-view">
      <section class="content-header">
        <div>
          <div class="page-title">${icons.box} Containers</div>
          <div class="page-sub">Manage Docker containers for agents and services</div>
        </div>
        <div class="page-meta">
          <button
            class="btn-secondary btn-small"
            @click=${() => state.handleContainersLoad()}
            ?disabled="${state.containersLoading}"
          >
            ${state.containersLoading
              ? html`${icons.loader} Refreshing...`
              : html`${icons.refreshCw} Refresh`}
          </button>
        </div>
      </section>

      ${state.containersLoading && state.containers.length === 0
        ? html`
            <div class="loading-container">
              <div class="spinner"></div>
              <p>Loading containers...</p>
            </div>
          `
        : state.containersError
          ? html`
              <div class="error-container">
                <div class="error-icon">${icons.alertTriangle}</div>
                <p>${state.containersError}</p>
                <button @click=${() => state.handleContainersLoad()} class="btn-primary">
                  Retry
                </button>
              </div>
            `
          : html`
              ${state.containers.length > 0
                ? html`
                    <div class="containers-overview">
                      <div class="overview-card">
                        <div class="card-icon">${icons.box}</div>
                        <div class="card-content">
                          <div class="card-label">Total Containers</div>
                          <div class="card-value">${state.containers.length}</div>
                        </div>
                      </div>

                      <div class="overview-card success">
                        <div class="card-icon">${icons.play}</div>
                        <div class="card-content">
                          <div class="card-label">Running</div>
                          <div class="card-value">${runningCount}</div>
                        </div>
                      </div>

                      <div class="overview-card danger">
                        <div class="card-icon">${icons.stop}</div>
                        <div class="card-content">
                          <div class="card-label">Stopped</div>
                          <div class="card-value">${stoppedCount}</div>
                        </div>
                      </div>
                    </div>
                  `
                : nothing}

              <div class="containers-section">
                ${state.containers.length === 0
                  ? html`
                      <div class="empty-state">
                        <div class="empty-icon">${icons.box}</div>
                        <h3>No containers found</h3>
                        <p>Docker containers will appear here when agents are running.</p>
                      </div>
                    `
                  : html`
                      <div class="section-header">
                        <h3>${icons.list} Container List</h3>
                        <span class="container-count">${state.containers.length} total</span>
                      </div>
                      <div class="containers-grid">
                        ${state.containers.map((container) => renderContainerCard(container, state))}
                      </div>
                    `}
              </div>
            `}
    </div>
  `;
}

function renderContainerCard(
  container: {
    id: string;
    name: string;
    image: string;
    status: string;
    created?: string;
    ports?: string[];
  },
  state: AppViewState
) {
  const statusStyle = STATUS_COLORS[container.status] || STATUS_COLORS.exited;

  return html`
    <div class="container-card" data-container-id="${container.id}">
      <div class="container-card-header">
        <div class="container-icon-wrapper">
          <div class="container-icon">${icons.box}</div>
        </div>

        <div class="container-info">
          <h4 class="container-name">${container.name}</h4>
          <div class="container-meta">
            <span class="container-image">${container.image}</span>
            ${container.created
              ? html`<span class="container-created">${icons.clock} ${formatDate(container.created)}</span>`
              : nothing}
          </div>
        </div>

        <div class="container-status-wrapper">
          <span
            class="status-badge"
            style="background: ${statusStyle.bg}; color: ${statusStyle.text};"
          >
            <span class="status-dot" style="background: ${statusStyle.dot};"></span>
            ${container.status}
          </span>
        </div>
      </div>

      ${container.ports?.length
        ? html`
            <div class="container-ports">
              ${container.ports.map((port) => html` <span class="port-tag">${port}</span> `)}
            </div>
          `
        : nothing}

      <div class="container-actions">
        ${container.status === "running"
          ? html`
              <button
                @click=${() => state.handleContainerStop(container.id)}
                class="btn-secondary btn-small"
              >
                ${icons.stop} Stop
              </button>
              <button
                @click=${() => state.handleContainerRestart(container.id)}
                class="btn-secondary btn-small"
              >
                ${icons.refreshCw} Restart
              </button>
            `
          : html`
              <button
                @click=${() => state.handleContainerStart(container.id)}
                class="btn-primary btn-small"
              >
                ${icons.play} Start
              </button>
            `}
        <button
          @click=${() => state.handleContainerLogs(container.id)}
          class="btn-secondary btn-small"
        >
          ${icons.fileText} Logs
        </button>
        <button
          @click=${() => {
            if (confirm(`Remove container "${container.name}"?`)) {
              state.handleContainerRemove?.(container.id);
            }
          }}
          class="btn-danger btn-small"
        >
          ${icons.trash} Remove
        </button>
      </div>
    </div>
  `;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
