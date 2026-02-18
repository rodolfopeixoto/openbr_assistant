import { html, nothing } from "lit";

// Minimal client interface for type safety
interface EnvClient {
  request(method: string, params: unknown): Promise<unknown>;
}

export type EnvViewProps = {
  client: EnvClient | null;
  connected: boolean;
  sessionKey: string;
  // Env vars state
  vars: Array<{
    key: string;
    encrypted: boolean;
    createdAt: number;
    updatedAt: number;
    hasValue: boolean;
    isSensitive: boolean;
  }>;
  loading: boolean;
  saving: boolean;
  error: string;
  // Modal state
  isModalOpen: boolean;
  editingVar: { key: string } | null;
  keyInput: string;
  valueInput: string;
  encryptInput: boolean;
  validationError: string;
  // Handlers
  onLoad: () => void;
  onModalOpen: (editVar?: { key: string }) => void;
  onModalClose: () => void;
  onKeyInput: (value: string) => void;
  onValueInput: (value: string) => void;
  onEncryptInput: (value: boolean) => void;
  onValidationError: (error: string) => void;
  onSave: () => void;
  onDelete: (key: string) => void;
};

export function renderEnvView(props: EnvViewProps) {
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const validateKey = (key: string, existingVars: string[], editingKey?: string): string | null => {
    if (!key) return "Key is required";
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return "Key must start with letter/underscore and contain only alphanumeric characters";
    }
    const RESERVED_KEYS = ["PATH", "HOME", "USER", "SHELL", "PWD", "OLDPWD"];
    if (RESERVED_KEYS.includes(key)) {
      return `Cannot modify reserved environment variable: ${key}`;
    }
    if (editingKey !== key && existingVars.includes(key)) {
      return "Key already exists";
    }
    return null;
  };

  const handleSave = () => {
    const error = validateKey(
      props.keyInput, 
      props.vars.map(v => v.key),
      props.editingVar?.key
    );
    if (error) {
      props.onValidationError(error);
      return;
    }

    if (!props.editingVar && !props.valueInput) {
      props.onValidationError("Value is required for new variables");
      return;
    }

    props.onSave();
  };

  const handleDelete = (key: string) => {
    if (confirm(`Are you sure you want to delete ${key}?`)) {
      props.onDelete(key);
    }
  };

  return html`
    <div class="page-container">
      <div class="page-header">
        <div class="page-title-row">
          <div class="page-title-section">
            <h1 class="page-title">Environment Variables</h1>
            <p class="page-description">
              Manage environment variables for the gateway. 
              Sensitive values are encrypted with AES-256-GCM.
            </p>
          </div>
          <div class="page-actions">
            <button
              class="btn btn-primary"
              @click=${() => props.onModalOpen()}
              ?disabled=${!props.connected || props.loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Variable
            </button>
          </div>
        </div>
      </div>

      ${!props.connected
        ? html`
          <div class="env-notice env-notice--warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <triangle cx="12" cy="12" r="10"></triangle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Connect to gateway to manage environment variables</span>
          </div>
        `
        : nothing
      }

      ${props.error
        ? html`
          <div class="env-notice env-notice--error">
            <strong>Error:</strong> ${props.error}
          </div>
        `
        : nothing
      }

      <div class="env-card">
        <div class="security-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <strong>Security Notice:</strong> Values are encrypted with AES-256-GCM. 
          Sensitive keys (containing "token", "password", "secret", "api_key", etc.) 
          are auto-encrypted. Audit logs track all changes.
        </div>

        ${props.loading
          ? html`
            <div class="env-loading">
              <div class="spinner"></div>
              <span>Loading environment variables...</span>
            </div>
          `
          : props.vars.length === 0
            ? html`
              <div class="env-empty">
                <svg class="env-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                </svg>
                <p class="env-empty-title">No environment variables configured</p>
                <p class="env-empty-subtitle">Click "Add Variable" to create one</p>
              </div>
            `
            : html`
              <div class="env-list">
                <div class="env-list-header">
                  <div class="env-col-key">Key</div>
                  <div class="env-col-status">Status</div>
                  <div class="env-col-updated">Last Updated</div>
                  <div class="env-col-actions">Actions</div>
                </div>

                ${props.vars.map((envVar) => html`
                  <div class="env-item">
                    <div class="env-col-key">
                      <code class="env-key">${envVar.key}</code>
                    </div>
                    <div class="env-col-status">
                      <div class="env-badges">
                        ${envVar.encrypted
                          ? html`<span class="env-badge env-badge--encrypted">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Encrypted
                          </span>`
                          : html`<span class="env-badge env-badge--plain">Plain</span>`
                        }
                        ${envVar.isSensitive
                          ? html`<span class="env-badge env-badge--sensitive">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            Sensitive
                          </span>`
                          : nothing
                        }
                      </div>
                    </div>
                    <div class="env-col-updated">
                      <time class="env-time" datetime=${new Date(envVar.updatedAt).toISOString()}
003e
                        ${formatDate(envVar.updatedAt)}
                      </time>
                    </div>
                    <div class="env-col-actions">
                      <button
                        class="env-btn env-btn--secondary"
                        @click=${() => props.onModalOpen({ key: envVar.key })}
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        class="env-btn env-btn--danger"
                        @click=${() => handleDelete(envVar.key)}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                `)}
              </div>
            `
        }
      </div>

      <!-- Modal -->
      ${props.isModalOpen
        ? html`
          <div class="modal-overlay" @click=${(e: Event) => {
            if (e.target === e.currentTarget) props.onModalClose();
          }}>
            <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
              <div class="modal-header">
                <h2 class="modal-title">
                  ${props.editingVar ? `Edit ${props.editingVar.key}` : 'Add Environment Variable'}
                </h2>
                <button class="modal-close" @click=${props.onModalClose}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label" for="env-key">Key</label>
                  <input
                    id="env-key"
                    class="form-input ${props.validationError ? 'error' : ''}"
                    type="text"
                    placeholder="e.g., API_KEY"
                    .value=${props.keyInput}
                    @input=${(e: Event) => {
                      props.onKeyInput((e.target as HTMLInputElement).value.toUpperCase());
                      props.onValidationError("");
                    }}
                    ?disabled=${!!props.editingVar}
                  />
                  ${props.validationError
                    ? html`<div class="form-error">${props.validationError}</div>`
                    : html`<div class="form-hint">Use uppercase letters, numbers, and underscores only</div>`
                  }
                </div>

                <div class="form-group">
                  <label class="form-label" for="env-value">Value</label>
                  <input
                    id="env-value"
                    class="form-input"
                    type="password"
                    placeholder=${props.editingVar ? "Leave empty to keep current value" : "Enter value"}
                    .value=${props.valueInput}
                    @input=${(e: Event) => props.onValueInput((e.target as HTMLInputElement).value)}
                  />
                  ${props.editingVar
                    ? html`<div class="form-hint">Leave empty to keep the current value</div>`
                    : nothing
                  }
                </div>

                <div class="form-checkbox">
                  <input
                    type="checkbox"
                    id="env-encrypt"
                    .checked=${props.encryptInput}
                    @change=${(e: Event) => props.onEncryptInput((e.target as HTMLInputElement).checked)}
                  />
                  <label for="env-encrypt">Encrypt this value</label>
                </div>
              </div>

              <div class="modal-footer">
                <button class="btn btn-secondary" @click=${props.onModalClose}>Cancel</button>
                <button
                  class="btn btn-primary"
                  @click=${handleSave}
                  ?disabled=${props.saving}
                >
                  ${props.saving
                    ? html`<span class="loading">
                      <span class="spinner"></span>
                      Saving...
                    </span>`
                    : 'Save'
                  }
                </button>
              </div>
            </div>
          </div>
        `
        : nothing
      }
    </div>
  `;
}
