import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

export interface SecurityRule {
  id: string;
  type: 'allowlist' | 'blocklist' | 'path_whitelist' | 'path_blacklist';
  pattern: string;
  description?: string;
  enabled: boolean;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user?: string;
  taskId?: string;
  details: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export const SECURITY_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'shield' as const },
  { id: 'commands', label: 'Command Rules', icon: 'terminal' as const },
  { id: 'paths', label: 'Path Restrictions', icon: 'folder' as const },
  { id: 'approval', label: 'Approval Settings', icon: 'checkCircle' as const },
  { id: 'audit', label: 'Audit Log', icon: 'fileText' as const }
];

export function renderOpencodeSecurityView(state: AppViewState) {
  const activeSection = state.opencodeSecuritySection || 'overview';
  const securityConfig = state.opencodeSecurityConfig || {};

  return html`
    <div class="opencode-security-view">
      ${renderSecurityHeader(state)}
      
      <div class="security-layout">
        ${renderSecuritySidebar(activeSection, state)}
        
        <div class="security-content">
          ${activeSection === 'overview' ? renderOverview(securityConfig, state)
            : activeSection === 'commands' ? renderCommandRules(securityConfig, state)
            : activeSection === 'paths' ? renderPathRestrictions(securityConfig, state)
            : activeSection === 'approval' ? renderApprovalSettings(securityConfig, state)
            : activeSection === 'audit' ? renderAuditLog(state)
            : nothing}
        </div>
      </div>
    </div>
  `;
}

function renderSecurityHeader(state: AppViewState) {
  return html`
    <div class="opencode-security-header">
      <div class="header-back">
        <button @click="${() => window.location.hash = 'opencode'}" class="btn-back">
          ${icons.arrowLeft}
        </button>
      </div>
      <div class="header-title">
        <h1>OpenCode Security</h1>
        <p class="subtitle">Manage security policies and audit logging</p>
      </div>
      <div class="header-actions">
        ${state.opencodeSecurityDirty ? html`
          <button @click="${() => state.handleOpencodeSecurityReset()}" class="btn-secondary">
            ${icons.rotateCcw} Reset
          </button>
        ` : nothing}
        <button 
          @click="${() => state.handleOpencodeSecuritySave()}"
          ?disabled="${!state.opencodeSecurityDirty || state.opencodeSecuritySaving}"
          class="btn-primary"
        >
          ${state.opencodeSecuritySaving 
            ? html`<span class="spinner"></span>Saving...` 
            : html`${icons.save} Save Changes`}
        </button>
      </div>
    </div>
  `;
}

function renderSecuritySidebar(activeSection: string, state: AppViewState) {
  return html`
    <div class="security-sidebar">
      ${SECURITY_SECTIONS.map(section => html`
        <button 
          class="sidebar-item ${activeSection === section.id ? 'active' : ''}"
          @click="${() => state.handleOpencodeSecuritySectionChange(section.id)}"
        >
          <span class="sidebar-icon">${icons[section.icon]}</span>
          <span class="sidebar-label">${section.label}</span>
        </button>
      `)}
    </div>
  `;
}

