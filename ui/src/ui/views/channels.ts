import { html, nothing } from "lit";
import type {
  ChannelAccountSnapshot,
  ChannelUiMetaEntry,
  ChannelsStatusSnapshot,
  DiscordStatus,
  GoogleChatStatus,
  IMessageStatus,
  NostrProfile,
  NostrStatus,
  SignalStatus,
  SlackStatus,
  TelegramStatus,
  WhatsAppStatus,
} from "../types";
import type { ChannelKey, ChannelsChannelData, ChannelsProps } from "./channels.types";
import { formatAgo } from "../format";
import { icons } from "../icons";
import { renderChannelConfigSection } from "./channels.config";
import { renderDiscordCard } from "./channels.discord";
import { renderGoogleChatCard } from "./channels.googlechat";
import { renderIMessageCard } from "./channels.imessage";
import { renderNostrCard } from "./channels.nostr";
import { channelEnabled, renderChannelAccountCount } from "./channels.shared";
import { renderSignalCard } from "./channels.signal";
import { renderSlackCard } from "./channels.slack";
import { renderTelegramCard } from "./channels.telegram";
import { renderWhatsAppCard } from "./channels.whatsapp";

export function renderChannels(props: ChannelsProps) {
  const channels = props.snapshot?.channels as Record<string, unknown> | null;
  const whatsapp = (channels?.whatsapp ?? undefined) as WhatsAppStatus | undefined;
  const telegram = (channels?.telegram ?? undefined) as TelegramStatus | undefined;
  const discord = (channels?.discord ?? null) as DiscordStatus | null;
  const googlechat = (channels?.googlechat ?? null) as GoogleChatStatus | null;
  const slack = (channels?.slack ?? null) as SlackStatus | null;
  const signal = (channels?.signal ?? null) as SignalStatus | null;
  const imessage = (channels?.imessage ?? null) as IMessageStatus | null;
  const nostr = (channels?.nostr ?? null) as NostrStatus | null;
  
  const channelOrder = resolveChannelOrder(props.snapshot);
  const orderedChannels = channelOrder
    .map((key, index) => ({
      key,
      enabled: channelEnabled(key, props),
      order: index,
    }))
    .sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.order - b.order;
    });

  // Calculate stats
  const totalChannels = orderedChannels.length;
  const enabledChannels = orderedChannels.filter(c => c.enabled).length;
  const connectedChannels = orderedChannels.filter(c => {
    const status = channels?.[c.key] as Record<string, unknown> | undefined;
    return status?.connected === true;
  }).length;

  return html`
    <div class="channels-page">
      <!-- Header -->
      <header class="channels-header">
        <div class="channels-header__content">
          <h1 class="channels-header__title">
            <span class="channels-header__icon">${icons.messageSquare}</span>
            Channels
          </h1>
          <p class="channels-header__subtitle">
            Manage messaging platform connections
          </p>
        </div>
      </header>

      <!-- Stats Row -->
      <div class="channels-stats">
        <div class="channels-stat">
          <span class="channels-stat__value">${totalChannels}</span>
          <span class="channels-stat__label">Total Channels</span>
        </div>
        <div class="channels-stat">
          <span class="channels-stat__value channels-stat__value--ok">${enabledChannels}</span>
          <span class="channels-stat__label">Enabled</span>
        </div>
        <div class="channels-stat">
          <span class="channels-stat__value channels-stat__value--ok">${connectedChannels}</span>
          <span class="channels-stat__label">Connected</span>
        </div>
      </div>

      <!-- Channels Grid -->
      <section class="channels-grid">
        ${orderedChannels.map((channel) =>
          renderChannel(channel.key, props, {
            whatsapp,
            telegram,
            discord,
            googlechat,
            slack,
            signal,
            imessage,
            nostr,
            channelAccounts: props.snapshot?.channelAccounts ?? null,
          }),
        )}
      </section>

      <!-- Health Section -->
      <section class="channels-health">
        <div class="channels-health__header">
          <h2 class="channels-health__title">Channel Health</h2>
          <div class="channels-health__meta">
            <span class="channels-health__time">
              ${props.lastSuccessAt ? `Updated ${formatAgo(props.lastSuccessAt)}` : "Not updated yet"}
            </span>
            <button 
              class="channels-health__refresh"
              @click=${props.onRefresh}
              title="Refresh channels"
            >
              ${icons.refreshCw}
            </button>
          </div>
        </div>
        
        <div class="channels-health__body">
          ${props.lastError
            ? html`
              <div class="callout danger" style="margin-bottom: 16px;">
                ${props.lastError}
              </div>
            `
            : nothing
          }
          
          ${props.snapshot ? renderHealthMetrics(props.snapshot) : nothing}
          
          ${renderJsonPreview(props)}
        </div>
      </section>
    </div>
  `;
}

