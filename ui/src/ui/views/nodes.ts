import { html, nothing } from "lit";
import type {
  DevicePairingList,
  DeviceTokenSummary,
  PairedDevice,
  PendingDevice,
} from "../controllers/devices";
import type {
  ExecApprovalsAllowlistEntry,
  ExecApprovalsFile,
  ExecApprovalsSnapshot,
} from "../controllers/exec-approvals";
import { clampText, formatAgo, formatList } from "../format";
import { icons } from "../icons";

export type NodesProps = {
  loading: boolean;
  nodes: Array<Record<string, unknown>>;
  devicesLoading: boolean;
  devicesError: string | null;
  devicesList: DevicePairingList | null;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  configFormMode: "form" | "raw";
  execApprovalsLoading: boolean;
  execApprovalsSaving: boolean;
  execApprovalsDirty: boolean;
  execApprovalsSnapshot: ExecApprovalsSnapshot | null;
  execApprovalsForm: ExecApprovalsFile | null;
  execApprovalsSelectedAgent: string | null;
  execApprovalsTarget: "gateway" | "node";
  execApprovalsTargetNodeId: string | null;
  onRefresh: () => void;
  onDevicesRefresh: () => void;
  onDeviceApprove: (requestId: string) => void;
  onDeviceReject: (requestId: string) => void;
  onDeviceRotate: (deviceId: string, role: string, scopes?: string[]) => void;
  onDeviceRevoke: (deviceId: string, role: string) => void;
  onLoadConfig: () => void;
  onLoadExecApprovals: () => void;
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSaveBindings: () => void;
  onExecApprovalsTargetChange: (kind: "gateway" | "node", nodeId: string | null) => void;
  onExecApprovalsSelectAgent: (agentId: string) => void;
  onExecApprovalsPatch: (path: Array<string | number>, value: unknown) => void;
  onExecApprovalsRemove: (path: Array<string | number>) => void;
  onSaveExecApprovals: () => void;
};

