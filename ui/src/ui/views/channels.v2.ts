import { html, nothing } from "lit";
import type {
  ChannelsStatusSnapshot,
  DiscordStatus,
  GoogleChatStatus,
  IMessageStatus,
  NostrStatus,
  SignalStatus,
  SlackStatus,
  TelegramStatus,
  WhatsAppStatus,
} from "../types";
import type { ChannelsProps } from "./channels.types";
import { icons } from "../icons";

// Channel categories definition
const CHANNEL_CATEGORIES = {
  messaging: {
    label: "Messaging",
    description: "Direct messaging platforms",
    icon: "messageSquare",
    channels: ["whatsapp", "telegram", "signal", "imessage"],
  },
  social: {
    label: "Social",
    description: "Social media and community platforms",
    icon: "users",
    channels: ["discord", "nostr"],
  },
  enterprise: {
    label: "Enterprise",
    description: "Business communication tools",
    icon: "briefcase",
    channels: ["slack", "googlechat"],
  },
} as const;

type CategoryKey = keyof typeof CHANNEL_CATEGORIES;

export function renderChannels(props: ChannelsProps) {
  const channels = props.snapshot?.channels as Record<string, unknown> | null;
  
  // Calculate stats
  const allChannels = Object.values(CHANNEL_CATEGORIES).flatMap(c => c.channels);
  const totalChannels = allChannels.length;
  const enabledChannels = allChannels.filter(key => {
    const status = channels?.[key] as Record<string, unknown> | undefined;
    return status?.enabled === true || status?.configured === true;
  }).length;
  const connectedChannels = allChannels.filter(key => {
    const status = channels?.[key] as Record<string, unknown> | undefined;
    return status?.connected === true;
  }).length;

  return html`
    <div class="channels-page-v2">
      <!-- Header -->
      <header class="channels-header-v2">
        <div class="channels-header-content">
          <div class="channels-title-wrapper">
            <div class="channels-icon">${icons.messageSquare}</div>
            <div>
              <h1>Channels</h1>
              <p class="subtitle">Manage your messaging platform connections</p>
            </div>
          </div>
          
          <div class="channels-stats-v2">
            <div class="stat-card">
              <span class="stat-value">${totalChannels}</span>
              <span class="stat-label">Total</span>
            </div>
            <div class="stat-card enabled">
              <span class="stat-value">${enabledChannels}</span>
              <span class="stat-label">Enabled</span>
            </div>
            <div class="stat-card connected">
              <span class="stat-value">${connectedChannels}</span>
              <span class="stat-label">Connected</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Global Error Banner -->
      ${props.lastError ? html`
        <div class="channels-error-banner">
          <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-message">${props.lastError}</span>
            <button class="error-dismiss" @click="${() => props.onRefresh(false)}" title="Refresh to clear">
              ${icons.refreshCw}
            </button>
          </div>
        </div>
      ` : nothing}

      <!-- Categories -->
      <div class="channels-categories">
        ${(Object.keys(CHANNEL_CATEGORIES) as CategoryKey[]).map(categoryKey => 
          renderCategory(categoryKey, props, channels)
        )}
      </div>
    </div>
  `;
}

function renderCategory(
  categoryKey: CategoryKey, 
  props: ChannelsProps, 
  channels: Record<string, unknown> | null
) {
  const category = CHANNEL_CATEGORIES[categoryKey];
  const categoryChannels = category.channels.map(key => ({
    key,
    status: channels?.[key] as Record<string, unknown> | undefined,
  }));

  return html`
    <section class="channel-category-section">
      <div class="category-header">
        <div class="category-icon-wrapper">
          ${getCategoryIcon(category.icon)}
        </div>
        <div class="category-info">
          <h2>${category.label}</h2>
          <p class="category-description">${category.description}</p>
        </div>
        
        <div class="category-status">
          ${categoryChannels.filter(c => c.status?.connected).length}/${categoryChannels.length} connected
        </div>
      </div>
      
      <div class="channel-toggles-grid">
        ${categoryChannels.map(({ key, status }) => 
          renderChannelToggle(key, status, props)
        )}
      </div>
    </section>
  `;
}

