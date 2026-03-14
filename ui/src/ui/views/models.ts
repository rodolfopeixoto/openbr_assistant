import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import type { ProviderCardData } from "../components/provider-card";
import { icons } from "../icons";

export interface ModelsViewState {
  loading: boolean;
  error: string | null;
  providers: ProviderCardData[];
  searchQuery: string;
  // Modal state
  showAddForm: string | null;
  selectedProvider: ProviderCardData | null;
  formProfileName: string;
  formCredential: string;
  formEmail: string;
  formMode: "api_key" | "oauth" | "token";
  formTesting: boolean;
  formSaving: boolean;
  formError: string;
  formTestResult: { ok: boolean; error?: string } | null;
}

export interface ModelsViewCallbacks {
  onRefresh: () => void;
  onConfigure: (providerId: string) => void;
  onManage: (providerId: string) => void;
  onSearchChange: (query: string) => void;
  // Modal callbacks
  onHideAddForm: () => void;
  onFormProfileNameChange: (value: string) => void;
  onFormCredentialChange: (value: string) => void;
  onFormEmailChange: (value: string) => void;
  onFormModeChange: (value: "api_key" | "oauth" | "token") => void;
  onFormTest: () => void;
  onFormSave: () => void;
}

function getFilteredProviders(providers: ProviderCardData[], query: string): ProviderCardData[] {
  if (!query.trim()) return providers;
  
  const lowerQuery = query.toLowerCase().trim();
  return providers.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.id.toLowerCase().includes(lowerQuery)
  );
}

function renderStatusSummary(providers: ProviderCardData[]): TemplateResult {
  const configured = providers.filter(p => p.status === "configured").length;
  const unconfigured = providers.filter(p => p.status === "unconfigured").length;
  const errors = providers.filter(p => p.status === "error").length;

  return html`
    <div class="models-status-bar">
      <div class="status-item">
        <span class="status-dot configured"></span>
        <span class="status-count">${configured}</span>
        <span class="status-label">Configured</span>
      </div>
      <div class="status-item">
        <span class="status-dot unconfigured"></span>
        <span class="status-count">${unconfigured}</span>
        <span class="status-label">Not Configured</span>
      </div>
      ${errors > 0 ? html`
        <div class="status-item error">
          <span class="status-dot error"></span>
          <span class="status-count">${errors}</span>
          <span class="status-label">Errors</span>
        </div>
      ` : null}
    </div>
  `;
}

