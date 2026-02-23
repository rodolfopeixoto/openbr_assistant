import { html } from "lit";
import type { AppViewState } from "../app-view-state";

export function renderContainersView(state: AppViewState) {
  return html`
    <div class="containers-view">
      <div class="containers-header">
        <h1>Containers</h1>
        <p class="subtitle">Manage Docker containers for agents</p>
      </div>

      ${state.containersLoading ? html`
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading containers...</p>
        </div>
      ` : state.containersError ? html`
        <div class="error-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>${state.containersError}</p>
          <button @click=${() => state.handleContainersLoad()} class="btn-primary">Retry</button>
        </div>
      ` : html`
        <div class="containers-content">
          ${state.containers.length === 0 ? html`
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5"/>
                <path d="M12 22V12"/>
              </svg>
              <h3>No containers running</h3>
              <p>Docker containers for agents will appear here.</p>
            </div>
          ` : html`
            <div class="containers-list">
              ${state.containers.map(container => html`
                <div class="container-card">
                  <div class="container-header">
                    <div class="container-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                        <path d="m3.3 7 8.7 5 8.7-5"/>
                        <path d="M12 22V12"/>
                      </svg>
                    </div>
                    <div class="container-info">
                      <h3>${container.name}</h3>
                      <span class="container-image">${container.image}</span>
                    </div>                    
                    <div class="container-status">
                      <span class="status-badge ${container.status}">${container.status}</span>
                    </div>
                  </div>
                  
                  <div class="container-actions">
                    ${container.status === 'running' ? html`
                      <button @click=${() => state.handleContainerStop(container.id)} class="btn-secondary">Stop</button>
                      <button @click=${() => state.handleContainerRestart(container.id)} class="btn-secondary">Restart</button>
                    ` : html`
                      <button @click=${() => state.handleContainerStart(container.id)} class="btn-primary">Start</button>
                    `}
                    <button @click=${() => state.handleContainerLogs(container.id)} class="btn-secondary">Logs</button>
                  </div>
                </div>
              `)}
            </div>
          `}
        </div>
      `}
    </div>
  `;
}
