import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";
import type { LlamaFullStatus, DownloadProgress } from "../controllers/llama.js";
import { PRIMARY_MODEL, ALTERNATIVE_MODELS } from "../controllers/llama.js";

// Status indicators using text/checkmarks instead of emojis
const STATUS_INDICATORS = {
  installed: "",
  notInstalled: "",
  running: "",
  stopped: "",
  check: "",
  warning: "",
};

// SVG Icons for professional look
const ICONS = {
  server: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>`,
  download: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  trash: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  play: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  stop: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  refresh: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  settings: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  power: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
  cpu: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  memory: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/></svg>`,
  gpu: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/><line x1="3" y1="11" x2="7" y2="11"/><line x1="17" y1="11" x2="21" y2="11"/></svg>`,
  brain: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>`,
  lightning: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  chip: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 6v-3"/><path d="M15 6v-3"/><path d="M9 21v-3"/><path d="M15 21v-3"/><path d="M6 9h-3"/><path d="M6 15h-3"/><path d="M21 9h-3"/><path d="M21 15h-3"/></svg>`,
  star: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  trophy: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  package: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  search: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  bolt: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  check: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  apple: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>`,
  nvidia: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 20v3"/><path d="M15 20v3"/></svg>`,
  metrics: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  clock: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  speed: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  timer: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  chart: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
};

export function renderOllamaView(state: AppViewState) {
  const status = (state.ollamaStatus as unknown as LlamaFullStatus | undefined | null) ?? undefined;

  return html`
    <div class="ollama-view">
      ${renderHeader(status, state)}
      ${status?.enabled ? renderEnabledContent(status, state) : renderDisabledState(state)}
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
          <div class="title-icon">${ICONS.brain}</div>
          <h1>Local LLM</h1>
          <span class="status-badge ${isRunning ? 'running' : 'stopped'}">
            ${isRunning 
              ? html`${ICONS.check}<span>Running</span>` 
              : html`${ICONS.warning}<span>Stopped</span>`}
          </span>
        </div>
        <p class="subtitle">Run AI models locally with llama.cpp integration</p>
      </div>

      <div class="header-actions">
        <button class="btn-icon" @click="${() => state.handleOllamaLoad()}" title="Refresh status">
          ${ICONS.refresh}
        </button>
      </div>
    </div>

    ${renderFeatureToggleSection(status, state)}
  `;
}

