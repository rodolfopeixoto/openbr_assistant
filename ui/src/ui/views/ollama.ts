import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";
import type { LlamaFullStatus, DownloadProgress } from "../controllers/llama.js";
import { PRIMARY_MODEL, ALTERNATIVE_MODELS } from "../controllers/llama.js";

// Professional SVG Icons
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
  bolt: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  lightning: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  memory: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/></svg>`,
  chip: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 6v-3"/><path d="M15 6v-3"/><path d="M9 21v-3"/><path d="M15 21v-3"/><path d="M6 9h-3"/><path d="M6 15h-3"/><path d="M21 9h-3"/><path d="M21 15h-3"/></svg>`,
  star: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  trophy: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  package: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  search: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  cpu: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  gpu: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/><line x1="3" y1="11" x2="7" y2="11"/><line x1="17" y1="11" x2="21" y2="11"/></svg>`,
  apple: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>`,
  nvidia: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 20v3"/><path d="M15 20v3"/></svg>`,
  metrics: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  clock: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  speed: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  timer: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  chart: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  server: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>`,
  info: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

export function renderOllamaView(state: AppViewState) {
  const status = (state.ollamaStatus as unknown as LlamaFullStatus | undefined | null) ?? undefined;

  return html`
    <div class="ollama-view">
      ${renderHeader(status, state)}
      ${status?.enabled ? renderEnabledView(status, state) : renderDisabledView(state)}
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
      <div class="enable-section">
        <div class="enable-content">
          <div class="enable-icon">${ICONS.power}</div>
          <div class="enable-text">
            <h2>Local LLM is Disabled</h2>
            <p>Enable to run AI models locally on your machine</p>
          </div>
          <button class="btn-primary btn-large" @click="${() => state.handleOllamaToggleFeature(true)}">
            Enable Local LLM
          </button>
        </div>
      </div>

      <div class="info-section">
        <h3>Benefits</h3>
        <div class="benefits-grid">
          <div class="benefit-card">
            <div class="benefit-icon">${ICONS.lightning}</div>
            <h4>Zero API Costs</h4>
            <p>No external API fees</p>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">${ICONS.memory}</div>
            <h4>Memory Efficient</h4>
            <p>~1.8GB RAM usage</p>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">${ICONS.star}</div>
            <h4>Private & Secure</h4>
            <p>Data stays local</p>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h3>System Requirements</h3>
        <div class="requirements-list">
          <div class="requirement-item">
            ${ICONS.check}<span>macOS, Linux, or Windows</span>
          </div>
          <div class="requirement-item">
            ${ICONS.check}<span>4GB RAM minimum (8GB recommended)</span>
          </div>
          <div class="requirement-item">
            ${ICONS.check}<span>~2GB free disk space</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEnabledView(status: LlamaFullStatus, state: AppViewState) {
  const isInstalled = status.installed;
  const isRunning = status.running;

  return html`
    <div class="enabled-view">
      <!-- Installation Status -->
      ${!isInstalled ? renderInstallSection(state) : nothing}

      <!-- Server Status & Controls -->
      ${isInstalled ? renderServerControls(status, state) : nothing}

      <!-- Models Section -->
      ${isInstalled ? renderModelsSection(status, state) : nothing}
    </div>
  `;
}

function renderInstallSection(state: AppViewState) {
  return html`
    <section class="install-section">
      <div class="install-card">
        <div class="install-header">
          <div class="install-icon">${ICONS.download}</div>
          <div class="install-title">
            <h2>Install Required</h2>
            <p>llama.cpp runtime is required to run models locally</p>
          </div>
        </div>
        <button class="btn-primary btn-large" @click="${() => state.handleOllamaInstall()}">
          ${ICONS.download} Install llama.cpp
        </button>
      </div>
    </section>
  `;
}

function renderServerControls(status: LlamaFullStatus, state: AppViewState) {
  const isRunning = status.running;
  const currentModel = status.currentModel;

  return html`
    <section class="server-section">
      <div class="section-header">
        <h2>${ICONS.server} Server Status</h2>
      </div>
      
      <div class="server-card">
        <div class="server-info">
          <div class="info-row">
            <span class="label">Status:</span>
            <span class="value ${isRunning ? 'success' : 'neutral'}">
              ${isRunning 
                ? html`${ICONS.check} Running` 
                : html`${ICONS.warning} Stopped`}
            </span>
          </div>
          ${currentModel ? html`
            <div class="info-row">
              <span class="label">Model:</span>
              <span class="value">${currentModel}</span>
            </div>
          ` : nothing}
          ${status.resources?.memoryGB ? html`
            <div class="info-row">
              <span class="label">Memory:</span>
              <span class="value">${status.resources.memoryGB} RAM</span>
            </div>
          ` : nothing}
        </div>

        <div class="server-actions">
          ${!isRunning
            ? html`
                <button class="btn-success" @click="${() => state.handleOllamaStart()}">
                  ${ICONS.play} Start Server
                </button>
              `
            : html`
                <button class="btn-danger" @click="${() => state.handleOllamaStop()}">
                  ${ICONS.stop} Stop Server
                </button>
              `}
        </div>
      </div>

      ${isRunning ? renderMetricsSection(status) : nothing}
    </section>
  `;
}

