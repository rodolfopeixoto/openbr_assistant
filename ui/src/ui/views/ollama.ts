import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";
import type { LlamaFullStatus, DownloadProgress } from "../controllers/llama.js";
import { PRIMARY_MODEL, ALTERNATIVE_MODELS } from "../controllers/llama.js";

// SVG Icons
const ICONS = {
  brain: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>`,
  check: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  download: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  trash: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  play: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  stop: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  refresh: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  settings: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  power: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
  lightning: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  memory: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/></svg>`,
  chip: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 6v-3"/><path d="M15 6v-3"/><path d="M9 21v-3"/><path d="M15 21v-3"/><path d="M6 9h-3"/><path d="M6 15h-3"/><path d="M21 9h-3"/><path d="M21 15h-3"/></svg>`,
  star: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  package: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  server: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>`,
  info: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  circle: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
  circleCheck: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  terminal: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  arrowRight: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
};

// ALL_MODELS combinado
const ALL_MODELS = [PRIMARY_MODEL, ...ALTERNATIVE_MODELS];

export function renderOllamaView(state: AppViewState) {
  const status = (state.ollamaStatus as unknown as LlamaFullStatus | undefined | null) ?? undefined;

  return html`
    <div class="ollama-view">
      ${renderHeader(status, state)}
      ${status?.enabled ? renderWizard(status, state) : renderDisabledView(state)}
    </div>
  `;
}

function renderHeader(status: LlamaFullStatus | undefined, state: AppViewState) {
  const isRunning = status?.running || false;

  return html`
    <div class="view-header">
      <div class="header-title">
        <div class="title-row">
          <div class="title-icon">${ICONS.brain}</div>
          <h1>Local LLM</h1>
          <span class="status-badge ${isRunning ? 'running' : 'stopped'}">
            ${isRunning 
              ? html`${ICONS.check}<span>Running</span>` 
              : html`${ICONS.warning}<span>Stopped</span>`}
          </span>
        </div>
        <p class="subtitle">Run AI models locally for privacy and zero API costs</p>
      </div>

      <div class="header-actions">
        <button class="btn-icon" @click="${() => state.handleOllamaLoad()}" title="Refresh status">
          ${ICONS.refresh}
        </button>
      </div>
    </div>
  `;
}

function renderDisabledView(state: AppViewState) {
  return html`
    <div class="disabled-view">
      <div class="enable-card">
        <div class="enable-icon-large">${ICONS.power}</div>
        <h2>Local LLM is Disabled</h2>
        <p class="enable-description">Enable to run AI models locally on your machine. 
           No data sent to external servers, completely private.</p>
        
        <div class="benefits-row">
          <div class="benefit-item">
            ${ICONS.lightning}<span>Zero API Costs</span>
          </div>
          <div class="benefit-item">
            ${ICONS.memory}<span>~1GB RAM</span>
          </div>
          <div class="benefit-item">
            ${ICONS.star}<span>100% Private</span>
          </div>
        </div>

        <button class="btn-primary btn-large" @click="${() => state.handleOllamaToggleFeature(true)}">
          Enable Local LLM
        </button>
      </div>
    </div>
  `;
}

function renderWizard(status: LlamaFullStatus, state: AppViewState) {
  // Determine current step
  const isInstalled = status.installed;
  const hasAnyModel = getInstalledModels(status).length > 0;
  const isRunning = status.running;
  
  let currentStep = 1;
  if (isInstalled) currentStep = 2;
  if (isInstalled && hasAnyModel) currentStep = 3;
  if (isInstalled && hasAnyModel && isRunning) currentStep = 4;

  return html`
    <div class="wizard-container">
      <!-- Progress Steps -->
      <div class="wizard-steps">
        <div class="step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}">
          <div class="step-number">${currentStep > 1 ? ICONS.check : '1'}</div>
          <span>Install</span>
        </div>
        <div class="step-line ${currentStep >= 2 ? 'active' : ''}"></div>
        
        <div class="step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}">
          <div class="step-number">${currentStep > 2 ? ICONS.check : '2'}</div>
          <span>Models</span>
        </div>
        <div class="step-line ${currentStep >= 3 ? 'active' : ''}"></div>
        
        <div class="step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}">
          <div class="step-number">${currentStep > 3 ? ICONS.check : '3'}</div>
          <span>Start</span>
        </div>
        <div class="step-line ${currentStep >= 4 ? 'active' : ''}"></div>
        
        <div class="step ${currentStep >= 4 ? 'active' : ''}">
          <div class="step-number">4</div>
          <span>Ready</span>
        </div>
      </div>

      <!-- Step Content -->
      <div class="wizard-content">
        ${!isInstalled 
          ? renderStep1Install(state) 
          : !hasAnyModel 
            ? renderStep2Models(status, state)
            : !isRunning 
              ? renderStep3Start(status, state)
              : renderStep4Running(status, state)}
      </div>

      <!-- Console/Logs -->
      ${renderConsole(status)}
    </div>
  `;
}

function renderStep1Install(state: AppViewState) {
  return html`
    <div class="wizard-step-content">
      <div class="step-header">
        <div class="step-icon-large">${ICONS.download}</div>
        <h2>Step 1: Install Runtime</h2>
        <p>Download and install llama.cpp - the engine that runs AI models locally.</p>
      </div>

      <div class="install-info">
        <div class="info-row">
          <span class="label">Version:</span>
          <span class="value">llama.cpp b8168 (latest)</span>
        </div>
        <div class="info-row">
          <span class="label">Size:</span>
          <span class="value">~25-30 MB</span>
        </div>
        <div class="info-row">
          <span class="label">Platform:</span>
          <span class="value">Auto-detected</span>
        </div>
      </div>

      <button 
        class="btn-primary btn-large" 
        @click="${() => state.handleOllamaInstall()}"
        ?disabled="${state.ollamaLoading}"
      >
        ${state.ollamaLoading 
          ? html`Installing...` 
          : html`${ICONS.download} Install llama.cpp`}
      </button>

      ${state.ollamaError ? html`
        <div class="error-box">
          <strong>Installation Failed</strong>
          <p>${state.ollamaError}</p>
        </div>
      ` : nothing}
    </div>
  `;
}

function renderStep2Models(status: LlamaFullStatus, state: AppViewState) {
  const installedModels = getInstalledModels(status);
  
  return html`
    <div class="wizard-step-content">
      <div class="step-header">
        <div class="step-icon-large">${ICONS.package}</div>
        <h2>Step 2: Download Models</h2>
        <p>Choose one or more AI models to download. Smaller models run faster.</p>
      </div>

      <div class="models-selection">
        <!-- Primary/Recommended Model -->
        <div class="model-card recommended">
          <div class="model-badge">Recommended</div>
          <div class="model-header">
            <div class="model-title">
              <h3>${PRIMARY_MODEL.displayName}</h3>
              <span class="model-size">${PRIMARY_MODEL.size}</span>
            </div>
            ${isModelInstalled(PRIMARY_MODEL.name, status) 
              ? html`<span class="installed-badge">${ICONS.check} Installed</span>`
              : nothing}
          </div>          
          <p class="model-description">${PRIMARY_MODEL.description}</p>
          <div class="model-tags">
            ${PRIMARY_MODEL.tags.map((tag) => html`<span class="tag">${tag}</span>`)}
          </div>
          ${renderModelButton(PRIMARY_MODEL.name, PRIMARY_MODEL.sizeBytes, status, state)}
        </div>

        <!-- Alternative Models -->
        <div class="alternative-models-grid">
          ${ALTERNATIVE_MODELS.map((model) => renderAlternativeModelCard(model, status, state))}
        </div>
      </div>
    </div>
  `;
}

function renderAlternativeModelCard(
  model: typeof ALTERNATIVE_MODELS[0],
  status: LlamaFullStatus,
  state: AppViewState
) {
  const isInstalled = isModelInstalled(model.name, status);
  
  return html`
    <div class="model-card small">
      <div class="model-header">
        <h4>${model.displayName}</h4>
        <span class="model-size">${model.size}</span>
      </div>      
      <p class="model-description">${model.description}</p>
      <div class="model-tags">
        ${model.tags.slice(0, 2).map((tag) => html`<span class="tag small">${tag}</span>`)}
      </div>
      ${renderModelButton(model.name, model.sizeBytes, status, state, true)}
    </div>
  `;
}

function renderModelButton(
  modelName: string, 
  sizeBytes: number,
  status: LlamaFullStatus, 
  state: AppViewState,
  isSmall = false
) {
  const isInstalled = isModelInstalled(modelName, status);
  const isDownloading = state.ollamaPullProgress?.model === modelName;
  const downloadProgress = isDownloading ? state.ollamaPullProgress?.progress as DownloadProgress : null;

  if (isDownloading && downloadProgress) {
    return html`
      <div class="download-progress-inline">
        <div class="progress-bar-small">
          <div class="progress-fill" style="width: ${downloadProgress.percent}%"></div>
        </div>
        <span class="progress-text">${downloadProgress.percent}% - ${formatSpeed(downloadProgress.speed)}</span>
      </div>
    `;
  }

  if (isInstalled) {
    return html`
      <div class="model-actions">
        <button class="btn-secondary btn-small" @click="${() => state.handleOllamaRemoveModel(modelName)}">
          ${ICONS.trash} Remove
        </button>
      </div>
    `;
  }

  return html`
    <button 
      class="${isSmall ? 'btn-secondary' : 'btn-primary'}"
      @click="${() => state.handleOllamaPullModel(modelName)}"
    >
      ${ICONS.download} Download
    </button>
  `;
}

function renderStep3Start(status: LlamaFullStatus, state: AppViewState) {
  const installedModels = getInstalledModels(status);
  
  return html`
    <div class="wizard-step-content">
      <div class="step-header">
        <div class="step-icon-large">${ICONS.server}</div>
        <h2>Step 3: Start Server</h2>
        <p>Start the local AI server to begin using your models.</p>
      </div>

      <div class="server-ready-card">
        <div class="ready-info">
          <div class="info-row">
            <span class="label">llama.cpp:</span>
            <span class="value success">${ICONS.check} Installed</span>
          </div>
          <div class="info-row">
            <span class="label">Models:</span>
            <span class="value">${installedModels.length} installed</span>
          </div>
          <div class="info-row">
            <span class="label">Port:</span>
            <span class="value">11434</span>
          </div>
        </div>

        <button 
          class="btn-success btn-large"
          @click="${() => state.handleOllamaStart()}"
        >
          ${ICONS.play} Start Server
        </button>
      </div>
    </div>
  `;
}

function renderStep4Running(status: LlamaFullStatus, state: AppViewState) {
  const currentModel = status.currentModel;
  const metrics = status.metrics;
  
  return html`
    <div class="wizard-step-content">
      <div class="step-header">
        <div class="step-icon-large success">${ICONS.circleCheck}</div>
        <h2>Server Running!</h2>
        <p>Your local AI is ready to use. Models are being served on port 11434.</p>
      </div>

      <div class="running-status-card">
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">Status</span>
            <span class="status-value success">${ICONS.check} Running</span>
          </div>          
          <div class="status-item">
            <span class="status-label">Model</span>
            <span class="status-value">${currentModel || 'None'}</span>
          </div>          
          <div class="status-item">
            <span class="status-label">Memory</span>
            <span class="status-value">${status.resources?.memoryGB || '~1GB'}</span>
          </div>          
          ${metrics ? html`
            <div class="status-item">
              <span class="status-label">Speed</span>
              <span class="status-value">${metrics.tokensPerSecond.toFixed(1)} t/s</span>
            </div>
          ` : nothing}
        </div>

        <button 
          class="btn-danger"
          @click="${() => state.handleOllamaStop()}"
        >
          ${ICONS.stop} Stop Server
        </button>
      </div>
    </div>
  `;
}

function renderConsole(status: LlamaFullStatus) {
  const lastError = status.error;
  
  return html`
    <div class="console-section">
      <div class="console-header">
        ${ICONS.terminal}<span>Console</span>
      </div>      
      <div class="console-content">
        ${lastError 
          ? html`<div class="console-line error">[ERROR] ${lastError}</div>`
          : html`<div class="console-line">Ready. Waiting for action...</div>`
        }
      </div>
    </div>
  `;
}

// Helper functions
function isModelInstalled(modelName: string, status: LlamaFullStatus): boolean {
  if (modelName === PRIMARY_MODEL.name) {
    return status.primaryModel?.installed || false;
  }
  return status.models?.some((m) => m.name === modelName && m.installed) || false;
}

function getInstalledModels(status: LlamaFullStatus): Array<{ name: string; displayName: string }> {
  const installed: Array<{ name: string; displayName: string }> = [];
  
  if (status.primaryModel?.installed) {
    installed.push({ 
      name: PRIMARY_MODEL.name, 
      displayName: PRIMARY_MODEL.displayName 
    });
  }
  
  status.models?.forEach((model) => {
    if (model.installed) {
      const altModel = ALTERNATIVE_MODELS.find((m) => m.name === model.name);
      if (altModel) {
        installed.push({ name: model.name, displayName: altModel.displayName });
      }
    }
  });
  
  return installed;
}

function formatSpeed(speed: string): string {
  return speed || "0 MB/s";
}
