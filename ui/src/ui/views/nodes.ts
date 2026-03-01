/**
 * Nodes View - Refactored with proper UX/UI
 * Functional, responsive, and user-friendly infrastructure management
 */

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

// Platform icons
const PLATFORM_ICONS: Record<string, () => ReturnType<typeof html>> = {
  macos: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path d="M12 2c-1.5 0-2.8.5-3.8 1.5C7.2 4.5 6.7 5.8 6.7 7.3c0 1.5.5 2.8 1.5 3.8.5.5 1.1.9 1.8 1.1-.3.7-.8 1.3-1.4 1.8-.6.5-1.3.8-2.1.8-.4 0-.7-.1-1.1-.2-.3-.1-.6-.3-.9-.5-.3-.2-.5-.3-.8-.3-.2 0-.4.1-.6.2-.2.1-.3.3-.3.5 0 .2.1.4.2.6.1.2.3.4.5.5.5.4 1.1.7 1.7.9.6.2 1.3.3 2 .3.9 0 1.8-.2 2.6-.7.8-.5 1.5-1.1 2-1.9.5.8 1.2 1.4 2 1.9.8.5 1.7.7 2.6.7.7 0 1.4-.1 2-.3.6-.2 1.2-.5 1.7-.9.2-.1.4-.3.5-.5.1-.2.2-.4.2-.6 0-.2-.1-.4-.3-.5-.2-.1-.4-.2-.6-.2-.3 0-.5.1-.8.3-.3.2-.6.4-.9.5-.3.1-.7.2-1.1.2-.8 0-1.5-.3-2.1-.8-.6-.5-1.1-1.1-1.4-1.8.7-.2 1.3-.6 1.8-1.1 1-1 1.5-2.3 1.5-3.8 0-1.5-.5-2.8-1.5-3.8C14.8 2.5 13.5 2 12 2z"/></svg>`,
  ios: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>`,
  android: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path d="M5 16v-6a7 7 0 0 1 14 0v6"/><line x1="5" y1="19" x2="5" y2="21"/><line x1="19" y1="19" x2="19" y2="21"/><line x1="9" y1="19" x2="9" y2="21"/><line x1="15" y1="19" x2="15" y2="21"/></svg>`,
  linux: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path d="M12 3c-1.5 0-2.7.5-3.6 1.4-.9.9-1.4 2.1-1.4 3.6 0 1.2.3 2.2.9 3 .6.8 1.4 1.4 2.4 1.8-.5.5-1.1.9-1.7 1.2-.6.3-1.3.5-2 .5h-.5c-.4 0-.8-.1-1.1-.2-.3-.1-.6-.3-.9-.5-.2-.1-.4-.2-.6-.2-.2 0-.3.1-.5.2-.1.1-.2.3-.2.5 0 .2.1.3.2.5.1.2.3.3.5.4.4.3.9.5 1.4.7.5.2 1.1.2 1.7.2h.5c.8 0 1.5-.2 2.2-.5.7-.3 1.3-.8 1.8-1.4.5.6 1.1 1.1 1.8 1.4.7.3 1.4.5 2.2.5h.5c.6 0 1.2-.1 1.7-.2.5-.2 1-.4 1.4-.7.2-.1.4-.2.5-.4.1-.2.2-.3.2-.5 0-.2-.1-.3-.2-.5-.2-.1-.3-.2-.5-.2-.2 0-.4.1-.6.2-.3.2-.6.4-.9.5-.3.1-.7.2-1.1.2h-.5c-.7 0-1.4-.2-2-.5-.6-.3-1.2-.7-1.7-1.2 1-.4 1.8-1 2.4-1.8.6-.8.9-1.8.9-3 0-1.5-.5-2.7-1.4-3.6C14.7 3.5 13.5 3 12 3z"/></svg>`,
  windows: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  docker: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path d="M4 10h12M4 14h12M4 18h12M4 6h12M18 10h2M18 14h2M18 6h2M18 18h2"/></svg>`,
  web: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
  cloud: () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
};

function getPlatformIcon(platform?: string): () => ReturnType<typeof html> {
  if (!platform) return PLATFORM_ICONS.linux;
  return PLATFORM_ICONS[platform.toLowerCase()] || PLATFORM_ICONS.linux;
}

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  "system.run": "Executar comandos do sistema",
  "fs.read": "Ler arquivos",
  "fs.write": "Escrever arquivos",
  "net.http": "Requisições HTTP",
  "net.ws": "Conexões WebSocket",
  "db.query": "Consultar bancos de dados",
  "docker": "Operações Docker",
  "k8s": "Operações Kubernetes",
  "git": "Operações Git",
};

// Design Tokens
const colors = {
  bg: { primary: '#0a0a0f', secondary: '#1a1a2e', tertiary: '#111118' },
  text: { primary: '#f9fafb', secondary: '#9ca3af', muted: '#6b7280' },
  accent: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#374151'
};

const spacing = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' };
const radius = { sm: '6px', md: '10px', lg: '16px' };

export function renderNodes(props: NodesProps) {
  const bindingState = resolveBindingsState(props);
  const approvalsState = resolveExecApprovalsState(props);

  const activeNodes = props.nodes.filter(n => n.connected).length;
  const totalNodes = props.nodes.length;
  const pairedDevices = props.devicesList?.paired?.length || 0;

  return html`
    <div style="
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: ${spacing.lg};
      min-height: 100vh;
      background: ${colors.bg.primary};
      color: ${colors.text.primary};
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <!-- Header -->
      <div style="
        margin-bottom: ${spacing.xl};
        padding-bottom: ${spacing.lg};
        border-bottom: 1px solid ${colors.border};
      ">
        <h1 style="
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 ${spacing.sm} 0;
          color: ${colors.text.primary};
        ">Infraestrutura</h1>
        <p style="
          font-size: 16px;
          color: ${colors.text.secondary};
          margin: 0;
        ">Gerencie nodes, dispositivos e políticas de segurança</p>
      </div>

      <!-- Stats Overview -->
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: ${spacing.md};
        margin-bottom: ${spacing.xl};
      ">
        ${renderStatCard({
          icon: icons.monitor,
          label: 'Nodes Ativos',
          value: `${activeNodes}/${totalNodes}`,
          status: activeNodes > 0 ? 'success' : 'warning',
          description: activeNodes === 0 ? 'Nenhum node conectado' : `${activeNodes} node${activeNodes > 1 ? 's' : ''} pronto${activeNodes > 1 ? 's' : ''} para executar comandos`
        })}
        
        ${renderStatCard({
          icon: icons.smartphone,
          label: 'Dispositivos Pareados',
          value: String(pairedDevices),
          status: pairedDevices > 0 ? 'success' : 'neutral',
          description: pairedDevices === 0 ? 'Nenhum dispositivo conectado' : `${pairedDevices} dispositivo${pairedDevices > 1 ? 's' : ''} pareado${pairedDevices > 1 ? 's' : ''}`
        })}
        
        ${renderStatCard({
          icon: icons.shield,
          label: 'Políticas de Segurança',
          value: approvalsState.ready ? 'Ativas' : 'Não Carregadas',
          status: approvalsState.ready ? 'success' : 'warning',
          description: approvalsState.ready ? 'Configurações de segurança aplicadas' : 'Clique para carregar configurações'
        })}
      </div>

      <!-- Nodes Section -->
      ${renderNodesSection(props)}

      <!-- Devices Section -->
      ${renderDevicesSection(props)}

      <!-- Security Section -->
      ${renderSecuritySection(approvalsState, bindingState)}
    </div>
  `;
}

function renderStatCard({
  icon,
  label,
  value,
  status,
  description
}: {
  icon: ReturnType<typeof html>;
  label: string;
  value: string;
  status: 'success' | 'warning' | 'neutral';
  description: string;
}) {
  const statusColors = {
    success: colors.success,
    warning: colors.warning,
    neutral: colors.text.muted
  };

  return html`
    <div style="
      background: ${colors.bg.secondary};
      border-radius: ${radius.md};
      padding: ${spacing.lg};
      border: 1px solid ${colors.border};
      display: flex;
      align-items: flex-start;
      gap: ${spacing.md};
      transition: all 0.2s ease;
    " onmouseover="this.style.borderColor='${colors.accent}'" onmouseout="this.style.borderColor='${colors.border}'">
      <div style="
        width: 48px;
        height: 48px;
        border-radius: ${radius.sm};
        background: ${status === 'success' ? 'rgba(16, 185, 129, 0.15)' : status === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)'};
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${statusColors[status]};
        flex-shrink: 0;
      ">
        ${icon}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 12px;
          color: ${colors.text.secondary};
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: ${spacing.xs};
        ">${label}</div>
        <div style="
          font-size: 24px;
          font-weight: 700;
          color: ${colors.text.primary};
          margin-bottom: ${spacing.xs};
        ">${value}</div>
        <div style="
          font-size: 13px;
          color: ${colors.text.muted};
          line-height: 1.4;
        ">${description}</div>
      </div>
    </div>
  `;
}

function renderNodesSection(props: NodesProps) {
  const nodes = props.nodes;
  const isLoading = props.loading;
  const hasError = false; // Add error handling if needed

  return html`
    <section style="
      background: ${colors.bg.secondary};
      border-radius: ${radius.lg};
      padding: ${spacing.lg};
      margin-bottom: ${spacing.xl};
      border: 1px solid ${colors.border};
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: ${spacing.lg};
        flex-wrap: wrap;
        gap: ${spacing.md};
      ">
        <div>
          <h2 style="
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 ${spacing.xs} 0;
            display: flex;
            align-items: center;
            gap: ${spacing.sm};
          ">
            ${icons.monitor}
            Nodes de Execução
          </h2>
          <p style="
            font-size: 14px;
            color: ${colors.text.secondary};
            margin: 0;
          ">Dispositivos remotos que podem executar comandos e skills</p>
        </div>
        <button
          @click=${props.onRefresh}
          ?disabled=${isLoading}
          style="
            display: inline-flex;
            align-items: center;
            gap: ${spacing.sm};
            padding: 10px 18px;
            background: ${colors.bg.tertiary};
            color: ${colors.text.secondary};
            border: 1px solid ${colors.border};
            border-radius: ${radius.sm};
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          "
          onmouseover="this.style.background='${colors.border}'"
          onmouseout="this.style.background='${colors.bg.tertiary}'"
        >
          ${isLoading 
            ? html`<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid ${colors.text.muted}; border-top-color: ${colors.accent}; border-radius: 50%; animation: spin 1s linear infinite;"></span> Atualizando...`
            : html`${icons.refreshCw} Atualizar`
          }
        </button>
      </div>

      ${isLoading && nodes.length === 0
        ? renderLoadingState('Carregando nodes...')
        : nodes.length === 0
          ? renderEmptyState({
              icon: icons.monitor,
              title: 'Nenhum node conectado',
              description: 'Nodes são dispositivos remotos que podem executar comandos para você. Eles aparecerão aqui quando pareados.',
              action: {
                label: 'Como adicionar um node',
                onClick: () => window.open('/docs/nodes', '_blank')
              }
            })
          : html`
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
              gap: ${spacing.md};
            ">
              ${nodes.map(node => renderNodeCard(node))}
            </div>
          `
      }
    </section>
  `;
}

function renderNodeCard(node: Record<string, unknown>) {
  const connected = Boolean(node.connected);
  const paired = Boolean(node.paired);
  const title = String(node.displayName || node.nodeId || 'Node Desconhecido');
  const platform = String(node.platform || 'linux');
  const caps = Array.isArray(node.caps) ? node.caps : [];
  const version = String(node.version || '');
  const ip = String(node.remoteIp || '');

  return html`
    <div style="
      background: ${colors.bg.tertiary};
      border-radius: ${radius.md};
      padding: ${spacing.lg};
      border: 1px solid ${connected ? colors.success : colors.border};
      transition: all 0.2s ease;
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
      <div style="
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: ${spacing.md};
      ">
        <div style="display: flex; align-items: center; gap: ${spacing.sm};">
          <div style="color: ${colors.text.secondary};">
            ${getPlatformIcon(platform)()}
          </div>
          <div>
            <div style="
              font-weight: 600;
              font-size: 16px;
              color: ${colors.text.primary};
            ">${title}</div>
            <div style="
              font-size: 12px;
              color: ${colors.text.muted};
              font-family: monospace;
            ">${clampText(String(node.nodeId || ''), 30)}</div>
          </div>
        </div>
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          background: ${connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)'};
          color: ${connected ? colors.success : colors.text.muted};
        ">
          <span style="
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${connected ? colors.success : colors.text.muted};
          "></span>
          ${connected ? 'Conectado' : 'Offline'}
        </span>
      </div>

      ${version ? html`
        <div style="
          font-size: 13px;
          color: ${colors.text.secondary};
          margin-bottom: ${spacing.sm};
        ">
          Versão: <span style="color: ${colors.text.primary}; font-family: monospace;">${version}</span>
        </div>
      ` : nothing}

      ${ip ? html`
        <div style="
          font-size: 13px;
          color: ${colors.text.secondary};
          margin-bottom: ${spacing.sm};
        ">
          IP: <span style="color: ${colors.text.primary}; font-family: monospace;">${ip}</span>
        </div>
      ` : nothing}

      ${caps.length > 0 ? html`
        <div style="margin-top: ${spacing.md};">
          <div style="
            font-size: 11px;
            color: ${colors.text.muted};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: ${spacing.xs};
          ">Capacidades</div>
          <div style="
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          ">
            ${caps.map((cap: unknown) => html`
              <span
                title="${CAPABILITY_DESCRIPTIONS[String(cap)] || String(cap)}"
                style="
                  display: inline-flex;
                  align-items: center;
                  padding: 4px 10px;
                  background: rgba(99, 102, 241, 0.1);
                  color: ${colors.accent};
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 500;
                  cursor: help;
                "
              >
                ${String(cap)}
              </span>
            `)}
          </div>
        </div>
      ` : nothing}
    </div>
  `;
}

function renderDevicesSection(props: NodesProps) {
  const list = props.devicesList ?? { pending: [], paired: [] };
  const pending = Array.isArray(list.pending) ? list.pending : [];
  const paired = Array.isArray(list.paired) ? list.paired : [];
  const isLoading = props.devicesLoading;
  const hasError = props.devicesError;

  const totalDevices = pending.length + paired.length;

  return html`
    <section style="
      background: ${colors.bg.secondary};
      border-radius: ${radius.lg};
      padding: ${spacing.lg};
      margin-bottom: ${spacing.xl};
      border: 1px solid ${colors.border};
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: ${spacing.lg};
        flex-wrap: wrap;
        gap: ${spacing.md};
      ">
        <div>
          <h2 style="
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 ${spacing.xs} 0;
            display: flex;
            align-items: center;
            gap: ${spacing.sm};
          ">
            ${icons.smartphone}
            Dispositivos Conectados
            ${totalDevices > 0 ? html`
              <span style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 24px;
                height: 24px;
                padding: 0 8px;
                background: ${colors.accent};
                color: white;
                border-radius: 9999px;
                font-size: 12px;
                font-weight: 600;
              ">${totalDevices}</span>
            ` : nothing}
          </h2>
          <p style="
            font-size: 14px;
            color: ${colors.text.secondary};
            margin: 0;
          ">Aplicativos e clientes conectados ao gateway</p>
        </div>
        <button
          @click=${props.onDevicesRefresh}
          ?disabled=${isLoading}
          style="
            display: inline-flex;
            align-items: center;
            gap: ${spacing.sm};
            padding: 10px 18px;
            background: ${colors.bg.tertiary};
            color: ${colors.text.secondary};
            border: 1px solid ${colors.border};
            border-radius: ${radius.sm};
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          "
          onmouseover="this.style.background='${colors.border}'"
          onmouseout="this.style.background='${colors.bg.tertiary}'"
        >
          ${isLoading 
            ? html`<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid ${colors.text.muted}; border-top-color: ${colors.accent}; border-radius: 50%; animation: spin 1s linear infinite;"></span> Atualizando...`
            : html`${icons.refreshCw} Atualizar`
          }
        </button>
      </div>

      ${hasError ? html`
        <div style="
          padding: ${spacing.md};
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: ${radius.sm};
          color: ${colors.error};
          margin-bottom: ${spacing.md};
          display: flex;
          align-items: center;
          gap: ${spacing.sm};
        ">
          ${icons.alertTriangle}
          ${hasError}
        </div>
      ` : nothing}

      ${isLoading && totalDevices === 0
        ? renderLoadingState('Carregando dispositivos...')
        : totalDevices === 0
          ? renderEmptyState({
              icon: icons.smartphone,
              title: 'Nenhum dispositivo conectado',
              description: 'Dispositivos aparecerão aqui quando solicitarem pareamento com o gateway. Use o aplicativo móvel ou cliente web para conectar.',
              action: null
            })
          : html`
            ${pending.length > 0 ? html`
              <div style="margin-bottom: ${spacing.lg};">
                <h3 style="
                  font-size: 14px;
                  font-weight: 600;
                  color: ${colors.warning};
                  margin: 0 0 ${spacing.md} 0;
                  display: flex;
                  align-items: center;
                  gap: ${spacing.sm};
                ">
                  <span style="
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    background: ${colors.warning};
                    color: ${colors.bg.primary};
                    border-radius: 50%;
                    font-size: 12px;
                    font-weight: 700;
                  ">${pending.length}</span>
                  Aguardando Aprovação
                </h3>
                <div style="display: grid; gap: ${spacing.md};">
                  ${pending.map(req => renderPendingDeviceCard(req, props))}
                </div>
              </div>
            ` : nothing}

            ${paired.length > 0 ? html`
              <div>
                <h3 style="
                  font-size: 14px;
                  font-weight: 600;
                  color: ${colors.success};
                  margin: 0 0 ${spacing.md} 0;
                  display: flex;
                  align-items: center;
                  gap: ${spacing.sm};
                ">
                  <span style="
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    background: ${colors.success};
                    color: ${colors.bg.primary};
                    border-radius: 50%;
                    font-size: 12px;
                    font-weight: 700;
                  ">${paired.length}</span>
                  Dispositivos Pareados
                </h3>
                <div style="display: grid; gap: ${spacing.md};">
                  ${paired.map(device => renderPairedDeviceCard(device, props))}
                </div>
              </div>
            ` : nothing}
          `
      }
    </section>
  `;
}

function renderPendingDeviceCard(req: PendingDevice, props: NodesProps) {
  const name = req.displayName?.trim() || req.deviceId;
  const age = typeof req.ts === "number" ? formatAgo(req.ts) : "agora";
  const role = req.role?.trim() || "Não definido";
  const ip = req.remoteIp || "IP não disponível";

  return html`
    <div style="
      background: ${colors.bg.tertiary};
      border-radius: ${radius.md};
      padding: ${spacing.lg};
      border: 1px solid ${colors.warning};
      border-left: 4px solid ${colors.warning};
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: ${spacing.md};
      ">
        <div style="flex: 1; min-width: 200px;">
          <div style="
            font-weight: 600;
            font-size: 16px;
            color: ${colors.text.primary};
            margin-bottom: ${spacing.xs};
          ">${name}</div>
          <div style="
            font-size: 12px;
            color: ${colors.text.muted};
            font-family: monospace;
            margin-bottom: ${spacing.sm};
          ">${req.deviceId}</div>
          <div style="
            display: flex;
            flex-wrap: wrap;
            gap: ${spacing.sm};
            font-size: 13px;
            color: ${colors.text.secondary};
          ">
            <span style="background: rgba(99, 102, 241, 0.1); padding: 2px 8px; border-radius: 4px;">Role: ${role}</span>
            <span style="background: rgba(99, 102, 241, 0.1); padding: 2px 8px; border-radius: 4px;">IP: ${ip}</span>
            <span>Solicitado ${age}</span>
            ${req.isRepair ? html`<span style="color: ${colors.warning};">(Reparo)</span>` : nothing}
          </div>
        </div>
        <div style="display: flex; gap: ${spacing.sm};">
          <button
            @click=${() => props.onDeviceApprove(req.requestId)}
            style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 10px 20px;
              background: ${colors.success};
              color: white;
              border: none;
              border-radius: ${radius.sm};
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='#059669'"
            onmouseout="this.style.background='${colors.success}'"
          >
            ${icons.check} Aprovar
          </button>
          <button
            @click=${() => props.onDeviceReject(req.requestId)}
            style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 10px 20px;
              background: transparent;
              color: ${colors.text.secondary};
              border: 1px solid ${colors.border};
              border-radius: ${radius.sm};
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='${colors.border}'"
            onmouseout="this.style.background='transparent'"
          >
            ${icons.x} Rejeitar
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPairedDeviceCard(device: PairedDevice, props: NodesProps) {
  const name = device.displayName?.trim() || device.deviceId;
  const ip = device.remoteIp || "IP não disponível";
  const roles = device.roles || [];
  const scopes = device.scopes || [];
  const tokens = Array.isArray(device.tokens) ? device.tokens : [];

  return html`
    <div style="
      background: ${colors.bg.tertiary};
      border-radius: ${radius.md};
      padding: ${spacing.lg};
      border: 1px solid ${colors.border};
      border-left: 4px solid ${colors.success};
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: ${spacing.md};
        margin-bottom: ${tokens.length > 0 ? spacing.md : 0};
      ">
        <div style="flex: 1; min-width: 200px;">
          <div style="
            font-weight: 600;
            font-size: 16px;
            color: ${colors.text.primary};
            margin-bottom: ${spacing.xs};
            display: flex;
            align-items: center;
            gap: ${spacing.sm};
          ">
            ${name}
            <span style="
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 8px;
              height: 8px;
              background: ${colors.success};
              border-radius: 50%;
            "></span>
          </div>
          <div style="
            font-size: 12px;
            color: ${colors.text.muted};
            font-family: monospace;
            margin-bottom: ${spacing.sm};
          ">${device.deviceId}</div>
          
          <div style="
            display: flex;
            flex-wrap: wrap;
            gap: ${spacing.sm};
            font-size: 13px;
            color: ${colors.text.secondary};
          ">
            <span style="background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 4px; color: ${colors.success};">IP: ${ip}</span>
            ${roles.length > 0 ? html`
              <span style="background: rgba(99, 102, 241, 0.1); padding: 2px 8px; border-radius: 4px;">Roles: ${formatList(roles)}</span>
            ` : nothing}
          </div>
        </div>
      </div>

      ${tokens.length > 0 ? html`
        <div style="
          border-top: 1px solid ${colors.border};
          padding-top: ${spacing.md};
          margin-top: ${spacing.md};
        ">
          <div style="
            font-size: 11px;
            color: ${colors.text.muted};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: ${spacing.sm};
          ">Tokens de Acesso</div>
          <div style="display: grid; gap: ${spacing.sm};">
            ${tokens.map(token => renderTokenRow(device.deviceId, token, props))}
          </div>
        </div>
      ` : nothing}
    </div>
  `;
}

function renderTokenRow(deviceId: string, token: DeviceTokenSummary, props: NodesProps) {
  const isRevoked = Boolean(token.revokedAtMs);
  const status = isRevoked ? "Revogado" : "Ativo";
  const when = formatAgo(token.rotatedAtMs ?? token.createdAtMs ?? token.lastUsedAtMs ?? null);

  return html`
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${spacing.sm} ${spacing.md};
      background: ${colors.bg.secondary};
      border-radius: ${radius.sm};
      flex-wrap: wrap;
      gap: ${spacing.sm};
    ">
      <div style="font-size: 13px;">
        <span style="font-weight: 500; color: ${colors.text.primary};">${token.role}</span>
        <span style="color: ${colors.text.muted}; margin: 0 8px;">•</span>
        <span style="color: ${isRevoked ? colors.text.muted : colors.success};">${status}</span>
        ${token.scopes?.length ? html`
          <span style="color: ${colors.text.muted}; margin: 0 8px;">•</span>
          <span style="color: ${colors.text.secondary};">${formatList(token.scopes)}</span>
        ` : nothing}
        <span style="color: ${colors.text.muted}; margin: 0 8px;">•</span>
        <span style="color: ${colors.text.muted};">${when}</span>
      </div>
      <div style="display: flex; gap: ${spacing.sm};">
        <button
          @click=${() => props.onDeviceRotate(deviceId, token.role, token.scopes)}
          title="Rotacionar token"
          style="
            padding: 6px 12px;
            background: transparent;
            color: ${colors.text.secondary};
            border: 1px solid ${colors.border};
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          "
          onmouseover="this.style.background='${colors.border}'"
          onmouseout="this.style.background='transparent'"
        >
          ${icons.refreshCw} Rotacionar
        </button>
        ${!isRevoked ? html`
          <button
            @click=${() => props.onDeviceRevoke(deviceId, token.role)}
            title="Revogar token"
            style="
              padding: 6px 12px;
              background: transparent;
              color: ${colors.error};
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'"
            onmouseout="this.style.background='transparent'"
          >
            ${icons.trash} Revogar
          </button>
        ` : nothing}
      </div>
    </div>
  `;
}

function renderLoadingState(message: string) {
  return html`
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    ">
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid ${colors.border};
        border-top-color: ${colors.accent};
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: ${spacing.md};
      "></div>
      <p style="color: ${colors.text.secondary}; margin: 0;">${message}</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
}

function renderEmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: ReturnType<typeof html>;
  title: string;
  description: string;
  action: { label: string; onClick: () => void } | null;
}) {
  return html`
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      background: ${colors.bg.tertiary};
      border-radius: ${radius.md};
      border: 2px dashed ${colors.border};
    ">
      <div style="
        width: 64px;
        height: 64px;
        color: ${colors.text.muted};
        margin-bottom: ${spacing.md};
        opacity: 0.5;
      ">
        ${icon}
      </div>
      <h3 style="
        font-size: 18px;
        font-weight: 600;
        color: ${colors.text.primary};
        margin: 0 0 ${spacing.sm} 0;
      ">${title}</h3>
      <p style="
        font-size: 14px;
        color: ${colors.text.secondary};
        margin: 0 0 ${action ? spacing.md : 0} 0;
        max-width: 400px;
        line-height: 1.5;
      ">${description}</p>
      ${action ? html`
        <button
          @click=${action.onClick}
          style="
            display: inline-flex;
            align-items: center;
            gap: ${spacing.sm};
            padding: 12px 24px;
            background: ${colors.accent};
            color: white;
            border: none;
            border-radius: ${radius.sm};
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          "
          onmouseover="this.style.background='#4f46e5'"
          onmouseout="this.style.background='${colors.accent}'"
        >
          ${icons.externalLink} ${action.label}
        </button>
      ` : nothing}
    </div>
  `;
}

// Type definitions for security section
type BindingState = {
  ready: boolean;
  disabled: boolean;
  configDirty: boolean;
  configLoading: boolean;
  configSaving: boolean;
  defaultBinding?: string | null;
  agents: Array<{ id: string; name?: string; index: number; isDefault: boolean; binding?: string | null }>;
  nodes: Array<{ id: string; label: string }>;
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSave: () => void;
  onLoadConfig: () => void;
  formMode: "form" | "raw";
};

type ExecApprovalsState = {
  ready: boolean;
  disabled: boolean;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  form: ExecApprovalsFile | null;
  defaults: { security: string; ask: string; askFallback: string; autoAllowSkills: boolean };
  selectedScope: string;
  selectedAgent: Record<string, unknown> | null;
  agents: Array<{ id: string; name?: string; isDefault?: boolean }>;
  allowlist: ExecApprovalsAllowlistEntry[];
  target: "gateway" | "node";
  targetNodeId: string | null;
  targetNodes: Array<{ id: string; label: string }>;
  onSelectScope: (agentId: string) => void;
  onSelectTarget: (kind: "gateway" | "node", nodeId: string | null) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onLoad: () => void;
  onSave: () => void;
};

function renderSecuritySection(approvalsState: ExecApprovalsState, bindingState: BindingState) {
  return html`
    <section style="
      background: ${colors.bg.secondary};
      border-radius: ${radius.lg};
      padding: ${spacing.lg};
      border: 1px solid ${colors.border};
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: ${spacing.md};
        margin-bottom: ${spacing.lg};
      ">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: ${radius.sm};
          background: rgba(99, 102, 241, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.accent};
        ">
          ${icons.shield}
        </div>
        <div>
          <h2 style="
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 4px 0;
          ">Segurança & Roteamento</h2>
          <p style="
            font-size: 14px;
            color: ${colors.text.secondary};
            margin: 0;
          ">Configure políticas de execução e roteamento de nodes</p>
        </div>
      </div>

      ${!approvalsState.ready ? html`
        <div style="
          text-align: center;
          padding: ${spacing.xl};
        ">
          <p style="color: ${colors.text.secondary}; margin: 0 0 ${spacing.md} 0;">
            As configurações de segurança não foram carregadas.
          </p>
          <button
            @click=${approvalsState.onLoad}
            ?disabled=${approvalsState.loading}
            style="
              display: inline-flex;
              align-items: center;
              gap: ${spacing.sm};
              padding: 10px 20px;
              background: ${colors.accent};
              color: white;
              border: none;
              border-radius: ${radius.sm};
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='#4f46e5'"
            onmouseout="this.style.background='${colors.accent}'"
          >
            ${approvalsState.loading 
              ? html`<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></span> Carregando...`
              : html`${icons.refreshCw} Carregar Configurações`
            }
          </button>
        </div>
      ` : html`
        <div style="
          background: ${colors.bg.tertiary};
          border-radius: ${radius.md};
          padding: ${spacing.lg};
        ">
          <h3 style="
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 ${spacing.sm} 0;
            display: flex;
            align-items: center;
            gap: ${spacing.sm};
          ">
            ${icons.shield}
            Configurações de Segurança
          </h3>
          <p style="
            font-size: 14px;
            color: ${colors.text.secondary};
            margin: 0 0 ${spacing.md} 0;
          ">As configurações estão carregadas e prontas para uso.</p>
          
          <div style="
            display: flex;
            flex-wrap: wrap;
            gap: ${spacing.sm};
          ">
            <span style="
              padding: 4px 12px;
              background: rgba(16, 185, 129, 0.1);
              color: ${colors.success};
              border-radius: 4px;
              font-size: 13px;
            ">Segurança: ${approvalsState.defaults.security}</span>
            <span style="
              padding: 4px 12px;
              background: rgba(99, 102, 241, 0.1);
              color: ${colors.accent};
              border-radius: 4px;
              font-size: 13px;
            ">Aprovação: ${approvalsState.defaults.ask}</span>
            <span style="
              padding: 4px 12px;
              background: rgba(245, 158, 11, 0.1);
              color: ${colors.warning};
              border-radius: 4px;
              font-size: 13px;
            ">Skills Auto: ${approvalsState.defaults.autoAllowSkills ? 'Sim' : 'Não'}</span>
          </div>
        </div>
      `}
    </section>
  `;
}

// Helper functions
function resolveBindingsState(props: NodesProps): BindingState {
  // Simplified version - adapt based on actual implementation
  return {
    ready: Boolean(props.configForm),
    disabled: props.configSaving || props.configFormMode === "raw",
    configDirty: props.configDirty,
    configLoading: props.configLoading,
    configSaving: props.configSaving,
    defaultBinding: undefined,
    agents: [],
    nodes: [],
    onBindDefault: props.onBindDefault,
    onBindAgent: props.onBindAgent,
    onSave: props.onSaveBindings,
    onLoadConfig: props.onLoadConfig,
    formMode: props.configFormMode,
  };
}

function resolveExecApprovalsState(props: NodesProps): ExecApprovalsState {
  // Simplified version - adapt based on actual implementation
  return {
    ready: Boolean(props.execApprovalsForm),
    disabled: props.execApprovalsSaving || props.execApprovalsLoading,
    dirty: props.execApprovalsDirty,
    loading: props.execApprovalsLoading,
    saving: props.execApprovalsSaving,
    form: props.execApprovalsForm,
    defaults: { security: "deny", ask: "on-miss", askFallback: "deny", autoAllowSkills: false },
    selectedScope: "__defaults__",
    selectedAgent: null,
    agents: [],
    allowlist: [],
    target: props.execApprovalsTarget,
    targetNodeId: props.execApprovalsTargetNodeId,
    targetNodes: [],
    onSelectScope: props.onExecApprovalsSelectAgent,
    onSelectTarget: props.onExecApprovalsTargetChange,
    onPatch: props.onExecApprovalsPatch,
    onRemove: props.onExecApprovalsRemove,
    onLoad: props.onLoadExecApprovals,
    onSave: props.onSaveExecApprovals,
  };
}