function renderOverview(securityConfig: Record<string, unknown>, state: AppViewState) {
  const allowlistEnabled = securityConfig.allowlistEnabled as boolean || false;
  const blocklistEnabled = securityConfig.blocklistEnabled as boolean || false;
  const approvalMode = securityConfig.approvalMode as string || 'on-miss';
  const auditEnabled = securityConfig.auditEnabled as boolean || false;

  return html`
    <div class="security-overview">
      <h2>Security Overview</h2>
      
      <div class="security-stats">
        <div class="stat-card ${allowlistEnabled ? 'active' : 'inactive'}">
          <div class="stat-icon">${icons.checkCircle}</div>
          <div class="stat-info">
            <h3>Allowlist</h3>
            <p>${allowlistEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
        
        <div class="stat-card ${blocklistEnabled ? 'active' : 'inactive'}">
          <div class="stat-icon">${icons.xCircle}</div>
          <div class="stat-info">
            <h3>Blocklist</h3>
            <p>${blocklistEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">${icons.userCheck}</div>
          <div class="stat-info">
            <h3>Approval Mode</h3>
            <p>${approvalMode}</p>
          </div>
        </div>
        
        <div class="stat-card ${auditEnabled ? 'active' : 'inactive'}">
          <div class="stat-icon">${icons.fileText}</div>
          <div class="stat-info">
            <h3>Audit Logging</h3>
            <p>${auditEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      </div>
      
      <div class="security-layers">
        <h3>Security Layers</h3>
        <div class="layer-list">
          <div class="security-layer">
            <div class="layer-number">1</div>
            <div class="layer-info">
              <h4>Container Sandboxing</h4>
              <p>Tasks run in isolated containers with chroot, network isolation, and resource limits</p>
            </div>
            <span class="layer-status enabled">Enabled</span>
          </div>
          
          <div class="security-layer">
            <div class="layer-number">2</div>
            <div class="layer-info">
              <h4>Command Filtering</h4>
              <p>Allowlist/blocklist rules control which commands can be executed</p>
            </div>
            <span class="layer-status ${allowlistEnabled || blocklistEnabled ? 'enabled' : 'optional'}">
              ${allowlistEnabled || blocklistEnabled ? 'Enabled' : 'Optional'}
            </span>
          </div>
          
          <div class="security-layer">
            <div class="layer-number">3</div>
            <div class="layer-info">
              <h4>User Approval</h4>
              <p>Modal dialogs or automatic approval based on confidence level</p>
            </div>
            <span class="layer-status ${approvalMode === 'always' ? 'enabled' : approvalMode === 'auto' ? 'optional' : 'enabled'}">
              ${approvalMode === 'always' ? 'Always' : approvalMode === 'auto' ? 'Auto' : 'On Miss'}
            </span>
          </div>
          
          <div class="security-layer">
            <div class="layer-number">4</div>
            <div class="layer-info">
              <h4>Path Restrictions</h4>
              <p>Whitelist/blacklist controls which paths OpenCode can access</p>
            </div>
            <span class="layer-status optional">Optional</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCommandRules(securityConfig: Record<string, unknown>, state: AppViewState) {
  const allowlist = (securityConfig.commandAllowlist as string[]) || [];
  const blocklist = (securityConfig.commandBlocklist as string[]) || [];
  const allowlistEnabled = securityConfig.allowlistEnabled as boolean || false;
  const blocklistEnabled = securityConfig.blocklistEnabled as boolean || false;

  return html`
    <div class="security-commands">
      <h2>Command Rules</h2>
      <p class="section-description">Control which shell commands OpenCode can execute</p>
      
      <div class="command-section">
        <div class="section-header">
          <label class="toggle-label">
            <input 
              type="checkbox" 
              .checked="${allowlistEnabled}"
              @change="${(e: InputEvent) => state.handleOpencodeSecurityChange('allowlistEnabled', (e.target as HTMLInputElement).checked)}"
            />
            <span class="toggle-slider"></span>
            <span class="toggle-title">Enable Allowlist</span>
          </label>
        </div>
        <p class="section-help">Only commands in this list will be allowed. Empty allowlist allows all commands (unless blocklisted).</p>
        
        <div class="rule-list">
          ${allowlist.map((cmd, index) => html`
            <div class="rule-item">
              <input 
                type="text"
                .value="${cmd}"
                placeholder="Command pattern (e.g., git, npm install *)"
                @input="${(e: InputEvent) => {
                  const newList = [...allowlist];
                  newList[index] = (e.target as HTMLInputElement).value;
                  state.handleOpencodeSecurityChange('commandAllowlist', newList);
                }}"
              />
              <button 
                @click="${() => {
                  const newList = allowlist.filter((_, i) => i !== index);
                  state.handleOpencodeSecurityChange('commandAllowlist', newList);
                }}"
                class="btn-icon"
              >
                ${icons.trash}
              </button>
            </div>
          `)}
          <button 
            @click="${() => state.handleOpencodeSecurityChange('commandAllowlist', [...allowlist, ''])}"
            class="btn-add"
          >
            ${icons.plus} Add Allowlist Rule
          </button>
        </div>
      </div>
      
      <div class="command-section">
        <div class="section-header">
          <label class="toggle-label">
            <input 
              type="checkbox" 
              .checked="${blocklistEnabled}"
              @change="${(e: InputEvent) => state.handleOpencodeSecurityChange('blocklistEnabled', (e.target as HTMLInputElement).checked)}"
            />
            <span class="toggle-slider"></span>
            <span class="toggle-title">Enable Blocklist</span>
          </label>
        </div>
        <p class="section-help">Commands in this list will be blocked. Takes precedence over allowlist.</p>
        
        <div class="rule-list">
          ${blocklist.map((cmd, index) => html`
            <div class="rule-item">
              <input 
                type="text"
                .value="${cmd}"
                placeholder="Command pattern (e.g., rm -rf /, sudo *)"
                @input="${(e: InputEvent) => {
                  const newList = [...blocklist];
                  newList[index] = (e.target as HTMLInputElement).value;
                  state.handleOpencodeSecurityChange('commandBlocklist', newList);
                }}"
              />
              <button 
                @click="${() => {
                  const newList = blocklist.filter((_, i) => i !== index);
                  state.handleOpencodeSecurityChange('commandBlocklist', newList);
                }}"
                class="btn-icon"
              >
                ${icons.trash}
              </button>
            </div>
          `)}
          <button 
            @click="${() => state.handleOpencodeSecurityChange('commandBlocklist', [...blocklist, ''])}"
            class="btn-add"
          >
            ${icons.plus} Add Blocklist Rule
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPathRestrictions(securityConfig: Record<string, unknown>, state: AppViewState) {
  const pathWhitelist = (securityConfig.pathWhitelist as string[]) || [];
  const pathBlacklist = (securityConfig.pathBlacklist as string[]) || [];

  return html`
    <div class="security-paths">
      <h2>Path Restrictions</h2>
      <p class="section-description">Control which filesystem paths OpenCode can access</p>
      
      <div class="path-section">
        <h3>Path Whitelist</h3>
        <p class="section-help">Only these paths will be accessible. Empty whitelist allows all paths (unless blacklisted).</p>
        
        <div class="rule-list">
          ${pathWhitelist.map((path, index) => html`
            <div class="rule-item">
              <input 
                type="text"
                .value="${path}"
                placeholder="/allowed/path/*"
                @input="${(e: InputEvent) => {
                  const newList = [...pathWhitelist];
                  newList[index] = (e.target as HTMLInputElement).value;
                  state.handleOpencodeSecurityChange('pathWhitelist', newList);
                }}"
              />
              <button 
                @click="${() => {
                  const newList = pathWhitelist.filter((_, i) => i !== index);
                  state.handleOpencodeSecurityChange('pathWhitelist', newList);
                }}"
                class="btn-icon"
              >
                ${icons.trash}
              </button>
            </div>
          `)}
          <button 
            @click="${() => state.handleOpencodeSecurityChange('pathWhitelist', [...pathWhitelist, ''])}"
            class="btn-add"
          >
            ${icons.plus} Add Whitelist Path
          </button>
        </div>
      </div>
      
      <div class="path-section">
        <h3>Path Blacklist</h3>
        <p class="section-help">These paths will be inaccessible. Takes precedence over whitelist.</p>
        
        <div class="rule-list">
          ${pathBlacklist.map((path, index) => html`
            <div class="rule-item">
              <input 
                type="text"
                .value="${path}"
                placeholder="/restricted/path/*"
                @input="${(e: InputEvent) => {
                  const newList = [...pathBlacklist];
                  newList[index] = (e.target as HTMLInputElement).value;
                  state.handleOpencodeSecurityChange('pathBlacklist', newList);
                }}"
              />
              <button 
                @click="${() => {
                  const newList = pathBlacklist.filter((_, i) => i !== index);
                  state.handleOpencodeSecurityChange('pathBlacklist', newList);
                }}"
                class="btn-icon"
              >
                ${icons.trash}
              </button>
            </div>
          `)}
          <button 
            @click="${() => state.handleOpencodeSecurityChange('pathBlacklist', [...pathBlacklist, ''])}"
            class="btn-add"
          >
            ${icons.plus} Add Blacklist Path
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderApprovalSettings(securityConfig: Record<string, unknown>, state: AppViewState) {
  const approvalMode = securityConfig.approvalMode as string || 'on-miss';
  const autoApproveTimeout = securityConfig.autoApproveTimeout as number || 300;

  return html`
    <div class="security-approval">
      <h2>Approval Settings</h2>
      <p class="section-description">Configure when user approval is required before executing tasks</p>
      
      <div class="approval-modes">
        <label class="approval-mode ${approvalMode === 'always' ? 'selected' : ''}">
          <input 
            type="radio" 
            name="approvalMode"
            value="always"
            .checked="${approvalMode === 'always'}"
            @change="${() => state.handleOpencodeSecurityChange('approvalMode', 'always')}"
          />
          <div class="mode-content">
            <div class="mode-icon">${icons.userCheck}</div>
            <div class="mode-info">
              <h3>Always Require Approval</h3>
              <p>Every task requires explicit user approval before running</p>
            </div>
          </div>
        </label>
        
        <label class="approval-mode ${approvalMode === 'on-miss' ? 'selected' : ''}">
          <input 
            type="radio" 
            name="approvalMode"
            value="on-miss"
            .checked="${approvalMode === 'on-miss'}"
            @change="${() => state.handleOpencodeSecurityChange('approvalMode', 'on-miss')}"
          />
          <div class="mode-content">
            <div class="mode-icon">${icons.helpCircle}</div>
            <div class="mode-info">
              <h3>On Miss (Recommended)</h3>
              <p>Approval only required when command doesn't match allowlist or matches blocklist</p>
            </div>
          </div>
        </label>
        
        <label class="approval-mode ${approvalMode === 'auto' ? 'selected' : ''}">
          <input 
            type="radio" 
            name="approvalMode"
            value="auto"
            .checked="${approvalMode === 'auto'}"
            @change="${() => state.handleOpencodeSecurityChange('approvalMode', 'auto')}"
          />
          <div class="mode-content">
            <div class="mode-icon">${icons.zap}</div>
            <div class="mode-info">
              <h3>Auto-approve</h3>
              <p>Tasks run automatically unless they match blocklist patterns</p>
            </div>
          </div>
        </label>
      </div>
      
      ${approvalMode === 'auto' ? html`
        <div class="approval-timeout">
          <label>Auto-approve Timeout (seconds)</label>
          <input 
            type="number"
            min="30"
            max="3600"
            .value="${autoApproveTimeout}"
            @input="${(e: InputEvent) => state.handleOpencodeSecurityChange('autoApproveTimeout', Number((e.target as HTMLInputElement).value))}"
          />
          <p class="field-help">Tasks will auto-approve after this time if no response</p>
        </div>
      ` : nothing}
    </div>
  `;
}

function renderAuditLog(state: AppViewState) {
  const auditLog = state.opencodeAuditLog || [];

  return html`
    <div class="security-audit">
      <h2>Audit Log</h2>
      <p class="section-description">Review security events and task approvals</p>
      
      <div class="audit-actions">
        <button @click="${() => state.handleOpencodeAuditRefresh()}" class="btn-secondary">
          ${icons.refreshCcw} Refresh
        </button>
        <button @click="${() => state.handleOpencodeAuditExport()}" class="btn-secondary">
          ${icons.download} Export
        </button>
      </div>
      
      ${state.opencodeAuditLoading ? html`
        <div class="audit-loading">
          <div class="spinner"></div>
          <p>Loading audit log...</p>
        </div>
      ` : auditLog.length === 0 ? html`
        <div class="audit-empty">
          <div class="empty-icon">${icons.fileText}</div>
          <h3>No audit entries</h3>
          <p>Security events will appear here when they occur</p>
        </div>
      ` : html`
        <div class="audit-list">
          ${auditLog.map(entry => html`
            <div class="audit-entry ${entry.severity}">
              <div class="audit-icon">${getSeverityIcon(entry.severity)}</div>
              <div class="audit-content">
                <div class="audit-header">
                  <span class="audit-action">${entry.action}</span>
                  <span class="audit-time">${formatDateTime(entry.timestamp)}</span>
                </div>
                <p class="audit-details">${entry.details}</p>
                ${entry.user ? html`<span class="audit-user">by ${entry.user}</span>` : nothing}
              </div>
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}

function getSeverityIcon(severity: SecurityAuditEntry['severity']) {
  switch (severity) {
    case 'critical':
      return icons.alertOctagon;
    case 'error':
      return icons.xCircle;
    case 'warning':
      return icons.alertTriangle;
    default:
      return icons.info;
  }
}

function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
