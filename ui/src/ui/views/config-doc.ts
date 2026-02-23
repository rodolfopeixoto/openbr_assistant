import { html, nothing } from "lit";

export interface ConfigFieldDoc {
  name: string;
  type: string;
  description: string;
  default?: string | number | boolean | null;
  example?: string;
  required?: boolean;
}

export interface ConfigSectionDoc {
  key: string;
  label: string;
  description: string;
  fields: ConfigFieldDoc[];
}

// Documentation based on OpenClaw config schema
export const CONFIG_DOCUMENTATION: ConfigSectionDoc[] = [
  {
    key: "agents",
    label: "Agents",
    description: "Configure AI agents, models, and behaviors",
    fields: [
      {
        name: "defaults.model.primary",
        type: "string",
        description: "Default AI model for all agents (e.g., openai/gpt-4, anthropic/claude-3-opus)",
        example: "openai/gpt-4"
      },
      {
        name: "defaults.maxConcurrent",
        type: "number",
        description: "Maximum concurrent agent runs",
        default: 4
      },
      {
        name: "defaults.workspace",
        type: "string",
        description: "Workspace directory for agent files",
        example: "~/.openclaw/workspace"
      },
      {
        name: "defaults.verboseDefault",
        type: "string",
        description: "Default verbosity level: off, on, or full",
        default: "on"
      },
      {
        name: "list[].agentId",
        type: "string",
        description: "Unique identifier for the agent",
        example: "my-assistant"
      },
      {
        name: "list[].name",
        type: "string",
        description: "Display name for the agent",
        example: "My Assistant"
      }
    ]
  },
  {
    key: "channels",
    label: "Channels",
    description: "Configure messaging channels (WhatsApp, Telegram, Discord, etc.)",
    fields: [
      {
        name: "telegram.enabled",
        type: "boolean",
        description: "Enable Telegram channel",
        default: false
      },
      {
        name: "telegram.token",
        type: "string",
        description: "Telegram Bot API token",
        example: "123456789:ABCdefGHIjklMNOpqrSTUvwxyz"
      },
      {
        name: "discord.enabled",
        type: "boolean",
        description: "Enable Discord channel",
        default: false
      },
      {
        name: "discord.token",
        type: "string",
        description: "Discord Bot token",
        example: "MTAxMDEwMTAxMDEw.xxxxxx.xxxxxxxxxx"
      },
      {
        name: "whatsapp.enabled",
        type: "boolean",
        description: "Enable WhatsApp channel (uses Baileys library)",
        default: false
      },
      {
        name: "slack.enabled",
        type: "boolean",
        description: "Enable Slack channel",
        default: false
      },
      {
        name: "slack.token",
        type: "string",
        description: "Slack Bot User OAuth Token",
        example: "xoxb-EXAMPLE-TOKEN-REPLACE-THIS"
      }
    ]
  },
  {
    key: "gateway",
    label: "Gateway",
    description: "Gateway server configuration",
    fields: [
      {
        name: "port",
        type: "number",
        description: "Port number for the gateway server",
        default: 18789,
        example: "18789"
      },
      {
        name: "mode",
        type: "string",
        description: "Gateway mode: local, remote, or hybrid",
        default: "local"
      },
      {
        name: "bind",
        type: "string",
        description: "Network interface to bind: loopback (127.0.0.1), all (0.0.0.0), or specific IP",
        default: "loopback"
      },
      {
        name: "auth.mode",
        type: "string",
        description: "Authentication mode: token, oauth, or none",
        default: "token"
      },
      {
        name: "auth.token",
        type: "string",
        description: "Authentication token for API access",
        example: "your-secure-token-here"
      },
      {
        name: "tls.enabled",
        type: "boolean",
        description: "Enable HTTPS/TLS encryption",
        default: true
      }
    ]
  },
  {
    key: "tools",
    label: "Tools",
    description: "Enable and configure available tools",
    fields: [
      {
        name: "browser.enabled",
        type: "boolean",
        description: "Enable browser automation tool",
        default: false
      },
      {
        name: "browser.mode",
        type: "string",
        description: "Browser mode: playwright, puppeteer, or local",
        default: "playwright"
      },
      {
        name: "search.enabled",
        type: "boolean",
        description: "Enable web search tool",
        default: false
      },
      {
        name: "search.provider",
        type: "string",
        description: "Search provider: google, bing, duckduckgo",
        default: "google"
      },
      {
        name: "exec.enabled",
        type: "boolean",
        description: "Enable command execution tool (security risk!)",
        default: false
      },
      {
        name: "exec.approval",
        type: "string",
        description: "Command approval mode: always, never, or ask",
        default: "ask"
      }
    ]
  },
  {
    key: "logging",
    label: "Logging",
    description: "Configure logging output and levels",
    fields: [
      {
        name: "level",
        type: "string",
        description: "Log level: silent, fatal, error, warn, info, debug, trace",
        default: "info"
      },
      {
        name: "consoleLevel",
        type: "string",
        description: "Console log level (can be different from file level)",
        default: "info"
      },
      {
        name: "file",
        type: "string",
        description: "Log file path (optional)",
        example: "~/.openclaw/logs/gateway.log"
      },
      {
        name: "consoleStyle",
        type: "string",
        description: "Console output style: pretty, compact, json",
        default: "pretty"
      }
    ]
  },
  {
    key: "messages",
    label: "Messages",
    description: "Message handling and routing settings",
    fields: [
      {
        name: "ackReactionScope",
        type: "string",
        description: "When to send acknowledgment reactions: never, group-mentions, all",
        default: "group-mentions"
      },
      {
        name: "autoReply",
        type: "boolean",
        description: "Enable automatic replies",
        default: true
      },
      {
        name: "rateLimit.maxPerMinute",
        type: "number",
        description: "Maximum messages per minute per user",
        default: 30
      }
    ]
  },
  {
    key: "commands",
    label: "Commands",
    description: "Custom slash commands configuration",
    fields: [
      {
        name: "native",
        type: "string",
        description: "Native commands mode: auto, enabled, or disabled",
        default: "auto"
      },
      {
        name: "prefix",
        type: "string",
        description: "Command prefix character",
        default: "/"
      }
    ]
  },
  {
    key: "update",
    label: "Updates",
    description: "Auto-update configuration",
    fields: [
      {
        name: "channel",
        type: "string",
        description: "Update channel: stable, beta, or dev",
        default: "stable"
      },
      {
        name: "checkOnStart",
        type: "boolean",
        description: "Check for updates on startup",
        default: true
      }
    ]
  },
  {
    key: "env",
    label: "Environment",
    description: "Environment variables and shell configuration",
    fields: [
      {
        name: "shellEnv.enabled",
        type: "boolean",
        description: "Load shell environment variables",
        default: true
      },
      {
        name: "shellEnv.timeoutMs",
        type: "number",
        description: "Timeout for loading shell environment (ms)",
        default: 5000
      }
    ]
  }
];