function renderFeatureToggleSection(status: LlamaFullStatus | undefined, state: AppViewState) {
  const isEnabled = status?.enabled || false;
  const ramUsage = status?.featureFlag?.ramUsage || "~1.8GB RAM";

  return html`
    <div class="feature-flag-section ${isEnabled ? 'enabled' : 'disabled'}">
      <div class="feature-flag-content">
        <div class="feature-flag-info">
          <div class="feature-flag-title">
            <span class="feature-flag-icon">${isEnabled ? ICONS.bolt : ICONS.power}</span>
            <span>Local LLM Feature</span>
          </div>          
          <div class="feature-flag-warning">
            ${ICONS.warning}
            <span>${ramUsage} required when enabled</span>
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
      <div class="disabled-icon">${ICONS.brain}</div>
      <h2>Local LLM is Disabled</h2>
      <p>Enable the feature toggle above to run AI models locally and reduce API costs.</p>
      
      <div class="benefits-grid">
        <div class="benefit-item">
          <span class="benefit-icon">${ICONS.lightning}</span>
          <div>
            <strong>Zero API Costs</strong>
            <p>Run models locally without external API fees</p>
          </div>
        </div>
        
        <div class="benefit-item">
          <span class="benefit-icon">${ICONS.memory}</span>
          <div>
            <strong>Efficient Memory Usage</strong>
            <p>Optimized for ~1.8GB RAM consumption</p>
          </div>
        </div>
        
        <div class="benefit-item">
          <span class="benefit-icon">${ICONS.star}</span>
          <div>
            <strong>Private and Secure</strong>
            <p>All data processing stays on your machine</p>
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
  const hwConfig = (status as unknown as Record<string, unknown>)?.hardwareConfig as Record<string, unknown> | undefined;
  
  return html`
    <section class="hardware-section">
      <div class="section-header">
        <h2>${ICONS.settings} Hardware Configuration</h2>
        <button class="btn-secondary btn-sm" @click="${() => state.handleOllamaDetectHardware?.()}">
          ${ICONS.search} Auto-Detect
        </button>
      </div>
      
      <div class="hardware-grid">
        <div class="hardware-card">
          <div class="hardware-header">
            <span class="hardware-icon">${ICONS.gpu}</span>
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
            <span class="hardware-icon">${ICONS.cpu}</span>
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
              <span class="hardware-icon">${ICONS.apple}</span>
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
              <span class="hardware-icon">${ICONS.nvidia}</span>
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
          <h2>${ICONS.metrics} Performance Metrics</h2>
        </div>
        <div class="metrics-placeholder">
          <p>No usage data available. Start using the local LLM to see metrics.</p>
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
        <h2>${ICONS.metrics} Performance Metrics</h2>
      </div>
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-icon">${ICONS.speed}</span>
          <div class="metric-info">
            <span class="metric-value">${metrics.tokensPerSecond.toFixed(1)}</span>
            <span class="metric-label">Tokens/sec</span>
          </div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">${ICONS.timer}</span>
          <div class="metric-info">
            <span class="metric-value">${metrics.avgResponseTime}ms</span>
            <span class="metric-label">Avg Response</span>
          </div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">${ICONS.chart}</span>
          <div class="metric-info">
            <span class="metric-value">${metrics.totalRequests}</span>
            <span class="metric-label">Total Requests</span>
          </div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">${ICONS.clock}</span>
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
            <span class="status-icon">${ICONS.server}</span>
            <span class="status-title">Server Status</span>
          </div>          
          <div class="status-details">
            <div class="status-row">
              <span class="label">llama.cpp:</span>
              <span class="value ${isInstalled ? 'success' : 'warning'}">
                ${isInstalled 
                  ? html`${ICONS.check}<span>Installed</span>` 
                  : html`${ICONS.warning}<span>Not Installed</span>`}
              </span>
            </div>
            <div class="status-row">
              <span class="label">Server:</span>
              <span class="value ${isRunning ? 'success' : 'warning'}">
                ${isRunning 
                  ? html`${ICONS.check}<span>Running</span>` 
                  : html`${ICONS.warning}<span>Stopped</span>`}
              </span>
            </div>
            ${currentModel
              ? html`
                  <div class="status-row">
                    <span class="label">Current Model:</span>
                    <span class="value">${currentModel}</span>
                  </div>
                `
              : nothing}
          </div>

          <div class="status-actions">
            ${!isInstalled
              ? html`
                  <button class="btn-primary" @click="${() => state.handleOllamaInstall()}">
                    ${ICONS.download} Install llama.cpp
                  </button>
                `
              : nothing} 
            ${isInstalled && !isRunning
              ? html`
                  <button class="btn-success" @click="${() => state.handleOllamaStart()}">
                    ${ICONS.play} Start Server
                  </button>
                `
              : nothing} 
            ${isRunning
              ? html`
                  <button class="btn-danger" @click="${() => state.handleOllamaStop()}">
                    ${ICONS.stop} Stop Server
                  </button>
                `
              : nothing}
          </div>
        </div>

        ${isRunning
          ? html`
              <div class="status-card resources">
                <div class="status-header">
                  <span class="status-icon">${ICONS.memory}</span>
                  <span class="status-title">Memory Usage</span>
                </div>                
                <div class="resource-grid">
                  <div class="resource-item">
                    <span class="resource-icon">${ICONS.chip}</span>
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
        <h2>${ICONS.trophy} Recommended Model</h2>
      </div>

      <div class="primary-model-card">
        <div class="recommended-badge">${ICONS.trophy} Recommended</div>
        
        <div class="primary-header">
          <div class="primary-info">
            <span class="primary-name">${primary.displayName}</span>
            <span class="primary-size">${formatSize(primary.sizeBytes)}</span>
          </div>
          <div class="primary-status">
            ${isInstalled
              ? html`<span class="status-badge enabled">${ICONS.check} Installed</span>`
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
                      ${ICONS.download} Download Model
                    </button>
                  `
                : html`
                    <button 
                      class="btn-danger" 
                      @click="${() => state.handleOllamaRemoveModel(primary.name)}"
                    >
                      ${ICONS.trash} Remove Model
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
        <h2>${ICONS.package} Alternative Models</h2>
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
                            ${ICONS.download} Download
                          </button>
                        `
                      : html`
                          <button 
                            class="btn-icon danger" 
                            @click="${() => state.handleOllamaRemoveModel(model.name)}"
                            title="Remove model"
                          >
                            ${ICONS.trash}
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
