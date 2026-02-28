import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

export interface OpenCodeTask {
  id: string;
  prompt: string;
  status: 'pending_approval' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  containerId?: string;
  workspacePath?: string;
  approvedBy?: string;
  approvedAt?: string;
  result?: string;
  error?: string;
  securityFlags?: string[];
}

export interface OpenCodeStatus {
  enabled: boolean;
  runtimeAvailable: boolean;
  runtimeType: 'docker' | 'podman' | 'apple' | null;
  activeTasks: number;
  totalTasks: number;
  pendingApprovals: number;
}

export function renderOpencodeView(state: AppViewState) {
  const status = state.opencodeStatus;
  const tasks = state.opencodeTasks || [];
  const selectedTask = state.opencodeSelectedTask;

  // Auto-load OpenCode data on first render
  if (!status && !state.opencodeLoading && !state.opencodeError && state.connected) {
    console.log("[Opencode View] Auto-loading OpenCode data...");
    state.handleOpencodeLoad();
  }

  if (state.opencodeLoading) {
    return html`
      <div class="view-loading">
        <div class="spinner"></div>
        <p>Loading OpenCode...</p>
      </div>
    `;
  }

  // Handle case where status is null but not loading (initial state or error)
  if (!status) {
    return html`
      <div class="opencode-view">
        ${renderHeader(null)}
        <div class="opencode-disabled-state">
          <div class="disabled-icon">${icons.code}</div>
          <h2>OpenCode AI</h2>
          <p>Loading OpenCode configuration...</p>
        </div>
      </div>
    `;
  }

  return html`
    <div class="opencode-view">
      ${renderHeader(status)}
      ${status.enabled ? html`
        <div class="opencode-content">
          ${renderStatusPanel(status)}
          ${renderTaskCreation(state)}
          ${renderTaskList(tasks, selectedTask, state)}
          ${selectedTask ? renderTaskDetail(selectedTask, state) : nothing}
        </div>
      ` : html`
        ${renderDisabledState(state)}
      `}
    </div>
  `;
}

function renderHeader(status: OpenCodeStatus | null) {
  return html`
    <div class="opencode-header">
      <div class="opencode-header-title">
        <div class="opencode-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h1>OpenCode AI</h1>
          <p class="subtitle">AI coding assistant integration</p>
        </div>
      </div>
      <div class="opencode-header-actions">
        <button @click=${() => window.location.hash = 'opencode-settings'} class="btn-secondary">
          ${icons.settings} Settings
        </button>
        <button @click=${() => window.location.hash = 'opencode-security'} class="btn-secondary">
          ${icons.shield} Security
        </button>
      </div>
    </div>
  `;
}

function renderStatusPanel(status: OpenCodeStatus) {
  const runtimeIcon = status.runtimeAvailable ? icons.check : icons.x;
  const runtimeColor = status.runtimeAvailable ? 'success' : 'error';
  
  return html`
    <div class="opencode-status-panel">
      <div class="opencode-status-card ${runtimeColor}">
        <div class="status-icon">${runtimeIcon}</div>
        <div class="status-info">
          <h3>Runtime</h3>
          <p>${status.runtimeAvailable ? (status.runtimeType?.toUpperCase() || 'Available') : 'Not Available'}</p>
        </div>
      </div>
      
      <div class="opencode-status-card">
        <div class="status-icon">${icons.activity}</div>
        <div class="status-info">
          <h3>Active Tasks</h3>
          <p class="status-value">${status.activeTasks}</p>
        </div>
      </div>
      
      <div class="opencode-status-card">
        <div class="status-icon">${icons.layers}</div>
        <div class="status-info">
          <h3>Total Tasks</h3>
          <p class="status-value">${status.totalTasks}</p>
        </div>
      </div>
      
      ${status.pendingApprovals > 0 ? html`
        <div class="opencode-status-card warning">
          <div class="status-icon">${icons.alertCircle}</div>
          <div class="status-info">
            <h3>Pending Approvals</h3>
            <p class="status-value">${status.pendingApprovals}</p>
          </div>
        </div>
      ` : nothing}
    </div>
  `;
}

function renderTaskCreation(state: AppViewState) {
  return html`
    <div class="opencode-task-creation">
      <h3>New Coding Task</h3>
      <div class="task-input-group">
        <textarea
          class="task-input"
          placeholder="Describe your coding task... (e.g., 'Create a React component for a user profile card')"
          .value="${state.opencodeTaskInput || ''}"
          @input="${(e: InputEvent) => state.handleOpencodeTaskInputChange((e.target as HTMLTextAreaElement).value)}"
          rows="4"
        ></textarea>
        <button 
          @click="${() => state.handleOpencodeTaskCreate()}"
          ?disabled="${!state.opencodeTaskInput?.trim() || state.opencodeTaskCreating}"
          class="btn-primary"
        >
          ${state.opencodeTaskCreating 
            ? html`<span class="spinner"></span>Creating...` 
            : html`${icons.play} Start Task`}
        </button>
      </div>
    </div>
  `;
}

