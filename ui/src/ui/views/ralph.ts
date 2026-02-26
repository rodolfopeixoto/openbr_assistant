import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";

export function renderRalphView(state: AppViewState) {
  return html`
    <div class="ralph-view">
      <section class="content-header">
        <div>
          <div class="page-title">Ralph Loop</div>
          <div class="page-sub">AI-powered development automation</div>
        </div>
        <button 
          class="btn btn-primary"
          @click=${() => state.showNewRunModal = true}
          ?disabled=${state.ralphLoading}
        >
          + New Run
        </button>
      </section>

      <div class="ralph-content">
        ${state.ralphLoading
          ? html`<div class="loading">Loading Ralph runs...</div>`
          : state.ralphError
            ? html`<div class="error">${state.ralphError}</div>`
            : html`
              <!-- Stats Overview -->
              <div class="ralph-stats">
                <div class="stat-card">
                  <div class="stat-value">${state.ralphStats?.totalRuns || 0}</div>
                  <div class="stat-label">Total Runs</div>
                </div>
                <div class="stat-card active">
                  <div class="stat-value">${state.ralphStats?.activeRuns || 0}</div>
                  <div class="stat-label">Active</div>
                </div>
                <div class="stat-card completed">
                  <div class="stat-value">${state.ralphStats?.completedRuns || 0}</div>
                  <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card failed">
                  <div class="stat-value">${state.ralphStats?.failedRuns || 0}</div>
                  <div class="stat-label">Failed</div>
                </div>
              </div>

              <!-- Container Engine Status -->
              <div class="engine-status">
                <h3>Container Engine</h3>
                <div class="engine-info">
                  <span class="engine-name">${state.ralphEngine || 'Unknown'}</span>
                  <span class="engine-status-badge ${state.ralphEngineStatus || 'unknown'}">
                    ${state.ralphEngineStatus || 'unknown'}
                  </span>
                </div>
              </div>

              <!-- Runs List -->
              <div class="runs-list">
                <h3>Development Runs</h3>
                
                ${!state.ralphRuns?.length 
                  ? html`<div class="empty-state">
                      <p>No runs yet. Create your first development run!</p>
                    </div>`
                  : html`<div class="runs-table">
                      ${state.ralphRuns.map((run: any) => html`
                        <div class="run-card ${run.status}">
                          <div class="run-header">
                            <span class="run-name">${run.name}</span>
                            <span class="run-status ${run.status}">${run.status}</span>
                          </div>
                          
                          <div class="run-details">
                            <div class="run-meta">
                              <span>PRD: ${run.prd?.title || 'Untitled'}</span>
                              <span>Branch: ${run.gitBranch}</span>
                              <span>Provider: ${run.gitProvider}</span>
                            </div>
                            
                            <div class="run-progress">
                              <div class="progress-text">
                                Story ${run.currentIteration} of ${run.maxIterations}
                              </div>
                              <div class="progress-bar">
                                <div class="progress-fill" 
                                     style="width: ${(run.currentIteration / run.maxIterations) * 100}%">
                                </div>
                              </div>
                            </div>
                            
                            <div class="run-actions">
                              ${run.status === 'running' 
                                ? html`
                                  <button class="btn btn-sm" @click=${() => state.pauseRalphRun?.(run.id)}>Pause</button>
                                  <button class="btn btn-sm btn-danger" @click=${() => state.cancelRalphRun?.(run.id)}>Cancel</button>
                                `
                                : run.status === 'paused'
                                  ? html`<button class="btn btn-sm btn-primary" @click=${() => state.resumeRalphRun?.(run.id)}>Resume</button>`
                                  : nothing}
                              <button class="btn btn-sm" @click=${() => state.viewRalphRun?.(run.id)}>Details</button>
                            </div>
                          </div>
                          
                          ${run.error 
                            ? html`<div class="run-error">Error: ${run.error}</div>`
                            : nothing}
                        </div>
                      `)}
                    </div>`
                }
              </div>

              <!-- PRD Templates -->
              <div class="prd-templates">
                <h3>PRD Templates</h3>
                <div class="templates-grid">
                  ${state.ralphTemplates?.map((template: any) => html`
                    <div class="template-card" @click=${() => state.selectRalphTemplate?.(template.id)}>
                      <div class="template-name">${template.name}</div>
                      <div class="template-description">${template.description}</div>
                      <div class="template-category">${template.category}</div>
                    </div>
                  `)}
                </div>
              </div>
            `}
      </div>
    </div>
  `;
}

