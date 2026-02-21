import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { state } from "lit/decorators.js";
import type { SessionsListResult } from "../types";
import type { ChatItem, MessageGroup } from "../types/chat-types";
import type { ChatAttachment, ChatQueueItem } from "../ui-types";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
} from "../chat/grouped-render";
import { normalizeMessage, normalizeRoleForGrouping } from "../chat/message-normalizer";
import { icons } from "../icons";
import { renderMarkdownSidebar } from "./markdown-sidebar";
import "../components/resizable-divider";
import "../components/ThinkingIndicator";
import type { ThinkingStep, ThinkingLevel } from "../components/ThinkingIndicator";
import "../../components/ScrollToBottomButton";

// Quick commands definition
interface QuickCommand {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof icons;
  template: string;
}

const QUICK_COMMANDS: QuickCommand[] = [
  {
    id: 'memory',
    label: 'Search Memory',
    description: 'Search your stored memories',
    icon: 'brain',
    template: 'Search my memory for: '
  },
  {
    id: 'file',
    label: 'Analyze File',
    description: 'Analyze or process a file',
    icon: 'fileText',
    template: 'Please analyze this file and tell me: '
  },
  {
    id: 'help',
    label: 'Help',
    description: 'Get help with available commands',
    icon: 'book',
    template: '/help'
  },
  {
    id: 'clear',
    label: 'Clear Context',
    description: 'Start fresh with cleared context',
    icon: 'refreshCw',
    template: '/clear'
  }
];

export type CompactionIndicatorStatus = {
  active: boolean;
  startedAt: number | null;
  completedAt: number | null;
};

export type ThinkingStatus = {
  active: boolean;
  level: ThinkingLevel;
  steps: ThinkingStep[];
  currentStepIndex: number;
  startedAt: number;
  completedAt?: number;
  summary?: string;
};

export type ChatProps = {
  sessionKey: string;
  onSessionKeyChange: (next: string) => void;
  thinkingLevel: string | null;
  showThinking: boolean;
  loading: boolean;
  sending: boolean;
  canAbort?: boolean;
  compactionStatus?: CompactionIndicatorStatus | null;
  thinkingStatus?: ThinkingStatus | null;
  messages: unknown[];
  toolMessages: unknown[];
  stream: string | null;
  streamStartedAt: number | null;
  assistantAvatarUrl?: string | null;
  draft: string;
  queue: ChatQueueItem[];
  connected: boolean;
  canSend: boolean;
  disabledReason: string | null;
  error: string | null;
  sessions: SessionsListResult | null;
  // Focus mode
  focusMode: boolean;
  // Sidebar state
  sidebarOpen?: boolean;
  sidebarContent?: string | null;
  sidebarError?: string | null;
  splitRatio?: number;
  assistantName: string;
  assistantAvatar: string | null;
  // Image attachments
  attachments?: ChatAttachment[];
  onAttachmentsChange?: (attachments: ChatAttachment[]) => void;
  // Commands menu state
  commandsMenuOpen?: boolean;
  onToggleCommandsMenu?: () => void;
  // Reasoning toggle and level
  onToggleThinking?: () => void;
  onSetThinkingLevel?: (level: string) => void;
  // Tool display toggle
  showTools?: boolean;
  onToggleShowTools?: () => void;
  // Event handlers
  onRefresh: () => void;
  onToggleFocusMode: () => void;
  onDraftChange: (next: string) => void;
  onSend: () => void;
  onAbort?: () => void;
  onQueueRemove: (id: string) => void;
  onNewSession: () => void;
  onOpenSidebar?: (content: string) => void;
  onCloseSidebar?: () => void;
  onSplitRatioChange?: (ratio: number) => void;
  onChatScroll?: (event: Event) => void;
  // Scroll-to-bottom button props
  showScrollToBottom?: boolean;
  newMessageCount?: number;
  onScrollToBottom?: () => void;
};

const COMPACTION_TOAST_DURATION_MS = 5000;

