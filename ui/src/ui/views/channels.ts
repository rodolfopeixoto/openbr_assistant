import { html, nothing } from "lit";
import type { ChannelsStatusSnapshot, ChannelAccountSnapshot } from "../types";
import type { ChannelKey, ChannelsProps } from "./channels.types";
import { formatAgo } from "../format";
import { icons } from "../icons";
import { renderChannelWizard } from "../components/channel-wizard";

// Channel metadata for display
const CHANNEL_META: Record<ChannelKey, { 
  name: string; 
  description: string; 
  icon: string;
  color: string;
  setupUrl?: string;
}> = {
  whatsapp: {
    name: "WhatsApp",
    description: "Connect via WhatsApp Web QR code",
    icon: "messageSquare",
    color: "#25D366",
    setupUrl: "#whatsapp-setup"
  },
  telegram: {
    name: "Telegram",
    description: "Bot-based messaging integration",
    icon: "send",
    color: "#0088cc",
    setupUrl: "#telegram-setup"
  },
  discord: {
    name: "Discord",
    description: "Server and DM integration",
    icon: "messageCircle",
    color: "#5865F2",
    setupUrl: "#discord-setup"
  },
  slack: {
    name: "Slack",
    description: "Workspace messaging",
    icon: "hash",
    color: "#4A154B",
    setupUrl: "#slack-setup"
  },
  signal: {
    name: "Signal",
    description: "Secure messaging",
    icon: "shield",
    color: "#3A76F0",
    setupUrl: "#signal-setup"
  },
  imessage: {
    name: "iMessage",
    description: "Apple Messages (Mac only)",
    icon: "messageSquare",
    color: "#34C759",
    setupUrl: "#imessage-setup"
  },
  googlechat: {
    name: "Google Chat",
    description: "Google Workspace messaging",
    icon: "messageSquare",
    color: "#00832d",
    setupUrl: "#googlechat-setup"
  },
  nostr: {
    name: "Nostr",
    description: "Decentralized social protocol",
    icon: "zap",
    color: "#8e44ad",
    setupUrl: "#nostr-setup"
  }
};

// Safe icon getter
function getIcon(name: string) {
  return (icons as Record<string, typeof icons.settings>)[name] || icons.settings;
}

export function renderChannels(props: ChannelsProps) {
  const channels = props.snapshot?.channels as Record<string, unknown> | null;
  const lastUpdated = props.lastSuccessAt ? formatAgo(props.lastSuccessAt) : null;
  
  // Categorize channels
  const channelList = Object.entries(CHANNEL_META).map(([key, meta]) => {
    const status = channels?.[key] as Record<string, unknown> | undefined;
    const accounts = props.snapshot?.channelAccounts?.[key] ?? [];
    const isConnected = status?.connected === true;
    const isConfigured = status?.configured === true;
    const hasError = status?.lastError != null;
    
    return {
      key: key as ChannelKey,
      meta,
      status,
      accounts,
      isConnected,
      isConfigured,
      hasError,
      accountCount: accounts.length
    };
  });

  const connected = channelList.filter(c => c.isConnected);
  const configured = channelList.filter(c => !c.isConnected && c.isConfigured);
  const available = channelList.filter(c => !c.isConnected && !c.isConfigured);

  return html`
    <div class="channels-page">
      ${renderHeader(props, lastUpdated)}
      ${renderStats(channelList)}
      
      ${connected.length > 0 ? html`
        <section class="channels-section">
          <div class="section-header">
            <div class="section-title">
              <div class="status-dot connected"></div>
              <h2>Connected</h2>
              <span class="count">${connected.length}</span>
            </div>
            <p class="section-desc">Active messaging channels ready to use</p>
          </div>
          <div class="channels-grid">
            ${connected.map(channel => renderChannelCard(channel, props))}
          </div>
        </section>
      ` : nothing}
      
      ${configured.length > 0 ? html`
        <section class="channels-section">
          <div class="section-header">
            <div class="section-title">
              <div class="status-dot configured"></div>
              <h2>Configured</h2>
              <span class="count">${configured.length}</span>
            </div>
            <p class="section-desc">Channels configured but not currently connected</p>
          </div>
          <div class="channels-grid">
            ${configured.map(channel => renderChannelCard(channel, props))}
          </div>
        </section>
      ` : nothing}
      
      ${available.length > 0 ? html`
        <section class="channels-section">
          <div class="section-header">
            <div class="section-title">
              <div class="status-dot available"></div>
              <h2>Available</h2>
              <span class="count">${available.length}</span>
            </div>
            <p class="section-desc">Channels available to configure</p>
          </div>
          <div class="channels-grid">
            ${available.map(channel => renderChannelCard(channel, props))}
          </div>
        </section>
      ` : nothing}
      
      ${renderHealthSection(props)}
      
      ${props.state?.channelWizardState?.isOpen 
        ? renderChannelWizard(props.state) 
        : nothing}
    </div>
  `;
}

