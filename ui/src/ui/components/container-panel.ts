import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface ContainerInfo {
  containerId: string;
  state: "pending" | "running" | "stopped" | "error";
  startedAt?: Date;
  finishedAt?: Date;
  exitCode?: number;
  error?: string;
  sessionId?: string;
  agentId?: string;
}

export interface RuntimeInfo {
  type: "docker" | "apple-container" | "podman" | null;
  version: string;
  path: string;
}

@customElement("container-panel")
export class ContainerPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family, system-ui, -apple-system, sans-serif);
    }

    .panel {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      padding: 20px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border, #2d2d44);
    }

    .panel-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary, #e2e8f0);
      margin: 0;
    }

    .runtime-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .runtime-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--bg-secondary, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
    }

    .runtime-icon {
      font-size: 14px;
    }

    .container-count {
      font-size: 14px;
      color: var(--text-secondary, #94a3b8);
    }

    .container-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .container-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-secondary, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .container-item:hover {
      border-color: var(--border-strong, #3d3d5c);
    }

    .container-item.running {
      border-left: 3px solid #22c55e;
    }

    .container-item.pending {
      border-left: 3px solid #f59e0b;
    }

    .container-item.stopped {
      border-left: 3px solid #64748b;
    }

    .container-item.error {
      border-left: 3px solid #ef4444;
    }

    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-indicator.running {
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
    }

    .status-indicator.pending {
      background: #f59e0b;
      animation: pulse 1.5s infinite;
    }

    .status-indicator.stopped {
      background: #64748b;
    }

    .status-indicator.error {
      background: #ef4444;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .container-info {
      flex: 1;
      min-width: 0;
    }

    .container-id {
      font-family: var(--font-mono, "Fira Code", monospace);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary, #e2e8f0);
      margin-bottom: 4px;
    }

    .container-meta {
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .container-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border: 1px solid var(--border, #2d2d44);
      border-radius: 6px;
      background: var(--bg-elevated, #1a1a2e);
      color: var(--text-primary, #e2e8f0);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:hover {
      background: var(--bg-secondary, #0f0f1a);
      border-color: var(--border-strong, #3d3d5c);
    }

    .btn-danger {
      border-color: #ef4444;
      color: #ef4444;
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary, #94a3b8);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state-text {
      font-size: 14px;
      line-height: 1.5;
    }

    .error-message {
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: #ef4444;
      font-size: 12px;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--border, #2d2d44);
      border-radius: 6px;
      color: var(--text-secondary, #94a3b8);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .refresh-btn:hover {
      border-color: var(--border-strong, #3d3d5c);
      color: var(--text-primary, #e2e8f0);
    }

    .refresh-btn.spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .logs-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .logs-content {
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border, #2d2d44);
    }

    .logs-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary, #e2e8f0);
    }

    .logs-body {
      flex: 1;
      overflow: auto;
      padding: 16px 20px;
      font-family: var(--font-mono, "Fira Code", monospace);
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-secondary, #94a3b8);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-secondary, #94a3b8);
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
    }

    .close-btn:hover {
      color: var(--text-primary, #e2e8f0);
    }
  `;

  @property({ type: Array }) containers: ContainerInfo[] = [];
  @property({ type: Object }) runtime: RuntimeInfo | null = null;
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = "";

  @state() private selectedContainer: ContainerInfo | null = null;
  @state() private showLogs = false;
  @state() private containerLogs = "";
  @state() private logsLoading = false;

  render() {
    return html`
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Containers</h3>
            <div class="runtime-info">
              ${this.runtime
                ? html`
                    <span class="runtime-badge">
                      <span class="runtime-icon">${this.getRuntimeIcon()}</span>
                      ${this.runtime.type}
                      ${this.runtime.version ? html`<span>v${this.runtime.version}</span>` : ""}
                    </span>
                  `
                : html`<span class="runtime-badge">No runtime detected</span>`}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="container-count">${this.containers.length} active</span>
            <button
              class="refresh-btn ${this.loading ? "spinning" : ""}"
              @click="${this.handleRefresh}"
              ?disabled="${this.loading}"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>

        ${this.error
          ? html`<div class="error-message">${this.error}</div>`
          : ""}

        <div class="container-list">
          ${this.containers.length === 0
            ? html`
                <div class="empty-state">
                  <div class="empty-state-icon">🐳</div>
                  <div class="empty-state-text">
                    No active containers.<br />
                    Containers are created automatically when agents execute tools securely.
                  </div>
                </div>
              `
            : this.containers.map(
                (container) => html`
                  <div class="container-item ${container.state}">
                    <div class="status-indicator ${container.state}"></div>
                    <div class="container-info">
                      <div class="container-id">${container.containerId.slice(0, 12)}</div>
                      <div class="container-meta">
                        ${container.sessionId
                          ? html`<span class="meta-item">Session: ${container.sessionId}</span>`
                          : ""}
                        ${container.agentId
                          ? html`<span class="meta-item">Agent: ${container.agentId}</span>`
                          : ""}
                        ${container.startedAt
                          ? html`<span class="meta-item">${this.formatDuration(container.startedAt)}</span>`
                          : ""}
                        ${container.exitCode !== undefined
                          ? html`<span class="meta-item">Exit: ${container.exitCode}</span>`
                          : ""}
                      </div>
                      ${container.error
                        ? html`<div class="error-message">${container.error}</div>`
                        : ""}
                    </div>
                    <div class="container-actions">
                      <button
                        class="btn"
                        @click="${() => this.viewLogs(container)}"
                        ?disabled="${container.state === "pending"}"
                      >
                        Logs
                      </button>
                      ${container.state === "running"
                        ? html`
                            <button
                              class="btn btn-danger"
                              @click="${() => this.stopContainer(container)}"
                            >
                              Stop
                            </button>
                          `
                        : ""}
                    </div>
                  </div>
                `
              )}
        </div>

        ${this.showLogs
          ? html`
              <div class="logs-modal" @click="${this.closeLogs}">
                <div class="logs-content" @click="${(e: Event) => e.stopPropagation()}">
                  <div class="logs-header">
                    <span class="logs-title">
                      Logs: ${this.selectedContainer?.containerId.slice(0, 12)}
                    </span>
                    <button class="close-btn" @click="${this.closeLogs}">×</button>
                  </div>
                  <div class="logs-body">
                    ${this.logsLoading
                      ? "Loading logs..."
                      : this.containerLogs || "No logs available"}
                  </div>
                </div>
              </div>
            `
          : ""}
      </div>
    `;
  }

  private getRuntimeIcon(): string {
    const icons: Record<string, string> = {
      docker: "🐳",
      "apple-container": "🍎",
      podman: "📦",
    };
    return this.runtime?.type ? icons[this.runtime.type] || "🔲" : "🔲";
  }

  private formatDuration(startedAt: Date): string {
    const seconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  private handleRefresh() {
    this.dispatchEvent(new CustomEvent("refresh", { bubbles: true, composed: true }));
  }

  private async viewLogs(container: ContainerInfo) {
    this.selectedContainer = container;
    this.showLogs = true;
    this.logsLoading = true;
    this.containerLogs = "";

    this.dispatchEvent(
      new CustomEvent("view-logs", {
        detail: { containerId: container.containerId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private stopContainer(container: ContainerInfo) {
    this.dispatchEvent(
      new CustomEvent("stop-container", {
        detail: { containerId: container.containerId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private closeLogs() {
    this.showLogs = false;
    this.selectedContainer = null;
    this.containerLogs = "";
  }

  // Public method to set logs from parent component
  setLogs(logs: string) {
    this.containerLogs = logs;
    this.logsLoading = false;
  }

  // Public method to set logs error
  setLogsError(error: string) {
    this.containerLogs = `Error loading logs: ${error}`;
    this.logsLoading = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "container-panel": ContainerPanel;
  }
}
