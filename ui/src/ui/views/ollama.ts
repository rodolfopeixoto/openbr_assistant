import { html } from "lit";
import type { AppViewState } from "../app-view-state";

export function renderOllamaView(state: AppViewState) {
  return html`
    <div class="ollama-view">
      <section class="content-header">
        <div>
          <div class="page-title">Ollama</div>
          <div class="page-sub">Local LLM model management</div>
        </div>
      </section>

      <div class="ollama-content">
        ${state.ollamaLoading
          ? html`<div class="loading">Loading...</div>`
          : state.ollamaError
            ? html`<div class="error">${state.ollamaError}</div>`
            : html`
              <div class="ollama-status">
                <div class="status-card">
                  <div class="status-row">
                    <span class="status-label">Status:</span>
                    <span class="status-value ${state.ollamaStatus?.running ? 'running' : 'stopped'}">
                      ${state.ollamaStatus?.running ? '● Running' : '○ Stopped'}
                    </span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Host:</span>
                    <span class="status-value">${state.ollamaStatus?.config?.host || 'localhost'}:${state.ollamaStatus?.config?.port || 11434}</span>
                  </div>
                  <div class="status-row">
                    <span class="status-label">Default Model:</span>
                    <span class="status-value">${state.ollamaStatus?.config?.defaultModel || 'llama3.2:3b'}</span>
                  </div>
                </div>
              </div>

              <div class="ollama-models">
                <h3>Installed Models</h3>
                <div class="models-grid">
                  ${state.ollamaStatus?.models?.map((model: any) => html`
                    <div class="model-card">
                      <div class="model-header">
                        <span class="model-name">${model.name}</span>
                        <span class="model-size">${model.size}</span>
                      </div>
                      <div class="model-details">
                        <div>Family: ${model.details?.family}</div>
                        <div>Parameters: ${model.details?.parameterSize}</div>
                        <div>Quantization: ${model.details?.quantizationLevel}</div>
                      </div>
                    </div>
                  `)}
                </div>
              </div>

              <div class="ollama-actions">
                <button @click=${() => state.handleOllamaLoad()}>Refresh</button>
              </div>
            `}
      </div>
    </div>
  `;
}