// Platform icons using SVG
const PLATFORM_ICONS: Record<string, () => ReturnType<typeof html>> = {
  macos: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><path d="M12 2c-1.5 0-2.8.5-3.8 1.5C7.2 4.5 6.7 5.8 6.7 7.3c0 1.5.5 2.8 1.5 3.8.5.5 1.1.9 1.8 1.1-.3.7-.8 1.3-1.4 1.8-.6.5-1.3.8-2.1.8-.4 0-.7-.1-1.1-.2-.3-.1-.6-.3-.9-.5-.3-.2-.5-.3-.8-.3-.2 0-.4.1-.6.2-.2.1-.3.3-.3.5 0 .2.1.4.2.6.1.2.3.4.5.5.5.4 1.1.7 1.7.9.6.2 1.3.3 2 .3.9 0 1.8-.2 2.6-.7.8-.5 1.5-1.1 2-1.9.5.8 1.2 1.4 2 1.9.8.5 1.7.7 2.6.7.7 0 1.4-.1 2-.3.6-.2 1.2-.5 1.7-.9.2-.1.4-.3.5-.5.1-.2.2-.4.2-.6 0-.2-.1-.4-.3-.5-.2-.1-.4-.2-.6-.2-.3 0-.5.1-.8.3-.3.2-.6.4-.9.5-.3.1-.7.2-1.1.2-.8 0-1.5-.3-2.1-.8-.6-.5-1.1-1.1-1.4-1.8.7-.2 1.3-.6 1.8-1.1 1-1 1.5-2.3 1.5-3.8 0-1.5-.5-2.8-1.5-3.8C14.8 2.5 13.5 2 12 2z"/></svg>`,
  ios: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>`,
  android: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><path d="M5 16v-6a7 7 0 0 1 14 0v6"/><line x1="5" y1="19" x2="5" y2="21"/><line x1="19" y1="19" x2="19" y2="21"/><line x1="9" y1="19" x2="9" y2="21"/><line x1="15" y1="19" x2="15" y2="21"/></svg>`,
  linux: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><path d="M12 3c-1.5 0-2.7.5-3.6 1.4-.9.9-1.4 2.1-1.4 3.6 0 1.2.3 2.2.9 3 .6.8 1.4 1.4 2.4 1.8-.5.5-1.1.9-1.7 1.2-.6.3-1.3.5-2 .5h-.5c-.4 0-.8-.1-1.1-.2-.3-.1-.6-.3-.9-.5-.2-.1-.4-.2-.6-.2-.2 0-.3.1-.5.2-.1.1-.2.3-.2.5 0 .2.1.3.2.5.1.2.3.3.5.4.4.3.9.5 1.4.7.5.2 1.1.2 1.7.2h.5c.8 0 1.5-.2 2.2-.5.7-.3 1.3-.8 1.8-1.4.5.6 1.1 1.1 1.8 1.4.7.3 1.4.5 2.2.5h.5c.6 0 1.2-.1 1.7-.2.5-.2 1-.4 1.4-.7.2-.1.4-.2.5-.4.1-.2.2-.3.2-.5 0-.2-.1-.3-.2-.5-.2-.1-.3-.2-.5-.2-.2 0-.4.1-.6.2-.3.2-.6.4-.9.5-.3.1-.7.2-1.1.2h-.5c-.7 0-1.4-.2-2-.5-.6-.3-1.2-.7-1.7-1.2 1-.4 1.8-1 2.4-1.8.6-.8.9-1.8.9-3 0-1.5-.5-2.7-1.4-3.6C14.7 3.5 13.5 3 12 3z"/><path d="M9 12c-1 0-2 .5-2.5 1.5S6 15.5 6 16.5"/><path d="M15 12c1 0 2 .5 2.5 1.5s.5 2.5.5 3.5"/></svg>`,
  windows: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  docker: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><path d="M4 10h12"/><path d="M4 14h12"/><path d="M4 18h12"/><path d="M4 6h12"/><path d="M18 10h2"/><path d="M18 14h2"/><path d="M18 6h2"/><path d="M18 18h2"/></svg>`,
  web: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  cloud: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
};

function getPlatformIcon(platform?: string): () => ReturnType<typeof html> {
  if (!platform) return PLATFORM_ICONS.linux || (() => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`);
  const normalized = platform.toLowerCase();
  return PLATFORM_ICONS[normalized] || PLATFORM_ICONS.linux || (() => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`);
}

// Capability descriptions for tooltips
const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  "system.run": "Execute system commands and scripts",
  "fs.read": "Read files from the file system",
  "fs.write": "Write files to the file system",
  "net.http": "Make HTTP requests",
  "net.ws": "WebSocket connections",
  "db.query": "Query databases",
  "docker": "Docker container operations",
  "k8s": "Kubernetes operations",
  "git": "Git version control operations",
};

export function renderNodes(props: NodesProps) {
  const bindingState = resolveBindingsState(props);
  const approvalsState = resolveExecApprovalsState(props);
  
  return html`
    <div class="nodes-page">
      <!-- Help Section -->
      <div class="nodes-help-section">
        <div class="help-card">
          <div class="help-icon">${icons.monitor}</div>
          <div class="help-content">
            <h3>What are Nodes?</h3>
            <p>Nodes are remote devices that execute commands on behalf of the gateway. They can run skills, tools, and automations for you. Examples: your computer, a server, or a cloud instance.</p>
          </div>
        </div>
        <div class="help-card">
          <div class="help-icon">${icons.smartphone}</div>
          <div class="help-content">
            <h3>What are Devices?</h3>
            <p>Devices are applications connected to the gateway (mobile apps, web clients, integrations). They send and receive messages but don't execute commands like nodes do.</p>
          </div>
        </div>
      </div>

      ${renderExecApprovals(approvalsState)}
      ${renderBindings(bindingState)}
      ${renderDevicesSection(props)}
      ${renderNodesSection(props)}
    </div>
  `;
}

function renderDevicesSection(props: NodesProps) {
  const list = props.devicesList ?? { pending: [], paired: [] };
  const pending = Array.isArray(list.pending) ? list.pending : [];
  const paired = Array.isArray(list.paired) ? list.paired : [];
  
  return html`
    <section class="nodes-section">
      <div class="section-header">
        <div class="section-title-wrapper">
          <div class="section-icon">${icons.smartphone}</div>
          <div>
            <h2 class="section-title">Devices</h2>
            <p class="section-subtitle">Connected applications and services</p>
          </div>
        </div>
        <button class="btn btn--secondary" ?disabled=${props.devicesLoading} @click=${props.onDevicesRefresh}>
          ${props.devicesLoading ? html`<span class="spinner"></span>Loading...` : html`${icons.refreshCw} Refresh`}
        </button>
      </div>
      
      ${props.devicesError
        ? html`<div class="error-banner">${props.devicesError}</div>`
        : nothing}
      
      <div class="devices-grid">
        ${pending.length === 0 && paired.length === 0
          ? html`<div class="empty-state">
              <div class="empty-icon">${icons.smartphone}</div>
              <p>No devices connected yet.</p>
              <p class="empty-hint">Devices will appear here when they request to pair with the gateway.</p>
            </div>`
          : nothing}
          
        ${pending.map((req) => renderPendingDeviceCard(req, props))}
        ${paired.map((device) => renderPairedDeviceCard(device, props))}
      </div>
    </section>
  `;
}

function renderPendingDevice(req: PendingDevice, props: NodesProps) {
  const name = req.displayName?.trim() || req.deviceId;
  const age = typeof req.ts === "number" ? formatAgo(req.ts) : "n/a";
  const role = req.role?.trim() ? `role: ${req.role}` : "role: -";
  const repair = req.isRepair ? " · repair" : "";
  const ip = req.remoteIp ? ` · ${req.remoteIp}` : "";
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${name}</div>
        <div class="list-sub">${req.deviceId}${ip}</div>
        <div class="muted" style="margin-top: 6px;">
          ${role} · requested ${age}${repair}
        </div>
      </div>
      <div class="list-meta">
        <div class="row" style="justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn--sm primary" @click=${() => props.onDeviceApprove(req.requestId)}>
            Approve
          </button>
          <button class="btn btn--sm" @click=${() => props.onDeviceReject(req.requestId)}>
            Reject
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPairedDevice(device: PairedDevice, props: NodesProps) {
  const name = device.displayName?.trim() || device.deviceId;
  const ip = device.remoteIp ? ` · ${device.remoteIp}` : "";
  const roles = `roles: ${formatList(device.roles)}`;
  const scopes = `scopes: ${formatList(device.scopes)}`;
  const tokens = Array.isArray(device.tokens) ? device.tokens : [];
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${name}</div>
        <div class="list-sub">${device.deviceId}${ip}</div>
        <div class="muted" style="margin-top: 6px;">${roles} · ${scopes}</div>
        ${
          tokens.length === 0
            ? html`
                <div class="muted" style="margin-top: 6px">Tokens: none</div>
              `
            : html`
              <div class="muted" style="margin-top: 10px;">Tokens</div>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
                ${tokens.map((token) => renderTokenRow(device.deviceId, token, props))}
              </div>
            `
        }
      </div>
    </div>
  `;
}