function renderHealthMetrics(snapshot: ChannelsStatusSnapshot) {
  const channels = snapshot.channels as Record<string, unknown> | null;
  
  // Count channels by status
  const metrics = {
    configured: 0,
    running: 0,
    connected: 0,
    errors: 0,
  };
  
  Object.values(channels || {}).forEach((ch: unknown) => {
    const status = ch as Record<string, unknown>;
    if (status?.configured) metrics.configured++;
    if (status?.running) metrics.running++;
    if (status?.connected) metrics.connected++;
    if (status?.lastError) metrics.errors++;
  });

  return html`
    <div class="health-metrics">
      <div class="health-metric">
        <div class="health-metric__icon">${icons.checkCircle}</div>
        <div class="health-metric__content">
          <div class="health-metric__label">Configured</div>
          <div class="health-metric__value health-metric__value--ok">${metrics.configured}</div>
        </div>
      </div>
      <div class="health-metric">
        <div class="health-metric__icon">${icons.playCircle}</div>
        <div class="health-metric__content">
          <div class="health-metric__label">Running</div>
          <div class="health-metric__value">${metrics.running}</div>
        </div>
      </div>
      <div class="health-metric">
        <div class="health-metric__icon">${icons.wifi}</div>
        <div class="health-metric__content">
          <div class="health-metric__label">Connected</div>
          <div class="health-metric__value health-metric__value--ok">${metrics.connected}</div>
        </div>
      </div>
      ${metrics.errors > 0 ? html`
        <div class="health-metric">
          <div class="health-metric__icon" style="color: var(--danger)">${icons.alertTriangle}</div>
          <div class="health-metric__content">
            <div class="health-metric__label">Errors</div>
            <div class="health-metric__value health-metric__value--error">${metrics.errors}</div>
          </div>
        </div>
      ` : nothing}
    </div>
  `;
}

function renderJsonPreview(props: ChannelsProps) {
  return html`
    <div class="health-json">
      <div class="health-json__header">
        <span class="health-json__title">Raw Snapshot</span>
        <button class="health-json__toggle" @click=${() => {
          const el = document.querySelector('.health-json__content');
          if (el) el.classList.toggle('hidden');
        }}>
          ${icons.eye} Toggle
        </button>
      </div>
      <div class="health-json__content">
        <pre>${props.snapshot ? JSON.stringify(props.snapshot, null, 2) : "No snapshot available."}</pre>
      </div>
    </div>
  `;
}

function resolveChannelOrder(snapshot: ChannelsStatusSnapshot | null): ChannelKey[] {
  if (snapshot?.channelMeta?.length) {
    return snapshot.channelMeta.map((entry) => entry.id) as ChannelKey[];
  }
  if (snapshot?.channelOrder?.length) {
    return snapshot.channelOrder;
  }
  return ["whatsapp", "telegram", "discord", "googlechat", "slack", "signal", "imessage", "nostr"];
}