function renderMetricsSection(status: LlamaFullStatus) {
  const metrics = status.metrics;
  if (!metrics || metrics.totalRequests === 0) {
    return html`
      <div class="metrics-placeholder">
        <p>No metrics available yet. Start using the model to see performance data.</p>
      </div>
    `;
  }

  return html`
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon">${ICONS.speed}</div>
        <div class="metric-value">${metrics.tokensPerSecond.toFixed(1)}</div>
        <div class="metric-label">Tokens/sec</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">${ICONS.timer}</div>
        <div class="metric-value">${metrics.avgResponseTime}ms</div>
        <div class="metric-label">Avg Response</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">${ICONS.chart}</div>
        <div class="metric-value">${metrics.totalRequests}</div>
        <div class="metric-label">Requests</div>
      </div>
    </div>
  `;
}

function renderModelsSection(status: LlamaFullStatus, state: AppViewState) {
  const primary = status.primaryModel;

  return html`
    <section class="models-section">
      <div class="section-header">
        <h2>${ICONS.trophy} Models</h2>
      </div>

      <!-- Primary Model -->
      <div class="primary-model-card">
        <div class="model-badge">Recommended</div>
        <div class="model-header">
          <div class="model-title">
            <h3>${primary.displayName}</h3>
            <span class="model-size">${formatSize(primary.sizeBytes)}</span>
          </div>
          <div class="model-status">
            ${primary.installed
              ? html`<span class="status-badge enabled">${ICONS.check} Installed</span>`
              : html`<span class="status-badge disabled">Not Installed</span>`}
          </div>
        </div>
        <p class="model-description">${primary.description}</p>
        <div class="model-tags">
          ${primary.tags.map((tag) => html`<span class="tag">${tag}</span>`)}
        </div>
        ${renderModelActions(primary.name, primary.installed, status, state)}
      </div>

      <!-- Alternative Models -->
      <div class="alternative-models">
        <h3>Alternative Models</h3>
        <div class="models-grid">
          ${ALTERNATIVE_MODELS.map((model) => renderAlternativeModel(model, status, state))}
        </div>
      </div>
    </section>
  `;
}

function renderAlternativeModel(
  model: typeof ALTERNATIVE_MODELS[0], 
  status: LlamaFullStatus, 
  state: AppViewState
) {
  const installedModels = status.models || [];
  const installed = installedModels.find((m) => m.name === model.name)?.installed || false;

  return html`
    <div class="model-card">
      <div class="model-header-small">
        <h4>${model.displayName}</h4>
        <span class="model-size">${model.size}</span>
      </div>
      <p class="model-description-small">${model.description}</p>
      <div class="model-tags-small">
        ${model.tags.map((tag) => html`<span class="tag-small">${tag}</span>`)}
      </div>
      ${renderModelActions(model.name, installed, status, state, true)}
    </div>
  `;
}

function renderModelActions(
  modelName: string, 
  isInstalled: boolean, 
  status: LlamaFullStatus, 
  state: AppViewState,
  isAlternative = false
) {
  const isDownloading = state.ollamaPullProgress?.model === modelName;
  const downloadProgress = isDownloading ? state.ollamaPullProgress?.progress as DownloadProgress : null;

  if (isDownloading && downloadProgress) {
    return html`
      <div class="download-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${downloadProgress.percent}%"></div>
        </div>
        <span class="progress-text">${downloadProgress.percent}% - ${downloadProgress.status}</span>
      </div>
    `;
  }

  if (!isInstalled) {
    return html`
      <button 
        class="${isAlternative ? 'btn-secondary' : 'btn-primary'}" 
        @click="${() => state.handleOllamaPullModel(modelName)}"
      >
        ${ICONS.download} Download
      </button>
    `;
  }

  return html`
    <div class="model-actions">
      <button 
        class="btn-secondary" 
        @click="${() => state.handleOllamaRemoveModel(modelName)}"
        title="Remove model"
      >
        ${ICONS.trash} Remove
      </button>
    </div>
  `;
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}