function renderTokenRow(deviceId: string, token: DeviceTokenSummary, props: NodesProps) {
  const status = token.revokedAtMs ? "revoked" : "active";
  const scopes = `scopes: ${formatList(token.scopes)}`;
  const when = formatAgo(token.rotatedAtMs ?? token.createdAtMs ?? token.lastUsedAtMs ?? null);
  return html`
    <div class="row" style="justify-content: space-between; gap: 8px;">
      <div class="list-sub">${token.role} · ${status} · ${scopes} · ${when}</div>
      <div class="row" style="justify-content: flex-end; gap: 6px; flex-wrap: wrap;">
        <button
          class="btn btn--sm"
          @click=${() => props.onDeviceRotate(deviceId, token.role, token.scopes)}
        >
          Rotate
        </button>
        ${
          token.revokedAtMs
            ? nothing
            : html`
              <button
                class="btn btn--sm danger"
                @click=${() => props.onDeviceRevoke(deviceId, token.role)}
              >
                Revoke
              </button>
            `
        }
      </div>
    </div>
  `;
}

// New card-based render functions
function renderPendingDeviceCard(req: PendingDevice, props: NodesProps) {
  const name = req.displayName?.trim() || req.deviceId;
  const age = typeof req.ts === "number" ? formatAgo(req.ts) : "just now";
  const ip = req.remoteIp || "Unknown IP";
  
  return html`
    <div class="device-card pending">
      <div class="device-card-header">
          <div class="device-icon">${icons.clock}</div>
        <div class="device-info">
          <h4 class="device-name">${name}</h4>
          <span class="device-status">Pending approval</span>
        </div>
      </div>
      
      <div class="device-details">
        <div class="detail-row">
          <span class="detail-label">ID:</span>
          <span class="detail-value">${clampText(req.deviceId, 30)}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Role:</span>
          <span class="detail-value">${req.role || "-"}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">IP:</span>
          <span class="detail-value">${ip}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Requested:</span>
          <span class="detail-value">${age}${req.isRepair ? " (repair)" : ""}</span>
        </div>
      </div>
      
      <div class="device-actions">
        <button class="btn btn--primary" @click=${() => props.onDeviceApprove(req.requestId)}>
          ${icons.check} Approve
        </button>
        <button class="btn btn--secondary" @click=${() => props.onDeviceReject(req.requestId)}>
          ${icons.x} Reject
        </button>
      </div>
    </div>
  `;
}

function renderPairedDeviceCard(device: PairedDevice, props: NodesProps) {
  const name = device.displayName?.trim() || device.deviceId;
  const ip = device.remoteIp || "Unknown IP";
  const roles = device.roles || [];
  const scopes = device.scopes || [];
  const tokens = Array.isArray(device.tokens) ? device.tokens : [];
  
  return html`
    <div class="device-card">
      <div class="device-card-header">
          <div class="device-icon">${icons.smartphone}</div>
        <div class="device-info">
          <h4 class="device-name">${name}</h4>
          <span class="device-status connected">Connected</span>
        </div>
      </div>
      
      <div class="device-details">
        <div class="detail-row">
          <span class="detail-label">ID:</span>
          <span class="detail-value">${clampText(device.deviceId, 30)}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">IP:</span>
          <span class="detail-value">${ip}</span>
        </div>
        
        ${roles.length > 0 ? html`
          <div class="detail-row">
            <span class="detail-label">Roles:</span>
            <span class="detail-value">${formatList(roles)}</span>
          </div>
        ` : nothing}
        
        ${scopes.length > 0 ? html`
          <div class="detail-row">
            <span class="detail-label">Scopes:</span>
            <span class="detail-value">${formatList(scopes)}</span>
          </div>
        ` : nothing}
      </div>
      
      ${tokens.length > 0 ? html`
        <div class="device-tokens">
          <h5>Access Tokens</h5>
          ${tokens.map((token) => renderTokenCard(device.deviceId, token, props))}
        </div>
      ` : nothing}
    </div>
  `;
}

function renderTokenCard(deviceId: string, token: DeviceTokenSummary, props: NodesProps) {
  const isRevoked = Boolean(token.revokedAtMs);
  const status = isRevoked ? "Revoked" : "Active";
  const when = formatAgo(token.rotatedAtMs ?? token.createdAtMs ?? token.lastUsedAtMs ?? null);
  
  return html`
    <div class="token-card ${isRevoked ? "revoked" : ""}">
      <div class="token-info">
        <span class="token-role">${token.role}</span>
        <span class="token-status ${isRevoked ? "revoked" : "active"}">${status}</span>
        ${token.scopes?.length ? html`<span class="token-scopes">${formatList(token.scopes)}</span>` : nothing}
        <span class="token-time">${when}</span>
      </div>
      
      <div class="token-actions">
        <button 
          class="btn btn--sm btn--secondary" 
          @click=${() => props.onDeviceRotate(deviceId, token.role, token.scopes)}
          title="Rotate token - generates a new token"
        >
          ${icons.refreshCw}
        </button>
        
        ${!isRevoked ? html`
          <button 
            class="btn btn--sm btn--danger" 
            @click=${() => props.onDeviceRevoke(deviceId, token.role)}
            title="Revoke token - permanently disables this token"
          >
            ${icons.trash}
          </button>
        ` : nothing}
      </div>
    </div>
  `;
}

function renderNodesSection(props: NodesProps) {
  return html`
    <section class="nodes-section">
      <div class="section-header">
        <div class="section-title-wrapper">
          <div class="section-icon">${icons.monitor}</div>
          <div>
            <h2 class="section-title">Nodes</h2>
            <p class="section-subtitle">Remote execution devices and connected services</p>
          </div>
        </div>
        <button class="btn btn--secondary" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? html`<span class="spinner"></span>Loading...` : html`${icons.refreshCw} Refresh`}
        </button>
      </div>
      
      <div class="nodes-grid">
        ${props.nodes.length === 0
          ? html`<div class="empty-state">
              <div class="empty-icon">${icons.monitor}</div>
              <p>No nodes connected yet.</p>
              <p class="empty-hint">Nodes are remote devices that can execute commands for you. They will appear here when paired.</p>
            </div>`
          : props.nodes.map((node) => renderNodeCard(node))}
      </div>
    </section>
  `;
}