function renderChannelToggle(
  key: string, 
  status: Record<string, unknown> | undefined,
  props: ChannelsProps
) {
  const configured = status?.configured === true;
  const enabled = status?.enabled === true || configured;
  const connected = status?.connected === true;
  const lastError = status?.lastError as string | undefined;
  
  const channelNames: Record<string, string> = {
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    discord: "Discord",
    googlechat: "Google Chat",
    slack: "Slack",
    signal: "Signal",
    imessage: "iMessage",
    nostr: "Nostr",
  };

  const channelDescriptions: Record<string, string> = {
    whatsapp: "Connect to WhatsApp Business API",
    telegram: "Bot-based messaging platform",
    discord: "Community chat for teams and gamers",
    googlechat: "Google Workspace messaging",
    slack: "Team collaboration platform",
    signal: "Privacy-focused messaging",
    imessage: "Apple messaging service",
    nostr: "Decentralized social protocol",
  };

  const statusColor = connected ? "connected" : lastError ? "error" : enabled ? "enabled" : "disabled";
  const statusText = connected ? "Connected" : lastError ? "Error" : enabled ? "Enabled" : "Disabled";

  return html`
    <div class="channel-toggle-card ${statusColor}">
      <div class="channel-toggle-header">
        <div class="channel-icon-small ${key}">${getChannelIcon(key)}</div>
        
        <div class="channel-toggle-info">
          <div class="channel-name-row">
            <span class="channel-name">${channelNames[key] || key}</span>
            <button 
              class="info-tooltip-btn"
              title="${channelDescriptions[key] || 'Configure this channel'}"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
          </div>
          
          <div class="channel-status-row">
            <span class="status-dot ${statusColor}"></span>
            <span class="status-text">${statusText}</span>            ${lastError ? html`
              <span class="error-hint" title="${lastError}">⚠️</span>
            ` : nothing}
          </div>
        </div>
        
        <label class="toggle-switch">
          <input 
            type="checkbox" 
            .checked="${enabled}"
            @change="${(e: Event) => {
              const target = e.target as HTMLInputElement;
              const shouldEnable = target.checked;
              console.log(`[Channels] Toggle ${key}:`, shouldEnable);
              
              // If enabling and not configured, open setup modal instead
              if (shouldEnable && !configured) {
                console.log(`[Channels] Opening setup modal for ${key}`);
                props.onChannelSetupOpen?.(key);
                // Reset toggle visually since we're not enabling yet
                target.checked = false;
              } else {
                props.onToggleChannel?.(key, shouldEnable);
              }
            }}"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
      
      ${configured ? html`
        <div class="channel-actions">
          <button class="btn-secondary btn-sm" @click="${() => props.onChannelSetupOpen?.(key)}">Configure</button>
          ${connected ? html`
            <button class="btn-secondary btn-sm">Logs</button>
          ` : nothing}
        </div>
      ` : html`
        <div 
          class="channel-setup-hint"
          @click="${() => {
            console.log(`[Channels] Setup hint clicked for ${key}`);
            props.onChannelSetupOpen?.(key);
          }}"
        >
          Click to set up ${channelNames[key] || key}
        </div>
      `}
    </div>
  `;
}

function getCategoryIcon(iconName: string) {
  const iconMap: Record<string, typeof icons[keyof typeof icons]> = {
    messageSquare: icons.messageSquare,
    users: icons.user || icons.messageSquare,
    briefcase: icons.folder || icons.messageSquare,
  };
  return iconMap[iconName] || icons.messageSquare;
}

function getChannelIcon(key: string) {
  // Return appropriate icon for each channel
  const iconMap: Record<string, typeof icons[keyof typeof icons]> = {
    whatsapp: icons.messageSquare,
    telegram: icons.messageSquare,
    discord: icons.messageSquare,
    googlechat: icons.messageSquare,
    slack: icons.messageSquare,
    signal: icons.messageSquare,
    imessage: icons.messageSquare,
    nostr: icons.messageSquare,
  };
  return iconMap[key] || icons.messageSquare;
}