function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function renderCompactionIndicator(status: CompactionIndicatorStatus | null | undefined) {
  if (!status) return nothing;

  // Show "compacting..." while active
  if (status.active) {
    return html`
      <div class="callout info compaction-indicator compaction-indicator--active">
        ${icons.loader} Compacting context...
      </div>
    `;
  }

  // Show "compaction complete" briefly after completion
  if (status.completedAt) {
    const elapsed = Date.now() - status.completedAt;
    if (elapsed < COMPACTION_TOAST_DURATION_MS) {
      return html`
        <div class="callout success compaction-indicator compaction-indicator--complete">
          ${icons.check} Context compacted
        </div>
      `;
    }
  }

  return nothing;
}

function renderThinkingIndicator(status: ThinkingStatus | null | undefined) {
  if (!status || !status.active) return nothing;

  return html`
    <thinking-indicator
      .level=${status.level}
      .steps=${status.steps}
      .currentStepIndex=${status.currentStepIndex}
      .startedAt=${status.startedAt}
      .isComplete=${!!status.completedAt}
      .summary=${status.summary || ""}
      .compact=${false}
    ></thinking-indicator>
  `;
}

function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function handlePaste(e: ClipboardEvent, props: ChatProps) {
  const items = e.clipboardData?.items;
  if (!items || !props.onAttachmentsChange) return;

  const imageItems: DataTransferItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      imageItems.push(item);
    }
  }

  if (imageItems.length === 0) return;

  e.preventDefault();

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) continue;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newAttachment: ChatAttachment = {
        id: generateAttachmentId(),
        dataUrl,
        mimeType: file.type,
      };
      const current = props.attachments ?? [];
      props.onAttachmentsChange?.([...current, newAttachment]);
    };
    reader.readAsDataURL(file);
  }
}

function renderAttachmentPreview(props: ChatProps) {
  const attachments = props.attachments ?? [];
  if (attachments.length === 0) return nothing;

  return html`
    <div class="chat-attachments">
      <div class="chat-attachments__warning">
        <span class="chat-attachments__warning-icon">⚠️</span>
        <span class="chat-attachments__warning-text">Make sure your AI model supports image analysis (e.g., GPT-4 Vision, Claude 3). Standard GPT-3.5 cannot see images.</span>
      </div>
      ${attachments.map(
        (att) => html`
          <div class="chat-attachment">
             <img
               src=${att.dataUrl}
               alt="Attached image"
               class="chat-attachment__img"
             />
             <button
               class="chat-attachment__remove"
               type="button"
               aria-label="Remove attachment"
              @click=${() => {
                const next = (props.attachments ?? []).filter((a) => a.id !== att.id);
                props.onAttachmentsChange?.(next);
              }}
            >
              ${icons.x}
            </button>
          </div>
        `,
      )}
    </div>
  `;
}

function renderThinkingLevelSelector(props: ChatProps) {
  const currentLevel = props.thinkingLevel ?? "off";
  const levels = [
    { value: "off", label: "Off", icon: icons.brain, desc: "No reasoning" },
    { value: "minimal", label: "Minimal", icon: icons.info, desc: "Brief thoughts" },
    { value: "low", label: "Low", icon: icons.sparkles, desc: "Some reasoning" },
    { value: "medium", label: "Medium", icon: icons.zap, desc: "Balanced" },
    { value: "high", label: "High", icon: icons.cpu, desc: "Deep reasoning" },
  ];

  const current = levels.find(l => l.value === currentLevel) ?? levels[0];

  return html`
    <div class="thinking-level-selector">
      <button
        class="chat-input-toolbar__btn ${currentLevel !== 'off' ? 'active' : ''}"
        title="Thinking: ${current.label} - ${current.desc}"
        @click=${() => {
          // Cycle: off -> minimal -> low -> medium -> high -> off
          const idx = levels.findIndex(l => l.value === currentLevel);
          const nextIdx = (idx + 1) % levels.length;
          const nextLevel = levels[nextIdx].value;
          props.onSetThinkingLevel?.(nextLevel);
        }}
      >
        ${current.icon} ${current.label}
      </button>
    </div>
  `;
}

