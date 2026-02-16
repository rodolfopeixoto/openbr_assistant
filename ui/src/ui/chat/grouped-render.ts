import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { AssistantIdentity } from "../assistant-identity";
import type { MessageGroup } from "../types/chat-types";
import { toSanitizedMarkdownHtml } from "../markdown";
import { renderCopyAsMarkdownButton } from "./copy-as-markdown";
import {
  extractTextCached,
  extractThinkingCached,
  formatReasoningMarkdown,
} from "./message-extract";
import { isToolResultMessage, normalizeRoleForGrouping } from "./message-normalizer";
import { icons } from "../icons";
import { extractToolCards, renderToolCardSidebar } from "./tool-cards";

type ImageBlock = {
  url: string;
  alt?: string;
};

function extractImages(message: unknown): ImageBlock[] {
  const m = message as Record<string, unknown>;
  const content = m.content;
  const images: ImageBlock[] = [];

  if (Array.isArray(content)) {
    for (const block of content) {
      if (typeof block !== "object" || block === null) continue;
      const b = block as Record<string, unknown>;

      if (b.type === "image") {
        const source = b.source as Record<string, unknown> | undefined;
        if (source?.type === "base64" && typeof source.data === "string") {
          const data = source.data as string;
          const mediaType = (source.media_type as string) || "image/png";
          const url = data.startsWith("data:") ? data : `data:${mediaType};base64,${data}`;
          images.push({ url });
        } else if (typeof b.url === "string") {
          images.push({ url: b.url });
        }
      } else if (b.type === "image_url") {
        const imageUrl = b.image_url as Record<string, unknown> | undefined;
        if (typeof imageUrl?.url === "string") {
          images.push({ url: imageUrl.url });
        }
      }
    }
  }

  return images;
}

export function renderReadingIndicatorGroup(assistant?: AssistantIdentity) {
  return html`
    <div class="chat-group assistant">
      <div class="chat-group-messages">
        ${renderAvatar("assistant", assistant)}
        <div class="chat-bubble chat-reading-indicator" aria-hidden="true">
          <span class="chat-reading-indicator__dots">
            <span></span><span></span><span></span>
          </span>
        </div>
      </div>
    </div>
  `;
}

export function renderStreamingGroup(
  text: string,
  startedAt: number,
  onOpenSidebar?: (content: string) => void,
  assistant?: AssistantIdentity,
) {
  const timestamp = new Date(startedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const name = assistant?.name ?? "Assistant";

  return html`
    <div class="chat-group assistant">
      <div class="chat-group-messages">
        ${renderAvatar("assistant", assistant)}
        <div class="chat-message__content">
          <div class="chat-group-footer">
            <span class="chat-sender-name">${name}</span>
            <span class="chat-group-timestamp">${timestamp}</span>
          </div>
          ${renderGroupedMessage(
            {
              role: "assistant",
              content: [{ type: "text", text }],
              timestamp: startedAt,
            },
            { isStreaming: true, showReasoning: false, showTools: false },
            onOpenSidebar,
          )}
        </div>
      </div>
    </div>
  `;
}

export function renderMessageGroup(
  group: MessageGroup,
  opts: {
    onOpenSidebar?: (content: string) => void;
    showReasoning: boolean;
    showTools: boolean;
    assistantName?: string;
    assistantAvatar?: string | null;
  },
) {
  const normalizedRole = normalizeRoleForGrouping(group.role);
  const assistantName = opts.assistantName ?? "Assistant";
  const who =
    normalizedRole === "user"
      ? "You"
      : normalizedRole === "assistant"
        ? assistantName
        : normalizedRole;
  const assistantIdentity = {
    name: assistantName,
    avatar: opts.assistantAvatar ?? null,
  };
  const timestamp = new Date(group.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return html`
    <div class="chat-group ${normalizedRole}">
      <div class="chat-group-messages">
        ${renderAvatar(group.role, assistantIdentity)}
        <div class="chat-message__content">
          <div class="chat-group-footer">
            <span class="chat-sender-name">${who}</span>
            <span class="chat-group-timestamp">${timestamp}</span>
          </div>
          ${group.messages.map((item, index) =>
            renderGroupedMessage(
              item.message,
              {
                isStreaming: group.isStreaming && index === group.messages.length - 1,
                showReasoning: opts.showReasoning,
                showTools: opts.showTools,
              },
              opts.onOpenSidebar,
            ),
          )}
        </div>
      </div>
    </div>
  `;
}

function renderAvatar(role: string, assistant?: Pick<AssistantIdentity, "name" | "avatar">) {
  const normalized = normalizeRoleForGrouping(role);
  const assistantName = assistant?.name?.trim() || "Assistant";
  const assistantAvatar = assistant?.avatar?.trim() || "";
  const initial =
    normalized === "user"
      ? "Y"
      : normalized === "assistant"
        ? assistantName.charAt(0).toUpperCase() || "A"
        : normalized === "tool"
          ? "⚙"
          : "?";

  if (assistantAvatar && normalized === "assistant") {
    if (isAvatarUrl(assistantAvatar)) {
      return html`<img class="chat-avatar ${normalized}" src="${assistantAvatar}" alt="${assistantName}" />`;
    }
    return html`<div class="chat-avatar ${normalized}">${assistantAvatar}</div>`;
  }

  return html`<div class="chat-avatar ${normalized}">${initial}</div>`;
}

function isAvatarUrl(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) || /^data:image\//i.test(value) || /^\//.test(value)
  );
}

