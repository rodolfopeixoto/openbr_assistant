import { html, nothing } from "lit";
import type { ToolCard } from "../types/chat-types";
import { icons } from "../icons";
import { formatToolDetail, resolveToolDisplay } from "../tool-display";
import { TOOL_INLINE_THRESHOLD } from "./constants";
import { extractTextCached } from "./message-extract";
import { isToolResultMessage } from "./message-normalizer";
import { extractErrorMessage, formatToolOutputForSidebar, getTruncatedPreview } from "./tool-helpers";

export function extractToolCards(message: unknown): ToolCard[] {
  const m = message as Record<string, unknown>;
  const content = normalizeContent(m.content);
  const cards: ToolCard[] = [];

  for (const item of content) {
    const kind = String(item.type ?? "").toLowerCase();
    const isToolCall =
      ["toolcall", "tool_call", "tooluse", "tool_use"].includes(kind) ||
      (typeof item.name === "string" && item.arguments != null);
    if (isToolCall) {
      cards.push({
        kind: "call",
        name: (item.name as string) ?? "tool",
        args: coerceArgs(item.arguments ?? item.args),
      });
    }
  }

  for (const item of content) {
    const kind = String(item.type ?? "").toLowerCase();
    if (kind !== "toolresult" && kind !== "tool_result") continue;
    const text = extractToolText(item);
    const name = typeof item.name === "string" ? item.name : "tool";
    cards.push({ kind: "result", name, text });
  }

  if (isToolResultMessage(message) && !cards.some((card) => card.kind === "result")) {
    const name =
      (typeof m.toolName === "string" && m.toolName) ||
      (typeof m.tool_name === "string" && m.tool_name) ||
      "tool";
    const text = extractTextCached(message) ?? undefined;
    cards.push({ kind: "result", name, text });
  }

  return cards;
}

// Helper to detect if tool result is an error
function isToolError(text: string | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower.includes('"status": "error"') || 
         lower.includes('"error":') ||
         lower.includes('error:') ||
         lower.includes('failed') ||
         lower.includes('exception');
}

// Helper to detect if tool result is a warning
function isToolWarning(text: string | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower.includes('"status": "warning"') || 
         lower.includes('"warning":') ||
         lower.includes('warning:') ||
         lower.includes('deprecated');
}

// Format JSON for display
function formatJSONDisplay(text: string): string {
  // First check if it's an error - if so, extract clean message
  const errorMessage = extractErrorMessage(text);
  if (errorMessage && text.trim().startsWith('{')) {
    return errorMessage;
  }

  try {
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const parsed = JSON.parse(trimmed);
      
      // Check if it's a simple success response
      if (parsed.status === 'success' && Object.keys(parsed).length <= 2) {
        return parsed.message || 'Completed successfully';
      }
      
      // Format JSON nicely
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Not valid JSON, return as-is
  }
  return text;
}

// Extract status from tool result
function extractStatus(text: string | undefined): { status: 'success' | 'error' | 'warning' | 'info'; message?: string } {
  if (!text) return { status: 'info' };
  
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.status) {
        return { status: parsed.status as 'success' | 'error' | 'warning', message: parsed.message || parsed.error };
      }
    }
  } catch {
    // Not JSON
  }
  
  if (isToolError(text)) return { status: 'error' };
  if (isToolWarning(text)) return { status: 'warning' };
  return { status: 'success' };
}

export function renderToolCardSidebar(card: ToolCard, onOpenSidebar?: (content: string) => void) {
  const display = resolveToolDisplay({ name: card.name, args: card.args });
  const detail = formatToolDetail(display);
  const hasText = Boolean(card.text?.trim());
  const status = extractStatus(card.text);
  
  const canClick = Boolean(onOpenSidebar);
  const handleClick = canClick
    ? () => {
        if (hasText) {
          onOpenSidebar!(formatToolOutputForSidebar(card.text!));
          return;
        }
        const info = `## ${display.label}\n\n${
          detail ? `**Command:** \`${detail}\`\n\n` : ""
        }*No output — tool completed successfully.*`;
        onOpenSidebar!(info);
      }
    : undefined;

  const isShort = hasText && (card.text?.length ?? 0) <= TOOL_INLINE_THRESHOLD;
  const showCollapsed = hasText && !isShort;
  const showInline = hasText && isShort;
  const isEmpty = !hasText;
  
  // Choose icon based on status
  const statusIcon = status.status === 'error' ? icons.alertCircle :
                    status.status === 'warning' ? icons.alertTriangle :
                    status.status === 'success' ? icons.checkCircle :
                    icons.info;

  // Status badge color
  const statusClass = `chat-tool-card--${status.status}`;

  return html`
    <div
      class="chat-tool-card ${statusClass} ${canClick ? "chat-tool-card--clickable" : ""}"
      @click=${handleClick}
      role=${canClick ? "button" : nothing}
      tabindex=${canClick ? "0" : nothing}
      @keydown=${
        canClick
          ? (e: KeyboardEvent) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              handleClick?.();
            }
          : nothing
      }
    >
      <div class="chat-tool-card__header">
        <div class="chat-tool-card__title">
          <span class="chat-tool-card__icon">${icons[display.icon]}</span>
          <span class="chat-tool-card__name">${display.label}</span>
        </div>
        <div class="chat-tool-card__meta">
          ${status.status !== 'info' ? html`
            <span class="chat-tool-card__status-badge chat-tool-card__status-badge--${status.status}">
              ${statusIcon}
              <span>${status.status}</span>
            </span>
          ` : nothing}
          ${canClick && hasText
            ? html`<span class="chat-tool-card__action">View details ${icons.chevronRight}</span>`
            : nothing}
        </div>
      </div>
      
      ${detail ? html`<div class="chat-tool-card__detail">${detail}</div>` : nothing}
      
      ${status.message ? html`
        <div class="chat-tool-card__message chat-tool-card__message--${status.status}">
          ${status.message}
        </div>
      ` : nothing}
      
      ${isEmpty
        ? html`<div class="chat-tool-card__status-text">Completed successfully</div>`
        : nothing}
        
      ${showCollapsed
        ? html`<div class="chat-tool-card__preview">${formatJSONDisplay(getTruncatedPreview(card.text!))}</div>`
        : nothing}
        
      ${showInline ? html`<div class="chat-tool-card__inline">${formatJSONDisplay(card.text!)}</div>` : nothing}
    </div>
  `;
}

function normalizeContent(content: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(content)) return [];
  return content.filter(Boolean) as Array<Record<string, unknown>>;
}

function coerceArgs(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function extractToolText(item: Record<string, unknown>): string | undefined {
  if (typeof item.text === "string") return item.text;
  if (typeof item.content === "string") return item.content;
  return undefined;
}
