import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface MCPServerUI {
  id: string;
  name: string;
  url: string;
  transport: "stdio" | "http" | "websocket";
  connected: boolean;
  tools: MCPToolUI[];
  resources: MCPResourceUI[];
  enabled: boolean;
  lastError?: string;
}

export interface MCPToolUI {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResourceUI {
  uri: string;
  name: string;
  description?: string;
}

export interface MCPInspectorEventUI {
  timestamp: string;
  direction: "sent" | "received";
  type: "request" | "response" | "notification" | "error";
  content: unknown;
}

@customElement("mcp-inspector")
export class MCPInspector extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family, system-ui, -apple-system, sans-serif);
      height: 100%;
    }

    .inspector {
      display: grid;
      grid-template-columns: 300px 1fr 400px;
      height: 100%;
      background: var(--bg-primary, #0f0f1a);
      color: var(--text-primary, #e2e8f0);
    }

    /* Server List Panel */
    .servers-panel {
      border-right: 1px solid var(--border, #2d2d44);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-header {
      padding: 16px;
      border-bottom: 1px solid var(--border, #2d2d44);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }

    .btn-icon {
      width: 28px;
      height: 28px;
      border: none;
      background: var(--bg-secondary, #1a1a2e);
      color: var(--text-primary, #e2e8f0);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .btn-icon:hover {
      background: var(--bg-elevated, #252540);
    }

    .servers-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .server-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 4px;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .server-item:hover {
      background: var(--bg-secondary, #1a1a2e);
    }

    .server-item.selected {
      background: var(--bg-secondary, #1a1a2e);
      border-color: var(--accent, #6366f1);
    }

    .server-name {
      font-weight: 500;
      font-size: 13px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .server-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .server-status.connected {
      background: #22c55e;
    }

    .server-status.disconnected {
      background: #64748b;
    }

    .server-status.error {
      background: #ef4444;
    }

    .server-url {
      font-size: 11px;
      color: var(--text-secondary, #94a3b8);
      font-family: var(--font-mono, monospace);
    }

    .server-meta {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      font-size: 11px;
    }

    .server-tag {
      padding: 2px 6px;
      background: var(--bg-elevated, #252540);
      border-radius: 4px;
      color: var(--text-secondary, #94a3b8);
    }

    /* Main Content */
    .main-content {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border, #2d2d44);
      padding: 0 16px;
    }

    .tab {
      padding: 12px 16px;
      font-size: 13px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      color: var(--text-secondary, #94a3b8);
    }

    .tab:hover {
      color: var(--text-primary, #e2e8f0);
    }

    .tab.active {
      color: var(--accent, #6366f1);
      border-bottom-color: var(--accent, #6366f1);
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    /* Tools Tab */
    .tools-grid {
      display: grid;
      gap: 12px;
    }

    .tool-card {
      background: var(--bg-secondary, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      padding: 16px;
    }

    .tool-name {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .tool-description {
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
      margin-bottom: 12px;
    }

    .btn-test {
      padding: 6px 12px;
      background: var(--accent, #6366f1);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-test:hover {
      opacity: 0.9;
    }

    /* Inspector Panel */
    .inspector-panel {
      border-left: 1px solid var(--border, #2d2d44);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .events-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      font-family: var(--font-mono, monospace);
      font-size: 11px;
    }

    .event-item {
      padding: 8px;
      margin-bottom: 8px;
      background: var(--bg-secondary, #1a1a2e);
      border-radius: 6px;
      border-left: 3px solid transparent;
    }

    .event-item.sent {
      border-left-color: #3b82f6;
    }

    .event-item.received {
      border-left-color: #22c55e;
    }

    .event-item.error {
      border-left-color: #ef4444;
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      opacity: 0.7;
    }

    .event-content {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-x: auto;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-secondary, #94a3b8);
      text-align: center;
      padding: 40px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .empty-text {
      font-size: 13px;
      max-width: 300px;
    }

    /* JSON Viewer */
    .json-viewer {
      background: var(--bg-secondary, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 6px;
      padding: 12px;
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      overflow-x: auto;
      white-space: pre;
    }
  `;

  @property({ type: Array }) servers: MCPServerUI[] = [];
  @property({ type: Array }) events: MCPInspectorEventUI[] = [];

  @state() private selectedServerId: string | null = null;
  @state() private activeTab: "tools" | "resources" | "prompts" = "tools";

  render() {
    const selectedServer = this.servers.find((s) => s.id === this.selectedServerId);

    return html`
      <div class="inspector">
        <!-- Servers Panel -->
        <div class="servers-panel">
          <div class="panel-header">
            <h3 class="panel-title">MCP Servers</h3>
            <button class="btn-icon" @click="${this.handleAddServer}" title="Add Server">+</button>
          </div>
          <div class="servers-list">
            ${this.servers.length === 0
              ? html`
                  <div class="empty-state" style="padding: 20px;">
                    <div class="empty-icon">🔌</div>
                    <div class="empty-text">No servers configured</div>
                  </div>
                `
              : this.servers.map(
                  (server) => html`
                    <div
                      class="server-item ${server.id === this.selectedServerId ? "selected" : ""}"
                      @click="${() => this.selectServer(server.id)}"
                    >
                      <div class="server-name">
                        <span
                          class="server-status ${server.connected
                            ? "connected"
                            : server.lastError
                            ? "error"
                            : "disconnected"}"
                        ></span>
                        ${server.name}
                      </div>
                      <div class="server-url">${server.url}</div>
                      <div class="server-meta">
                        <span class="server-tag">${server.transport}</span>
                        <span class="server-tag">${server.tools.length} tools</span>
                        ${server.enabled
                          ? ""
                          : html`<span class="server-tag">disable</span>`}
                      </div>
                    </div>
                  `
                )}
          </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
          ${!selectedServer
            ? html`
                <div class="empty-state">
                  <div class="empty-icon">🔌</div>
                  <div class="empty-title">MCP Inspector</div>
                  <div class="empty-text">
                    Select a server to view tools, resources, and test connections
                  </div>
                </div>
              `
            : html`
                <div class="tabs">
                  <div
                    class="tab ${this.activeTab === "tools" ? "active" : ""}"
                    @click="${() => (this.activeTab = "tools")}"
                  >
                    Tools (${selectedServer.tools.length})
                  </div>
                  <div
                    class="tab ${this.activeTab === "resources" ? "active" : ""}"
                    @click="${() => (this.activeTab = "resources")}"
                  >
                    Resources (${selectedServer.resources.length})
                  </div>
                  <div
                    class="tab ${this.activeTab === "prompts" ? "active" : ""}"
                    @click="${() => (this.activeTab = "prompts")}"
                  >
                    Prompts
                  </div>
                </div>

                <div class="tab-content">
                  ${this.activeTab === "tools"
                    ? this.renderToolsTab(selectedServer)
                    : this.activeTab === "resources"
                    ? this.renderResourcesTab(selectedServer)
                    : this.renderPromptsTab(selectedServer)}
                </div>
              `}
        </div>

        <!-- Inspector Panel -->
        <div class="inspector-panel">
          <div class="panel-header">
            <h3 class="panel-title">Inspector</h3>
          </div>
          <div class="events-list">
            ${this.events.length === 0
              ? html`<div style="text-align: center; padding: 40px 20px; opacity: 0.5;">
                  No events yet
                </div>`
              : this.events.map(
                  (event) => html`
                    <div class="event-item ${event.direction} ${event.type}">
                      <div class="event-header">
                        <span>${event.direction.toUpperCase()} - ${event.type}</span>
                        <span>${new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div class="event-content">
                        ${JSON.stringify(event.content, null, 2)}
                      </div>
                    </div>
                  `
                )}
          </div>
        </div>
      </div>
    `;
  }

  private renderToolsTab(server: MCPServerUI) {
    if (server.tools.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">🛠️</div>
          <div class="empty-title">No Tools Available</div>
          <div class="empty-text">This server hasn't exposed any tools yet</div>
        </div>
      `;
    }

    return html`
      <div class="tools-grid">
        ${server.tools.map(
          (tool) => html`
            <div class="tool-card">
              <div class="tool-name">${tool.name}</div>
              <div class="tool-description">${tool.description}</div>
              <div class="json-viewer">${JSON.stringify(tool.inputSchema, null, 2)}</div>
              <button
                class="btn-test"
                @click="${() => this.testTool(server.id, tool.name)}"
                ?disabled="${!server.connected}"
              >
                Test Tool
              </button>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderResourcesTab(server: MCPServerUI) {
    if (server.resources.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <div class="empty-title">No Resources Available</div>
          <div class="empty-text">This server hasn't exposed any resources yet</div>
        </div>
      `;
    }

    return html`
      <div class="tools-grid">
        ${server.resources.map(
          (resource) => html`
            <div class="tool-card">
              <div class="tool-name">${resource.name}</div>
              <div class="tool-description">${resource.description || "No description"}</div>
              <div style="font-family: monospace; font-size: 11px; color: var(--text-secondary);">
                ${resource.uri}
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderPromptsTab(server: MCPServerUI) {
    return html`
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-title">Prompts</div>
        <div class="empty-text">Prompt management coming soon</div>
      </div>
    `;
  }

  private selectServer(serverId: string) {
    this.selectedServerId = serverId;
    this.dispatchEvent(
      new CustomEvent("server-select", {
        detail: { serverId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleAddServer() {
    this.dispatchEvent(new CustomEvent("add-server", { bubbles: true, composed: true }));
  }

  private testTool(serverId: string, toolName: string) {
    this.dispatchEvent(
      new CustomEvent("test-tool", {
        detail: { serverId, toolName },
        bubbles: true,
        composed: true,
      })
    );
  }

  // Public method to add event
  addEvent(event: MCPInspectorEventUI) {
    this.events = [...this.events, event];
  }

  // Public method to clear events
  clearEvents() {
    this.events = [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mcp-inspector": MCPInspector;
  }
}
