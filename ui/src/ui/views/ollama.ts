import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";
import type { LlamaFullStatus, DownloadProgress } from "../controllers/llama.js";
import { PRIMARY_MODEL, ALTERNATIVE_MODELS } from "../controllers/llama.js";

// Icons
const icons: Record<string, string> = {
  server: "🖥️",
  download: "⬇️",
  trash: "🗑️",
  play: "▶️",
  stop: "⏹️",
  check: "✓",
  warning: "⚠️",
  cpu: "🧠",
  memory: "💾",
  gpu: "🎮",
  star: "⭐",
  recommended: "🏆",
  package: "📦",
  settings: "⚙️",
  refresh: "🔄",
  power: "⏻",
  rocket: "🚀",
  bolt: "⚡",
  brain: "🧠",
  chip: "💻",
};

export function renderOllamaView(state: AppViewState) {
  const status = state.ollamaStatus as LlamaFullStatus | undefined;

  return html`
    <div class="ollama-view">
      ${renderHeader(status, state)} ${status?.enabled ? renderEnabledContent(status, state) : renderDisabledState(state)}
    </div>
  `;
}

function renderHeader(status: LlamaFullStatus | undefined, state: AppViewState) {
  const isEnabled = status?.enabled || false;
  const isRunning = status?.running || false;

  return html`
    <div class="view-header">
      <div class="header-title">
        <div class="title-row">
          <div class="title-icon">${icons.brain}</div>
          <h1>Llama 3.2:3b</h1>
          <span class="status-badge ${isRunning ? 'running' : 'stopped'}">
            ${isRunning ? icons.check + ' Running' : icons.warning + ' Stopped'}
          </span>
        </div>
        <p class="subtitle">Direct llama.cpp integration - Optimized & lightweight</p>
      </div>

      <div class="header-actions">
        <button class="btn-icon" @click="${() => state.handleOllamaLoad()}" title="Refresh">
          ${icons.refresh}
        </button>
      </div>
    </div>

    ${renderFeatureFlagSection(status, state)}
  `;
}

function renderFeatureFlagSection(status: LlamaFullStatus | undefined, state: AppViewState) {
  const isEnabled = status?.enabled || false;
  const ramUsage = status?.featureFlag?.ramUsage || "~1.8GB RAM";

  return html`
    <div class="feature-flag-section ${isEnabled ? 'enabled' : 'disabled'}">
      <div class="feature-flag-content">
        <div class="feature-flag-info">
          <div class="feature-flag-title">
            <span class="feature-flag-icon">${isEnabled ? icons.rocket : icons.power}</span>
            <span>Local LLM Feature</span>
          </div>          
          <div class="feature-flag-warning">
            ${icons.warning} ${ramUsage} when enabled (saves ~700MB vs Ollama)
          </div>
        </div>

        <label class="toggle-switch large">
          <input
            type="checkbox"
            .checked="${isEnabled}"
            @change="${(e: InputEvent) => {
              const target = e.target as HTMLInputElement;
              state.handleOllamaToggleFeature(target.checked);
            }}"
          />
          <span class="slider"></span>
          <span class="toggle-label">${isEnabled ? 'ON' : 'OFF'}</span>
        </label>
      </div>
    </div>
  `;
}