function renderTaskList(tasks: OpenCodeTask[], selectedTask: OpenCodeTask | null, state: AppViewState) {
  if (tasks.length === 0) {
    return html`
      <div class="opencode-empty-state">
        <div class="empty-icon">${icons.code}</div>
        <h3>No tasks yet</h3>
        <p>Create your first coding task above</p>
      </div>
    `;
  }

  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return html`
    <div class="opencode-task-list">
      <h3>Recent Tasks</h3>
      <div class="task-list">
        ${sortedTasks.map(task => html`
          <div 
            class="task-item ${task.status} ${selectedTask?.id === task.id ? 'selected' : ''}"
            @click="${() => state.handleOpencodeTaskSelect(task)}"
          >
            <div class="task-status-indicator ${task.status}"></div>
            <div class="task-info">
              <div class="task-prompt">${truncate(task.prompt, 60)}</div>
              <div class="task-meta">
                <span class="task-status ${task.status}">${formatStatus(task.status)}</span>
                <span class="task-time">${formatTime(task.createdAt)}</span>
              </div>
            </div>
            ${task.status === 'pending_approval' ? html`
              <button 
                @click="${(e: Event) => { e.stopPropagation(); state.handleOpencodeTaskApprove(task.id); }}"
                class="btn-approve"
              >
                ${icons.check} Approve
              </button>
            ` : nothing}
            ${task.status === 'running' ? html`
              <button 
                @click="${(e: Event) => { e.stopPropagation(); state.handleOpencodeTaskCancel(task.id); }}"
                class="btn-cancel"
              >
                ${icons.x} Cancel
              </button>
            ` : nothing}
          </div>
        `)}
      </div>
    </div>
  `;
}

function renderTaskDetail(task: OpenCodeTask, state: AppViewState) {
  return html`
    <div class="opencode-task-detail">
      <div class="task-detail-header">
        <h3>Task Details</h3>
        <button @click="${() => state.handleOpencodeTaskSelect(null)}" class="btn-close">${icons.x}</button>
      </div>
      
      <div class="task-detail-content">
        <div class="detail-section">
          <label>Prompt</label>
          <div class="detail-value prompt">${task.prompt}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-section">
            <label>Status</label>
            <span class="status-badge ${task.status}">${formatStatus(task.status)}</span>
          </div>
          <div class="detail-section">
            <label>Created</label>
            <div class="detail-value">${formatDateTime(task.createdAt)}</div>
          </div>
        </div>
        
        ${task.startedAt ? html`
          <div class="detail-section">
            <label>Started</label>
            <div class="detail-value">${formatDateTime(task.startedAt)}</div>
          </div>
        ` : nothing}
        
        ${task.approvedBy ? html`
          <div class="detail-section">
            <label>Approved By</label>
            <div class="detail-value">${task.approvedBy} at ${formatDateTime(task.approvedAt || '')}</div>
          </div>
        ` : nothing}
        
        ${task.containerId ? html`
          <div class="detail-section">
            <label>Container</label>
            <div class="detail-value">${task.containerId.substring(0, 12)}...</div>
          </div>
        ` : nothing}
        
        ${task.workspacePath ? html`
          <div class="detail-section">
            <label>Workspace</label>
            <div class="detail-value code">${task.workspacePath}</div>
          </div>
        ` : nothing}
        
        ${task.securityFlags && task.securityFlags.length > 0 ? html`
          <div class="detail-section">
            <label>Security Flags</label>
            <div class="security-flags">
              ${task.securityFlags.map(flag => html`
                <span class="security-flag">${flag}</span>
              `)}
            </div>
          </div>
        ` : nothing}
        
        ${task.result ? html`
          <div class="detail-section">
            <label>Result</label>
            <pre class="detail-value result">${task.result}</pre>
          </div>
        ` : nothing}
        
        ${task.error ? html`
          <div class="detail-section">
            <label>Error</label>
            <pre class="detail-value error">${task.error}</pre>
          </div>
        ` : nothing}
        
        <div class="detail-actions">
          <button @click="${() => state.handleOpencodeTaskLogs(task.id)}" class="btn-secondary">
            ${icons.terminal} View Logs
          </button>
          ${task.status === 'completed' || task.status === 'failed' ? html`
            <button @click="${() => state.handleOpencodeTaskDownload(task.id)}" class="btn-secondary">
              ${icons.download} Download Workspace
            </button>
          ` : nothing}
        </div>
      </div>
    </div>
  `;
}

function renderDisabledState(state: AppViewState) {
  return html`
    <div class="opencode-disabled-state">
      <div class="disabled-icon">${icons.code}</div>
      <h2>OpenCode AI is Disabled</h2>
      <p>Enable OpenCode to start using AI-powered coding assistance in secure containers.</p>
      <button @click="${() => window.location.hash = 'opencode-settings'}" class="btn-primary">
        ${icons.settings} Configure OpenCode
      </button>
    </div>
  `;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function formatStatus(status: OpenCodeTask['status']): string {
  const labels: Record<OpenCodeTask['status'], string> = {
    'pending_approval': 'Pending Approval',
    'running': 'Running',
    'completed': 'Completed',
    'failed': 'Failed',
    'cancelled': 'Cancelled'
  };
  return labels[status];
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