function renderCommandsMenu(props: ChatProps) {
  // Filter commands based on text after "/"
  const filterText = props.draft.slice(1).toLowerCase().trim();
  const filteredCommands = filterText
    ? QUICK_COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(filterText) ||
        cmd.id.toLowerCase().includes(filterText) ||
        cmd.description.toLowerCase().includes(filterText)
      )
    : QUICK_COMMANDS;

  return html`
    <div class="chat-commands-menu">
      <div class="chat-commands-menu__header">
        <span>${filterText ? `Commands matching "${filterText}"` : 'Quick Commands'}</span>
        <button
          class="chat-commands-menu__close"
          @click=${(e: Event) => {
            e.stopPropagation();
            props.onToggleCommandsMenu?.();
          }}
          aria-label="Close commands menu"
        >
          ${icons.x}
        </button>
      </div>
      <div class="chat-commands-menu__list">
        ${filteredCommands.length === 0
          ? html`<div class="chat-commands-menu__empty">No commands found</div>`
          : filteredCommands.map((cmd, index) => html`
            <button
              class="chat-commands-menu__item"
              @click=${() => {
                props.onDraftChange(cmd.template);
                props.onToggleCommandsMenu?.();
                // Focus the textarea after selecting a command
                setTimeout(() => {
                  const textarea = document.querySelector('.chat-input__textarea') as HTMLTextAreaElement;
                  if (textarea) {
                    textarea.focus();
                    // Place cursor at the end
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                  }
                }, 0);
              }}
              ${index === 0 ? 'autofocus' : ''}
            >
              <span class="chat-commands-menu__icon">${icons[cmd.icon]}</span>
              <div class="chat-commands-menu__content">
                <span class="chat-commands-menu__label">${cmd.label}</span>
                <span class="chat-commands-menu__desc">${cmd.description}</span>
              </div>
            </button>
          `)}
      </div>
    </div>
  `;
}