function renderNodeCard(node: Record<string, unknown>) {
  const connected = Boolean(node.connected);
  const paired = Boolean(node.paired);
  const title = (typeof node.displayName === "string" && node.displayName.trim()) ||
    (typeof node.nodeId === "string" ? node.nodeId : "Unknown Node");
  
  const caps = Array.isArray(node.caps) ? (node.caps as unknown[]) : [];
  const commands = Array.isArray(node.commands) ? (node.commands as unknown[]) : [];
  
  // Get platform icon
  const platform = typeof node.platform === "string" ? node.platform.toLowerCase() : "";
  const platformIcon = getPlatformIcon(platform);
  
  return html`
    <div class="node-card ${connected ? "connected" : "offline"}">
      <div class="node-card-header">
        <div class="node-platform-icon">${platformIcon}</div>
        <div class="node-info">
          <h4 class="node-name">${title}</h4>
          <div class="node-badges">
            ${paired ? html`<span class="badge">Paired</span>` : html`<span class="badge badge--warning">Unpaired</span>`}
            ${connected 
              ? html`<span class="badge badge--success">🟢 Connected</span>` 
              : html`<span class="badge badge--error">🔴 Offline</span>`}
          </div>
        </div>
      </div>
      
      <div class="node-details">
        <div class="detail-row">
          <span class="detail-label">Node ID:</span>
          <span class="detail-value">${clampText(String(node.nodeId || "Unknown"), 30)}</span>
        </div>
        
        ${node.remoteIp ? html`
          <div class="detail-row">
            <span class="detail-label">IP Address:</span>
            <span class="detail-value">${node.remoteIp}</span>
          </div>
        ` : nothing}
        
        ${node.version ? html`
          <div class="detail-row">
            <span class="detail-label">Version:</span>
            <span class="detail-value">${node.version}</span>
          </div>
        ` : nothing}
        
        ${node.platform ? html`
          <div class="detail-row">
            <span class="detail-label">Platform:</span>
            <span class="detail-value">${node.platform}${node.deviceFamily ? ` (${node.deviceFamily})` : ""}</span>
          </div>
        ` : nothing}
        
        ${node.connectedAtMs ? html`
          <div class="detail-row">
            <span class="detail-label">Connected since:</span>
            <span class="detail-value">${formatAgo(node.connectedAtMs as number)}</span>
          </div>
        ` : nothing}
      </div>
      
      ${caps.length > 0 ? html`
        <div class="node-capabilities">
          <h5>Capabilities</h5>
          <div class="capability-list">
            ${caps.map((c) => {
              const capName = String(c);
              const description = CAPABILITY_DESCRIPTIONS[capName] || `This node can perform ${capName} operations`;
              return html`<span class="capability-chip" title="${description}">${capName}</span>`;
            })}
          </div>
        </div>
      ` : nothing}
      
      ${commands.length > 0 ? html`
        <div class="node-commands">
          <h5>Available Commands</h5>
          <div class="command-list">
            ${commands.map((c) => html`<span class="command-chip" title="Command: ${String(c)}">${String(c)}</span>`)}
          </div>
        </div>
      ` : nothing}
    </div>
  `;
}

type BindingAgent = {
  id: string;
  name?: string;
  index: number;
  isDefault: boolean;
  binding?: string | null;
};

type BindingNode = {
  id: string;
  label: string;
};

type BindingState = {
  ready: boolean;
  disabled: boolean;
  configDirty: boolean;
  configLoading: boolean;
  configSaving: boolean;
  defaultBinding?: string | null;
  agents: BindingAgent[];
  nodes: BindingNode[];
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSave: () => void;
  onLoadConfig: () => void;
  formMode: "form" | "raw";
};

type ExecSecurity = "deny" | "allowlist" | "full";
type ExecAsk = "off" | "on-miss" | "always";

type ExecApprovalsResolvedDefaults = {
  security: ExecSecurity;
  ask: ExecAsk;
  askFallback: ExecSecurity;
  autoAllowSkills: boolean;
};

type ExecApprovalsAgentOption = {
  id: string;
  name?: string;
  isDefault?: boolean;
};

type ExecApprovalsTargetNode = {
  id: string;
  label: string;
};

type ExecApprovalsState = {
  ready: boolean;
  disabled: boolean;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  form: ExecApprovalsFile | null;
  defaults: ExecApprovalsResolvedDefaults;
  selectedScope: string;
  selectedAgent: Record<string, unknown> | null;
  agents: ExecApprovalsAgentOption[];
  allowlist: ExecApprovalsAllowlistEntry[];
  target: "gateway" | "node";
  targetNodeId: string | null;
  targetNodes: ExecApprovalsTargetNode[];
  onSelectScope: (agentId: string) => void;
  onSelectTarget: (kind: "gateway" | "node", nodeId: string | null) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onLoad: () => void;
  onSave: () => void;
};

const EXEC_APPROVALS_DEFAULT_SCOPE = "__defaults__";

const SECURITY_OPTIONS: Array<{ value: ExecSecurity; label: string }> = [
  { value: "deny", label: "Deny" },
  { value: "allowlist", label: "Allowlist" },
  { value: "full", label: "Full" },
];

const ASK_OPTIONS: Array<{ value: ExecAsk; label: string }> = [
  { value: "off", label: "Off" },
  { value: "on-miss", label: "On miss" },
  { value: "always", label: "Always" },
];

function resolveBindingsState(props: NodesProps): BindingState {
  const config = props.configForm;
  const nodes = resolveExecNodes(props.nodes);
  const { defaultBinding, agents } = resolveAgentBindings(config);
  const ready = Boolean(config);
  const disabled = props.configSaving || props.configFormMode === "raw";
  return {
    ready,
    disabled,
    configDirty: props.configDirty,
    configLoading: props.configLoading,
    configSaving: props.configSaving,
    defaultBinding,
    agents,
    nodes,
    onBindDefault: props.onBindDefault,
    onBindAgent: props.onBindAgent,
    onSave: props.onSaveBindings,
    onLoadConfig: props.onLoadConfig,
    formMode: props.configFormMode,
  };
}

