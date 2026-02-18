import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

interface EnvVar {
  key: string;
  encrypted: boolean;
  createdAt: number;
  updatedAt: number;
  hasValue: boolean;
  isSensitive: boolean;
}

@customElement("env-manager")
export class EnvManager extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-body, system-ui, -apple-system, sans-serif);
    }

    .env-container {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      padding: 24px;
    }

    .env-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .env-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text, #fff);
    }

    .env-subtitle {
      font-size: 13px;
      color: var(--muted, #888);
      margin-top: 4px;
    }

    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--accent, #6366f1);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .add-btn:hover {
      background: var(--accent-hover, #7c3aed);
    }

    .add-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .env-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .env-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg, #13131f);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .env-item:hover {
      border-color: var(--border-strong, #3d3d5c);
    }

    .env-key {
      font-family: var(--font-mono, 'Fira Code', monospace);
      font-size: 14px;
      color: var(--text, #fff);
      font-weight: 500;
      min-width: 200px;
    }

    .env-badges {
      display: flex;
      gap: 8px;
      flex: 1;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-encrypted {
      background: rgba(16, 163, 127, 0.15);
      color: #10a37f;
    }

    .badge-sensitive {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .badge-plain {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
    }

    .env-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 8px 12px;
      background: transparent;
      border: 1px solid var(--border, #2d2d44);
      border-radius: 6px;
      color: var(--muted, #888);
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      border-color: var(--border-strong, #3d3d5c);
      color: var(--text, #fff);
    }

    .action-btn.delete:hover {
      border-color: #ef4444;
      color: #ef4444;
    }

    .env-empty {
      text-align: center;
      padding: 48px 24px;
      color: var(--muted, #888);
    }

    .env-empty-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      opacity: 0.3;
    }

    .modal-overlay {
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
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
    }

    .modal-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .modal {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      transform: scale(0.95);
      transition: transform 0.2s ease;
    }

    .modal-overlay.open .modal {
      transform: scale(1);
    }

    .modal-header {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--text, #fff);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--muted, #888);
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg, #13131f);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 6px;
      color: var(--text, #fff);
      font-size: 14px;
      font-family: var(--font-mono, 'Fira Code', monospace);
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent, #6366f1);
    }

    .form-input.error {
      border-color: #ef4444;
    }

    .form-error {
      color: #ef4444;
      font-size: 12px;
      margin-top: 4px;
    }

    .form-hint {
      color: var(--muted, #888);
      font-size: 12px;
      margin-top: 4px;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .checkbox-group input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--accent, #6366f1);
    }

    .checkbox-group label {
      font-size: 14px;
      color: var(--text, #fff);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border, #2d2d44);
      color: var(--text, #fff);
    }

    .btn-secondary:hover {
      border-color: var(--border-strong, #3d3d5c);
    }

    .btn-primary {
      background: var(--accent, #6366f1);
      border: none;
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover, #7c3aed);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border, #2d2d44);
      border-top-color: var(--accent, #6366f1);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .security-notice {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #f59e0b;
    }

    .security-notice strong {
      color: #fbbf24;
    }
  `;

  @property({ type: Array }) vars: EnvVar[] = [];
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) saving = false;
  @property({ type: String }) error = "";

  @state() private isModalOpen = false;
  @state() private editingVar: EnvVar | null = null;
  @state() private keyInput = "";
  @state() private valueInput = "";
  @state() private encryptInput = true;
  @state() private validationError = "";

  private openModal(editVar?: EnvVar) {
    this.editingVar = editVar || null;
    this.keyInput = editVar?.key || "";
    this.valueInput = "";
    this.encryptInput = true;
    this.validationError = "";
    this.isModalOpen = true;
  }

  private closeModal() {
    this.isModalOpen = false;
    this.editingVar = null;
    this.keyInput = "";
    this.valueInput = "";
    this.validationError = "";
  }

  private validateKey(key: string): string | null {
    if (!key) return "Key is required";
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return "Key must start with letter/underscore and contain only alphanumeric characters";
    }
    const RESERVED_KEYS = ["PATH", "HOME", "USER", "SHELL", "PWD", "OLDPWD"];
    if (RESERVED_KEYS.includes(key)) {
      return `Cannot modify reserved environment variable: ${key}`;
    }
    if (!this.editingVar && this.vars.some(v => v.key === key)) {
      return "Key already exists";
    }
    return null;
  }

  private async handleSave() {
    const error = this.validateKey(this.keyInput);
    if (error) {
      this.validationError = error;
      return;
    }

    if (!this.editingVar && !this.valueInput) {
      this.validationError = "Value is required for new variables";
      return;
    }

    this.dispatchEvent(new CustomEvent("env-save", {
      detail: {
        key: this.keyInput,
        value: this.valueInput,
        encrypt: this.encryptInput,
      },
      bubbles: true,
      composed: true,
    }));

    this.closeModal();
  }

  private handleDelete(key: string) {
    if (confirm(`Are you sure you want to delete ${key}?`)) {
      this.dispatchEvent(new CustomEvent("env-delete", {
        detail: { key },
        bubbles: true,
        composed: true,
      }));
    }
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  render() {
    return html`
      <div class="env-container">
        <div class="security-notice">
          <strong>Security Notice:</strong> Values are encrypted with AES-256-GCM. 
          Sensitive keys (containing "token", "password", "secret", "api_key", etc.) 
          are auto-encrypted. Audit logs track all changes.
        </div>

        <div class="env-header">
          <div>
            <div class="env-title">Environment Variables</div>
            <div class="env-subtitle">Manage environment variables for the gateway</div>
          </div>
          <button class="add-btn" @click=${() => this.openModal()} ?disabled=${this.loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Variable
          </button>
        </div>

        ${this.loading
          ? html`
            <div class="env-empty">
              <div class="spinner"></div>
              <p>Loading environment variables...</p>
            </div>
          `
          : this.vars.length === 0
            ? html`
              <div class="env-empty">
                <svg class="env-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                </svg>
                <p>No environment variables configured</p>
                <p style="font-size: 13px; margin-top: 8px;">Click "Add Variable" to create one</p>
              </div>
            `
            : html`
              <div class="env-list">
                ${this.vars.map((envVar) => html`
                  <div class="env-item">
                    <div class="env-key">${envVar.key}</div>
                    <div class="env-badges">
                      ${envVar.encrypted
                        ? html`<span class="badge badge-encrypted">🔒 Encrypted</span>`
                        : html`<span class="badge badge-plain">Plain</span>`
                      }
                      ${envVar.isSensitive
                        ? html`<span class="badge badge-sensitive">⚠️ Sensitive</span>`
                        : nothing
                      }
                    </div>
                    <div class="env-actions">
                      <button class="action-btn" @click=${() => this.openModal(envVar)} title="Edit">
                        Edit
                      </button>
                      <button class="action-btn delete" @click=${() => this.handleDelete(envVar.key)} title="Delete">
                        Delete
                      </button>
                    </div>
                  </div>
                `)}
              </div>
            `
        }

        <!-- Modal -->
        <div class="modal-overlay ${this.isModalOpen ? 'open' : ''}" @click=${(e: Event) => {
          if (e.target === e.currentTarget) this.closeModal();
        }}>
          <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
            <div class="modal-header">
              ${this.editingVar ? `Edit ${this.editingVar.key}` : 'Add Environment Variable'}
            </div>

            <div class="form-group">
              <label class="form-label">Key</label>
              <input
                class="form-input ${this.validationError ? 'error' : ''}"
                type="text"
                placeholder="e.g., API_KEY"
                .value=${this.keyInput}
                @input=${(e: Event) => {
                  this.keyInput = (e.target as HTMLInputElement).value.toUpperCase();
                  this.validationError = "";
                }}
                ?disabled=${!!this.editingVar}
              />
              ${this.validationError
                ? html`<div class="form-error">${this.validationError}</div>`
                : html`<div class="form-hint">Use uppercase letters, numbers, and underscores only</div>`
              }
            </div>

            <div class="form-group">
              <label class="form-label">Value</label>
              <input
                class="form-input"
                type="password"
                placeholder=${this.editingVar ? "Leave empty to keep current value" : "Enter value"}
                .value=${this.valueInput}
                @input=${(e: Event) => this.valueInput = (e.target as HTMLInputElement).value}
              />
              ${this.editingVar
                ? html`<div class="form-hint">Leave empty to keep the current value</div>`
                : nothing
              }
            </div>

            <div class="checkbox-group">
              <input
                type="checkbox"
                id="encrypt"
                .checked=${this.encryptInput}
                @change=${(e: Event) => this.encryptInput = (e.target as HTMLInputElement).checked}
              />
              <label for="encrypt">Encrypt this value</label>
            </div>

            <div class="modal-actions">
              <button class="btn btn-secondary" @click=${this.closeModal}>Cancel</button>
              <button class="btn btn-primary" @click=${this.handleSave} ?disabled=${this.saving}>
                ${this.saving
                  ? html`<span class="loading"><span class="spinner"></span> Saving...</span>`
                  : 'Save'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "env-manager": EnvManager;
  }
}