// Templates for quick insertion
export const CONFIG_TEMPLATES: Record<string, string> = {
  agents: `{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-4"
      },
      "maxConcurrent": 4,
      "workspace": "~/.openclaw/workspace",
      "verboseDefault": "on"
    },
    "list": [
      {
        "agentId": "main",
        "name": "Assistant",
        "enabled": true
      }
    ]
  }
}`,

  telegram: `{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN_HERE",
      "allowGroups": true,
      "allowDMs": true
    }
  }
}`,

  discord: `{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN_HERE",
      "intents": ["Guilds", "GuildMessages", "DirectMessages"]
    }
  }
}`,

  whatsapp: `{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "sessionName": "openclaw",
      "autoReconnect": true
    }
  }
}`,

  slack: `{
  "channels": {
    "slack": {
      "enabled": true,
      "token": "xoxb-EXAMPLE-TOKEN-REPLACE-THIS",
      "signingSecret": "YOUR_SIGNING_SECRET"
    }
  }
}`,

  gateway: `{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "generate-a-secure-token"
    },
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}`,

  logging: `{
  "logging": {
    "level": "info",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "file": "~/.openclaw/logs/openclaw.log"
  }
}`,

  tools: `{
  "tools": {
    "browser": {
      "enabled": true,
      "mode": "playwright"
    },
    "search": {
      "enabled": true,
      "provider": "google"
    }
  }
}`
};