function normalizeSecurity(value?: string): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") return value;
  return "deny";
}

function normalizeAsk(value?: string): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") return value;
  return "on-miss";
}

function resolveExecApprovalsDefaults(
  form: ExecApprovalsFile | null,
): ExecApprovalsResolvedDefaults {
  const defaults = form?.defaults ?? {};
  return {
    security: normalizeSecurity(defaults.security),
    ask: normalizeAsk(defaults.ask),
    askFallback: normalizeSecurity(defaults.askFallback ?? "deny"),
    autoAllowSkills: Boolean(defaults.autoAllowSkills ?? false),
  };
}

function resolveConfigAgents(config: Record<string, unknown> | null): ExecApprovalsAgentOption[] {
  const agentsNode = (config?.agents ?? {}) as Record<string, unknown>;
  const list = Array.isArray(agentsNode.list) ? agentsNode.list : [];
  const agents: ExecApprovalsAgentOption[] = [];
  list.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) return;
    const name = typeof record.name === "string" ? record.name.trim() : undefined;
    const isDefault = record.default === true;
    agents.push({ id, name: name || undefined, isDefault });
  });
  return agents;
}

function resolveExecApprovalsAgents(
  config: Record<string, unknown> | null,
  form: ExecApprovalsFile | null,
): ExecApprovalsAgentOption[] {
  const configAgents = resolveConfigAgents(config);
  const approvalsAgents = Object.keys(form?.agents ?? {});
  const merged = new Map<string, ExecApprovalsAgentOption>();
  configAgents.forEach((agent) => merged.set(agent.id, agent));
  approvalsAgents.forEach((id) => {
    if (merged.has(id)) return;
    merged.set(id, { id });
  });
  const agents = Array.from(merged.values());
  if (agents.length === 0) {
    agents.push({ id: "main", isDefault: true });
  }
  agents.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    const aLabel = a.name?.trim() ? a.name : a.id;
    const bLabel = b.name?.trim() ? b.name : b.id;
    return aLabel.localeCompare(bLabel);
  });
  return agents;
}

function resolveExecApprovalsScope(
  selected: string | null,
  agents: ExecApprovalsAgentOption[],
): string {
  if (selected === EXEC_APPROVALS_DEFAULT_SCOPE) return EXEC_APPROVALS_DEFAULT_SCOPE;
  if (selected && agents.some((agent) => agent.id === selected)) return selected;
  return EXEC_APPROVALS_DEFAULT_SCOPE;
}

function resolveExecApprovalsState(props: NodesProps): ExecApprovalsState {
  const form = props.execApprovalsForm ?? props.execApprovalsSnapshot?.file ?? null;
  const ready = Boolean(form);
  const defaults = resolveExecApprovalsDefaults(form);
  const agents = resolveExecApprovalsAgents(props.configForm, form);
  const targetNodes = resolveExecApprovalsNodes(props.nodes);
  const target = props.execApprovalsTarget;
  let targetNodeId =
    target === "node" && props.execApprovalsTargetNodeId ? props.execApprovalsTargetNodeId : null;
  if (target === "node" && targetNodeId && !targetNodes.some((node) => node.id === targetNodeId)) {
    targetNodeId = null;
  }
  const selectedScope = resolveExecApprovalsScope(props.execApprovalsSelectedAgent, agents);
  const selectedAgent =
    selectedScope !== EXEC_APPROVALS_DEFAULT_SCOPE
      ? (((form?.agents ?? {})[selectedScope] as Record<string, unknown> | undefined) ?? null)
      : null;
  const allowlist = Array.isArray((selectedAgent as { allowlist?: unknown })?.allowlist)
    ? ((selectedAgent as { allowlist?: ExecApprovalsAllowlistEntry[] }).allowlist ?? [])
    : [];
  return {
    ready,
    disabled: props.execApprovalsSaving || props.execApprovalsLoading,
    dirty: props.execApprovalsDirty,
    loading: props.execApprovalsLoading,
    saving: props.execApprovalsSaving,
    form,
    defaults,
    selectedScope,
    selectedAgent,
    agents,
    allowlist,
    target,
    targetNodeId,
    targetNodes,
    onSelectScope: props.onExecApprovalsSelectAgent,
    onSelectTarget: props.onExecApprovalsTargetChange,
    onPatch: props.onExecApprovalsPatch,
    onRemove: props.onExecApprovalsRemove,
    onLoad: props.onLoadExecApprovals,
    onSave: props.onSaveExecApprovals,
  };
}

