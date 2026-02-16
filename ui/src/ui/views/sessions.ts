import { html, nothing } from "lit";
import type { GatewaySessionRow, SessionsListResult } from "../types";
import { formatAgo } from "../format";
import { pathForTab } from "../navigation";
import { formatSessionTokens } from "../presenter";
import { icons } from "../icons";

export type SessionsProps = {
  loading: boolean;
  result: SessionsListResult | null;
  error: string | null;
  activeMinutes: string;
  limit: string;
  includeGlobal: boolean;
  includeUnknown: boolean;
  basePath: string;
  onFiltersChange: (next: {
    activeMinutes: string;
    limit: string;
    includeGlobal: boolean;
    includeUnknown: boolean;
  }) => void;
  onRefresh: () => void;
  onPatch: (
    key: string,
    patch: {
      label?: string | null;
      thinkingLevel?: string | null;
      verboseLevel?: string | null;
      reasoningLevel?: string | null;
    },
  ) => void;
  onDelete: (key: string) => void;
};

const THINK_LEVELS = ["", "off", "minimal", "low", "medium", "high"] as const;
const BINARY_THINK_LEVELS = ["", "off", "on"] as const;
const VERBOSE_LEVELS = [
  { value: "", label: "inherit" },
  { value: "off", label: "off (explicit)" },
  { value: "on", label: "on" },
] as const;
const REASONING_LEVELS = ["", "off", "on", "stream"] as const;

function normalizeProviderId(provider?: string | null): string {
  if (!provider) return "";
  const normalized = provider.trim().toLowerCase();
  if (normalized === "z.ai" || normalized === "z-ai") return "zai";
  return normalized;
}

function isBinaryThinkingProvider(provider?: string | null): boolean {
  return normalizeProviderId(provider) === "zai";
}

function resolveThinkLevelOptions(provider?: string | null): readonly string[] {
  return isBinaryThinkingProvider(provider) ? BINARY_THINK_LEVELS : THINK_LEVELS;
}

function resolveThinkLevelDisplay(value: string, isBinary: boolean): string {
  if (!isBinary) return value;
  if (!value || value === "off") return value;
  return "on";
}

function resolveThinkLevelPatchValue(value: string, isBinary: boolean): string | null {
  if (!value) return null;
  if (!isBinary) return value;
  if (value === "on") return "low";
  return value;
}