function renderDisabledState(state: AppViewState) {
  return html`
    <div class="disabled-state">
      <div class="disabled-icon">${icons.brain}</div>
      <h2>Local LLM is Disabled</h2>
      <p>Enable the feature toggle above to run Llama 3.2:3b locally and save on API costs.</p>
      
      <div class="benefits-grid">
        <div class="benefit-item">
          <span class="benefit-icon">${icons.bolt}</span>
          <div>
            <strong>Zero API Costs</strong>
            <p>Run models locally for free</p>
          </div>
        </div>
        
        <div class="benefit-item">
          <span class="benefit-icon">${icons.memory}</span>
          <div>
            <strong>~1.8GB RAM</strong>
            <p>Efficient memory usage</p>
          </div>
        </div>
        
        <div class="benefit-item">
          <span class="benefit-icon">${icons.star}</span>
          <div>
            <strong>Private & Secure</strong>
            <p>Data stays on your machine</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEnabledContent(status: LlamaFullStatus, state: AppViewState) {
  return html`
    <div class="enabled-content">
      ${renderStatusOverview(status, state)} 
      ${status.running ? renderMetricsSection(status) : nothing}
      ${renderHardwareConfigSection(status, state)}
      ${renderPrimaryModelSection(status, state)}
      ${renderAlternativeModelsSection(status, state)}
    </div>
  `;
}

function renderHardwareConfigSection(status: LlamaFullStatus, state: AppViewState) {
  // Check if hardware config is available
  const hwConfig = (status as unknown as Record<string, unknown>)?.hardwareConfig as Record<string, unknown> | undefined;
  
  return html`
    <section class="hardware-section">
      <div class="section-header">
        <h2>${icons.settings} Hardware Configuration</h2>
        <button class="btn-secondary btn-sm" @click="${() => state.handleOllamaDetectHardware?.()}">
          🔍 Auto-Detect
        </button>
      </div>
      
      <div class="hardware-grid">
        <div class="hardware-card">
          <div class="hardware-header">
            <span class="hardware-icon">🖥️</span>
            <span class="hardware-title">GPU Acceleration</span>
          </div>
          <div class="hardware-controls">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                .checked="${hwConfig?.useGPU ?? true}"
                @change="${(e: InputEvent) => {
                  const target = e.target as HTMLInputElement;
                  state.handleOllamaConfigureHardware?.({ useGPU: target.checked });
                }}"
              />
              <span class="slider"></span>
              <span class="toggle-label">Use GPU</span>
            </label>
            
            <div class="hardware-field">
              <label>GPU Layers</label>
              <input 
                type="range" 
                min="0" 
                max="99" 
                .value="${String(hwConfig?.gpuLayers ?? 99)}"
                @change="${(e: InputEvent) => {
                  const target = e.target as HTMLInputElement;
                  state.handleOllamaConfigureHardware?.({ gpuLayers: parseInt(target.value) });
                }}"
              />
              <span class="field-value">${hwConfig?.gpuLayers ?? 99} layers</span>
            </div>
          </div>
        </div>

        <div class="hardware-card">
          <div class="hardware-header">
            <span class="hardware-icon">⚙️</span>
            <span class="hardware-title">CPU Settings</span>
          </div>
          <div class="hardware-controls">
            <div class="hardware-field">
              <label>Threads</label>
              <input 
                type="range" 
                min="1" 
                max="16" 
                .value="${String(hwConfig?.threads ?? 4)}"
                @change="${(e: InputEvent) => {
                  const target = e.target as HTMLInputElement;
                  state.handleOllamaConfigureHardware?.({ threads: parseInt(target.value) });
                }}"
              />
              <span class="field-value">${hwConfig?.threads ?? 4} threads</span>
            </div>
          </div>
        </div>

        ${hwConfig?.useMetal ? html`
          <div class="hardware-card">
            <div class="hardware-header">
              <span class="hardware-icon">🍎</span>
              <span class="hardware-title">Metal (Apple Silicon)</span>
            </div>
            <div class="hardware-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  .checked="${hwConfig?.useMetal ?? true}"
                  @change="${(e: InputEvent) => {
                    const target = e.target as HTMLInputElement;
                    state.handleOllamaConfigureHardware?.({ useMetal: target.checked });
                  }}"
                />
                <span class="slider"></span>
                <span class="toggle-label">Use Metal</span>
              </label>
            </div>
          </div>
        ` : nothing}

        ${hwConfig?.useCUDA ? html`
          <div class="hardware-card">
            <div class="hardware-header">
              <span class="hardware-icon">🎮</span>
              <span class="hardware-title">CUDA (NVIDIA)</span>
            </div>
            <div class="hardware-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  .checked="${hwConfig?.useCUDA ?? false}"
                  @change="${(e: InputEvent) => {
                    const target = e.target as HTMLInputElement;
                    state.handleOllamaConfigureHardware?.({ useCUDA: target.checked });
                  }}"
                />
                <span class="slider"></span>
                <span class="toggle-label">Use CUDA</span>
              </label>
            </div>
          </div>
        ` : nothing}
      </div>
    </section>
  `;
}

function renderMetricsSection(status: LlamaFullStatus) {
  const metrics = status.metrics;
  if (!metrics || metrics.totalRequests === 0) {
    return html`
      <section class="metrics-section">
        <div class="section-header">
          <h2>${icons.bolt} Performance Metrics</h2>
        </div>
        <div class="metrics-placeholder">
          <p>No usage data yet. Start chatting to see metrics!</p>
        </div>
      </section>
    `;
  }

  const lastRequestTime = metrics.lastRequestAt 
    ? new Date(metrics.lastRequestAt).toLocaleTimeString()
    : 'Never';

  return html`
    <section class="metrics-section">
      <div class="section-header">
        <h2>${icons.bolt} Performance Metrics</h2>
      </div>
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-icon">⚡</span>
          <div class="metric-info">
            <span class="metric-value">${metrics.tokensPerSecond.toFixed(1)}</span>
            <span class="metric-label">Tokens/sec</span>
          </div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">⏱️</span>
          <div class="metric-info">
            <span class="metric-value">${metrics.avgResponseTime}ms</span>
            <span class="metric-label">Avg Response</span>
          </div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">📊</span>
          <div class="metric-info">
            <span class="metric-value">${metrics.totalRequests}</span>
            <span class="metric-label">Total Requests</span>
          </div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">🕐</span>
          <div class="metric-info">
            <span class="metric-value">${lastRequestTime}</span>
            <span class="metric-label">Last Request</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderStatusOverview(status: LlamaFullStatus, state: AppViewState) {
  const isInstalled = status.installed;
  const isRunning = status.running;
  const currentModel = status.currentModel;

  return html`
    <section class="status-section">
      <div class="status-grid">
        <div class="status-card">
          <div class="status-header">
            <span class="status-icon">${icons.server}</span>
            <span class="status-title">Status</span>
          </div>          
          <div class="status-details">
            <div class="status-row">
              <span class="label">llama.cpp:</span>
              <span class="value ${isInstalled ? 'success' : 'warning'}">
                ${isInstalled ? icons.check + ' Installed' : icons.warning + ' Not Installed'}
              </span>
            </div>
            <div class="status-row">
              <span class="label">Server:</span>
              <span class="value ${isRunning ? 'success' : 'warning'}">
                ${isRunning ? icons.check + ' Running' : icons.warning + ' Stopped'}
              </span>
            </div>
            ${currentModel
              ? html`
                  <div class="status-row">
                    <span class="label">Model:</span>
                    <span class="value">${currentModel}</span>
                  </div>
                `
              : nothing}
          </div>

          <div class="status-actions">
            ${!isInstalled
              ? html`
                  <button class="btn-primary" @click="${() => state.handleOllamaInstall()}">
                    ${icons.download} Install llama.cpp
                  </button>
                `
              : nothing} 
            ${isInstalled && !isRunning
              ? html`
                  <button class="btn-success" @click="${() => state.handleOllamaStart()}">
                    ${icons.play} Start Server
                  </button>
                `
              : nothing} 
            ${isRunning
              ? html`
                  <button class="btn-danger" @click="${() => state.handleOllamaStop()}">
                    ${icons.stop} Stop Server
                  </button>
                `
              : nothing}
          </div>
        </div>

        ${isRunning
          ? html`
              <div class="status-card resources">
                <div class="status-header">
                  <span class="status-icon">${icons.memory}</span>
                  <span class="status-title">Memory Usage</span>
                </div>                
                <div class="resource-grid">
                  <div class="resource-item">
                    <span class="resource-icon">${icons.chip}</span>
                    <div class="resource-info">
                      <span class="resource-value">${status.resources.memoryGB}</span>
                      <span class="resource-label">RAM</span>
                    </div>
                  </div>
                </div>              
              </div>
            `
          : nothing}
      </div>
    </section>
  `;
}

