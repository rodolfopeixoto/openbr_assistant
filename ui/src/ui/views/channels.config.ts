import { html, nothing } from "lit";
import type { ConfigUiHints } from "../types";
import type { ChannelsProps } from "./channels.types";
import { analyzeConfigSchema, renderNode, schemaType, type JsonSchema } from "./config-form";
import { icons } from "../icons";

// Channel configuration types
export type ChannelConfigType = "whatsapp" | "telegram" | "discord" | "slack" | "signal" | "imessage" | "nostr" | "googlechat";

export interface ChannelConfigField {
  name: string;
  label: string;
  type: "text" | "password" | "select" | "checkbox" | "array";
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

export interface ChannelConfigSchema {
  key: ChannelConfigType;
  name: string;
  description: string;
  icon: keyof typeof icons;
  fields: ChannelConfigField[];
  setupSteps?: string[];
  docsUrl?: string;
}

type ChannelConfigFormProps = {
  channelId: string;
  configValue: Record<string, unknown> | null;
  schema: unknown | null;
  uiHints: ConfigUiHints;
  disabled: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
};

function resolveSchemaNode(
  schema: JsonSchema | null,
  path: Array<string | number>,
): JsonSchema | null {
  let current = schema;
  for (const key of path) {
    if (!current) return null;
    const type = schemaType(current);
    if (type === "object") {
      const properties = current.properties ?? {};
      if (typeof key === "string" && properties[key]) {
        current = properties[key];
        continue;
      }
      const additional = current.additionalProperties;
      if (typeof key === "string" && additional && typeof additional === "object") {
        current = additional as JsonSchema;
        continue;
      }
      return null;
    }
    if (type === "array") {
      if (typeof key !== "number") return null;
      const items = Array.isArray(current.items) ? current.items[0] : current.items;
      current = items ?? null;
      continue;
    }
    return null;
  }
  return current;
}

function resolveChannelValue(
  config: Record<string, unknown>,
  channelId: string,
): Record<string, unknown> {
  const channels = (config.channels ?? {}) as Record<string, unknown>;
  const fromChannels = channels[channelId];
  const fallback = config[channelId];
  const resolved =
    (fromChannels && typeof fromChannels === "object"
      ? (fromChannels as Record<string, unknown>)
      : null) ??
    (fallback && typeof fallback === "object" ? (fallback as Record<string, unknown>) : null);
  return resolved ?? {};
}

export function renderChannelConfigForm(props: ChannelConfigFormProps) {
  const analysis = analyzeConfigSchema(props.schema);
  const normalized = analysis.schema;
  if (!normalized) {
    return html`
      <div class="callout danger">Schema unavailable. Use Raw.</div>
    `;
  }
  const node = resolveSchemaNode(normalized, ["channels", props.channelId]);
  if (!node) {
    return html`
      <div class="callout danger">Channel config schema unavailable.</div>
    `;
  }
  const configValue = props.configValue ?? {};
  const value = resolveChannelValue(configValue, props.channelId);
  return html`
    <div class="config-form">
      ${renderNode({
        schema: node,
        value,
        path: ["channels", props.channelId],
        hints: props.uiHints,
        unsupported: new Set(analysis.unsupportedPaths),
        disabled: props.disabled,
        showLabel: false,
        onPatch: props.onPatch,
      })}
    </div>
  `;
}

export function renderChannelConfigSection(params: { channelId: string; props: ChannelsProps }) {
  const { channelId, props } = params;
  const disabled = props.configSaving || props.configSchemaLoading;
  return html`
    <div style="margin-top: 16px;">
      ${
        props.configSchemaLoading
          ? html`
              <div class="muted">Loading config schema…</div>
            `
          : renderChannelConfigForm({
              channelId,
              configValue: props.configForm,
              schema: props.configSchema,
              uiHints: props.configUiHints,
              disabled,
              onPatch: props.onConfigPatch,
            })
      }
      <div class="row" style="margin-top: 12px;">
        <button
          class="btn primary"
          ?disabled=${disabled || !props.configFormDirty}
          @click=${() => props.onConfigSave()}
        >
          ${props.configSaving ? "Saving…" : "Save"}
        </button>
        <button
          class="btn"
          ?disabled=${disabled}
          @click=${() => props.onConfigReload()}
        >
          Reload
        </button>
      </div>
    </div>
  `;
}

// Channel configuration schemas for quick setup
export const CHANNEL_CONFIG_SCHEMAS: Record<ChannelConfigType, ChannelConfigSchema> = {
  whatsapp: {
    key: "whatsapp",
    name: "WhatsApp",
    description: "Connect to WhatsApp Business API via Baileys library",
    icon: "messageSquare",
    setupSteps: [
      "Configure access policy below",
      "Scan QR code with WhatsApp mobile app",
      "Wait for connection confirmation",
    ],
    docsUrl: "https://docs.openclaw.ai/channels/whatsapp",
    fields: [
      {
        name: "dmPolicy",
        label: "Direct Message Policy",
        type: "select",
        required: true,
        description: "How to handle direct messages from unknown users",
        defaultValue: "pairing",
        options: [
          { value: "pairing", label: "Pairing - Require approval code" },
          { value: "allowlist", label: "Allowlist - Only allow specific numbers" },
          { value: "open", label: "Open - Allow all (requires allowFrom: ['*'])" },
        ],
      },
      {
        name: "allowFrom",
        label: "Allowed Phone Numbers",
        type: "array",
        description: "Phone numbers in E.164 format (e.g., +15551234567). Use * for all if policy is 'open'",
        placeholder: "+15551234567",
      },
      {
        name: "groupPolicy",
        label: "Group Policy",
        type: "select",
        required: true,
        defaultValue: "allowlist",
        options: [
          { value: "allowlist", label: "Allowlist - Only specific groups" },
          { value: "open", label: "Open - All groups" },
          { value: "disabled", label: "Disabled - No group messages" },
        ],
      },
      {
        name: "selfChatMode",
        label: "Self-Chat Mode",
        type: "checkbox",
        description: "Enable if using your personal WhatsApp number (same phone)",
        defaultValue: false,
      },
      {
        name: "sendReadReceipts",
        label: "Send Read Receipts",
        type: "checkbox",
        description: "Send blue checkmarks when messages are read",
        defaultValue: true,
      },
    ],
  },
  telegram: {
    key: "telegram",
    name: "Telegram",
    description: "Connect via Telegram Bot API",
    icon: "messageSquare",
    setupSteps: [
      "Create a bot with @BotFather on Telegram",
      "Copy the bot token below",
      "Configure access policy",
    ],
    docsUrl: "https://docs.openclaw.ai/channels/telegram",
    fields: [
      {
        name: "botToken",
        label: "Bot Token",
        type: "password",
        required: true,
        description: "Get this from @BotFather on Telegram",
        placeholder: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
      },
      {
        name: "dmPolicy",
        label: "Direct Message Policy",
        type: "select",
        required: true,
        defaultValue: "pairing",
        options: [
          { value: "pairing", label: "Pairing - Require approval code" },
          { value: "allowlist", label: "Allowlist - Only allow specific users" },
          { value: "open", label: "Open - Allow all" },
        ],
      },
      {
        name: "allowFrom",
        label: "Allowed User IDs",
        type: "array",
        description: "Telegram user IDs or usernames. Use * for all if policy is 'open'",
        placeholder: "@username or 12345678",
      },
      {
        name: "groupPolicy",
        label: "Group Policy",
        type: "select",
        required: true,
        defaultValue: "allowlist",
        options: [
          { value: "allowlist", label: "Allowlist - Only specific groups" },
          { value: "open", label: "Open - All groups" },
          { value: "disabled", label: "Disabled - No group messages" },
        ],
      },
    ],
  },
  discord: {
    key: "discord",
    name: "Discord",
    description: "Connect as a Discord bot",
    icon: "messageSquare",
    setupSteps: [
      "Create a Discord application at discord.com/developers",
      "Create a bot and copy the token",
      "Invite bot to your server",
    ],
    docsUrl: "https://docs.openclaw.ai/channels/discord",
    fields: [
      {
        name: "token",
        label: "Bot Token",
        type: "password",
        required: true,
        description: "Discord bot token from Developer Portal",
        placeholder: "YOUR_DISCORD_BOT_TOKEN",
      },
      {
        name: "dmPolicy",
        label: "Direct Message Policy",
        type: "select",
        required: true,
        defaultValue: "pairing",
        options: [
          { value: "pairing", label: "Pairing - Require approval code" },
          { value: "allowlist", label: "Allowlist - Only allow specific users" },
          { value: "open", label: "Open - Allow all" },
        ],
      },
      {
        name: "allowFrom",
        label: "Allowed User IDs",
        type: "array",
        description: "Discord user IDs allowed to DM the bot",
        placeholder: "123456789012345678",
      },
    ],
  },
  slack: {
    key: "slack",
    name: "Slack",
    description: "Connect to Slack workspace",
    icon: "messageSquare",
    setupSteps: [
      "Create a Slack app at api.slack.com/apps",
      "Add Bot Token Scopes: chat:write, im:read, im:write",
      "Install app to workspace and copy tokens",
    ],
    docsUrl: "https://docs.openclaw.ai/channels/slack",
    fields: [
      {
        name: "botToken",
        label: "Bot User OAuth Token",
        type: "password",
        required: true,
        description: "Starts with xoxb-",
        placeholder: "xoxb-your-bot-token",
      },
      {
        name: "mode",
        label: "Connection Mode",
        type: "select",
        required: true,
        defaultValue: "socket",
        options: [
          { value: "socket", label: "Socket Mode - Real-time events" },
          { value: "webhook", label: "HTTP Mode - Webhook endpoint" },
        ],
      },
      {
        name: "dmPolicy",
        label: "Direct Message Policy",
        type: "select",
        required: true,
        defaultValue: "pairing",
        options: [
          { value: "pairing", label: "Pairing - Require approval code" },
          { value: "allowlist", label: "Allowlist - Only specific users" },
          { value: "open", label: "Open - All users" },
        ],
      },
    ],
  },
  signal: {
    key: "signal",
    name: "Signal",
    description: "Connect to Signal messenger",
    icon: "messageSquare",
    setupSteps: [
      "Install signal-cli on your server",
      "Register/link your Signal number",
      "Configure access policy below",
    ],
    docsUrl: "https://docs.openclaw.ai/channels/signal",
    fields: [
      {
        name: "account",
        label: "Signal Account Number",
        type: "text",
        required: true,
        description: "Your Signal phone number in E.164 format",
        placeholder: "+15551234567",
      },
      {
        name: "dmPolicy",
        label: "Direct Message Policy",
        type: "select",
        required: true,
        defaultValue: "pairing",
        options: [
          { value: "pairing", label: "Pairing - Require approval code" },
          { value: "allowlist", label: "Allowlist - Only allow specific numbers" },
          { value: "open", label: "Open - Allow all" },
        ],
      },
      {
        name: "allowFrom",
        label: "Allowed Phone Numbers",
        type: "array",
        description: "Phone numbers in E.164 format",
        placeholder: "+15551234567",
      },
    ],
  },
  imessage: {
    key: "imessage",
    name: "iMessage",
    description: "Connect to Apple iMessage (Mac only)",
    icon: "messageSquare",
    setupSteps: [
      "Requires Mac with iMessage configured",
      "Enable Full Disk Access for terminal/app",
      "Configure BlueBubbles or direct access",
    ],
    docsUrl: "https://docs.openclaw.ai/channels/imessage",
    fields: [
      {
        name: "mode",
        label: "Connection Mode",
        type: "select",
        required: true,
        defaultValue: "bluebubbles",
        options: [
          { value: "bluebubbles", label: "BlueBubbles Server" },
          { value: "direct", label: "Direct Database Access (Mac only)" },
        ],
      },
      {
        name: "dmPolicy",
        label: "Direct Message Policy",
        type: "select",
        required: true,
        defaultValue: "pairing",
        options: [
          { value: "pairing", label: "Pairing - Require approval code" },
          { value: "allowlist", label: "Allowlist - Only specific contacts" },
          { value: "open", label: "Open - All contacts" },
        ],
      },
      {
        name: "allowFrom",
        label: "Allowed Contacts",
        type: "array",
        description: "Phone numbers or email addresses",
        placeholder: "+15551234567 or email@example.com",
      },
    ],
  },
  nostr: {
    key: "nostr",
    name: "Nostr",
    description: "Connect to Nostr decentralized social network",
    icon: "globe",
    setupSteps: [
      "Generate or import a Nostr key pair",
      "Configure relays",
      "Set up your profile",
    ],
    docsUrl: "https://docs.openclaw.ai/channels/nostr",
    fields: [
      {
        name: "privateKey",
        label: "Private Key (nsec)",
        type: "password",
        required: true,
        description: "Your Nostr private key in nsec format",
        placeholder: "nsec1...",
      },
      {
        name: "relays",
        label: "Relays",
        type: "array",
        required: true,
        description: "Nostr relay URLs",
        defaultValue: ["wss://relay.damus.io", "wss://relay.nostr.band"],
        placeholder: "wss://relay.example.com",
      },
      {
        name: "dmPolicy",
        label: "Direct Message Policy",
        type: "select",
        required: true,
        defaultValue: "pairing",
        options: [
          { value: "pairing", label: "Pairing - Require approval code" },
          { value: "allowlist", label: "Allowlist - Only specific pubkeys" },
          { value: "open", label: "Open - All" },
        ],
      },
    ],
  },
  googlechat: {
    key: "googlechat",
    name: "Google Chat",
    description: "Connect to Google Chat via Bot API",
    icon: "messageSquare",
    setupSteps: [
      "Create a Google Cloud project",
      "Enable Google Chat API",
      "Create a service account and download credentials",
    ],
    docsUrl: "https://docs.openclaw.ai/channels/googlechat",
    fields: [
      {
        name: "credentialsPath",
        label: "Service Account Credentials",
        type: "text",
        required: true,
        description: "Path to the downloaded JSON credentials file",
        placeholder: "/path/to/credentials.json",
      },
      {
        name: "dmPolicy",
        label: "Direct Message Policy",
        type: "select",
        required: true,
        defaultValue: "pairing",
        options: [
          { value: "pairing", label: "Pairing - Require approval code" },
          { value: "allowlist", label: "Allowlist - Only specific users" },
          { value: "open", label: "Open - All users in domain" },
        ],
      },
    ],
  },
};

export function getChannelSchema(key: string): ChannelConfigSchema | undefined {
  return CHANNEL_CONFIG_SCHEMAS[key as ChannelConfigType];
}

export function getDefaultChannelConfig(key: ChannelConfigType): Record<string, unknown> {
  const schema = CHANNEL_CONFIG_SCHEMAS[key];
  if (!schema) return { enabled: true };

  const config: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      config[field.name] = field.defaultValue;
    }
  }

  // Add enabled for channels that support it
  if (key !== "whatsapp") {
    config.enabled = true;
  }

  return config;
}