function renderHeader(props: ChannelsProps, lastUpdated: string | null) {
  return html`
    <header class="channels-header">
      <div class="header-content">
        <div class="header-main">
          <div class="header-icon">${icons.messageSquare}</div>
          <div class="header-text">
            <h1>Channels</h1>
            <p>Manage messaging platform connections</p>
          </div>
        </div>
        
        <div class="header-actions">
          ${lastUpdated ? html`
            <span class="last-updated">
              ${icons.clock} Updated ${lastUpdated}
            </span>
          ` : nothing}
          
          <button 
            class="btn-refresh ${props.loading ? 'spinning' : ''}"
            @click=${() => props.onRefresh(true)}
            ?disabled=${props.loading}
          >
            ${icons.refreshCw}
          </button>
        </div>
      </div>
      
      ${props.lastError ? html`
        <div class="error-banner">
          ${icons.alertTriangle}
          <span>${props.lastError}</span>
        </div>
      ` : nothing}
    </header>
  `;
}

function renderStats(channelList: Array<{
  isConnected: boolean;
  isConfigured: boolean;
  accountCount: number;
}>) {
  const total = channelList.length;
  const connected = channelList.filter(c => c.isConnected).length;
  const configured = channelList.filter(c => !c.isConnected && c.isConfigured).length;
  const totalAccounts = channelList.reduce((sum, c) => sum + c.accountCount, 0);

  return html`
    <section class="channels-stats-bar">
      <div class="stat-item">
        <span class="stat-value">${connected}</span>
        <span class="stat-label">Connected</span>
      </div>
      <div class="stat-divider"></div>
      
      <div class="stat-item">
        <span class="stat-value">${configured}</span>
        <span class="stat-label">Configured</span>
      </div>
      <div class="stat-divider"></div>
      
      <div class="stat-item">
        <span class="stat-value">${totalAccounts}</span>
        <span class="stat-label">Accounts</span>
      </div>
      <div class="stat-divider"></div>
      
      <div class="stat-item">
        <span class="stat-value total">${total}</span>
        <span class="stat-label">Total</span>
      </div>
    </section>
  `;
}

function renderChannelCard(
  channel: {
    key: ChannelKey;
    meta: { name: string; description: string; icon: string; color: string; setupUrl?: string };
    status: Record<string, unknown> | undefined;
    accounts: ChannelAccountSnapshot[];
    isConnected: boolean;
    isConfigured: boolean;
    hasError: boolean;
    accountCount: number;
  },
  props: ChannelsProps
) {
  const { key, meta, accounts, isConnected, isConfigured, hasError } = channel;
  const lastError = typeof channel.status?.lastError === 'string' ? channel.status.lastError : undefined;
  
  // Get last activity
  const lastActivity = accounts.length > 0 
    ? Math.max(...accounts.map(a => a.lastInboundAt || 0))
    : null;
  
  let cardClass = "channel-card";
  if (isConnected) cardClass += " connected";
  else if (hasError) cardClass += " error";
  else if (isConfigured) cardClass += " configured";
  else cardClass += " available";

  return html`
    <div class="${cardClass}">
      <div class="card-header">
        <div class="channel-icon" style="background: ${meta.color}20; color: ${meta.color}">
          ${getIcon(meta.icon)}
        </div>
        
        <div class="channel-info">
          <h3>${meta.name}</h3>
          <div class="channel-status">
            <span class="status-indicator ${isConnected ? 'connected' : hasError ? 'error' : isConfigured ? 'configured' : 'available'}"></span>
            <span class="status-text">${isConnected ? 'Connected' : hasError ? 'Error' : isConfigured ? 'Configured' : 'Available'}</span>
          </div>
        </div>
        
        ${accounts.length > 0 ? html`
          <div class="account-badge">
            ${accounts.length} account${accounts.length !== 1 ? 's' : ''}
          </div>
        ` : nothing}
      </div>
      
      <div class="card-body">
        <p class="channel-desc">${meta.description}</p>
        
        ${accounts.length > 0 ? html`
          <div class="account-list">
            ${accounts.slice(0, 3).map(account => renderAccountItem(account))}
            ${accounts.length > 3 ? html`
              <div class="account-more">+${accounts.length - 3} more</div>
            ` : nothing}
          </div>
        ` : nothing}
        
        ${lastError ? html`
          <div class="error-message">
            ${icons.alertCircle}
            <span>${lastError}</span>
          </div>
        ` : nothing}
        
        ${lastActivity ? html`
          <div class="last-activity">
            ${icons.clock}
            <span>Last activity ${formatAgo(lastActivity)}</span>
          </div>
        ` : nothing}
      </div>
      
      <div class="card-footer">
          ${isConnected ? html`
          <button class="btn-action secondary" @click=${() => disconnectChannel(key, props)}>
            ${icons.x} Disconnect
          </button>
          <button class="btn-action primary" @click=${() => manageChannel(key, props)}>
            ${icons.settings} Manage
          </button>
        ` : isConfigured ? html`
          <button class="btn-action primary" @click=${() => connectChannel(key, props)}>
            ${icons.check} Connect
          </button>
          <button class="btn-action secondary" @click=${() => configureChannel(key, props)}>
            ${icons.settings} Configure
          </button>
        ` : html`
          <button class="btn-action primary full" @click=${() => setupChannel(key, props)}>
            ${icons.plus} Setup
          </button>
        `}
      </div>
    </div>
  `;
}

