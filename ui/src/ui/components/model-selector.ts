import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface ModelProvider {
  id: string;
  name: string;
  icon: string;
  status: "configured" | "unconfigured" | "error";
  models: Model[];
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  features: ("vision" | "tools" | "json")[];
  costPer1kTokens?: {
    input: number;
    output: number;
  };
  contextWindow?: number;
  isDefault?: boolean;
}

@customElement("model-selector")
export class ModelSelector extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      font-family: var(--font-body, system-ui, -apple-system, sans-serif);
    }

    .dropdown-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      color: var(--text, #fff);
      transition: all 0.2s ease;
      min-width: 200px;
    }

    .dropdown-trigger:hover {
      border-color: var(--border-strong, #3d3d5c);
      background: var(--bg-hover, #252540);
    }

    .dropdown-trigger.active {
      border-color: var(--accent, #6366f1);
    }

    .model-icon {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .model-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .model-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .model-provider {
      font-size: 11px;
      color: var(--muted, #888);
    }

    .dropdown-arrow {
      transition: transform 0.2s ease;
      color: var(--muted, #888);
    }

    .dropdown-trigger.active .dropdown-arrow {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      max-height: 500px;
      overflow-y: auto;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
    }

    .dropdown-menu.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border, #2d2d44);
      font-weight: 600;
      font-size: 13px;
      color: var(--muted, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .provider-section {
      border-bottom: 1px solid var(--border, #2d2d44);
    }

    .provider-section:last-child {
      border-bottom: none;
    }

    .provider-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .provider-header:hover {
      background: var(--bg-hover, #252540);
    }

    .provider-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: auto;
    }

    .provider-status.configured {
      background: #22c55e;
    }

    .provider-status.unconfigured {
      background: #f59e0b;
    }

    .provider-status.error {
      background: #ef4444;
    }

    .models-list {
      padding: 4px 8px;
    }

    .model-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      margin: 2px 0;
    }

    .model-item:hover {
      background: var(--bg-hover, #252540);
    }

    .model-item.selected {
      background: var(--accent-subtle, rgba(99, 102, 241, 0.15));
      border: 1px solid var(--accent, #6366f1);
    }

    .model-radio {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-strong, #3d3d5c);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .model-item.selected .model-radio {
      border-color: var(--accent, #6366f1);
      background: var(--accent, #6366f1);
    }

    .model-details {
      flex: 1;
      min-width: 0;
    }

    .model-title {
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 2px;
    }

    .model-meta {
      font-size: 11px;
      color: var(--muted, #888);
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .feature-badge {
      padding: 2px 6px;
      background: var(--bg-accent, #2d2d44);
      border-radius: 4px;
      font-size: 10px;
      text-transform: uppercase;
    }

    .cost-info {
      margin-left: auto;
      font-size: 11px;
      color: var(--muted, #888);
      text-align: right;
    }

    .configure-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      margin: 8px;
      background: var(--bg-accent, #2d2d44);
      border: 1px dashed var(--border-strong, #3d3d5c);
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      color: var(--muted, #888);
      transition: all 0.15s ease;
    }

    .configure-btn:hover {
      background: var(--bg-hover, #252540);
      border-color: var(--accent, #6366f1);
      color: var(--text, #fff);
    }

    .manage-link {
      display: block;
      padding: 12px 16px;
      text-align: center;
      color: var(--accent, #6366f1);
      font-size: 13px;
      cursor: pointer;
      border-top: 1px solid var(--border, #2d2d44);
      transition: background 0.15s ease;
    }

    .manage-link:hover {
      background: var(--bg-hover, #252540);
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 999;
      display: none;
    }

    .backdrop.open {
      display: block;
    }
  `;

  @property({ type: Array }) providers: ModelProvider[] = [];
  @property({ type: String }) selectedProvider = "";
  @property({ type: String }) selectedModel = "";
  @state() private isOpen = false;
  @state() private expandedProvider: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    // Auto-expand selected provider
    if (this.selectedProvider) {
      this.expandedProvider = this.selectedProvider;
    }
  }

  private toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  private closeDropdown() {
    this.isOpen = false;
  }

  private toggleProvider(providerId: string) {
    this.expandedProvider = this.expandedProvider === providerId ? null : providerId;
  }

  private selectModel(providerId: string, modelId: string) {
    this.selectedProvider = providerId;
    this.selectedModel = modelId;
    this.isOpen = false;
    
    this.dispatchEvent(
      new CustomEvent("model-selected", {
        detail: { providerId, modelId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleConfigure(providerId: string) {
    this.dispatchEvent(
      new CustomEvent("configure-provider", {
        detail: { providerId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleManage() {
    this.dispatchEvent(
      new CustomEvent("manage-providers", {
        bubbles: true,
        composed: true,
      })
    );
    this.closeDropdown();
  }

  private getSelectedModelInfo() {
    const provider = this.providers.find((p) => p.id === this.selectedProvider);
    const model = provider?.models.find((m) => m.id === this.selectedModel);
    return { provider, model };
  }

  render() {
    const { provider, model } = this.getSelectedModelInfo();

    return html`
      <div class="backdrop ${this.isOpen ? "open" : ""}" @click=${this.closeDropdown}></div>

      <button
        class="dropdown-trigger ${this.isOpen ? "active" : ""}"
        @click=${this.toggleDropdown}
      >
        <div class="model-icon">${model ? "🤖" : "⚙️"}</div>
        <div class="model-info">
          <div class="model-name">${model?.name || "Select Model"}</div>
          <div class="model-provider">${provider?.name || "No provider selected"}</div>
        </div>
        <svg
          class="dropdown-arrow"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="dropdown-menu ${this.isOpen ? "open" : ""}">
        <div class="dropdown-header">AI Models</div>

        ${this.providers.map(
          (provider) => html`
            <div class="provider-section">
              <div class="provider-header" @click=${() => this.toggleProvider(provider.id)}>
                <span>${provider.icon}</span>
                <span>${provider.name}</span>
                <span
                  class="provider-status ${provider.status}"
                  title="${provider.status}"
                ></span>
              </div>

              ${this.expandedProvider === provider.id
                ? html`
                    <div class="models-list">
                      ${provider.models.map(
                        (model) => html`
                          <div
                            class="model-item ${this.selectedModel === model.id
                              ? "selected"
                              : ""
                            }"
                            @click=${() => this.selectModel(provider.id, model.id)}
                          >
                            <div class="model-radio">
                              ${this.selectedModel === model.id
                                ? html`<svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="white"
                                  >
                                    <circle cx="12" cy="12" r="10"></circle>
                                  </svg>`
                                : null}
                            </div>
                            <div class="model-details">
                              <div class="model-title">${model.name}</div>
                              <div class="model-meta">
                                ${model.features.includes("vision")
                                  ? html`<span class="feature-badge">👁 Vision</span>`
                                  : null}
                                ${model.contextWindow
                                  ? html`<span>${(model.contextWindow / 1000).toFixed(0)}k context</span>`
                                  : null}
                              </div>
                            </div>
                            ${model.costPer1kTokens
                              ? html`
                                  <div class="cost-info">
                                    <div>$${model.costPer1kTokens.input}</div>
                                    <div style="font-size: 9px">per 1k tokens</div>
                                  </div>
                                `
                              : null}
                          </div>
                        `
                      )}
                    </div>

                    ${provider.status === "unconfigured"
                      ? html`
                          <button
                            class="configure-btn"
                            @click=${() => this.handleConfigure(provider.id)}
                          >
                            <span>⚙️</span>
                            <span>Configure ${provider.name}</span>
                          </button>
                        `
                      : null}
                  `
                : null}
            </div>
          `
        )}

        <div class="manage-link" @click=${this.handleManage}>⚙️ Manage Providers</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "model-selector": ModelSelector;
  }
}