export type DocPanelProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onInsertTemplate: (template: string) => void;
  onInsertField: (field: string) => void;
};

export function renderDocPanel(props: DocPanelProps) {
  const filteredDocs = props.searchQuery
    ? CONFIG_DOCUMENTATION.filter(
        (section) =>
          section.label.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
          section.key.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
          section.fields.some(
            (field) =>
              field.name.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
              field.description.toLowerCase().includes(props.searchQuery.toLowerCase())
          )
      )
    : CONFIG_DOCUMENTATION;

  return html`
    <div class="config-doc-panel">
      <div class="config-doc-panel__header">
        <h3 class="config-doc-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Configuration Reference
        </h3>
        <div class="config-doc-panel__search">
          <input
            type="text"
            class="config-doc-panel__search-input"
            placeholder="Search fields..."
            .value=${props.searchQuery}
            @input=${(e: Event) => props.onSearchChange((e.target as HTMLInputElement).value)}
          />
          <svg class="config-doc-panel__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>
      </div>

      <div class="config-doc-panel__content">
        ${filteredDocs.length === 0
          ? html`<div class="config-doc-panel__empty">No fields found matching "${props.searchQuery}"</div>`
          : filteredDocs.map(
              (section) => html`
                <details class="config-doc-section" ?open=${props.searchQuery !== ""}>
                  <summary class="config-doc-section__header">
                    <span class="config-doc-section__label">${section.label}</span>
                    <span class="config-doc-section__key">${section.key}</span>
                    ${CONFIG_TEMPLATES[section.key]
                      ? html`
                          <button
                            class="config-doc-section__insert-btn"
                            @click=${(e: Event) => {
                              e.stopPropagation();
                              props.onInsertTemplate(CONFIG_TEMPLATES[section.key]);
                            }}
                            title="Insert ${section.key} template"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Insert Template
                          </button>
                        `
                      : nothing}
                  </summary>
                  <div class="config-doc-section__description">${section.description}</div>
                  <div class="config-doc-fields">
                    ${section.fields.map(
                      (field) => html`
                        <div class="config-doc-field">
                          <div class="config-doc-field__header">
                            <code class="config-doc-field__name">${field.name}</code>
                            <span class="config-doc-field__type">${field.type}</span>
                            ${field.required
                              ? html`<span class="config-doc-field__badge config-doc-field__badge--required">required</span>`
                              : nothing}
                            ${field.default !== undefined
                              ? html`<span class="config-doc-field__badge">default: ${field.default}</span>`
                              : nothing}
                            <button
                              class="config-doc-field__insert"
                              @click=${() => props.onInsertField(`"${field.name}": `)}
                              title="Insert field name"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                            </button>
                          </div>
                          <div class="config-doc-field__description">${field.description}</div>
                          ${field.example
                            ? html`<div class="config-doc-field__example">Example: <code>${field.example}</code></div>`
                            : nothing}
                        </div>
                      `
                    )}
                  </div>
                </details>
              `
            )}
      </div>

      <div class="config-doc-panel__footer">
        <div class="config-doc-panel__tip">
          <strong>Tip:</strong> Click "Insert Template" to add a complete configuration section, or click the + icon next to a field to insert just that field.
        </div>
      </div>
    </div>
  `;
}