function renderPrimaryModelSection(status: LlamaFullStatus, state: AppViewState) {
  const primary = status.primaryModel;
  const isDownloading = state.ollamaPullProgress?.model === primary.name;
  const downloadProgress = isDownloading ? state.ollamaPullProgress?.progress as DownloadProgress : null;
  const isInstalled = primary.installed;

  return html`
    <section class="primary-model-section">
      <div class="section-header">
        <h2>${icons.recommended} Primary Model</h2>
      </div>

      <div class="primary-model-card">
        <div class="recommended-badge">${icons.recommended} Recommended</div>
        
        <div class="primary-header">
          <div class="primary-info">
            <span class="primary-name">${primary.displayName}</span>
            <span class="primary-size">${formatSize(primary.sizeBytes)}</span>
          </div>
          <div class="primary-status">
            ${isInstalled
              ? html`<span class="status-badge enabled">${icons.check} Installed</span>`
              : html`<span class="status-badge disabled">Not Installed</span>`}
          </div>
        </div>

        <p class="primary-description">${primary.description}</p>

        <div class="primary-tags">
          ${primary.tags.map((tag) => html`<span class="tag highlight">${tag}</span>`)}
        </div>

        ${isDownloading && downloadProgress
          ? html`
              <div class="download-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${downloadProgress.percent}%"></div>
                </div>
                <div class="progress-info">
                  <span>${downloadProgress.status}</span>
                  <span>${downloadProgress.percent}% (${downloadProgress.speed})</span>
                </div>
              </div>
            `
          : html`
              ${!isInstalled
                ? html`
                    <button 
                      class="btn-primary btn-large" 
                      @click="${() => state.handleOllamaPullModel(primary.name)}"
                    >
                      ${icons.download} Download Llama 3.2:3b
                    </button>
                  `
                : html`
                    <button 
                      class="btn-danger" 
                      @click="${() => state.handleOllamaRemoveModel(primary.name)}"
                    >
                      ${icons.trash} Remove Model
                    </button>
                  `}
            `}
      </div>
    </section>
  `;
}