function renderMessageImages(images: ImageBlock[]) {
  if (images.length === 0) return nothing;

  return html`
    <div class="chat-message-images">
      ${images.map(
        (img) => html`
          <img
            src=${img.url}
            alt=${img.alt ?? "Attached image"}
            class="chat-message-image"
            @click=${() => window.open(img.url, "_blank")}
          />
        `,
      )}
    </div>
  `;
}

function renderGroupedMessage(
  message: unknown,
  opts: { isStreaming: boolean; showReasoning: boolean; showTools: boolean },
  onOpenSidebar?: (content: string) => void,
) {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role : "unknown";
  const isToolResult =
    isToolResultMessage(message) ||
    role.toLowerCase() === "toolresult" ||
    role.toLowerCase() === "tool_result" ||
    typeof m.toolCallId === "string" ||
    typeof m.tool_call_id === "string";

  const toolCards = extractToolCards(message);
  const hasToolCards = toolCards.length > 0;
  const images = extractImages(message);
  const hasImages = images.length > 0;

  const extractedText = extractTextCached(message);
  const extractedThinking =
    opts.showReasoning && role === "assistant" ? extractThinkingCached(message) : null;
  const markdownBase = extractedText?.trim() ? extractedText : null;
  const reasoningMarkdown = extractedThinking ? formatReasoningMarkdown(extractedThinking) : null;
  const markdown = markdownBase;
  const canCopyMarkdown = role === "assistant" && Boolean(markdown?.trim());

  const bubbleClasses = [
    "chat-bubble",
    canCopyMarkdown ? "has-copy" : "",
    opts.isStreaming ? "streaming" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // If it's only tool results with no text
  if (!markdown && hasToolCards && isToolResult) {
    if (opts.showTools) {
      return html`${toolCards.map((card) => renderToolCardSidebar(card, onOpenSidebar))}`;
    }
    // Show minimal indicator when tools are hidden
    return html`${renderToolIndicator(toolCards.length)}`;
  }

  // If nothing to render, return nothing
  if (!markdown && !hasToolCards && !hasImages) return nothing;

  return html`
    <div class="${bubbleClasses}">
      ${canCopyMarkdown ? renderCopyAsMarkdownButton(markdown!) : nothing}
      ${renderMessageImages(images)}
      ${reasoningMarkdown
        ? html`<div class="chat-thinking">
            <div class="chat-thinking__header">Thinking</div>
            <div class="chat-thinking__content">${unsafeHTML(toSanitizedMarkdownHtml(reasoningMarkdown))}</div>
          </div>`
        : nothing}
      ${markdown
        ? html`<div class="chat-text">${unsafeHTML(toSanitizedMarkdownHtml(markdown))}</div>`
        : nothing}
      ${opts.showTools
        ? toolCards.map((card) => renderToolCardSidebar(card, onOpenSidebar))
        : hasToolCards ? renderToolIndicator(toolCards.length) : nothing}
    </div>
  `;
}

function renderToolIndicator(count: number) {
  return html`
    <div class="chat-tool-indicator">
      <span class="chat-tool-indicator__icon">${icons.wrench}</span>
      <span class="chat-tool-indicator__text">${count} tool${count > 1 ? 's' : ''} used</span>
    </div>
  `;
}
