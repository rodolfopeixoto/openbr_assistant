import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Provider, ProviderStatus, CredentialType } from "../types/providers.js";
import { getProviderBrand, getProviderLetter, getStatusLabel, getCredentialTypeLabel } from "../types/providers.js";

export interface ProviderCardProps {
  provider: Provider;
  onConfigure?: (providerId: string) => void;
  onManage?: (providerId: string) => void;
}

@customElement("providers-card")
export class ProvidersCard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .card {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s ease;
      cursor: pointer;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .card:hover {
      border-color: var(--border-strong, #3d3d5c);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }

    .card.configured {
      border-left: 3px solid #22c55e;
    }

    .card.unconfigured {
      border-left: 3px solid #f59e0b;
    }

    .card.error {
      border-left: 3px solid #ef4444;
    }

    .card.checking {
      border-left: 3px solid var(--accent, #6366f1);
      opacity: 0.7;
    }

    .card.disabled {
      border-left: 3px solid #6b7280;
      opacity: 0.6;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .provider-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .provider-info {
      flex: 1;
      min-width: 0;
    }

    .provider-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--text, #fff);
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .provider-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted, #888);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot.configured {
      background: #22c55e;
    }

    .status-dot.unconfigured {
      background: #f59e0b;
    }

    .status-dot.error {
      background: #ef4444;
    }

    .status-dot.checking {
      background: var(--accent, #6366f1);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .status-dot.disabled {
      background: #6b7280;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .description {
      font-size: 13px;
      color: var(--muted, #888);
      line-height: 1.5;
      margin-bottom: 16px;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat {
      background: var(--bg, #0f0f1a);
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 600;
      color: var(--text, #fff);
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 11px;
      color: var(--muted, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .credential-type {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--bg-accent, #2d2d44);
      border-radius: 4px;
      font-size: 11px;
      color: var(--muted, #888);
      margin-bottom: 12px;
      width: fit-content;
    }

    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
      color: #ef4444;
      margin-bottom: 12px;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: auto;
    }

    .btn {
      flex: 1;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn-primary {
      background: var(--accent, #6366f1);
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover, #818cf8);
    }

    .btn-secondary {
      background: var(--bg-accent, #2d2d44);
      color: var(--text, #fff);
      border: 1px solid var(--border, #2d2d44);
    }

    .btn-secondary:hover {
      background: var(--bg-hover, #252540);
      border-color: var(--border-strong, #3d3d5c);
    }

    @media (max-width: 640px) {
      .card {
        padding: 16px;
      }

      .provider-icon {
        width: 36px;
        height: 36px;
        font-size: 14px;
      }

      .provider-name {
        font-size: 14px;
      }

      .stat-value {
        font-size: 16px;
      }

      .btn {
        padding: 8px 12px;
        font-size: 12px;
      }
    }
  `;

  @property({ type: Object }) provider!: Provider;

  private getBrandColors() {
    return getProviderBrand(this.provider.id);
  }

  private getProviderLetter(): string {
    return getProviderLetter(this.provider.id);
  }

  private getStatusLabel(): string {
    return getStatusLabel(this.provider.status);
  }

  private handleConfigure() {
    this.dispatchEvent(
      new CustomEvent("configure", {
        detail: { providerId: this.provider.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleManage() {
    this.dispatchEvent(
      new CustomEvent("manage", {
        detail: { providerId: this.provider.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const brand = this.getBrandColors();
    const letter = this.getProviderLetter();

    return html`
      <div class="card ${this.provider.status}">
        <div class="header">
          <div 
            class="provider-icon" 
            style="background: ${brand.bgColor}; color: ${brand.color};"
          >
            ${letter}
          </div>
          <div class="provider-info">
            <h3 class="provider-name">${this.provider.name}</h3>
            <div class="provider-status">
              <span class="status-dot ${this.provider.status}"></span>
              <span>${this.getStatusLabel()}</span>
            </div>
          </div>
        </div>

        <div class="description">
          ${this.provider.description}
        </div>

        ${this.provider.credentialType !== "none" ? html`
          <div class="credential-type">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            ${getCredentialTypeLabel(this.provider.credentialType)}
          </div>
        ` : null}

        ${this.provider.lastError ? html`
          <div class="error-message">
            ${this.provider.lastError}
          </div>
        ` : null}

        <div class="stats">
          <div class="stat">
            <div class="stat-value">${this.provider.credentialCount}</div>
            <div class="stat-label">Credentials</div>
          </div>
          <div class="stat">
            <div class="stat-value">${this.provider.modelsCount}</div>
            <div class="stat-label">Models</div>
          </div>
        </div>

        <div class="actions">
          ${this.provider.status === "unconfigured" ? html`
            <button class="btn btn-primary" @click=${this.handleConfigure}>
              Configure
            </button>
          ` : html`
            <button class="btn btn-secondary" @click=${this.handleManage}>
              Manage
            </button>
            ${this.provider.status === "error" ? html`
              <button class="btn btn-primary" @click=${this.handleConfigure}>
                Fix
              </button>
            ` : null}
          `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "providers-card": ProvidersCard;
  }
}