function renderBindings(state: BindingState) {
  const supportsBinding = state.nodes.length > 0;
  const defaultValue = state.defaultBinding ?? "";
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="card-title">Exec node binding</div>
          <div class="card-sub">
            Pin agents to a specific node when using <span class="mono">exec host=node</span>.
          </div>
        </div>
        <button
          class="btn"
          ?disabled=${state.disabled || !state.configDirty}
          @click=${state.onSave}
        >
          ${state.configSaving ? "Saving…" : "Save"}
        </button>
      </div>

      ${
        state.formMode === "raw"
          ? html`
              <div class="callout warn" style="margin-top: 12px">
                Switch the Config tab to <strong>Form</strong> mode to edit bindings here.
              </div>
            `
          : nothing
      }

      ${
        !state.ready
          ? html`<div class="row" style="margin-top: 12px; gap: 12px;">
            <div class="muted">Load config to edit bindings.</div>
            <button class="btn" ?disabled=${state.configLoading} @click=${state.onLoadConfig}>
              ${state.configLoading ? "Loading…" : "Load config"}
            </button>
          </div>`
          : html`
            <div class="list" style="margin-top: 16px;">
              <div class="list-item">
                <div class="list-main">
                  <div class="list-title">Default binding</div>
                  <div class="list-sub">Used when agents do not override a node binding.</div>
                </div>
                <div class="list-meta">
                  <label class="field">
                    <span>Node</span>
                    <select
                      ?disabled=${state.disabled || !supportsBinding}
                      @change=${(event: Event) => {
                        const target = event.target as HTMLSelectElement;
                        const value = target.value.trim();
                        state.onBindDefault(value ? value : null);
                      }}
                    >
                      <option value="" ?selected=${defaultValue === ""}>Any node</option>
                      ${state.nodes.map(
                        (node) =>
                          html`<option
                            value=${node.id}
                            ?selected=${defaultValue === node.id}
                          >
                            ${node.label}
                          </option>`,
                      )}
                    </select>
                  </label>
                  ${
                    !supportsBinding
                      ? html`
                          <div class="muted">No nodes with system.run available.</div>
                        `
                      : nothing
                  }
                </div>
              </div>

              ${
                state.agents.length === 0
                  ? html`
                      <div class="muted">No agents found.</div>
                    `
                  : state.agents.map((agent) => renderAgentBinding(agent, state))
              }
            </div>
          `
      }
    </section>
  `;
}

function renderExecApprovals(state: ExecApprovalsState) {
  const ready = state.ready;
  const targetReady = state.target !== "node" || Boolean(state.targetNodeId);
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="card-title">Exec approvals</div>
          <div class="card-sub">
            Allowlist and approval policy for <span class="mono">exec host=gateway/node</span>.
          </div>
        </div>
        <button
          class="btn"
          ?disabled=${state.disabled || !state.dirty || !targetReady}
          @click=${state.onSave}
        >
          ${state.saving ? "Saving…" : "Save"}
        </button>
      </div>

      ${renderExecApprovalsTarget(state)}

      ${
        !ready
          ? html`<div class="row" style="margin-top: 12px; gap: 12px;">
            <div class="muted">Load exec approvals to edit allowlists.</div>
            <button class="btn" ?disabled=${state.loading || !targetReady} @click=${state.onLoad}>
              ${state.loading ? "Loading…" : "Load approvals"}
            </button>
          </div>`
          : html`
            ${renderExecApprovalsTabs(state)}
            ${renderExecApprovalsPolicy(state)}
            ${
              state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE
                ? nothing
                : renderExecApprovalsAllowlist(state)
            }
          `
      }
    </section>
  `;
}

function renderExecApprovalsTarget(state: ExecApprovalsState) {
  const hasNodes = state.targetNodes.length > 0;
  const nodeValue = state.targetNodeId ?? "";
  return html`
    <div class="list" style="margin-top: 12px;">
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">Target</div>
          <div class="list-sub">
            Gateway edits local approvals; node edits the selected node.
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>Host</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (value === "node") {
                  const first = state.targetNodes[0]?.id ?? null;
                  state.onSelectTarget("node", nodeValue || first);
                } else {
                  state.onSelectTarget("gateway", null);
                }
              }}
            >
              <option value="gateway" ?selected=${state.target === "gateway"}>Gateway</option>
              <option value="node" ?selected=${state.target === "node"}>Node</option>
            </select>
          </label>
          ${
            state.target === "node"
              ? html`
                <label class="field">
                  <span>Node</span>
                  <select
                    ?disabled=${state.disabled || !hasNodes}
                    @change=${(event: Event) => {
                      const target = event.target as HTMLSelectElement;
                      const value = target.value.trim();
                      state.onSelectTarget("node", value ? value : null);
                    }}
                  >
                    <option value="" ?selected=${nodeValue === ""}>Select node</option>
                    ${state.targetNodes.map(
                      (node) =>
                        html`<option
                          value=${node.id}
                          ?selected=${nodeValue === node.id}
                        >
                          ${node.label}
                        </option>`,
                    )}
                  </select>
                </label>
              `
              : nothing
          }
        </div>
      </div>
      ${
        state.target === "node" && !hasNodes
          ? html`
              <div class="muted">No nodes advertise exec approvals yet.</div>
            `
          : nothing
      }
    </div>
  `;
}