export function renderRalphModal(state: AppViewState) {
  if (!state.showNewRunModal) {
    return nothing;
  }

  return html`
    <div class="modal-overlay" @click=${() => state.showNewRunModal = false}>
      <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>Create New Development Run</h2>
          <button class="close-btn" @click=${() => state.showNewRunModal = false}>&times;</button>
        </div>
        
        <div class="modal-body">
          <form @submit=${(e: Event) => {
            e.preventDefault();
            state.createRalphRun?.();
          }}>
            <div class="form-group">
              <label>Run Name</label>
              <input 
                type="text" 
                .value=${state.newRalphRunName || ''}
                @input=${(e: InputEvent) => state.newRalphRunName = (e.target as HTMLInputElement).value}
                placeholder="e.g., Feature XYZ Implementation"
                required
              >
            </div>

            <div class="form-group">
              <label>PRD Template</label>
              <select 
                @change=${(e: InputEvent) => state.selectedRalphTemplate = (e.target as HTMLSelectElement).value}
              >
                <option value="">Select a template...</option>
                ${state.ralphTemplates?.map((t: any) => html`<option value="${t.id}" ?selected=${state.selectedRalphTemplate === t.id}>${t.name}</option>`)}
              </select>
            </div>

            <div class="form-group">
              <label>Git Provider</label>
              <select 
                @change=${(e: InputEvent) => state.selectedGitProvider = (e.target as HTMLSelectElement).value}
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="bitbucket">Bitbucket</option>
              </select>
            </div>

            <div class="form-group">
              <label>Repository URL</label>
              <input 
                type="text" 
                .value=${state.newRalphRepoUrl || ''}
                @input=${(e: InputEvent) => state.newRalphRepoUrl = (e.target as HTMLInputElement).value}
                placeholder="https://github.com/user/repo.git"
                required
              >
            </div>

            <div class="form-group">
              <label>Base Branch</label>
              <input 
                type="text" 
                .value=${state.newRalphBaseBranch || 'main'}
                @input=${(e: InputEvent) => state.newRalphBaseBranch = (e.target as HTMLInputElement).value}
                placeholder="main"
                required
              >
            </div>

            <div class="form-actions">
              <button type="button" class="btn" @click=${() => state.showNewRunModal = false}>Cancel</button>
              <button type="submit" class="btn btn-primary" ?disabled=${state.ralphCreating}>
                ${state.ralphCreating ? 'Creating...' : 'Start Development Run'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function renderRalphRunDetail(state: AppViewState) {
  const run = state.selectedRalphRun;
  
  if (!run) {
    return nothing;
  }

  const progress = state.ralphRunProgress?.get(run.id) || [];
  const qualityChecks = state.ralphRunQualityChecks?.get(run.id) || [];

  return html`
    <div class="run-detail-view">
      <section class="content-header">
        <div>
          <div class="page-title">${run.name}</div>
          <div class="page-sub">Run ID: ${run.id} | Status: ${run.status}</div>
        </div>
        <button class="btn" @click=${() => state.selectedRalphRun = null}>&larr; Back</button>
      </section>

      <div class="run-detail-content">
        <!-- PRD Overview -->
        <div class="prd-section">
          <h3>Product Requirements Document</h3>
          <div class="prd-info">
            <h4>${run.prd?.title}</h4>
            <p>${run.prd?.description}</p>
          </div>
          
          <div class="stories-list">
            <h4>User Stories</h4>
            ${run.prd?.userStories?.map((story: any) => html`
              <div class="story-card ${story.passes ? 'passed' : story.attempts >= story.maxAttempts ? 'failed' : 'pending'}">
                <div class="story-header">
                  <span class="story-title">${story.title}</span>
                  <span class="story-status">
                    ${story.passes 
                      ? '✓ Passed' 
                      : story.attempts >= story.maxAttempts 
                        ? '✗ Failed' 
                        : '⏳ Pending'}
                  </span>
                </div>
                <div class="story-description">${story.description}</div>
                <div class="story-meta">
                  <span>Priority: ${story.priority}</span>
                  <span>Attempts: ${story.attempts}/${story.maxAttempts}</span>
                </div>
                
                ${story.lastError 
                  ? html`<div class="story-error">Error: ${story.lastError}</div>`
                  : nothing}
              </div>
            `)}
          </div>
        </div>

        <!-- Progress Log -->
        <div class="progress-section">
          <h3>Development Progress</h3>
          <div class="progress-timeline">
            ${progress.map((entry: any) => html`
              <div class="progress-entry ${entry.action}">
                <span class="timestamp">${new Date(entry.timestamp).toLocaleString()}</span>
                <span class="iteration">#${entry.iteration}</span>
                <span class="message">${entry.message}</span>
              </div>
            `)}
          </div>
        </div>

        <!-- Quality Checks -->
        ${qualityChecks.length 
          ? html`<div class="quality-section">
              <h3>Quality Checks</h3>
              <div class="checks-list">
                ${qualityChecks.map((check: any) => html`
                  <div class="check-item ${check.passed ? 'passed' : 'failed'}">
                    <span class="check-type">${check.type}</span>
                    <span class="check-status">${check.passed ? '✓' : '✗'}</span>
                    <span class="check-duration">${check.duration}ms</span>
                  </div>
                `)}
              </div>
            </div>`
          : nothing}

        <!-- Container Info -->
        ${run.containerId 
          ? html`<div class="container-section">
              <h3>Container</h3>
              <div class="container-info">
                <span>ID: ${run.containerId}</span>
                <button class="btn btn-sm" @click=${() => state.viewRalphContainerLogs?.(run.id)}>View Logs</button>
              </div>
            </div>`
          : nothing}
      </div>
    </div>
  `;
}