export function renderSessions(props: SessionsProps) {
  const rows = props.result?.sessions ?? [];
  const totalSessions = rows.length;

  return html`
    <div class="sessions-page">
      <!-- Header -->
      <header class="sessions-header">
        <div class="sessions-header__content">
          <h1 class="sessions-header__title">
            <span class="sessions-header__icon">${icons.database}</span>
            Sessions
          </h1>
          <p class="sessions-header__subtitle">
            Active session keys and per-session overrides
          </p>
        </div>
        <button 
          class="btn btn--secondary" 
          ?disabled=${props.loading} 
          @click=${props.onRefresh}
        >
          ${props.loading 
            ? html`<span class="spinner"></span> Refreshing...` 
            : html`${icons.refreshCw} Refresh`
          }
        </button>
      </header>

      <!-- Filters -->
      <div class="sessions-filters">
        <label class="sessions-filter">
          <span class="sessions-filter__label">Active within (minutes)</span>
          <input
            class="sessions-filter__input"
            .value=${props.activeMinutes}
            @input=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: (e.target as HTMLInputElement).value,
                limit: props.limit,
                includeGlobal: props.includeGlobal,
                includeUnknown: props.includeUnknown,
              })}
          />
        </label>
        
        <label class="sessions-filter">
          <span class="sessions-filter__label">Limit</span>
          <input
            class="sessions-filter__input"
            .value=${props.limit}
            @input=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: (e.target as HTMLInputElement).value,
                includeGlobal: props.includeGlobal,
                includeUnknown: props.includeUnknown,
              })}
          />
        </label>
        
        <label class="sessions-filter sessions-filter--checkbox">
          <input
            class="sessions-filter__checkbox"
            type="checkbox"
            .checked=${props.includeGlobal}
            @change=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: props.limit,
                includeGlobal: (e.target as HTMLInputElement).checked,
                includeUnknown: props.includeUnknown,
              })}
          />
          <span class="sessions-filter__label">Include global</span>
        </label>
        
        <label class="sessions-filter sessions-filter--checkbox">
          <input
            class="sessions-filter__checkbox"
            type="checkbox"
            .checked=${props.includeUnknown}
            @change=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: props.limit,
                includeGlobal: props.includeGlobal,
                includeUnknown: (e.target as HTMLInputElement).checked,
              })}
          />
          <span class="sessions-filter__label">Include unknown</span>
        </label>
      </div>

      <!-- Stats -->
      <div class="sessions-stats">
        ${props.result 
          ? `${totalSessions} session${totalSessions !== 1 ? 's' : ''} found • Store: ${props.result.path}`
          : 'Loading sessions...'
        }
      </div>

      <!-- Error -->
      ${props.error
        ? html`<div class="sessions-error" style="margin-bottom: 16px;">${props.error}</div>`
        : nothing
      }

      <!-- Desktop Table -->
      <div class="sessions-table-container">
        ${rows.length === 0 
          ? renderEmptyState()
          : html`
            <table class="sessions-table">
              <thead class="sessions-table__head">
                <tr>
                  <th>Key</th>
                  <th>Label</th>
                  <th>Kind</th>
                  <th>Updated</th>
                  <th>Tokens</th>
                  <th>Thinking</th>
                  <th>Verbose</th>
                  <th>Reasoning</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody class="sessions-table__body">
                ${rows.map((row) => renderTableRow(row, props))}
              </tbody>
            </table>
          `
        }
      </div>

      <!-- Mobile Cards -->
      <div class="sessions-mobile">
        ${rows.length === 0 
          ? renderEmptyState()
          : rows.map((row) => renderMobileCard(row, props))
        }
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return html`
    <div class="sessions-empty">
      <div class="sessions-empty__icon">${icons.database}</div>
      <h3 class="sessions-empty__title">No sessions found</h3>
      <p class="sessions-empty__text">Try adjusting your filters or refresh the page.</p>
    </div>
  `;
}

function renderTableRow(row: GatewaySessionRow, props: SessionsProps) {
  const updated = row.updatedAt ? formatAgo(row.updatedAt) : "n/a";
  const rawThinking = row.thinkingLevel ?? "";
  const isBinaryThinking = isBinaryThinkingProvider(row.modelProvider);
  const thinking = resolveThinkLevelDisplay(rawThinking, isBinaryThinking);
  const thinkLevels = resolveThinkLevelOptions(row.modelProvider);
  const verbose = row.verboseLevel ?? "";
  const reasoning = row.reasoningLevel ?? "";
  const displayName = row.displayName ?? row.key;
  const canLink = row.kind !== "global";
  const chatUrl = canLink
    ? `${pathForTab("chat", props.basePath)}?session=${encodeURIComponent(row.key)}`
    : null;

  const kindClass = row.kind === 'global' 
    ? 'sessions-table__kind--global' 
    : row.kind === 'direct' 
      ? 'sessions-table__kind--user' 
      : '';

  return html`
    <tr>
      <td>
        <div class="sessions-table__key">
          ${canLink 
            ? html`<a href=${chatUrl} target="_blank">${displayName}</a>`
            : displayName
          }
        </div>
      </td>
      
      <td>
        <input
          class="sessions-table__label-input"
          .value=${row.label ?? ""}
          ?disabled=${props.loading}
          placeholder="(optional)"
          @change=${(e: Event) => {
            const value = (e.target as HTMLInputElement).value.trim();
            props.onPatch(row.key, { label: value || null });
          }}
        />
      </td>
      
      <td>
        <span class="sessions-table__kind ${kindClass}">${row.kind}</span>
      </td>
      
      <td class="sessions-table__time">${updated}</td>
      
      <td class="sessions-table__tokens">${formatSessionTokens(row)}</td>
      
      <td>
        <select
          class="sessions-table__select"
          .value=${thinking}
          ?disabled=${props.loading}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            props.onPatch(row.key, {
              thinkingLevel: resolveThinkLevelPatchValue(value, isBinaryThinking),
            });
          }}
        >
          ${thinkLevels.map((level) => html`<option value=${level}>${level || "inherit"}</option>`
          )}
        </select>
      </td>
      
      <td>
        <select
          class="sessions-table__select"
          .value=${verbose}
          ?disabled=${props.loading}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            props.onPatch(row.key, { verboseLevel: value || null });
          }}
        >
          ${VERBOSE_LEVELS.map(
            (level) => html`<option value=${level.value}>${level.label}</option>`,
          )}
        </select>
      </td>
      
      <td>
        <select
          class="sessions-table__select"
          .value=${reasoning}
          ?disabled=${props.loading}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            props.onPatch(row.key, { reasoningLevel: value || null });
          }}
        >
          ${REASONING_LEVELS.map(
            (level) => html`<option value=${level}>${level || "inherit"}</option>`,
          )}
        </select>
      </td>
      
      <td>
        <div class="sessions-table__actions">
          ${canLink 
            ? html`
              <a 
                href=${chatUrl} 
                target="_blank"
                class="btn btn--secondary btn--sm"
              >
                Chat
              </a>
            `
            : nothing
          }
          <button 
            class="btn btn--danger btn--sm" 
            ?disabled=${props.loading} 
            @click=${() => props.onDelete(row.key)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderMobileCard(row: GatewaySessionRow, props: SessionsProps) {
  const updated = row.updatedAt ? formatAgo(row.updatedAt) : "n/a";
  const rawThinking = row.thinkingLevel ?? "";
  const isBinaryThinking = isBinaryThinkingProvider(row.modelProvider);
  const thinking = resolveThinkLevelDisplay(rawThinking, isBinaryThinking);
  const thinkLevels = resolveThinkLevelOptions(row.modelProvider);
  const verbose = row.verboseLevel ?? "";
  const reasoning = row.reasoningLevel ?? "";
  const displayName = row.displayName ?? row.key;
  const canLink = row.kind !== "global";
  const chatUrl = canLink
    ? `${pathForTab("chat", props.basePath)}?session=${encodeURIComponent(row.key)}`
    : null;

  const kindClass = row.kind === 'global'
    ? 'sessions-table__kind--global'
    : row.kind === 'direct'
      ? 'sessions-table__kind--user'
      : '';

  return html`
    <div class="session-card">
      <div class="session-card__header">
        <div class="session-card__key">
          <div class="session-card__key-text">
            ${canLink
              ? html`<a href=${chatUrl} target="_blank">${displayName}</a>`
              : displayName
            }
          </div>
          <span class="sessions-table__kind ${kindClass} session-card__kind">${row.kind}</span>
        </div>
        <div class="session-card__time">${updated}</div>
      </div>
      
      <div class="session-card__body">
        <div class="session-card__field">
          <span class="session-card__field-label">Label</span>
          <input
            class="session-card__input"
            .value=${row.label ?? ""}
            ?disabled=${props.loading}
            placeholder="(optional)"
            @change=${(e: Event) => {
              const value = (e.target as HTMLInputElement).value.trim();
              props.onPatch(row.key, { label: value || null });
            }}
          />
        </div>
        
        <div class="session-card__field">
          <span class="session-card__field-label">Tokens</span>
          <span class="session-card__field-value">${formatSessionTokens(row)}</span>
        </div>
        
        <div class="session-card__field">
          <span class="session-card__field-label">Thinking</span>
          <select
            class="session-card__select"
            .value=${thinking}
            ?disabled=${props.loading}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              props.onPatch(row.key, {
                thinkingLevel: resolveThinkLevelPatchValue(value, isBinaryThinking),
              });
            }}
          >
            ${thinkLevels.map((level) => html`<option value=${level}>${level || "inherit"}</option>`
            )}
          </select>
        </div>
        
        <div class="session-card__field">
          <span class="session-card__field-label">Verbose</span>
          <select
            class="session-card__select"
            .value=${verbose}
            ?disabled=${props.loading}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              props.onPatch(row.key, { verboseLevel: value || null });
            }}
          >
            ${VERBOSE_LEVELS.map(
              (level) => html`<option value=${level.value}>${level.label}</option>`,
            )}
          </select>
        </div>
        
        <div class="session-card__field">
          <span class="session-card__field-label">Reasoning</span>
          <select
            class="session-card__select"
            .value=${reasoning}
            ?disabled=${props.loading}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              props.onPatch(row.key, { reasoningLevel: value || null });
            }}
          >
            ${REASONING_LEVELS.map(
              (level) => html`<option value=${level}>${level || "inherit"}</option>`,
            )}
          </select>
        </div>
      </div>
      
      <div class="session-card__footer">
        ${canLink 
          ? html`
            <a 
              href=${chatUrl} 
              target="_blank"
              class="btn btn--secondary"
            >
              Open Chat
            </a>
          `
          : nothing
        }
        <button 
          class="btn btn--danger" 
          ?disabled=${props.loading} 
          @click=${() => props.onDelete(row.key)}
        >
          Delete
        </button>
      </div>
    </div>
  `;
}