function renderAccountItem(account: ChannelAccountSnapshot) {
  const isActive = account.running || (account.lastInboundAt && Date.now() - account.lastInboundAt < 10 * 60 * 1000);
  
  return html`
    <div class="account-item">
      <div class="account-status ${isActive ? 'active' : 'inactive'}"></div>
      <span class="account-name">${account.name || account.accountId}</span>
      ${account.connected ? html`<span class="connected-badge">${icons.wifi}</span>` : nothing}
    </div>
  `;
}

function renderHealthSection(props: ChannelsProps) {
  if (!props.snapshot) return nothing;
  
  const channels = props.snapshot.channels as Record<string, unknown> | null;
  const errors: string[] = [];
  
  Object.entries(channels || {}).forEach(([key, ch]) => {
    const status = ch as Record<string, unknown>;
    if (status?.lastError) {
      errors.push(`${CHANNEL_META[key as ChannelKey]?.name || key}: ${status.lastError}`);
    }
  });

  return html`
    <section class="channels-health">
      <div class="health-header" @click=${toggleHealthSection}>
        <div class="health-title">
          ${icons.activity}
          <h3>System Health</h3>
          ${errors.length > 0 ? html`<span class="error-count">${errors.length}</span>` : nothing}
        </div>
        <div class="health-toggle">
          ${icons.chevronDown}
        </div>
      </div>
      
      <div class="health-content collapsed">
        ${errors.length > 0 ? html`
          <div class="health-errors">
            <h4>${icons.alertTriangle} Active Issues</h4>
            <ul>
              ${errors.map(err => html`<li>${err}</li>`)}
            </ul>
          </div>
        ` : html`
          <div class="health-ok">
            ${icons.checkCircle}
            <span>All systems operational</span>
          </div>
        `}
        
        ${props.snapshot ? html`
          <div class="health-raw">
            <button class="toggle-raw" @click=${toggleRawData}>
              ${icons.code} Show Raw Data
            </button>
            <pre class="raw-data hidden">${JSON.stringify(props.snapshot, null, 2)}</pre>
          </div>
        ` : nothing}
      </div>
    </section>
  `;
}

// Action handlers
function disconnectChannel(key: ChannelKey, props: ChannelsProps) {
  if (confirm(`Disconnect ${CHANNEL_META[key].name}?`)) {
    // Navigate to config to disable channel
    props.onNavigate?.('config', { section: 'channels', channel: key });
  }
}

function connectChannel(key: ChannelKey, props: ChannelsProps) {
  // Open wizard for supported channels, otherwise navigate to config
  if (shouldUseWizard(key)) {
    props.state?.handleChannelWizardOpen(key);
  } else {
    props.onNavigate?.('config', { section: 'channels', channel: key });
  }
}

function configureChannel(key: ChannelKey, props: ChannelsProps) {
  // Open wizard for supported channels, otherwise navigate to config
  if (shouldUseWizard(key)) {
    props.state?.handleChannelWizardOpen(key);
  } else {
    props.onNavigate?.('config', { section: 'channels', channel: key });
  }
}

function setupChannel(key: ChannelKey, props: ChannelsProps) {
  // Open wizard for supported channels, otherwise navigate to config
  if (shouldUseWizard(key)) {
    props.state?.handleChannelWizardOpen(key);
  } else {
    props.onNavigate?.('config', { section: 'channels', channel: key, setup: 'true' });
  }
}

function manageChannel(key: ChannelKey, props: ChannelsProps) {
  // Open wizard for supported channels, otherwise navigate to config
  if (shouldUseWizard(key)) {
    props.state?.handleChannelWizardOpen(key);
  } else {
    props.onNavigate?.('config', { section: 'channels', channel: key });
  }
}

function shouldUseWizard(key: ChannelKey): boolean {
  // Channels that have full wizard support
  return ['telegram', 'discord', 'slack'].includes(key);
}

// Toggle handlers
function toggleHealthSection(e: Event) {
  const header = e.currentTarget as HTMLElement;
  const content = header.nextElementSibling as HTMLElement;
  const toggle = header.querySelector('.health-toggle');
  
  if (content) {
    content.classList.toggle('collapsed');
    toggle?.classList.toggle('rotated');
  }
}

function toggleRawData(e: Event) {
  const button = e.currentTarget as HTMLElement;
  const raw = button.nextElementSibling as HTMLElement;
  
  if (raw) {
    raw.classList.toggle('hidden');
    button.innerHTML = raw.classList.contains('hidden') 
      ? `${getIcon('code')} Show Raw Data`
      : `${getIcon('code')} Hide Raw Data`;
  }
}
