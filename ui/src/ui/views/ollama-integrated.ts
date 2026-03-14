import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";

// SVG Icons
const ICONS = {
  brain: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>`,
  check: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
  download: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  trash: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  power: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
  chip: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 6v-3"/><path d="M15 6v-3"/><path d="M9 21v-3"/><path d="M15 21v-3"/><path d="M6 9h-3"/><path d="M6 15h-3"/><path d="M21 9h-3"/><path d="M21 15h-3"/></svg>`,
  warning: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

// Modelos configurados
const OLLAMA_MODELS = {
  llama3_2: {
    name: "llama3.2:3b",
    displayName: "Llama 3.2 3B",
    description: "Meta's Llama 3.2 - Fast and efficient",
    size: "~2.0 GB",
    tags: ["instruct", "3b", "meta", "recommended"],
    recommended: true,
  },
  gemma2_2b: {
    name: "gemma2:2b",
    displayName: "Gemma 2 2B",
    description: "Google's Gemma 2 - Ultra small and fast",
    size: "~1.6 GB",
    tags: ["instruct", "2b", "google"],
    recommended: false,
  },
  phi4_mini: {
    name: "phi4:mini-q3",
    displayName: "Phi-4 Mini Q3",
    description: "Microsoft Phi-4 Mini - Great for coding",
    size: "~1.8 GB",
    tags: ["instruct", "3.8b", "microsoft", "coding"],
    recommended: false,
  },
};

export function renderOllamaIntegratedView(state: AppViewState) {
  const status = state.ollamaIntegratedStatus as any;

  return html`
    <div class="ollama-view">
      ${renderHeader(status)}
      ${status?.available 
        ? renderModelsPanel(status, state)
        : renderSetupPanel(status, state)}
    </div>
  `;
}

function renderHeader(status: any) {
  const isAvailable = status?.available || false;
  const isRunning = status?.running || false;

  return html`
    <div class="view-header">
      <div class="header-title">
        <div class="title-row">
          <div class="title-icon">${ICONS.brain}</div>
          <h1>Local AI (Ollama)</h1>
          ${isAvailable 
            ? html`<span class="status-badge running">${ICONS.check} Ready</span>`
            : isRunning
              ? html`<span class="status-badge warning">${ICONS.warning} Starting...</span>`
              : html`<span class="status-badge stopped">${ICONS.power} Off</span>`}
        </div>
        <p class="subtitle">Run AI models locally. No data leaves your machine.</p>
      </div>
    </div>
  `;
}

function renderSetupPanel(status: any, state: AppViewState) {
  const isInstalled = status?.installed || false;

  if (!isInstalled) {
    return html`
      <div class="setup-panel">
        <div class="setup-icon">${ICONS.chip}</div>
        <h2>Ollama Not Installed</h2>
        <p>Install Ollama to run AI models locally on your machine.</p>
        
        <div class="install-options">
          <div class="install-option">
            <strong>macOS/Linux</strong>
            <code>curl -fsSL https://ollama.com/install.sh | sh</code>
          </div>          
          <div class="install-option">
            <strong>Windows</strong>
            <a href="https://ollama.com/download/windows" target="_blank">Download from ollama.com</a>
          </div>
        </div>

        <button class="btn-secondary" @click="${() => state.handleOllamaIntegratedRefresh()}">
          Check Again
        </button>
      </div>
    `;
  }

  return html`
    <div class="setup-panel">
      <div class="setup-icon">${ICONS.power}</div>
      <h2>Ollama Installed but Not Running</h2>
      <p>Start Ollama to begin using local AI models.</p>
      
      <button class="btn-primary btn-large" @click="${() => state.handleOllamaIntegratedStart()}">
        ${ICONS.power} Start Ollama
      </button>
    </div>
  `;
}

function renderModelsPanel(status: any, state: AppViewState) {
  const models = status?.models || [];

  return html`
    <div class="models-panel">
      <div class="panel-header">
        <h2>Available Models</h2>
        <button class="btn-icon" @click="${() => state.handleOllamaIntegratedRefresh()}" title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>

      <div class="models-list">
        ${Object.entries(OLLAMA_MODELS).map(([key, model]) => {
          const installedModel = models.find((m: any) => m.name === model.name || m.name.startsWith(model.name.split(":")[0]));
          const isInstalled = installedModel?.installed || false;
          
          return html`
            <div class="model-card ${model.recommended ? 'recommended' : ''} ${isInstalled ? 'installed' : ''}">
              ${model.recommended ? html`<div class="model-badge">Recommended</div>` : nothing}
              
              <div class="model-info">
                <div class="model-header">
                  <h3>${model.displayName}</h3>
                  <span class="model-size">${model.size}</span>
                </div>                
                <p class="model-description">${model.description}</p>
                <div class="model-tags">
                  ${model.tags.map((tag) => html`<span class="tag">${tag}</span>`)}
                </div>
              </div>

              <div class="model-actions">
                ${isInstalled 
                  ? html`
                    <span class="installed-badge">${ICONS.check} Installed</span>
                    <button class="btn-icon danger" @click="${() => state.handleOllamaIntegratedDelete(key)}" title="Remove">
                      ${ICONS.trash}
                    </button>
                  `
                  : html`
                    <button class="btn-primary" @click="${() => state.handleOllamaIntegratedPull(key)}">
                      ${ICONS.download} Download
                    </button>
                  `}
              </div>
            </div>
          `;
        })}
      </div>

      ${status?.version ? html`
        <div class="version-info">
          Ollama ${status.version}
        </div>
      ` : nothing}
    </div>
  `;
}
