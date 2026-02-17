import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface WizardProviderInfo {
  id: string;
  name: string;
  supportsApiKey: boolean;
  supportsOAuth: boolean;
  apiKeyUrl?: string;
  oauthUrl?: string;
  description?: string;
}

export interface WizardFormData {
  profileName: string;
  credentialType: "api_key" | "oauth";
  apiKey?: string;
  token?: string;
  testConnection: boolean;
}

export type WizardStep = "type" | "input" | "oauth" | "testing" | "success" | "error";

export interface OAuthState {
  authUrl: string;
  state: string;
  verifier: string;
  redirectUri: string;
}

const PROVIDER_INFO: Record<string, Partial<WizardProviderInfo>> = {
  openai: {
    supportsApiKey: true,
    supportsOAuth: false,
    apiKeyUrl: "https://platform.openai.com/api-keys",
    description: "OpenAI API for GPT-4, GPT-3.5, and other models",
  },
  anthropic: {
    supportsApiKey: true,
    supportsOAuth: false,
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    description: "Anthropic API for Claude models",
  },
  google: {
    supportsApiKey: true,
    supportsOAuth: true,
    apiKeyUrl: "https://makersuite.google.com/app/apikey",
    oauthUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    description: "Google AI Studio for Gemini models",
  },
  kimi: {
    supportsApiKey: true,
    supportsOAuth: false,
    apiKeyUrl: "https://platform.moonshot.cn/console/api-keys",
    description: "Kimi API for Chinese and multilingual models",
  },
  glm: {
    supportsApiKey: true,
    supportsOAuth: false,
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    description: "GLM API for Chinese language models",
  },
  qwen: {
    supportsApiKey: true,
    supportsOAuth: false,
    apiKeyUrl: "https://dashscope.console.aliyun.com/apiKey",
    description: "Qwen API for Alibaba's language models",
  },
  openrouter: {
    supportsApiKey: true,
    supportsOAuth: false,
    apiKeyUrl: "https://openrouter.ai/keys",
    description: "OpenRouter for unified API access to multiple providers",
  },
  "google-antigravity": {
    supportsApiKey: false,
    supportsOAuth: true,
    oauthUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    description: "Google Antigravity (Cloud Code Assist) with OAuth",
  },
};