function renderAlternativeModelsSection(status: LlamaFullStatus, state: AppViewState) {
  const models = ALTERNATIVE_MODELS;
  const installedModels = status.models || [];

  return html`
    <section class="alternative-models-section">
      <div class="section-header">
        <h2>${icons.package} Alternative Models</h2>
      </div>

      <div class="models-grid">
        ${models.map((model) => {
          const installed = installedModels.find((m) => m.name === model.name)?.installed || false;
          const isDownloading = state.ollamaPullProgress?.model === model.name;
          const downloadProgress = isDownloading ? state.ollamaPullProgress?.progress as DownloadProgress : null;

          return html`
            <div class="model-card">
              <div class="model-header">
                <span class="model-name">${model.displayName}</span>
                <span class="model-size">${model.size}</span>
              </div>

              <p class="model-description">${model.description}</p>

              <div class="model-tags">
                ${model.tags.map((tag) => html`<span class="tag">${tag}</span>`)}
              </div>

              ${isDownloading && downloadProgress
                ? html`
                    <div class="download-progress">
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${downloadProgress.percent}%"></div>
                      </div>
                      <span class="progress-text">${downloadProgress.percent}%</span>
                    </div>
                  `
                : html`
                    ${!installed
                      ? html`
                          <button 
                            class="btn-secondary" 
                            @click="${() => state.handleOllamaPullModel(model.name)}"
                          >
                            ${icons.download} Download
                          </button>
                        `
                      : html`
                          <button 
                            class="btn-icon danger" 
                            @click="${() => state.handleOllamaRemoveModel(model.name)}"
                            title="Remove model"
                          >
                            ${icons.trash}
                          </button>
                        `}
                  `}
            </div>
          `;
        })}
      </div>
    </section>
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