export function renderChat(props: ChatProps) {
  const canCompose = props.connected;
  const isBusy = props.sending || props.stream !== null;
  const canAbort = Boolean(props.canAbort && props.onAbort);
  const activeSession = props.sessions?.sessions?.find((row) => row.key === props.sessionKey);
  const reasoningLevel = activeSession?.reasoningLevel ?? "off";
  const showReasoning = props.showThinking && reasoningLevel !== "off";
  const assistantIdentity = {
    name: props.assistantName,
    avatar: props.assistantAvatar ?? props.assistantAvatarUrl ?? null,
  };

  const hasAttachments = (props.attachments?.length ?? 0) > 0;
  const composePlaceholder = props.connected
    ? hasAttachments
      ? "Add a message or paste more images..."
      : "Type your message... (Enter to send, Shift+Enter for new line)"
    : "Connect to the gateway to start chatting…";

  const splitRatio = props.splitRatio ?? 0.6;
  const sidebarOpen = Boolean(props.sidebarOpen && props.onCloseSidebar);
  const chatItems = buildChatItems(props);
  const hasMessages = chatItems.length > 0;
  
  const thread = html`
    <div
      class="chat-thread"
      role="log"
      aria-live="polite"
      @scroll=${props.onChatScroll}
    >
      ${
        props.loading
          ? html`
              <div class="chat-loading">
                <div class="chat-loading__spinner"></div>
                <span>Loading chat history…</span>
              </div>
            `
          : !hasMessages && props.connected
            ? html`
                <div class="chat-empty">
                  <div class="chat-empty__icon">${icons.messageSquare}</div>
                  <div class="chat-empty__title">No messages yet</div>
                  <div class="chat-empty__subtitle">Start a conversation by typing a message below.</div>
                </div>
              `
            : !props.connected
              ? html`
                  <div class="chat-empty">
                    <div class="chat-empty__icon">${icons.plug}</div>
                    <div class="chat-empty__title">Not connected</div>
                    <div class="chat-empty__subtitle">Connect to the gateway to start chatting.</div>
                  </div>
                `
              : nothing
      }
      
      ${renderThinkingIndicator(props.thinkingStatus)}
      
      ${repeat(
        chatItems,
        (item) => item.key,
        (item) => {
          if (item.kind === "reading-indicator") {
            return renderReadingIndicatorGroup(assistantIdentity);
          }

          if (item.kind === "stream") {
            return renderStreamingGroup(
              item.text,
              item.startedAt,
              props.onOpenSidebar,
              assistantIdentity,
            );
          }

          if (item.kind === "group") {
            return renderMessageGroup(item, {
              onOpenSidebar: props.onOpenSidebar,
              showReasoning,
              showTools: props.showTools ?? false,
              assistantName: props.assistantName,
              assistantAvatar: assistantIdentity.avatar,
            });
          }

          return nothing;
        },
      )}
    </div>
  `;

  return html`
    <section class="card chat">
      ${props.disabledReason ? html`<div class="callout">${props.disabledReason}</div>` : nothing}

      ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}

      ${renderCompactionIndicator(props.compactionStatus)}

      ${
        props.focusMode
          ? html`
            <button
              class="chat-focus-exit"
              type="button"
              @click=${props.onToggleFocusMode}
              aria-label="Exit focus mode"
              title="Exit focus mode"
            >
              ${icons.x}
            </button>
          `
          : nothing
      }

      <div
        class="chat-split-container ${sidebarOpen ? "chat-split-container--open" : ""}"
      >
        <div
          class="chat-main"
          style="flex: ${sidebarOpen ? `0 0 ${splitRatio * 100}%` : "1 1 100%"}"
        >
          ${thread}
        
        <scroll-to-bottom-button
          ?visible=${props.showScrollToBottom ?? false}
          .newMessageCount=${props.newMessageCount ?? 0}
          @scroll-to-bottom=${props.onScrollToBottom}
        ></scroll-to-bottom-button>
        </div>

        ${
          sidebarOpen
            ? html`
              <resizable-divider
                .splitRatio=${splitRatio}
                @resize=${(e: CustomEvent) => props.onSplitRatioChange?.(e.detail.splitRatio)}
              ></resizable-divider>
              <div class="chat-sidebar">
                ${renderMarkdownSidebar({
                  content: props.sidebarContent ?? null,
                  error: props.sidebarError ?? null,
                  onClose: props.onCloseSidebar!,
                  onViewRawText: () => {
                    if (!props.sidebarContent || !props.onOpenSidebar) return;
                    props.onOpenSidebar(`\`\`\`\n${props.sidebarContent}\n\`\`\``);
                  },
                })}
              </div>
            `
            : nothing
        }
      </div>

      ${
        props.queue.length
          ? html`
            <div class="chat-queue" role="status" aria-live="polite">
              <div class="chat-queue__title">Queued (${props.queue.length})</div>
              <div class="chat-queue__list">
                ${props.queue.map(
                  (item) => html`
                    <div class="chat-queue__item">
                      <div class="chat-queue__text">
                        ${
                          item.text ||
                          (item.attachments?.length ? `Image (${item.attachments.length})` : "")
                        }
                      </div>
                      <button
                        class="btn chat-queue__remove"
                        type="button"
                        aria-label="Remove queued message"
                        @click=${() => props.onQueueRemove(item.id)}
                      >
                        ${icons.x}
                      </button>
                    </div>
                  `,
                )}
              </div>
            </div>
          `
          : nothing
      }

      <div class="chat-compose">
        ${renderAttachmentPreview(props)}
        
        <div class="chat-input-container">
          <!-- Quick Actions Toolbar -->
          <div class="chat-input-toolbar">
            <button 
              class="chat-input-toolbar__btn" 
              title="Attach file"
              @click=${() => document.getElementById('file-input')?.click()}
            >
              ${icons.paperclip} Attach
            </button>
          <button 
            class="chat-input-toolbar__btn ${props.commandsMenuOpen ? 'active' : ''}" 
            title="Quick commands"
            @click=${(e: Event) => {
              e.stopPropagation();
              props.onToggleCommandsMenu?.();
            }}
          >
            ${icons.zap} Commands
          </button>
          <button 
            class="chat-input-toolbar__btn ${props.showTools ? 'active' : ''}" 
            title="${props.showTools ? 'Hide' : 'Show'} tool execution details"
            @click=${(e: Event) => {
              e.stopPropagation();
              props.onToggleShowTools?.();
            }}
          >
            ${props.showTools ? icons.eye : icons.eyeOff} Tools
          </button>
            ${renderThinkingLevelSelector(props)}
            <button class="chat-input-toolbar__btn" title="New chat session" @click=${(e: Event) => {
              e.stopPropagation();
              props.onNewSession();
            }}>
              ${icons.refreshCw} New Chat
            </button>
          </div>
          
          ${props.commandsMenuOpen ? renderCommandsMenu(props) : nothing}
          
          <!-- Hidden file input -->
          <input 
            type="file" 
            id="file-input" 
            style="display: none" 
            accept="image/*"
            @change=${(e: Event) => {
              const input = e.target as HTMLInputElement;
              if (input.files && input.files[0]) {
                const file = input.files[0];
                console.log('[Chat] File selected:', file.name, file.type, file.size);
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  console.log('[Chat] File loaded as data URL, length:', dataUrl.length);
                  const newAttachment: ChatAttachment = {
                    id: generateAttachmentId(),
                    dataUrl,
                    mimeType: file.type,
                  };
                  const current = props.attachments ?? [];
                  props.onAttachmentsChange?.([...current, newAttachment]);
                  console.log('[Chat] Attachment added, total:', current.length + 1);
                };
                reader.onerror = () => {
                  console.error('[Chat] Error reading file');
                };
                reader.readAsDataURL(file);
              }
              // Reset input so the same file can be selected again
              input.value = '';
            }}
          />
          
          <!-- Main Input Area -->
          <div class="chat-input-main">
            <textarea
              class="chat-input__textarea"
              ${ref((el) => el && adjustTextareaHeight(el as HTMLTextAreaElement))}
              .value=${props.draft}
              ?disabled=${!props.connected}
              @keydown=${(e: KeyboardEvent) => {
                // Handle commands menu navigation
                if (props.commandsMenuOpen) {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    props.onToggleCommandsMenu?.();
                    return;
                  }
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const items = document.querySelectorAll('.chat-commands-menu__item');
                    if (items.length === 0) return;
                    const current = document.activeElement;
                    const currentIndex = Array.from(items).indexOf(current as Element);
                    let nextIndex: number;
                    if (e.key === "ArrowDown") {
                      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                    } else {
                      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                    }
                    (items[nextIndex] as HTMLElement).focus();
                    return;
                  }
                  if (e.key === "Enter" && document.activeElement?.classList.contains('chat-commands-menu__item')) {
                    // Let the button's click handler work
                    return;
                  }
                }
                if (e.key !== "Enter") return;
                if (e.isComposing || e.keyCode === 229) return;
                if (e.shiftKey) return;
                if (!props.connected) {
                  console.log('[Chat] Cannot send: not connected');
                  return;
                }
                e.preventDefault();
                console.log('[Chat] Enter pressed, sending message');
                if (canCompose && props.onSend) {
                  props.onSend();
                } else {
                  console.warn('[Chat] Cannot send: canCompose=', canCompose, 'onSend=', typeof props.onSend);
                }
              }}
              @input=${(e: Event) => {
                const target = e.target as HTMLTextAreaElement;
                adjustTextareaHeight(target);
                const value = target.value;
                props.onDraftChange(value);
                
                // Show commands menu when typing "/" at the start
                if (value.startsWith('/') && !props.commandsMenuOpen) {
                  props.onToggleCommandsMenu?.();
                }
                // Hide when "/" is removed from start
                if (props.commandsMenuOpen && !value.startsWith('/')) {
                  props.onToggleCommandsMenu?.();
                }
              }}
              @paste=${(e: ClipboardEvent) => handlePaste(e, props)}
              placeholder=${composePlaceholder}
              rows="1"
            ></textarea>
          </div>
          
          <!-- Input Actions -->
          <div class="chat-input__actions">
            <span class="chat-input__hint">
              ${props.connected ? html`<span class="kbd-hint">↵ Enter</span> to send` : nothing}
            </span>

            <div class="chat-input__buttons">
              ${canAbort
                ? html`
                  <button
                    class="chat-input__stop-btn"
                    @click=${props.onAbort}
                    title="Stop generation"
                  >
                    ${icons.stopCircle} Stop
                  </button>
                `
                : html`
                  <button
                    class="chat-input__send-btn"
                    ?disabled=${!props.connected || isBusy || (!props.draft?.trim() && !hasAttachments)}
                    @click=${(e: Event) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[Chat] Send button clicked');
                      if (props.onSend) {
                        props.onSend();
                      } else {
                        console.error('[Chat] onSend is not defined!');
                      }
                    }}
                    title=${isBusy ? "Add to queue" : "Send message"}
                  >
                    ${isBusy ? icons.loader : icons.send}
                  </button>
                `
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

const CHAT_HISTORY_RENDER_LIMIT = 200;

function groupMessages(items: ChatItem[]): Array<ChatItem | MessageGroup> {
  const result: Array<ChatItem | MessageGroup> = [];
  let currentGroup: MessageGroup | null = null;

  for (const item of items) {
    if (item.kind !== "message") {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(item);
      continue;
    }

    const normalized = normalizeMessage(item.message);
    const role = normalizeRoleForGrouping(normalized.role);
    const timestamp = normalized.timestamp || Date.now();

    if (!currentGroup || currentGroup.role !== role) {
      if (currentGroup) result.push(currentGroup);
      currentGroup = {
        kind: "group",
        key: `group:${role}:${item.key}`,
        role,
        messages: [{ message: item.message, key: item.key }],
        timestamp,
        isStreaming: false,
      };
    } else {
      currentGroup.messages.push({ message: item.message, key: item.key });
    }
  }

  if (currentGroup) result.push(currentGroup);
  return result;
}

function buildChatItems(props: ChatProps): Array<ChatItem | MessageGroup> {
  const items: ChatItem[] = [];
  const history = Array.isArray(props.messages) ? props.messages : [];
  const tools = Array.isArray(props.toolMessages) ? props.toolMessages : [];
  const historyStart = Math.max(0, history.length - CHAT_HISTORY_RENDER_LIMIT);
  if (historyStart > 0) {
    items.push({
      kind: "message",
      key: "chat:history:notice",
      message: {
        role: "system",
        content: `Showing last ${CHAT_HISTORY_RENDER_LIMIT} messages (${historyStart} hidden).`,
        timestamp: Date.now(),
      },
    });
  }
  for (let i = historyStart; i < history.length; i++) {
    const msg = history[i];
    const normalized = normalizeMessage(msg);

    if (!props.showThinking && normalized.role.toLowerCase() === "toolresult") {
      continue;
    }

    items.push({
      kind: "message",
      key: messageKey(msg, i),
      message: msg,
    });
  }
  if (props.showThinking) {
    for (let i = 0; i < tools.length; i++) {
      items.push({
        kind: "message",
        key: messageKey(tools[i], i + history.length),
        message: tools[i],
      });
    }
  }

  if (props.stream !== null) {
    const key = `stream:${props.sessionKey}:${props.streamStartedAt ?? "live"}`;
    if (props.stream.trim().length > 0) {
      items.push({
        kind: "stream",
        key,
        text: props.stream,
        startedAt: props.streamStartedAt ?? Date.now(),
      });
    } else {
      items.push({ kind: "reading-indicator", key });
    }
  }

  return groupMessages(items);
}

function messageKey(message: unknown, index: number): string {
  const m = message as Record<string, unknown>;
  const toolCallId = typeof m.toolCallId === "string" ? m.toolCallId : "";
  if (toolCallId) return `tool:${toolCallId}`;
  const id = typeof m.id === "string" ? m.id : "";
  if (id) return `msg:${id}`;
  const messageId = typeof m.messageId === "string" ? m.messageId : "";
  if (messageId) return `msg:${messageId}`;
  const timestamp = typeof m.timestamp === "number" ? m.timestamp : null;
  const role = typeof m.role === "string" ? m.role : "unknown";
  if (timestamp != null) return `msg:${role}:${timestamp}:${index}`;
  return `msg:${role}:${index}`;
}