export function renderModels(
  state: ModelsViewState,
  callbacks: ModelsViewCallbacks
): TemplateResult {
  const filteredProviders = getFilteredProviders(state.providers, state.searchQuery);

  return html`
    <div class="models-page">
      <style>
        .models-page {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .models-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .models-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--text, #fff);
          margin: 0;
        }

        .models-subtitle {
          font-size: 14px;
          color: var(--muted, #888);
          margin-top: 4px;
        }

        .models-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-box {
          position: relative;
          width: 280px;
        }

        .search-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          background: var(--bg-elevated, #1a1a2e);
          border: 1px solid var(--border, #2d2d44);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text, #fff);
          outline: none;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: var(--accent, #6366f1);
          box-shadow: 0 0 0 3px var(--accent-subtle, rgba(99, 102, 241, 0.15));
        }

        .search-input::placeholder {
          color: var(--muted, #666);
        }

        .search-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted, #666);
          pointer-events: none;
        }

        .btn {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-secondary {
          background: var(--bg-elevated, #1a1a2e);
          color: var(--text, #fff);
          border: 1px solid var(--border, #2d2d44);
        }

        .btn-secondary:hover {
          background: var(--bg-hover, #252540);
          border-color: var(--border-strong, #3d3d5c);
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }

        .models-status-bar {
          display: flex;
          gap: 24px;
          margin-bottom: 24px;
          padding: 16px 20px;
          background: var(--bg-elevated, #1a1a2e);
          border: 1px solid var(--border, #2d2d44);
          border-radius: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-item.error {
          color: #ef4444;
        }

        .status-dot {
          width: 10px;
          height: 10px;
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

        .status-count {
          font-weight: 600;
          font-size: 16px;
          color: var(--text, #fff);
        }

        .status-label {
          font-size: 13px;
          color: var(--muted, #888);
        }

        .providers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .no-results {
          grid-column: 1 / -1;
          padding: 60px 40px;
          text-align: center;
          color: var(--muted, #888);
          background: var(--bg-elevated, #1a1a2e);
          border: 1px solid var(--border, #2d2d44);
          border-radius: 12px;
        }

        .no-results-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          color: var(--muted, #666);
        }

        .no-results-title {
          font-size: 18px;
          font-weight: 500;
          color: var(--text, #fff);
          margin-bottom: 8px;
        }

        .no-results-desc {
          font-size: 14px;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #ef4444;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 40px;
          color: var(--muted, #888);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border, #2d2d44);
          border-top-color: var(--accent, #6366f1);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        provider-card {
          height: 100%;
        }
      </style>

      <div class="models-header">
        <div>
          <h1 class="models-title">AI Model Providers</h1>
          <div class="models-subtitle">Configure and manage your LLM provider credentials</div>
        </div>
        <div class="models-actions">
          <div class="search-box">
            <input
              type="text"
              class="search-input"
              placeholder="Search providers..."
              .value=${state.searchQuery}
              @input=${(e: Event) => callbacks.onSearchChange((e.target as HTMLInputElement).value)}
            />
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          <button class="btn btn-secondary" @click=${callbacks.onRefresh}>
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      ${state.error ? html`
        <div class="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          ${state.error}
        </div>
      ` : null}

      ${state.loading ? html`
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>Loading providers...</span>
        </div>
      ` : html`
        ${renderStatusSummary(state.providers)}
        
        <div class="providers-grid">
          ${filteredProviders.length === 0 ? html`
            <div class="no-results">
              <svg class="no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
                <path d="M8 8l6 6M14 8l-6 6"></path>
              </svg>
              <div class="no-results-title">No providers found</div>
              <div class="no-results-desc">Try adjusting your search terms</div>
            </div>
          ` : filteredProviders.map(provider => html`
            <provider-card
              .provider=${provider}
              @configure=${(e: CustomEvent) => callbacks.onConfigure(e.detail.providerId)}
              @manage=${(e: CustomEvent) => callbacks.onManage(e.detail.providerId)}
            ></provider-card>
          `)}
        </div>
      `}

      ${state.showAddForm && state.selectedProvider ? html`
        <div class="modal-overlay" @click=${callbacks.onHideAddForm}>
          <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
            <div class="modal-header">
              <h2 class="modal-title">Configure ${state.selectedProvider.name}</h2>
              <button class="modal-close" @click=${callbacks.onHideAddForm}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div class="modal-body">
              ${state.formError ? html`
                <div class="form-error">${state.formError}</div>
              ` : null}
              
              <div class="form-group">
                <label class="form-label">Profile Name</label>
                <input 
                  type="text" 
                  class="form-input"
                  .value=${state.formProfileName}
                  @input=${(e: Event) => callbacks.onFormProfileNameChange((e.target as HTMLInputElement).value)}
                  placeholder="e.g., default, work, personal"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Authentication Mode</label>
                <select 
                  class="form-select"
                  .value=${state.formMode}
                  @change=${(e: Event) => callbacks.onFormModeChange((e.target as HTMLSelectElement).value as "api_key" | "oauth" | "token")}
                >
                  <option value="api_key">API Key</option>
                  <option value="token">Token</option>
                  <option value="oauth" disabled>OAuth (coming soon)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">
                  ${state.formMode === "api_key" ? "API Key" : "Token"}
                </label>
                <input 
                  type="password" 
                  class="form-input"
                  .value=${state.formCredential}
                  @input=${(e: Event) => callbacks.onFormCredentialChange((e.target as HTMLInputElement).value)}
                  placeholder=${state.formMode === "api_key" ? "sk-..." : "Enter your token"}
                />
              </div>

              <div class="form-group">
                <label class="form-label">Email (optional)</label>
                <input 
                  type="email" 
                  class="form-input"
                  .value=${state.formEmail}
                  @input=${(e: Event) => callbacks.onFormEmailChange((e.target as HTMLInputElement).value)}
                  placeholder="your@email.com"
                />
              </div>

              ${state.formTestResult ? html`
                <div class="test-result ${state.formTestResult.ok ? 'success' : 'error'}">
                  ${state.formTestResult.ok 
                    ? html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Connection successful!`
                    : html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> ${state.formTestResult.error}`
                  }
                </div>
              ` : null}
            </div>
            
            <div class="modal-footer">
              <button class="btn btn-secondary" @click=${callbacks.onHideAddForm}>Cancel</button>
              <button 
                class="btn btn-secondary" 
                @click=${callbacks.onFormTest}
                ?disabled=${state.formTesting || !state.formCredential}
              >
                ${state.formTesting ? html`<span class="btn-spinner"></span> Testing...` : 'Test Connection'}
              </button>
              <button 
                class="btn btn-primary" 
                @click=${callbacks.onFormSave}
                ?disabled=${state.formSaving || !state.formCredential}
              >
                ${state.formSaving ? html`<span class="btn-spinner"></span> Saving...` : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        <style>
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 24px;
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

          .modal-close {
            background: none;
            border: none;
            color: var(--muted, #888);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.15s ease;
          }

          .modal-close:hover {
            color: var(--text, #fff);
            background: var(--bg-hover, #252540);
          }

          .modal-body {
            padding: 24px;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px 24px;
            border-top: 1px solid var(--border, #2d2d44);
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group:last-child {
            margin-bottom: 0;
          }

          .form-label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: var(--text, #fff);
            margin-bottom: 8px;
          }

          .form-input,
          .form-select {
            width: 100%;
            padding: 12px 16px;
            background: var(--bg, #0f0f1a);
            border: 1px solid var(--border, #2d2d44);
            border-radius: 8px;
            font-size: 14px;
            color: var(--text, #fff);
            transition: all 0.15s ease;
          }

          .form-input:focus,
          .form-select:focus {
            outline: none;
            border-color: var(--accent, #6366f1);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .form-input::placeholder {
            color: var(--muted, #666);
          }

          .form-select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
          }

          .form-select option:disabled {
            color: #666;
          }

          .form-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 13px;
            color: #ef4444;
            margin-bottom: 20px;
          }

          .test-result {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            margin-top: 16px;
          }

          .test-result.success {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #22c55e;
          }

          .test-result.error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
          }

          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            border: none;
          }

          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-primary {
            background: var(--accent, #6366f1);
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            background: var(--accent-hover, #818cf8);
          }

          .btn-secondary {
            background: var(--bg-accent, #2d2d44);
            color: var(--text, #fff);
            border: 1px solid var(--border, #2d2d44);
          }

          .btn-secondary:hover:not(:disabled) {
            background: var(--bg-hover, #252540);
            border-color: var(--border-strong, #3d3d5c);
          }

          .btn-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      ` : nothing}
    </div>
  `;
}