function renderChannel(key: ChannelKey, props: ChannelsProps, data: ChannelsChannelData) {
  const accountCountLabel = renderChannelAccountCount(key, data.channelAccounts);
  switch (key) {
    case "whatsapp":
      return renderWhatsAppCard({
        props,
        whatsapp: data.whatsapp,
        accountCountLabel,
      });
    case "telegram":
      return renderTelegramCard({
        props,
        telegram: data.telegram,
        telegramAccounts: data.channelAccounts?.telegram ?? [],
        accountCountLabel,
      });
    case "discord":
      return renderDiscordCard({
        props,
        discord: data.discord,
        accountCountLabel,
      });
    case "googlechat":
      return renderGoogleChatCard({
        props,
        googleChat: data.googlechat,
        accountCountLabel,
      });
    case "slack":
      return renderSlackCard({
        props,
        slack: data.slack,
        accountCountLabel,
      });
    case "signal":
      return renderSignalCard({
        props,
        signal: data.signal,
        accountCountLabel,
      });
    case "imessage":
      return renderIMessageCard({
        props,
        imessage: data.imessage,
        accountCountLabel,
      });
    case "nostr": {
      const nostrAccounts = data.channelAccounts?.nostr ?? [];
      const primaryAccount = nostrAccounts[0];
      const accountId = primaryAccount?.accountId ?? "default";
      const profile =
        (primaryAccount as { profile?: NostrProfile | null } | undefined)?.profile ?? null;
      const showForm =
        props.nostrProfileAccountId === accountId ? props.nostrProfileFormState : null;
      const profileFormCallbacks = showForm
        ? {
            onFieldChange: props.onNostrProfileFieldChange,
            onSave: props.onNostrProfileSave,
            onImport: props.onNostrProfileImport,
            onCancel: props.onNostrProfileCancel,
            onToggleAdvanced: props.onNostrProfileToggleAdvanced,
          }
        : null;
      return renderNostrCard({
        props,
        nostr: data.nostr,
        nostrAccounts,
        accountCountLabel,
        profileFormState: showForm,
        profileFormCallbacks,
        onEditProfile: () => props.onNostrProfileEdit(accountId, profile),
      });
    }
    default:
      return renderGenericChannelCard(key, props, data.channelAccounts ?? {});
  }
}

function renderGenericChannelCard(
  key: ChannelKey,
  props: ChannelsProps,
  channelAccounts: Record<string, ChannelAccountSnapshot[]>,
) {
  const label = resolveChannelLabel(props.snapshot, key);
  const status = props.snapshot?.channels?.[key] as Record<string, unknown> | undefined;
  const configured = typeof status?.configured === "boolean" ? status.configured : undefined;
  const running = typeof status?.running === "boolean" ? status.running : undefined;
  const connected = typeof status?.connected === "boolean" ? status.connected : undefined;
  const lastError = typeof status?.lastError === "string" ? status.lastError : undefined;
  const accounts = channelAccounts[key] ?? [];
  const accountCountLabel = renderChannelAccountCount(key, channelAccounts);

  // Determine card state
  let cardClass = "channel-card";
  if (connected) cardClass += " channel-card--enabled";
  else if (lastError) cardClass += " channel-card--error";
  else if (!configured) cardClass += " channel-card--disabled";

  // Determine status dot
  let statusDotClass = "channel-card__status-dot--disconnected";
  let statusText = "Disconnected";
  if (connected) {
    statusDotClass = "channel-card__status-dot--connected";
    statusText = "Connected";
  } else if (lastError) {
    statusDotClass = "channel-card__status-dot--error";
    statusText = "Error";
  }

  return html`
    <div class="${cardClass}">
      <div class="channel-card__header">
        <div class="channel-card__icon">📡</div>
        <div class="channel-card__info">
          <h3 class="channel-card__name">
            ${label}
            ${accountCountLabel}
          </h3>
          <div class="channel-card__status">
            <span class="channel-card__status-dot ${statusDotClass}"></span>
            <span class="channel-card__status-text">${statusText}</span>
          </div>
        </div>
      </div>

      <div class="channel-card__body">
        <p class="channel-card__description">Channel status and configuration.</p>
        
        <div class="channel-card__stats">
          <div class="channel-card__stat">
            <span class="channel-card__stat-label">Configured</span>
            <span class="channel-card__stat-value ${configured ? 'channel-card__stat-value--ok' : ''}">
              ${configured == null ? "n/a" : configured ? "Yes" : "No"}
            </span>
          </div>
          <div class="channel-card__stat">
            <span class="channel-card__stat-label">Running</span>
            <span class="channel-card__stat-value ${running ? 'channel-card__stat-value--ok' : ''}">
              ${running == null ? "n/a" : running ? "Yes" : "No"}
            </span>
          </div>
        </div>

        ${accounts.length > 0
          ? html`
            <div class="account-card-list" style="margin-top: 12px;">
              ${accounts.map((account) => renderGenericAccount(account))}
            </div>
          `
          : nothing
        }

        ${lastError
          ? html`
            <div class="channel-card__error" style="margin-top: 12px;">
              <span class="channel-card__error-icon">${icons.alertCircle}</span>
              <span class="channel-card__error-text">${lastError}</span>
            </div>
          `
          : nothing
        }
      </div>

      <div class="channel-card__footer">
        ${renderChannelConfigSection({ channelId: key, props })}
      </div>
    </div>
  `;
}

