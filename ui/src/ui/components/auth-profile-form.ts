import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface AuthFormData {
  providerId: string;
  profileName: string;
  mode: "api_key" | "oauth" | "token";
  credential: string; // API key, token, etc.
  email?: string;
}

@customElement("auth-profile-form")
export class AuthProfileForm extends LitElement {
  @property({ type: String }) providerId = "";
  @property({ type: String }) providerName = "";
  @property({ type: String }) mode: "api_key" | "oauth" | "token" = "api_key";
  
  @state() private profileName = "";
  @state() private credential = "";
  @state() private email = "";
  @state() private testing = false;
  @state() private testResult: { success: boolean; message: string } | null = null;
  @state() private saving = false;

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-body, system-ui, -apple-system, sans-serif);
    }

    .form-container {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      padding: 24px;
      max-width: 480px;
    }

    h3 {
      margin: 0 0 20px 0;
      color: var(--text, #fff);
      font-size: 18px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      margin-bottom: 6px;
      color: var(--text-secondary, #a0a0b0);
      font-size: 14px;
    }

    input, select {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-input, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      color: var(--text, #fff);
      font-size: 14px;
      box-sizing: border-box;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--accent, #6366f1);
    }

    .help-text {
      margin-top: 4px;
      font-size: 12px;
      color: var(--text-secondary, #888);
    }

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    button {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-test {
      background: var(--bg-hover, #252540);
      color: var(--text, #fff);
    }

    .btn-save {
      background: var(--accent, #6366f1);
      color: white;
    }

    .test-result {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
    }

    .test-result.success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
    }

    .test-result.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }

    .loading {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  `;

  render() {
    return html`
      <div class="form-container">
        <h3>Configurar ${this.providerName || this.providerId}</h3>
        
        <div class="form-group">
          <label>Método de Autenticação</label>
          <select .value=${this.mode} @change=${this.handleModeChange}>
            <option value="api_key">API Key</option>
            <option value="token">Token de Acesso</option>
            ${this.supportsOAuth() ? html`<option value="oauth">OAuth</option>` : ""}
          </select>
        </div>

        <div class="form-group">
          <label>Nome do Profile</label>
          <input
            type="text"
            .value=${this.profileName}
            @input=${this.handleProfileNameChange}
            placeholder="Ex: default, pessoal, trabalho"
            required
          />
          <div class="help-text">Identificador único para esta credencial</div>
        </div>

        ${this.mode === "api_key" ? html`
          <div class="form-group">
            <label>API Key</label>
            <input
              type="password"
              .value=${this.credential}
              @input=${this.handleCredentialChange}
              placeholder="sk-..."
              required
            />
            <div class="help-text">Chave de API fornecida pelo ${this.providerName}</div>
          </div>
        ` : this.mode === "token" ? html`
          <div class="form-group">
            <label>Token de Acesso</label>
            <input
              type="password"
              .value=${this.credential}
              @input=${this.handleCredentialChange}
              placeholder="Token de acesso..."
              required
            />
          </div>
        ` : html`
          <div class="form-group">
            <p>Será redirecionado para a página de autenticação OAuth...</p>
          </div>
        `}

        <div class="form-group">
          <label>Email (opcional)</label>
          <input
            type="email"
            .value=${this.email}
            @input=${this.handleEmailChange}
            placeholder="seu@email.com"
          />
          <div class="help-text">Para identificação apenas</div>
        </div>

        ${this.testResult ? html`
          <div class="test-result ${this.testResult.success ? "success" : "error"}">
            ${this.testResult.success ? "✓" : "✗"} ${this.testResult.message}
          </div>
        ` : ""}

        <div class="button-group">
          <button 
            class="btn-test" 
            @click=${this.handleTest}
            ?disabled=${this.testing || !this.isValid()}
          >
            ${this.testing ? html`
              <span class="loading">
                <span class="spinner"></span>
                Testando...
              </span>
            ` : "Testar Conexão"}
          </button>
          <button 
            class="btn-save" 
            @click=${this.handleSave}
            ?disabled=${this.saving || !this.isValid()}
          >
            ${this.saving ? html`
              <span class="loading">
                <span class="spinner"></span>
                Salvando...
              </span>
            ` : "Salvar"}
          </button>
        </div>
      </div>
    `;
  }

  private supportsOAuth(): boolean {
    // Lista de providers que suportam OAuth
    const oauthProviders = ["google", "github-copilot", "minimax-portal"];
    return oauthProviders.includes(this.providerId);
  }

  private isValid(): boolean {
    if (!this.profileName.trim()) return false;
    if (this.mode !== "oauth" && !this.credential.trim()) return false;
    return true;
  }

  private handleModeChange(e: Event) {
    this.mode = (e.target as HTMLSelectElement).value as typeof this.mode;
    this.testResult = null;
  }

  private handleProfileNameChange(e: Event) {
    this.profileName = (e.target as HTMLInputElement).value;
  }

  private handleCredentialChange(e: Event) {
    this.credential = (e.target as HTMLInputElement).value;
  }

  private handleEmailChange(e: Event) {
    this.email = (e.target as HTMLInputElement).value;
  }

  private async handleTest() {
    if (!this.isValid()) return;

    this.testing = true;
    this.testResult = null;

    try {
      const profileId = `${this.providerId}:${this.profileName}`;
      const credential = this.buildCredential();

      this.dispatchEvent(new CustomEvent("test-auth", {
        detail: { profileId, credential },
        bubbles: true,
        composed: true,
      }));
    } finally {
      this.testing = false;
    }
  }

  private async handleSave() {
    if (!this.isValid()) return;

    this.saving = true;

    try {
      const profileId = `${this.providerId}:${this.profileName}`;
      const credential = this.buildCredential();

      this.dispatchEvent(new CustomEvent("save-auth", {
        detail: { profileId, credential, email: this.email || undefined },
        bubbles: true,
        composed: true,
      }));
    } finally {
      this.saving = false;
    }
  }

  private buildCredential() {
    const base = {
      type: this.mode,
      provider: this.providerId,
    };

    switch (this.mode) {
      case "api_key":
        return { ...base, key: this.credential };
      case "token":
        return { ...base, token: this.credential };
      case "oauth":
        return base; // OAuth é tratado separadamente
      default:
        return base;
    }
  }

  setTestResult(result: { success: boolean; message: string }) {
    this.testResult = result;
    this.testing = false;
  }
}