@customElement("provider-config-wizard")
export class ProviderConfigWizard extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-body, system-ui, -apple-system, sans-serif);
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 20px;
    }

    .modal {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border, #2d2d44);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text, #fff);
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--muted, #888);
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: var(--bg-hover, #252540);
      color: var(--text, #fff);
    }

    .modal-body {
      padding: 24px;
    }

    .provider-info {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: var(--bg, #0f0f1a);
      border-radius: 10px;
    }

    .provider-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .provider-details h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text, #fff);
      margin: 0 0 4px 0;
    }

    .provider-details p {
      font-size: 13px;
      color: var(--muted, #888);
      margin: 0;
    }

    .step-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .step {
      flex: 1;
      height: 4px;
      background: var(--bg-accent, #2d2d44);
      border-radius: 2px;
      transition: background 0.3s ease;
    }

    .step.active {
      background: var(--accent, #6366f1);
    }

    .step.completed {
      background: #22c55e;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text, #fff);
      margin-bottom: 8px;
    }

    .form-hint {
      font-size: 12px;
      color: var(--muted, #888);
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      background: var(--bg, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text, #fff);
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      border-color: var(--accent, #6366f1);
      box-shadow: 0 0 0 3px var(--accent-subtle, rgba(99, 102, 241, 0.15));
    }

    .form-input::placeholder {
      color: var(--muted, #666);
    }

    .form-input.error {
      border-color: #ef4444;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: #ef4444;
      margin-bottom: 20px;
    }

    .credential-types {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .credential-option {
      padding: 16px;
      background: var(--bg, #0f0f1a);
      border: 2px solid var(--border, #2d2d44);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
    }

    .credential-option:hover {
      border-color: var(--border-strong, #3d3d5c);
      background: var(--bg-hover, #252540);
    }

    .credential-option.selected {
      border-color: var(--accent, #6366f1);
      background: var(--accent-subtle, rgba(99, 102, 241, 0.1));
    }

    .credential-option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .credential-option-icon {
      width: 32px;
      height: 32px;
      margin: 0 auto 8px;
      color: var(--accent, #6366f1);
    }

    .credential-option-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text, #fff);
      margin-bottom: 4px;
    }

    .credential-option-desc {
      font-size: 12px;
      color: var(--muted, #888);
    }

    .api-key-help {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-accent, #2d2d44);
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .api-key-help-icon {
      width: 20px;
      height: 20px;
      color: var(--accent, #6366f1);
      flex-shrink: 0;
    }

    .api-key-help-text {
      font-size: 13px;
      color: var(--text, #fff);
      flex: 1;
    }

    .api-key-help-link {
      color: var(--accent, #6366f1);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }

    .api-key-help-link:hover {
      text-decoration: underline;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      cursor: pointer;
    }

    .checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-strong, #3d3d5c);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .checkbox.checked {
      background: var(--accent, #6366f1);
      border-color: var(--accent, #6366f1);
    }

    .checkbox-label {
      font-size: 14px;
      color: var(--text, #fff);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid var(--border, #2d2d44);
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-primary {
      background: var(--accent, #6366f1);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--accent-hover, #818cf8);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .success-state {
      text-align: center;
      padding: 40px 20px;
    }

    .success-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      background: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .success-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text, #fff);
      margin-bottom: 8px;
    }

    .success-desc {
      font-size: 14px;
      color: var(--muted, #888);
      margin-bottom: 24px;
    }

    .testing-state {
      text-align: center;
      padding: 40px 20px;
    }

    .testing-spinner {
      width: 48px;
      height: 48px;
      margin: 0 auto 20px;
      border: 3px solid var(--border, #2d2d44);
      border-top-color: var(--accent, #6366f1);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .testing-text {
      font-size: 16px;
      color: var(--text, #fff);
      margin-bottom: 8px;
    }

    .testing-subtext {
      font-size: 13px;
      color: var(--muted, #888);
    }
  `;

  @property({ type: Boolean }) open = false;
  @property({ type: String }) providerId = "";
  @property({ type: String }) providerName = "";
  @state() private step: WizardStep = "type";
  @state() private formData: WizardFormData = {
    profileName: "default",
    credentialType: "api_key",
    apiKey: "",
    token: "",
    testConnection: true,
  };
  @state() private error: string | null = null;
  @state() private isSubmitting = false;
  @state() private oauthState: OAuthState | null = null;
  private oauthCheckInterval: number | null = null;

  private getProviderInfo(): WizardProviderInfo {
    const info = PROVIDER_INFO[this.providerId] || {};
    return {
      id: this.providerId,
      name: this.providerName,
      supportsApiKey: info.supportsApiKey ?? true,
      supportsOAuth: info.supportsOAuth ?? false,
      apiKeyUrl: info.apiKeyUrl,
      oauthUrl: info.oauthUrl,
      description: info.description,
    };
  }

  private getProviderIcon(): { letter: string; color: string; bgColor: string } {
    const letters: Record<string, string> = {
      openai: "O",
      anthropic: "A",
      google: "G",
      kimi: "K",
      glm: "GL",
      qwen: "Q",
      minimax: "M",
      groq: "Gr",
      cerebras: "C",
      xai: "X",
      openrouter: "OR",
    };

    const brands: Record<string, { color: string; bgColor: string }> = {
      openai: { color: "#10a37f", bgColor: "rgba(16, 163, 127, 0.15)" },
      anthropic: { color: "#cc785c", bgColor: "rgba(204, 120, 92, 0.15)" },
      google: { color: "#4285f4", bgColor: "rgba(66, 133, 244, 0.15)" },
      kimi: { color: "#6366f1", bgColor: "rgba(99, 102, 241, 0.15)" },
      glm: { color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.15)" },
      qwen: { color: "#7c3aed", bgColor: "rgba(124, 58, 237, 0.15)" },
      openrouter: { color: "#6366f1", bgColor: "rgba(99, 102, 241, 0.15)" },
    };

    const brand = brands[this.providerId] || { color: "#6366f1", bgColor: "rgba(99, 102, 241, 0.15)" };
    return {
      letter: letters[this.providerId] || this.providerId.charAt(0).toUpperCase(),
      color: brand.color,
      bgColor: brand.bgColor,
    };
  }

  private close() {
    this.open = false;
    this.step = "type";
    this.formData = {
      profileName: "default",
      credentialType: "api_key",
      apiKey: "",
      token: "",
      testConnection: true,
    };
    this.error = null;
    this.isSubmitting = false;
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private async selectCredentialType(type: "api_key" | "oauth") {
    this.formData = { ...this.formData, credentialType: type };
    
    if (type === "oauth") {
      // Start OAuth flow
      await this.startOAuthFlow();
    } else {
      this.step = "input";
    }
  }

  private async startOAuthFlow() {
    this.step = "oauth";
    this.isSubmitting = true;
    this.error = null;

    try {
      // Dispatch event to start OAuth - parent component should handle this
      this.dispatchEvent(
        new CustomEvent("oauth-start", {
          detail: {
            providerId: this.providerId,
          },
          bubbles: true,
          composed: true,
        })
      );
    } catch (err) {
      this.error = String(err);
      this.step = "error";
      this.isSubmitting = false;
    }
  }

  // Called by parent when OAuth URL is ready
  handleOAuthUrl(authUrl: string, state: string, verifier: string) {
    this.oauthState = { authUrl, state, verifier, redirectUri: "" };
    this.isSubmitting = false;
    // Open OAuth in new window
    window.open(authUrl, "oauth-popup", "width=600,height=700");
  }

  // Called by parent when OAuth callback is received
  handleOAuthCallback(code: string, state: string) {
    if (!this.oauthState || this.oauthState.state !== state) {
      this.error = "OAuth state mismatch";
      this.step = "error";
      return;
    }

    // Dispatch save event with OAuth callback data
    this.dispatchEvent(
      new CustomEvent("oauth-callback", {
        detail: {
          providerId: this.providerId,
          code,
          state,
          verifier: this.oauthState.verifier,
        },
        bubbles: true,
        composed: true,
      })
    );
    
    this.step = "testing";
  }

  private validateForm(): boolean {
    if (!this.formData.profileName.trim()) {
      this.error = "Profile name is required";
      return false;
    }

    if (this.formData.credentialType === "api_key") {
      if (!this.formData.apiKey?.trim()) {
        this.error = "API key is required";
        return false;
      }
    }

    this.error = null;
    return true;
  }

  private async submit() {
    if (!this.validateForm()) return;

    this.isSubmitting = true;
    this.step = "testing";

    try {
      const credential = this.formData.credentialType === "api_key"
        ? {
            type: "api_key" as const,
            provider: this.providerId,
            key: this.formData.apiKey!,
          }
        : {
            type: "token" as const,
            provider: this.providerId,
            token: this.formData.token!,
          };

      this.dispatchEvent(
        new CustomEvent("save", {
          detail: {
            providerId: this.providerId,
            profileName: this.formData.profileName,
            credential,
            testConnection: this.formData.testConnection,
          },
          bubbles: true,
          composed: true,
        })
      );
    } catch (err) {
      this.error = String(err);
      this.step = "error";
      this.isSubmitting = false;
    }
  }

  handleSaveSuccess() {
    this.step = "success";
    this.isSubmitting = false;
  }

  handleSaveError(error: string) {
    this.error = error;
    this.step = "error";
    this.isSubmitting = false;
  }

  private renderStepIndicator() {
    // Dynamic steps based on credential type
    const steps = this.formData.credentialType === "oauth"
      ? ["type", "oauth", "testing", "success"]
      : ["type", "input", "testing", "success"];
    const currentIndex = steps.indexOf(this.step);

    return html`
      <div class="step-indicator">
        ${steps.map((_, index) => html`
          <div class="step ${index <= currentIndex ? "active" : ""} ${index < currentIndex ? "completed" : ""}"></div>
        `)}
      </div>
    `;
  }

  private renderTypeSelection() {
    const provider = this.getProviderInfo();

    return html`
      ${this.renderStepIndicator()}
      
      <div class="credential-types">
        <div 
          class="credential-option ${this.formData.credentialType === "api_key" ? "selected" : ""} ${!provider.supportsApiKey ? "disabled" : ""}"
          @click=${() => provider.supportsApiKey && this.selectCredentialType("api_key")}
        >
          <svg class="credential-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <div class="credential-option-title">API Key</div>
          <div class="credential-option-desc">Simple key-based authentication</div>
        </div>

        <div 
          class="credential-option ${this.formData.credentialType === "oauth" ? "selected" : ""} ${!provider.supportsOAuth ? "disabled" : ""}"
          @click=${() => provider.supportsOAuth && this.selectCredentialType("oauth")}
        >
          <svg class="credential-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          <div class="credential-option-title">OAuth</div>
          <div class="credential-option-desc">Token-based authentication</div>
        </div>
      </div>

      ${!provider.supportsApiKey && !provider.supportsOAuth ? html`
        <div class="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          This provider doesn't support direct configuration. Please configure it via the CLI.
        </div>
      ` : null}
    `;
  }

  private renderInputForm() {
    const provider = this.getProviderInfo();
    const icon = this.getProviderIcon();

    return html`
      ${this.renderStepIndicator()}

      <div class="provider-info">
        <div class="provider-icon" style="background: ${icon.bgColor}; color: ${icon.color};">
          ${icon.letter}
        </div>
        <div class="provider-details">
          <h3>${provider.name}</h3>
          <p>${provider.description}</p>
        </div>
      </div>

      ${this.error ? html`
        <div class="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          ${this.error}
        </div>
      ` : null}

      ${this.formData.credentialType === "api_key" && provider.apiKeyUrl ? html`
        <div class="api-key-help">
          <svg class="api-key-help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span class="api-key-help-text">Don't have an API key?</span>
          <a href="${provider.apiKeyUrl}" target="_blank" rel="noopener" class="api-key-help-link">Get one</a>
        </div>
      ` : null}

      <div class="form-group">
        <label class="form-label">Profile Name</label>
        <div class="form-hint">A unique name for this credential (e.g., "default", "work", "personal")</div>
        <input
          type="text"
          class="form-input ${this.error && !this.formData.profileName ? "error" : ""}"
          placeholder="default"
          .value=${this.formData.profileName}
          @input=${(e: Event) => this.formData = { ...this.formData, profileName: (e.target as HTMLInputElement).value }}
        />
      </div>

      ${this.formData.credentialType === "api_key" ? html`
        <div class="form-group">
          <label class="form-label">API Key</label>
          <div class="form-hint">Your secret API key from ${provider.name}</div>
          <input
            type="password"
            class="form-input ${this.error && !this.formData.apiKey ? "error" : ""}"
            placeholder="sk-..."
            .value=${this.formData.apiKey}
            @input=${(e: Event) => this.formData = { ...this.formData, apiKey: (e.target as HTMLInputElement).value }}
          />
        </div>
      ` : html`
        <div class="form-group">
          <label class="form-label">Access Token</label>
          <div class="form-hint">Your OAuth access token</div>
          <input
            type="password"
            class="form-input"
            placeholder="Enter your access token"
            .value=${this.formData.token}
            @input=${(e: Event) => this.formData = { ...this.formData, token: (e.target as HTMLInputElement).value }}
          />
        </div>
      `}

      <label class="checkbox-group" @click=${() => this.formData = { ...this.formData, testConnection: !this.formData.testConnection }}>
        <div class="checkbox ${this.formData.testConnection ? "checked" : ""}">
          ${this.formData.testConnection ? html`
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ` : null}
        </div>
        <span class="checkbox-label">Test connection before saving</span>
      </label>
    `;
  }

  private renderTesting() {
    return html`
      <div class="testing-state">
        <div class="testing-spinner"></div>
        <div class="testing-text">Testing connection...</div>
        <div class="testing-subtext">Verifying your credentials with ${this.providerName}</div>
      </div>
    `;
  }

  private renderSuccess() {
    return html`
      <div class="success-state">
        <div class="success-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="success-title">Configuration Saved!</div>
        <div class="success-desc">${this.providerName} is now configured and ready to use.</div>
      </div>
    `;
  }

  private renderError() {
    return html`
      ${this.renderStepIndicator()}
      
      <div class="error-message" style="margin-top: 20px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        ${this.error || "An error occurred while saving the configuration."}
      </div>
    `;
  }

  private renderOAuthStep() {
    const provider = this.getProviderInfo();
    const icon = this.getProviderIcon();

    return html`
      ${this.renderStepIndicator()}

      <div class="provider-info">
        <div class="provider-icon" style="background: ${icon.bgColor}; color: ${icon.color};">
          ${icon.letter}
        </div>
        <div class="provider-details">
          <h3>${provider.name}</h3>
          <p>${provider.description}</p>
        </div>
      </div>

      ${this.oauthState ? html`
        <div class="testing-state">
          <div class="testing-text">Waiting for authentication...</div>
          <div class="testing-subtext">Complete the sign-in process in the popup window</div>
          <button 
            class="btn btn-secondary" 
            style="margin-top: 20px;"
            @click=${() => {
              if (this.oauthState?.authUrl) {
                window.open(this.oauthState.authUrl, "oauth-popup", "width=600,height=700");
              }
            }}
          >
            Open Login Window Again
          </button>
        </div>
      ` : html`
        <div class="testing-state">
          <div class="testing-spinner"></div>
          <div class="testing-text">Preparing OAuth flow...</div>
          <div class="testing-subtext">Please wait while we set up authentication</div>
        </div>
      `}
    `;
  }

  render() {
    if (!this.open) return null;

    const provider = this.getProviderInfo();

    return html`
      <div class="modal-backdrop" @click=${(e: Event) => {
        if (e.target === e.currentTarget) this.close();
      }}>
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">
              ${this.step === "success" ? "Success" : `Configure ${provider.name}`}
            </h2>
            <button class="close-btn" @click=${this.close} ?disabled=${this.isSubmitting}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            ${this.step === "type" ? this.renderTypeSelection() : null}
            ${this.step === "input" ? this.renderInputForm() : null}
            ${this.step === "oauth" ? this.renderOAuthStep() : null}
            ${this.step === "testing" ? this.renderTesting() : null}
            ${this.step === "success" ? this.renderSuccess() : null}
            ${this.step === "error" ? this.renderError() : null}
          </div>

          ${this.step !== "testing" && this.step !== "oauth" ? html`
            <div class="modal-footer">
              ${this.step !== "type" && this.step !== "success" ? html`
                <button class="btn btn-secondary" @click=${() => this.step = "type"} ?disabled=${this.isSubmitting}>
                  Back
                </button>
              ` : null}
              
              ${this.step === "type" ? html`
                <button class="btn btn-secondary" @click=${this.close}>Cancel</button>
              ` : null}

              ${this.step === "input" ? html`
                <button class="btn btn-primary" @click=${this.submit} ?disabled=${this.isSubmitting}>
                  ${this.isSubmitting ? html`<div class="spinner"></div>` : null}
                  ${this.formData.testConnection ? "Test & Save" : "Save"}
                </button>
              ` : null}

              ${this.step === "success" ? html`
                <button class="btn btn-primary" @click=${this.close}>Done</button>
              ` : null}

              ${this.step === "error" ? html`
                <button class="btn btn-secondary" @click=${() => this.step = "input"}>Back</button>
                <button class="btn btn-primary" @click=${this.submit}>Retry</button>
              ` : null}
            </div>
          ` : null}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "provider-config-wizard": ProviderConfigWizard;
  }
}
