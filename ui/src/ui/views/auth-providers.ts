import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import type { AuthFormData } from "../components/auth-profile-form";
import type { ProviderCardData } from "../components/provider-card";
import { icons } from "../icons";

export interface AuthProvidersViewState {
  loading: boolean;
  error: string | null;
  providers: ProviderCardData[];
  configuredProfileIds: string[];
  searchQuery: string;
  showAddForm: boolean;
  selectedProviderId: string | null;
  testing: boolean;
  testResult: { success: boolean; message: string } | null;
  saving: boolean;
}

export interface AuthProvidersViewCallbacks {
  onRefresh: () => void;
  onSearchChange: (query: string) => void;
  onShowAddForm: (providerId: string) => void;
  onHideAddForm: () => void;
  onTestCredential: (profileId: string, credential: unknown) => void;
  onSaveCredential: (profileId: string, credential: unknown, email?: string) => void;
  onRemoveCredential: (profileId: string) => void;
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

  return html`
    <div class="auth-status-bar">
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
    </div>
  `;
}

export function renderAuthProviders(
  state: AuthProvidersViewState,
  callbacks: AuthProvidersViewCallbacks
): TemplateResult {
  const filteredProviders = getFilteredProviders(state.providers, state.searchQuery);
  const selectedProvider = state.selectedProviderId 
    ? state.providers.find(p => p.id === state.selectedProviderId)
    : null;

  return html`
    <div class="auth-providers-page">
      <style>
        .auth-providers-page {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .auth-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .auth-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--text, #fff);
          margin: 0;
        }

        .auth-subtitle {
          font-size: 14px;
          color: var(--muted, #888);
          margin-top: 4px;
        }

        .auth-actions {
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

        .btn-primary {
          background: var(--accent, #6366f1);
          color: white;
        }

        .btn-primary:hover {
          background: var(--accent-hover, #5558e0);
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }

        .auth-status-bar {
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
          cursor: pointer;
        }

        /* Modal overlay for add form */
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

        .modal-content {
          max-height: 90vh;
          overflow-y: auto;
        }

        .configured-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 6px;
          color: #22c55e;
          font-size: 12px;
          font-weight: 500;
        }
      </style>

      <div class="auth-header">
        <div>
          <h1 class="auth-title">Authentication Providers</h1>
          <div class="auth-subtitle">Configure credentials for AI model providers</div>
        </div>
        <div class="auth-actions">
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
              @click=${() => callbacks.onShowAddForm(provider.id)}
            ></provider-card>
          `)}
        </div>
      `}

      ${state.showAddForm && selectedProvider ? html`
        <div class="modal-overlay" @click=${callbacks.onHideAddForm}>
          <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
            <auth-profile-form
              .providerId=${selectedProvider.id}
              .providerName=${selectedProvider.name}
              @test-auth=${(e: CustomEvent) => callbacks.onTestCredential(e.detail.profileId, e.detail.credential)}
              @save-auth=${(e: CustomEvent) => callbacks.onSaveCredential(e.detail.profileId, e.detail.credential, e.detail.email)}
            ></auth-profile-form>
          </div>
        </div>
      ` : nothing}
    </div>
  `;
}
