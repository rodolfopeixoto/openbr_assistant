import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { 
  Provider, 
  ProviderModel, 
  ProviderConfiguration, 
  TestConnectionResult,
  CredentialType 
} from "../types/providers.js";
import { getProviderBrand, getProviderLetter, getCredentialTypeLabel } from "../types/providers.js";

type ModalStep = "auth" | "models" | "testing" | "success" | "error";

@customElement("providers-config-modal")
export class ProvidersConfigModal extends LitElement {
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
      max-width: 520px;
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

    .auth-methods {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .auth-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg, #0f0f1a);
      border: 2px solid var(--border, #2d2d44);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .auth-option:hover {
      border-color: var(--border-strong, #3d3d5c);
      background: var(--bg-hover, #252540);
    }

    .auth-option.selected {
      border-color: var(--accent, #6366f1);
      background: var(--accent-subtle, rgba(99, 102, 241, 0.1));
    }

    .auth-option-icon {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-strong, #3d3d5c);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .auth-option.selected .auth-option-icon {
      border-color: var(--accent, #6366f1);
      background: var(--accent, #6366f1);
    }

    .auth-option-content {
      flex: 1;
    }

    .auth-option-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text, #fff);
      margin-bottom: 2px;
    }

    .auth-option-desc {
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

    .models-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .model-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border, #2d2d44);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .model-item:last-child {
      border-bottom: none;
    }

    .model-item:hover {
      background: var(--bg-hover, #252540);
    }

    .model-item.selected {
      background: var(--accent-subtle, rgba(99, 102, 241, 0.1));
    }

    .model-checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-strong, #3d3d5c);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .model-item.selected .model-checkbox {
      background: var(--accent, #6366f1);
      border-color: var(--accent, #6366f1);
    }

    .model-info {
      flex: 1;
    }

    .model-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text, #fff);
      margin-bottom: 2px;
    }

    .model-description {
      font-size: 12px;
      color: var(--muted, #888);
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

    .test-result {
      background: var(--bg, #0f0f1a);
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      text-align: left;
    }

    .test-result.success {
      border: 1px solid #22c55e;
    }

    .test-result.error {
      border: 1px solid #ef4444;
    }

    .test-result-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #fff);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .test-result.success .test-result-title {
      color: #22c55e;
    }

    .test-result.error .test-result-title {
      color: #ef4444;
    }

    .test-result-detail {
      font-size: 13px;
      color: var(--muted, #888);
    }

    @media (max-width: 640px) {
      .modal-backdrop {
        padding: 10px;
      }

      .modal {
        max-height: 95vh;
      }

      .modal-body {
        padding: 16px;
      }

      .modal-footer {
        padding: 16px;
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `;

  @property({ type: Boolean }) open = false;
  @property({ type: Object }) provider!: Provider;
  @property({ type: Array }) availableModels: ProviderModel[] = [];
  
  @state() private step: ModalStep = "auth";
  @state() private config: ProviderConfiguration = {
    providerId: "",
    profileName: "default",
    credentialType: "api_key",
    apiKey: "",
    token: "",
    selectedModels: [],
    testConnection: true,
  };
  @state() private error: string | null = null;
  @state() private isSubmitting = false;
  @state() private testResult: TestConnectionResult | null = null;

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("provider") && this.provider) {
      this.config = {
        ...this.config,
        providerId: this.provider.id,
        credentialType: this.provider.supportedAuthMethods[0] || "api_key",
      };
    }
  }

  private close() {
    this.open = false;
    this.reset();
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private reset() {
    this.step = "auth";
    this.config = {
      providerId: this.provider?.id || "",
      profileName: "default",
      credentialType: this.provider?.supportedAuthMethods[0] || "api_key",
      apiKey: "",
      token: "",
      selectedModels: [],
      testConnection: true,
    };
    this.error = null;
    this.isSubmitting = false;
    this.testResult = null;
  }

  private selectAuthMethod(method: CredentialType) {
    this.config = { ...this.config, credentialType: method };
  }

  private validateAuthForm(): boolean {
    if (!this.config.profileName.trim()) {
      this.error = "Profile name is required";
      return false;
    }

    if (this.config.credentialType === "api_key" && !this.config.apiKey?.trim()) {
      this.error = "API key is required";
      return false;
    }

    if (this.config.credentialType === "token" && !this.config.token?.trim()) {
      this.error = "Access token is required";
      return false;
    }

    this.error = null;
    return true;
  }

  private goToModels() {
    if (!this.validateAuthForm()) return;
    this.step = "models";
  }

  private toggleModel(modelId: string) {
    const selected = new Set(this.config.selectedModels);
    if (selected.has(modelId)) {
      selected.delete(modelId);
    } else {
      selected.add(modelId);
    }
    this.config = { ...this.config, selectedModels: Array.from(selected) };
  }

  private async testConnection() {
    this.isSubmitting = true;
    this.step = "testing";

    try {
      this.dispatchEvent(
        new CustomEvent("test", {
          detail: { config: this.config },
          bubbles: true,
          composed: true,
        })
      );
    } catch (err) {
      this.handleTestError(String(err));
    }
  }

  handleTestSuccess(result: TestConnectionResult) {
    this.testResult = result;
    this.isSubmitting = false;
    if (result.success) {
      this.step = "success";
      this.dispatchEvent(
        new CustomEvent("save", {
          detail: { config: this.config, testResult: result },
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this.step = "error";
      this.error = result.error || "Connection test failed";
    }
  }

  handleTestError(error: string) {
    this.testResult = { success: false, error };
    this.error = error;
    this.step = "error";
    this.isSubmitting = false;
  }

  private async save() {
    if (this.config.testConnection) {
      await this.testConnection();
    } else {
      this.dispatchEvent(
        new CustomEvent("save", {
          detail: { config: this.config },
          bubbles: true,
          composed: true,
        })
      );
      this.step = "success";
    }
  }

  private getBrandColors() {
    return getProviderBrand(this.provider?.id || "");
  }

  private getProviderIcon() {
    return getProviderLetter(this.provider?.id || "");
  }

  private renderStepIndicator() {
    const steps: ModalStep[] = ["auth", "models", "testing", "success"];
    const currentIndex = steps.indexOf(this.step);

    return html`
      <div class="step-indicator">
        ${steps.map((step, index) => html`
          <div class="step ${index <= currentIndex ? "active" : ""} ${index < currentIndex ? "completed" : ""}"></div>
        `)}
      </div>
    `;
  }

  private renderAuthStep() {
    const brand = this.getBrandColors();
    const letter = this.getProviderIcon();

    return html`
      ${this.renderStepIndicator()}

      <div class="provider-info">
        <div class="provider-icon" style="background: ${brand.bgColor}; color: ${brand.color};">
          ${letter}
        </div>
        <div class="provider-details">
          <h3>${this.provider.name}</h3>
          <p>${this.provider.description}</p>
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

      <div class="form-group">
        <label class="form-label">Profile Name</label>
        <div class="form-hint">A unique name for this credential (e.g., "default", "work", "personal")</div>
        <input
          type="text"
          class="form-input ${this.error && !this.config.profileName ? "error" : ""}"
          placeholder="default"
          .value=${this.config.profileName}
          @input=${(e: Event) => this.config = { ...this.config, profileName: (e.target as HTMLInputElement).value }}
        />
      </div>

      ${this.provider.supportedAuthMethods.length > 1 ? html`
        <div class="form-label">Authentication Method</div>
        <div class="auth-methods">
          ${this.provider.supportedAuthMethods.map(method => html`
            <div 
              class="auth-option ${this.config.credentialType === method ? "selected" : ""}"
              @click=${() => this.selectAuthMethod(method)}
            >
              <div class="auth-option-icon">
                ${this.config.credentialType === method ? html`
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ` : null}
              </div>
              <div class="auth-option-content">
                <div class="auth-option-title">${getCredentialTypeLabel(method)}</div>
                <div class="auth-option-desc">
                  ${method === "api_key" ? "Simple key-based authentication" : 
                    method === "oauth" ? "OAuth 2.0 authentication flow" : 
                    "Token-based authentication"}
                </div>
              </div>
            </div>
          `)}
        </div>
      ` : null}

      ${this.config.credentialType === "api_key" ? html`
        ${this.provider.apiKeyUrl ? html`
          <div class="api-key-help">
            <svg class="api-key-help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span class="api-key-help-text">Don't have an API key?</span>
            <a href="${this.provider.apiKeyUrl}" target="_blank" rel="noopener" class="api-key-help-link">Get one</a>
          </div>
        ` : null}

        <div class="form-group">
          <label class="form-label">API Key</label>
          <div class="form-hint">Your secret API key from ${this.provider.name}</div>
          <input
            type="password"
            class="form-input ${this.error && !this.config.apiKey ? "error" : ""}"
            placeholder="sk-..."
            .value=${this.config.apiKey}
            @input=${(e: Event) => this.config = { ...this.config, apiKey: (e.target as HTMLInputElement).value }}
          />
        </div>
      ` : null}

      ${this.config.credentialType === "token" ? html`
        <div class="form-group">
          <label class="form-label">Access Token</label>
          <div class="form-hint">Your access token from ${this.provider.name}</div>
          <input
            type="password"
            class="form-input ${this.error && !this.config.token ? "error" : ""}"
            placeholder="Enter your access token"
            .value=${this.config.token}
            @input=${(e: Event) => this.config = { ...this.config, token: (e.target as HTMLInputElement).value }}
          />
        </div>
      ` : null}

      ${this.config.credentialType === "oauth" ? html`
        <div class="form-group">
          <div class="error-message">
            OAuth configuration requires browser interaction. Please use the CLI to configure OAuth providers.
          </div>
        </div>
      ` : null}

      <label class="checkbox-group" @click=${() => this.config = { ...this.config, testConnection: !this.config.testConnection }}>
        <div class="checkbox ${this.config.testConnection ? "checked" : ""}">
          ${this.config.testConnection ? html`
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ` : null}
        </div>
        <span class="checkbox-label">Test connection before saving</span>
      </label>
    `;
  }

  private renderModelsStep() {
    return html`
      ${this.renderStepIndicator()}

      <div class="form-group">
        <label class="form-label">Select Models</label>
        <div class="form-hint">Choose which models to enable from ${this.provider.name}</div>
      </div>

      <div class="models-list">
        ${this.availableModels.length === 0 ? html`
          <div style="padding: 24px; text-align: center; color: var(--muted, #888);">
            Loading available models...
          </div>
        ` : this.availableModels.map(model => html`
          <div 
            class="model-item ${this.config.selectedModels.includes(model.id) ? "selected" : ""}"
            @click=${() => this.toggleModel(model.id)}
          >
            <div class="model-checkbox">
              ${this.config.selectedModels.includes(model.id) ? html`
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ` : null}
            </div>
            <div class="model-info">
              <div class="model-name">${model.name}</div>
              <div class="model-description">${model.description || "No description available"}</div>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  private renderTestingStep() {
    return html`
      <div class="testing-state">
        <div class="testing-spinner"></div>
        <div class="testing-text">Testing connection...</div>
        <div class="testing-subtext">Verifying your credentials with ${this.provider.name}</div>
      </div>
    `;
  }

  private renderSuccessStep() {
    return html`
      <div class="success-state">
        <div class="success-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="success-title">Configuration Saved!</div>
        <div class="success-desc">${this.provider.name} is now configured and ready to use.</div>
        
        ${this.testResult ? html`
          <div class="test-result ${this.testResult.success ? "success" : "error"}">
            <div class="test-result-title">
              ${this.testResult.success ? "✓ Connection Test Passed" : "✗ Connection Test Failed"}
            </div>
            <div class="test-result-detail">
              ${this.testResult.latency ? `Latency: ${this.testResult.latency}ms` : ""}
              ${this.testResult.modelsAvailable ? `• ${this.testResult.modelsAvailable} models available` : ""}
            </div>
          </div>
        ` : null}
      </div>
    `;
  }

  private renderErrorStep() {
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

      ${this.testResult ? html`
        <div class="test-result error">
          <div class="test-result-title">✗ Connection Test Failed</div>
          <div class="test-result-detail">${this.testResult.error}</div>
        </div>
      ` : null}
    `;
  }

  render() {
    if (!this.open) return null;

    return html`
      <div class="modal-backdrop" @click=${(e: Event) => {
        if (e.target === e.currentTarget && !this.isSubmitting) this.close();
      }}>
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">
              ${this.step === "success" ? "Success" : `Configure ${this.provider.name}`}
            </h2>
            <button class="close-btn" @click=${this.close} ?disabled=${this.isSubmitting}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            ${this.step === "auth" ? this.renderAuthStep() : null}
            ${this.step === "models" ? this.renderModelsStep() : null}
            ${this.step === "testing" ? this.renderTestingStep() : null}
            ${this.step === "success" ? this.renderSuccessStep() : null}
            ${this.step === "error" ? this.renderErrorStep() : null}
          </div>

          ${this.step !== "testing" ? html`
            <div class="modal-footer">
              ${this.step === "auth" ? html`
                <button class="btn btn-secondary" @click=${this.close}>Cancel</button>
                <button class="btn btn-primary" @click=${this.goToModels}>
                  Next
                </button>
              ` : null}

              ${this.step === "models" ? html`
                <button class="btn btn-secondary" @click=${() => this.step = "auth"}>Back</button>
                <button 
                  class="btn btn-primary" 
                  @click=${this.save}
                  ?disabled=${this.isSubmitting}
                >
                  ${this.isSubmitting ? html`<div class="spinner"></div>` : null}
                  ${this.config.testConnection ? "Test & Save" : "Save"}
                </button>
              ` : null}

              ${this.step === "success" ? html`
                <button class="btn btn-primary" @click=${this.close}>Done</button>
              ` : null}

              ${this.step === "error" ? html`
                <button class="btn btn-secondary" @click=${() => this.step = "auth"}>Back</button>
                <button 
                  class="btn btn-primary" 
                  @click=${this.config.testConnection ? this.testConnection : this.save}
                  ?disabled=${this.isSubmitting}
                >
                  ${this.isSubmitting ? html`<div class="spinner"></div>` : "Retry"}
                </button>
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
    "providers-config-modal": ProvidersConfigModal;
  }
}