function renderExecApprovalsTabs(state: ExecApprovalsState) {
  return html`
    <div class="row" style="margin-top: 12px; gap: 8px; flex-wrap: wrap;">
      <span class="label">Scope</span>
      <div class="row" style="gap: 8px; flex-wrap: wrap;">
        <button
          class="btn btn--sm ${state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE ? "active" : ""}"
          @click=${() => state.onSelectScope(EXEC_APPROVALS_DEFAULT_SCOPE)}
        >
          Defaults
        </button>
        ${state.agents.map((agent) => {
          const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
          return html`
            <button
              class="btn btn--sm ${state.selectedScope === agent.id ? "active" : ""}"
              @click=${() => state.onSelectScope(agent.id)}
            >
              ${label}
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

function renderExecApprovalsPolicy(state: ExecApprovalsState) {
  const isDefaults = state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE;
  const defaults = state.defaults;
  const agent = state.selectedAgent ?? {};
  const basePath = isDefaults ? ["defaults"] : ["agents", state.selectedScope];
  const agentSecurity = typeof agent.security === "string" ? agent.security : undefined;
  const agentAsk = typeof agent.ask === "string" ? agent.ask : undefined;
  const agentAskFallback = typeof agent.askFallback === "string" ? agent.askFallback : undefined;
  const securityValue = isDefaults ? defaults.security : (agentSecurity ?? "__default__");
  const askValue = isDefaults ? defaults.ask : (agentAsk ?? "__default__");
  const askFallbackValue = isDefaults ? defaults.askFallback : (agentAskFallback ?? "__default__");
  const autoOverride =
    typeof agent.autoAllowSkills === "boolean" ? agent.autoAllowSkills : undefined;
  const autoEffective = autoOverride ?? defaults.autoAllowSkills;
  const autoIsDefault = autoOverride == null;

  return html`
    <div class="list" style="margin-top: 16px;">
      <div class="list-item">
        <div class="list-main">
          <div class="list-title">Security</div>
          <div class="list-sub">
            ${isDefaults ? "Default security mode." : `Default: ${defaults.security}.`}
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>Mode</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "security"]);
                } else {
                  state.onPatch([...basePath, "security"], value);
                }
              }}
            >
              ${
                !isDefaults
                  ? html`<option value="__default__" ?selected=${securityValue === "__default__"}>
                    Use default (${defaults.security})
                  </option>`
                  : nothing
              }
              ${SECURITY_OPTIONS.map(
                (option) =>
                  html`<option
                    value=${option.value}
                    ?selected=${securityValue === option.value}
                  >
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">Ask</div>
          <div class="list-sub">
            ${isDefaults ? "Default prompt policy." : `Default: ${defaults.ask}.`}
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>Mode</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "ask"]);
                } else {
                  state.onPatch([...basePath, "ask"], value);
                }
              }}
            >
              ${
                !isDefaults
                  ? html`<option value="__default__" ?selected=${askValue === "__default__"}>
                    Use default (${defaults.ask})
                  </option>`
                  : nothing
              }
              ${ASK_OPTIONS.map(
                (option) =>
                  html`<option
                    value=${option.value}
                    ?selected=${askValue === option.value}
                  >
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">Ask fallback</div>
          <div class="list-sub">
            ${
              isDefaults
                ? "Applied when the UI prompt is unavailable."
                : `Default: ${defaults.askFallback}.`
            }
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>Fallback</span>
            <select
              ?disabled=${state.disabled}
              @change=${(event: Event) => {
                const target = event.target as HTMLSelectElement;
                const value = target.value;
                if (!isDefaults && value === "__default__") {
                  state.onRemove([...basePath, "askFallback"]);
                } else {
                  state.onPatch([...basePath, "askFallback"], value);
                }
              }}
            >
              ${
                !isDefaults
                  ? html`<option value="__default__" ?selected=${askFallbackValue === "__default__"}>
                    Use default (${defaults.askFallback})
                  </option>`
                  : nothing
              }
              ${SECURITY_OPTIONS.map(
                (option) =>
                  html`<option
                    value=${option.value}
                    ?selected=${askFallbackValue === option.value}
                  >
                    ${option.label}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </div>

      <div class="list-item">
        <div class="list-main">
          <div class="list-title">Auto-allow skill CLIs</div>
          <div class="list-sub">
            ${
              isDefaults
                ? "Allow skill executables listed by the Gateway."
                : autoIsDefault
                  ? `Using default (${defaults.autoAllowSkills ? "on" : "off"}).`
                  : `Override (${autoEffective ? "on" : "off"}).`
            }
          </div>
        </div>
        <div class="list-meta">
          <label class="field">
            <span>Enabled</span>
            <input
              type="checkbox"
              ?disabled=${state.disabled}
              .checked=${autoEffective}
              @change=${(event: Event) => {
                const target = event.target as HTMLInputElement;
                state.onPatch([...basePath, "autoAllowSkills"], target.checked);
              }}
            />
          </label>
          ${
            !isDefaults && !autoIsDefault
              ? html`<button
                class="btn btn--sm"
                ?disabled=${state.disabled}
                @click=${() => state.onRemove([...basePath, "autoAllowSkills"])}
              >
                Use default
              </button>`
              : nothing
          }
        </div>
      </div>
    </div>
  `;
}

function renderExecApprovalsAllowlist(state: ExecApprovalsState) {
  const allowlistPath = ["agents", state.selectedScope, "allowlist"];
  const entries = state.allowlist;
  return html`
    <div class="row" style="margin-top: 18px; justify-content: space-between;">
      <div>
        <div class="card-title">Allowlist</div>
        <div class="card-sub">Case-insensitive glob patterns.</div>
      </div>
      <button
        class="btn btn--sm"
        ?disabled=${state.disabled}
        @click=${() => {
          const next = [...entries, { pattern: "" }];
          state.onPatch(allowlistPath, next);
        }}
      >
        Add pattern
      </button>
    </div>
    <div class="list" style="margin-top: 12px;">
      ${
        entries.length === 0
          ? html`
              <div class="muted">No allowlist entries yet.</div>
            `
          : entries.map((entry, index) => renderAllowlistEntry(state, entry, index))
      }
    </div>
  `;
}

function renderAllowlistEntry(
  state: ExecApprovalsState,
  entry: ExecApprovalsAllowlistEntry,
  index: number,
) {
  const lastUsed = entry.lastUsedAt ? formatAgo(entry.lastUsedAt) : "never";
  const lastCommand = entry.lastUsedCommand ? clampText(entry.lastUsedCommand, 120) : null;
  const lastPath = entry.lastResolvedPath ? clampText(entry.lastResolvedPath, 120) : null;
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${entry.pattern?.trim() ? entry.pattern : "New pattern"}</div>
        <div class="list-sub">Last used: ${lastUsed}</div>
        ${lastCommand ? html`<div class="list-sub mono">${lastCommand}</div>` : nothing}
        ${lastPath ? html`<div class="list-sub mono">${lastPath}</div>` : nothing}
      </div>
      <div class="list-meta">
        <label class="field">
          <span>Pattern</span>
          <input
            type="text"
            .value=${entry.pattern ?? ""}
            ?disabled=${state.disabled}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              state.onPatch(
                ["agents", state.selectedScope, "allowlist", index, "pattern"],
                target.value,
              );
            }}
          />
        </label>
        <button
          class="btn btn--sm danger"
          ?disabled=${state.disabled}
          @click=${() => {
            if (state.allowlist.length <= 1) {
              state.onRemove(["agents", state.selectedScope, "allowlist"]);
              return;
            }
            state.onRemove(["agents", state.selectedScope, "allowlist", index]);
          }}
        >
          Remove
        </button>
      </div>
    </div>
  `;
}

function renderAgentBinding(agent: BindingAgent, state: BindingState) {
  const bindingValue = agent.binding ?? "__default__";
  const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
  const supportsBinding = state.nodes.length > 0;
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${label}</div>
        <div class="list-sub">
          ${agent.isDefault ? "default agent" : "agent"} ·
          ${
            bindingValue === "__default__"
              ? `uses default (${state.defaultBinding ?? "any"})`
              : `override: ${agent.binding}`
          }
        </div>
      </div>
      <div class="list-meta">
        <label class="field">
          <span>Binding</span>
          <select
            ?disabled=${state.disabled || !supportsBinding}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              const value = target.value.trim();
              state.onBindAgent(agent.index, value === "__default__" ? null : value);
            }}
          >
            <option value="__default__" ?selected=${bindingValue === "__default__"}>
              Use default
            </option>
            ${state.nodes.map(
              (node) =>
                html`<option
                  value=${node.id}
                  ?selected=${bindingValue === node.id}
                >
                  ${node.label}
                </option>`,
            )}
          </select>
        </label>
      </div>
    </div>
  `;
}

function resolveExecNodes(nodes: Array<Record<string, unknown>>): BindingNode[] {
  const list: BindingNode[] = [];
  for (const node of nodes) {
    const commands = Array.isArray(node.commands) ? node.commands : [];
    const supports = commands.some((cmd) => String(cmd) === "system.run");
    if (!supports) continue;
    const nodeId = typeof node.nodeId === "string" ? node.nodeId.trim() : "";
    if (!nodeId) continue;
    const displayName =
      typeof node.displayName === "string" && node.displayName.trim()
        ? node.displayName.trim()
        : nodeId;
    list.push({
      id: nodeId,
      label: displayName === nodeId ? nodeId : `${displayName} · ${nodeId}`,
    });
  }
  list.sort((a, b) => a.label.localeCompare(b.label));
  return list;
}

function resolveExecApprovalsNodes(
  nodes: Array<Record<string, unknown>>,
): ExecApprovalsTargetNode[] {
  const list: ExecApprovalsTargetNode[] = [];
  for (const node of nodes) {
    const commands = Array.isArray(node.commands) ? node.commands : [];
    const supports = commands.some(
      (cmd) =>
        String(cmd) === "system.execApprovals.get" || String(cmd) === "system.execApprovals.set",
    );
    if (!supports) continue;
    const nodeId = typeof node.nodeId === "string" ? node.nodeId.trim() : "";
    if (!nodeId) continue;
    const displayName =
      typeof node.displayName === "string" && node.displayName.trim()
        ? node.displayName.trim()
        : nodeId;
    list.push({
      id: nodeId,
      label: displayName === nodeId ? nodeId : `${displayName} · ${nodeId}`,
    });
  }
  list.sort((a, b) => a.label.localeCompare(b.label));
  return list;
}

function resolveAgentBindings(config: Record<string, unknown> | null): {
  defaultBinding?: string | null;
  agents: BindingAgent[];
} {
  const fallbackAgent: BindingAgent = {
    id: "main",
    name: undefined,
    index: 0,
    isDefault: true,
    binding: null,
  };
  if (!config || typeof config !== "object") {
    return { defaultBinding: null, agents: [fallbackAgent] };
  }
  const tools = (config.tools ?? {}) as Record<string, unknown>;
  const exec = (tools.exec ?? {}) as Record<string, unknown>;
  const defaultBinding =
    typeof exec.node === "string" && exec.node.trim() ? exec.node.trim() : null;

  const agentsNode = (config.agents ?? {}) as Record<string, unknown>;
  const list = Array.isArray(agentsNode.list) ? agentsNode.list : [];
  if (list.length === 0) {
    return { defaultBinding, agents: [fallbackAgent] };
  }

  const agents: BindingAgent[] = [];
  list.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) return;
    const name = typeof record.name === "string" ? record.name.trim() : undefined;
    const isDefault = record.default === true;
    const toolsEntry = (record.tools ?? {}) as Record<string, unknown>;
    const execEntry = (toolsEntry.exec ?? {}) as Record<string, unknown>;
    const binding =
      typeof execEntry.node === "string" && execEntry.node.trim() ? execEntry.node.trim() : null;
    agents.push({
      id,
      name: name || undefined,
      index,
      isDefault,
      binding,
    });
  });

  if (agents.length === 0) {
    agents.push(fallbackAgent);
  }

  return { defaultBinding, agents };
}

function renderNode(node: Record<string, unknown>) {
  const connected = Boolean(node.connected);
  const paired = Boolean(node.paired);
  const title =
    (typeof node.displayName === "string" && node.displayName.trim()) ||
    (typeof node.nodeId === "string" ? node.nodeId : "unknown");
  const caps = Array.isArray(node.caps) ? (node.caps as unknown[]) : [];
  const commands = Array.isArray(node.commands) ? (node.commands as unknown[]) : [];
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${title}</div>
        <div class="list-sub">
          ${typeof node.nodeId === "string" ? node.nodeId : ""}
          ${typeof node.remoteIp === "string" ? ` · ${node.remoteIp}` : ""}
          ${typeof node.version === "string" ? ` · ${node.version}` : ""}
        </div>
        <div class="chip-row" style="margin-top: 6px;">
          <span class="chip">${paired ? "paired" : "unpaired"}</span>
          <span class="chip ${connected ? "chip-ok" : "chip-warn"}">
            ${connected ? "connected" : "offline"}
          </span>
          ${caps.slice(0, 12).map((c) => html`<span class="chip">${String(c)}</span>`)}
          ${commands.slice(0, 8).map((c) => html`<span class="chip">${String(c)}</span>`)}
        </div>
      </div>
    </div>
  `;
}
