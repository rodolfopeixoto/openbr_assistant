import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";

// SVG Icons
const ICONS = {
  settings: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  save: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  download: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  history: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>`,
  refresh: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  check: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  code: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  edit: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  rotate: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
};

export function renderConfigManagerView(state: AppViewState) {
  const configState = state.configManagerState;
  
  if (!configState || state.configManagerLoading) {
    return html`
      <div class="config-manager-view">
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading configuration...</p>
        </div>
      </div>
    `;
  }

  return html`
    <div class="config-manager-view">
      ${renderHeader(state)}
      <div class="config-content">
        ${renderSidebar(configState, state)}
        ${renderMainPanel(configState, state)}
      </div>
    </div>
  `;
}

function renderHeader(state: AppViewState) {
  return html`
    <div class="view-header">
      <div class="header-title">
        <div class="title-row">
          <div class="title-icon">${ICONS.settings}</div>
          <h1>Configuration</h1>
        </div>
        <p class="subtitle">Manage system configuration and settings</p>
      </div>
      
      <div class="header-actions">
        <button class="btn-secondary" @click="${() => state.handleConfigManagerLoad()}" ?disabled="${state.configManagerLoading}">
          ${ICONS.refresh} Refresh
        </button>
        <button class="btn-secondary" @click="${() => handleExport(state)}" ?disabled="${state.configManagerLoading}">
          ${ICONS.download} Export
        </button>
        <button class="btn-secondary" @click="${() => handleImport(state)}" ?disabled="${state.configManagerLoading}">
          ${ICONS.upload} Import
        </button>
        <button class="btn-danger" @click="${() => handleReset(state)}" ?disabled="${state.configManagerLoading}">
          ${ICONS.rotate} Reset
        </button>
      </div>
    </div>
  `;
}

function renderSidebar(configState: any, state: AppViewState) {
  const tabs = [
    { id: 'general', label: 'General', icon: ICONS.settings },
    { id: 'ai', label: 'AI Models', icon: ICONS.code },
    { id: 'channels', label: 'Channels', icon: ICONS.edit },
    { id: 'security', label: 'Security', icon: ICONS.check },
    { id: 'logging', label: 'Logging', icon: ICONS.history },
  ];

  return html`
    <div class="config-sidebar">
      <nav class="config-nav">
        ${tabs.map((tab) => html`
          <button 
            class="nav-item ${configState.selectedTab === tab.id ? 'active' : ''}"
            @click="${() => selectTab(state, tab.id)}"
          >
            ${tab.icon}
            <span>${tab.label}</span>
          </button>
        `)}
      </nav>
      
      ${renderHistoryPanel(configState, state)}
    </div>
  `;
}

function renderMainPanel(configState: any, state: AppViewState) {
  const hasErrors = configState.validationErrors?.length > 0;
  const hasWarnings = configState.validationWarnings?.length > 0;

  return html`
    <div class="config-main">
      ${hasErrors ? html`
        <div class="alert alert-error">
          <strong>${ICONS.warning} Validation Errors</strong>
          <ul>
            ${configState.validationErrors.map((error: string) => html`<li>${error}</li>`)}
          </ul>
        </div>
      ` : nothing}
      
      ${hasWarnings ? html`
        <div class="alert alert-warning">
          <strong>${ICONS.warning} Warnings</strong>
          <ul>
            ${configState.validationWarnings.map((warning: string) => html`<li>${warning}</li>`)}
          </ul>
        </div>
      ` : nothing}
      
      <div class="config-editor">
        <div class="editor-header">
          <div class="editor-tabs">
            <button 
              class="tab ${configState.editMode === 'form' ? 'active' : ''}"
              @click="${() => setEditMode(state, 'form')}"
            >
              Form
            </button>
            <button 
              class="tab ${configState.editMode === 'json' ? 'active' : ''}"
              @click="${() => setEditMode(state, 'json')}"
            >
              JSON
            </button>
          </div>
          
          <button 
            class="btn-primary" 
            @click="${() => handleSave(state)}"
            ?disabled="${state.configManagerSaving}"
          >
            ${state.configManagerSaving ? 'Saving...' : html`${ICONS.save} Save Changes`}
          </button>
        </div>
        
        <div class="editor-content">
          ${configState.editMode === 'form' 
            ? renderFormEditor(configState, state)
            : renderJsonEditor(configState, state)
          }
        </div>
      </div>
    </div>
  `;
}

function renderHistoryPanel(configState: any, state: AppViewState) {
  if (!configState.history || configState.history.length === 0) {
    return html`
      <div class="history-panel">
        <h3>${ICONS.history} History</h3>
        <p class="empty-text">No history yet</p>
      </div>
    `;
  }

  return html`
    <div class="history-panel">
      <h3>${ICONS.history} History</h3>
      <div class="history-list">
        ${configState.history.map((entry: any, index: number) => html`
          <div class="history-item">
            <div class="history-time">${new Date(entry.timestamp).toLocaleString()}</div>
            <div class="history-comment">${entry.comment || 'Configuration update'}</div>
            <button 
              class="btn-small" 
              @click="${() => state.handleConfigManagerRollback(index)}"
              ?disabled="${state.configManagerSaving}"
            >
              Restore
            </button>
          </div>
        `)}
      </div>
    </div>
  `;
}

function renderFormEditor(configState: any, state: AppViewState) {
  // Simplified form based on selected tab
  const config = configState.config || {};
  
  switch (configState.selectedTab) {
    case 'general':
      return renderGeneralSettings(config, state);
    case 'ai':
      return renderAISettings(config, state);
    case 'channels':
      return renderChannelSettings(config, state);
    case 'security':
      return renderSecuritySettings(config, state);
    case 'logging':
      return renderLoggingSettings(config, state);
    default:
      return html`<div class="empty-state">Select a section to configure</div>`;
  }
}

function renderGeneralSettings(config: any, state: AppViewState) {
  return html`
    <div class="form-section">
      <h3>Gateway Settings</h3>
      
      <div class="form-group">
        <label>Port</label>
        <input 
          type="number" 
          .value="${config.gateway?.port || 18789}"
          @change="${(e: InputEvent) => updateConfigValue(state, 'gateway.port', parseInt((e.target as HTMLInputElement).value))}"
        />
      </div>
      
      <div class="form-group">
        <label>Host</label>
        <input 
          type="text" 
          .value="${config.gateway?.host || '127.0.0.1'}"
          @change="${(e: InputEvent) => updateConfigValue(state, 'gateway.host', (e.target as HTMLInputElement).value)}"
        />
      </div>
    </div>
  `;
}

function renderAISettings(config: any, state: AppViewState) {
  return html`
    <div class="form-section">
      <h3>AI Configuration</h3>
      
      <div class="form-group">
        <label>Default Provider</label>
        <select 
          .value="${config.ai?.defaultProvider || 'openai'}"
          @change="${(e: InputEvent) => updateConfigValue(state, 'ai.defaultProvider', (e.target as HTMLSelectElement).value)}"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="ollama">Ollama (Local)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Default Model</label>
        <input 
          type="text" 
          .value="${config.ai?.defaultModel || 'gpt-4'}"
          @change="${(e: InputEvent) => updateConfigValue(state, 'ai.defaultModel', (e.target as HTMLInputElement).value)}"
        />
      </div>
      
      <div class="form-group">
        <label>Temperature (${config.ai?.temperature || 0.7})</label>
        <input 
          type="range" 
          min="0" 
          max="2" 
          step="0.1"
          .value="${config.ai?.temperature || 0.7}"
          @change="${(e: InputEvent) => updateConfigValue(state, 'ai.temperature', parseFloat((e.target as HTMLInputElement).value))}"
        />
      </div>
    </div>
  `;
}

function renderChannelSettings(config: any, state: AppViewState) {
  const telegramEnabled = config.channels?.telegram?.enabled || false;
  const telegramToken = config.channels?.telegram?.token || '';
  const telegramTimeout = config.channels?.telegram?.timeoutSeconds || 500;
  
  return html`
    <div class="form-section">
      <h3>Channel Configuration</h3>
      
      <!-- WhatsApp -->
      <div class="channel-config-group">
        <h4>WhatsApp</h4>
        <div class="form-group checkbox">
          <label>
            <input 
              type="checkbox"
              .checked="${config.channels?.whatsapp?.enabled || false}"
              @change="${(e: InputEvent) => updateConfigValue(state, 'channels.whatsapp.enabled', (e.target as HTMLInputElement).checked)}"
            />
            Enable WhatsApp
          </label>
        </div>
      </div>
      
      <!-- Telegram -->
      <div class="channel-config-group">
        <h4>Telegram</h4>
        <div class="form-group checkbox">
          <label>
            <input 
              type="checkbox"
              .checked="${telegramEnabled}"
              @change="${(e: InputEvent) => updateConfigValue(state, 'channels.telegram.enabled', (e.target as HTMLInputElement).checked)}"
            />
            Enable Telegram
          </label>
        </div>
        
        ${telegramEnabled ? html`
          <div class="form-group">
            <label>Bot Token <span class="required">*</span></label>
            <input 
              type="password"
              .value="${telegramToken}"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              @change="${(e: InputEvent) => updateConfigValue(state, 'channels.telegram.token', (e.target as HTMLInputElement).value)}"
            />
            <p class="help-text">Get your bot token from @BotFather on Telegram</p>
          </div>
          
          <div class="form-group">
            <label>Timeout (seconds)</label>
            <input 
              type="number"
              .value="${telegramTimeout}"
              min="30"
              max="600"
              @change="${(e: InputEvent) => updateConfigValue(state, 'channels.telegram.timeoutSeconds', parseInt((e.target as HTMLInputElement).value))}"
            />
            <p class="help-text">Request timeout (30-600 seconds)</p>
          </div>
          
          <div class="form-group checkbox">
            <label>
              <input 
                type="checkbox"
                .checked="${config.channels?.telegram?.dmPolicy === 'open' || !config.channels?.telegram?.dmPolicy}"
                @change="${(e: InputEvent) => updateConfigValue(state, 'channels.telegram.dmPolicy', (e.target as HTMLInputElement).checked ? 'open' : 'closed')}"
              />
              Allow DMs from anyone
            </label>
          </div>
        ` : nothing}
      </div>
      
      <!-- Discord -->
      <div class="channel-config-group">
        <h4>Discord</h4>
        <div class="form-group checkbox">
          <label>
            <input 
              type="checkbox"
              .checked="${config.channels?.discord?.enabled || false}"
              @change="${(e: InputEvent) => updateConfigValue(state, 'channels.discord.enabled', (e.target as HTMLInputElement).checked)}"
            />
            Enable Discord
          </label>
        </div>
        
        ${config.channels?.discord?.enabled ? html`
          <div class="form-group">
            <label>Bot Token <span class="required">*</span></label>
            <input 
              type="password"
              .value="${config.channels?.discord?.token || ''}"
              placeholder="YOUR_DISCORD_BOT_TOKEN"
              @change="${(e: InputEvent) => updateConfigValue(state, 'channels.discord.token', (e.target as HTMLInputElement).value)}"
            />
          </div>
        ` : nothing}
      </div>
      
      <!-- Slack -->
      <div class="channel-config-group">
        <h4>Slack</h4>
        <div class="form-group checkbox">
          <label>
            <input 
              type="checkbox"
              .checked="${config.channels?.slack?.enabled || false}"
              @change="${(e: InputEvent) => updateConfigValue(state, 'channels.slack.enabled', (e.target as HTMLInputElement).checked)}"
            />
            Enable Slack
          </label>
        </div>
        
        ${config.channels?.slack?.enabled ? html`
          <div class="form-group">
            <label>Bot Token <span class="required">*</span></label>
            <input 
              type="password"
              .value="${config.channels?.slack?.botToken || ''}"
              placeholder="xoxb-..."
              @change="${(e: InputEvent) => updateConfigValue(state, 'channels.slack.botToken', (e.target as HTMLInputElement).value)}"
            />
          </div>
        ` : nothing}
      </div>
    </div>
  `;
}

function renderSecuritySettings(config: any, state: AppViewState) {
  return html`
    <div class="form-section">
      <h3>Security Settings</h3>
      
      <div class="form-group checkbox">
        <label>
          <input 
            type="checkbox"
            .checked="${config.security?.authEnabled || true}"
            @change="${(e: InputEvent) => updateConfigValue(state, 'security.authEnabled', (e.target as HTMLInputElement).checked)}"
          />
          Enable Authentication
        </label>
      </div>
      
      <div class="form-group">
        <label>Token Expiry (seconds)</label>
        <input 
          type="number" 
          .value="${config.security?.tokenExpiry || 86400}"
          @change="${(e: InputEvent) => updateConfigValue(state, 'security.tokenExpiry', parseInt((e.target as HTMLInputElement).value))}"
        />
      </div>
    </div>
  `;
}

function renderLoggingSettings(config: any, state: AppViewState) {
  return html`
    <div class="form-section">
      <h3>Logging Configuration</h3>
      
      <div class="form-group">
        <label>Log Level</label>
        <select 
          .value="${config.logging?.level || 'info'}"
          @change="${(e: InputEvent) => updateConfigValue(state, 'logging.level', (e.target as HTMLSelectElement).value)}"
        >
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Max File Size</label>
        <input 
          type="text" 
          .value="${config.logging?.maxSize || '100m'}"
          @change="${(e: InputEvent) => updateConfigValue(state, 'logging.maxSize', (e.target as HTMLInputElement).value)}"
        />
      </div>
    </div>
  `;
}

function renderJsonEditor(configState: any, state: AppViewState) {
  const jsonString = JSON.stringify(configState.config || {}, null, 2);
  
  return html`
    <div class="json-editor">
      <textarea
        .value="${jsonString}"
        @change="${(e: InputEvent) => handleJsonChange(state, (e.target as HTMLTextAreaElement).value)}"
        rows="30"
        spellcheck="false"
      ></textarea>
    </div>
  `;
}

// Helper functions
function selectTab(state: AppViewState, tabId: string) {
  state.configManagerState = {
    ...state.configManagerState,
    selectedTab: tabId,
  };
}

function setEditMode(state: AppViewState, mode: 'form' | 'json') {
  state.configManagerState = {
    ...state.configManagerState,
    editMode: mode,
  };
}

function updateConfigValue(state: AppViewState, path: string, value: unknown) {
  const currentConfig = state.configManagerState?.config || {};
  const keys = path.split('.');
  
  let target: any = currentConfig;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]];
  }
  
  target[keys[keys.length - 1]] = value;
  
  state.configManagerState = {
    ...state.configManagerState,
    config: { ...currentConfig },
  };
}

function handleJsonChange(state: AppViewState, json: string) {
  try {
    const config = JSON.parse(json);
    state.configManagerState = {
      ...state.configManagerState,
      config,
      validationErrors: [],
    };
  } catch (err) {
    state.configManagerState = {
      ...state.configManagerState,
      validationErrors: ['Invalid JSON format'],
    };
  }
}

async function handleSave(state: AppViewState) {
  const config = state.configManagerState?.config;
  if (config) {
    await state.handleConfigManagerUpdate(config, 'Manual update');
  }
}

async function handleExport(state: AppViewState) {
  const json = await state.handleConfigManagerExport();
  if (json) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openclaw-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function handleImport(state: AppViewState) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const text = await file.text();
      await state.handleConfigManagerImport(text);
    }
  };
  input.click();
}

async function handleReset(state: AppViewState) {
  if (confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
    await state.handleConfigManagerReset();
  }
}