function resolveChannelMetaMap(
  snapshot: ChannelsStatusSnapshot | null,
): Record<string, ChannelUiMetaEntry> {
  if (!snapshot?.channelMeta?.length) return {};
  return Object.fromEntries(snapshot.channelMeta.map((entry) => [entry.id, entry]));
}

function resolveChannelLabel(snapshot: ChannelsStatusSnapshot | null, key: string): string {
  const meta = resolveChannelMetaMap(snapshot)[key];
  return meta?.label ?? snapshot?.channelLabels?.[key] ?? key;
}

const RECENT_ACTIVITY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

function hasRecentActivity(account: ChannelAccountSnapshot): boolean {
  if (!account.lastInboundAt) return false;
  return Date.now() - account.lastInboundAt < RECENT_ACTIVITY_THRESHOLD_MS;
}

function deriveRunningStatus(account: ChannelAccountSnapshot): "Yes" | "No" | "Active" {
  if (account.running) return "Yes";
  // If we have recent inbound activity, the channel is effectively running
  if (hasRecentActivity(account)) return "Active";
  return "No";
}

function deriveConnectedStatus(account: ChannelAccountSnapshot): "Yes" | "No" | "Active" | "n/a" {
  if (account.connected === true) return "Yes";
  if (account.connected === false) return "No";
  // If connected is null/undefined but we have recent activity, show as active
  if (hasRecentActivity(account)) return "Active";
  return "n/a";
}

function renderGenericAccount(account: ChannelAccountSnapshot) {
  const runningStatus = deriveRunningStatus(account);
  const connectedStatus = deriveConnectedStatus(account);

  return html`
    <div class="account-card">
      <div class="account-card-header">
        <div class="account-card-title">${account.name || account.accountId}</div>
        <div class="account-card-id">${account.accountId}</div>
      </div>
      <div class="status-list account-card-status">
        <div>
          <span class="label">Running</span>
          <span>${runningStatus}</span>
        </div>
        <div>
          <span class="label">Configured</span>
          <span>${account.configured ? "Yes" : "No"}</span>
        </div>
        <div>
          <span class="label">Connected</span>
          <span>${connectedStatus}</span>
        </div>
        <div>
          <span class="label">Last inbound</span>
          <span>${account.lastInboundAt ? formatAgo(account.lastInboundAt) : "n/a"}</span>
        </div>
        ${
          account.lastError
            ? html`
              <div class="account-card-error">
                ${account.lastError}
              </div>
            `
            : nothing
        }
      </div>
    </div>
  `;
}
