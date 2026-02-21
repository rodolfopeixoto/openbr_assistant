import type { GatewayBrowserClient } from "../gateway";
import type { ChatAttachment } from "../ui-types";
import { extractText } from "../chat/message-extract";
import { generateUUID } from "../uuid";
import type { ThinkingStep, ThinkingLevel } from "../components/ThinkingIndicator";

export type ChatState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  sessionKey: string;
  chatLoading: boolean;
  chatMessages: unknown[];
  chatThinkingLevel: string | null;
  chatSending: boolean;
  chatMessage: string;
  chatAttachments: ChatAttachment[];
  chatRunId: string | null;
  chatStream: string | null;
  chatStreamStartedAt: number | null;
  lastError: string | null;
  // Thinking/reasoning state
  chatThinkingActive: boolean;
  chatThinkingSteps: ThinkingStep[];
  chatThinkingCurrentStepIndex: number;
  chatThinkingStartedAt: number | null;
  chatThinkingCompletedAt: number | null;
  chatThinkingSummary: string | null;
};

export type ChatEventPayload = {
  runId: string;
  sessionKey: string;
  state: "delta" | "final" | "aborted" | "error";
  message?: unknown;
  errorMessage?: string;
};

export type ThinkingEventPayload = {
  type: "thinking";
  runId: string;
  sessionKey: string;
  level: ThinkingLevel;
  step?: {
    id: string;
    text: string;
    timestamp: number;
  };
  stepIndex?: number;
  summary?: string;
  completed?: boolean;
};

export async function loadChatHistory(state: ChatState) {
  if (!state.client || !state.connected) return;
  state.chatLoading = true;
  state.lastError = null;
  try {
    console.log("[DEBUG loadChatHistory] Loading chat history for sessionKey:", state.sessionKey);
    const res = (await state.client.request("chat.history", {
      sessionKey: state.sessionKey,
      limit: 200,
    })) as { messages?: unknown[]; thinkingLevel?: string | null };
    console.log("[DEBUG loadChatHistory] Received messages count:", res.messages?.length);
    state.chatMessages = Array.isArray(res.messages) ? res.messages : [];
    state.chatThinkingLevel = res.thinkingLevel ?? null;
  } catch (err) {
    console.error("[DEBUG loadChatHistory] Error:", err);
    state.lastError = String(err);
  } finally {
    state.chatLoading = false;
  }
}

function dataUrlToBase64(dataUrl: string): { content: string; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], content: match[2] };
}

export async function sendChatMessage(
  state: ChatState,
  message: string,
  attachments?: ChatAttachment[],
): Promise<string | null> {
  if (!state.client || !state.connected) return null;
  const msg = message.trim();
  const hasAttachments = attachments && attachments.length > 0;
  if (!msg && !hasAttachments) return null;

  const now = Date.now();

  // Build user message content blocks
  const contentBlocks: Array<{ type: string; text?: string; source?: unknown }> = [];
  if (msg) {
    contentBlocks.push({ type: "text", text: msg });
  }
  // Add image previews to the message for display
  if (hasAttachments) {
    for (const att of attachments) {
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: att.mimeType, data: att.dataUrl },
      });
    }
  }

  state.chatMessages = [
    ...state.chatMessages,
    {
      role: "user",
      content: contentBlocks,
      timestamp: now,
    },
  ];

  state.chatSending = true;
  state.lastError = null;
  const runId = generateUUID();
  state.chatRunId = runId;
  state.chatStream = "";
  state.chatStreamStartedAt = now;

  // Convert attachments to API format
  const apiAttachments = hasAttachments
    ? attachments
        .map((att) => {
          const parsed = dataUrlToBase64(att.dataUrl);
          if (!parsed) return null;
          return {
            type: "image",
            mimeType: parsed.mimeType,
            content: parsed.content,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null)
    : undefined;

  // Log attachment processing
  if (hasAttachments) {
    console.log('[Chat] Attachments processed:', {
      originalCount: attachments.length,
      processedCount: apiAttachments?.length ?? 0,
    });
  }

  // Check if attachments failed to process
  if (hasAttachments && (!apiAttachments || apiAttachments.length === 0)) {
    console.error('[Chat] Failed to process image attachments');
    state.chatSending = false;
    state.chatRunId = null;
    state.lastError = "Failed to process image. Please try a different image or check the file format.";
    return null;
  }

  try {
    // Add timeout to prevent indefinite hanging
    // Images may take longer to process, so use 60s timeout when attachments are present
    const TIMEOUT_MS = hasAttachments ? 60000 : 30000;
    console.log('[Chat] Using timeout:', TIMEOUT_MS + 'ms', hasAttachments ? '(includes image processing)' : '');
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout after " + TIMEOUT_MS + "ms. " + 
        (hasAttachments ? "Image processing may take longer. Try a smaller image or check if the model supports vision." : "Please try again."))), TIMEOUT_MS)
    );

    await Promise.race([
      state.client.request("chat.send", {
        sessionKey: state.sessionKey,
        message: msg,
        deliver: false,
        idempotencyKey: runId,
        attachments: apiAttachments,
      }),
      timeoutPromise,
    ]);

    return runId;
  } catch (err) {
    const error = String(err);
    state.chatRunId = null;
    state.chatStream = null;
    state.chatStreamStartedAt = null;
    state.lastError = error;
    state.chatMessages = [
      ...state.chatMessages,
      {
        role: "assistant",
        content: [{ type: "text", text: "Error: " + error }],
        timestamp: Date.now(),
      },
    ];
    return null;
  } finally {
    state.chatSending = false;
  }
}

export async function abortChatRun(state: ChatState): Promise<boolean> {
  if (!state.client || !state.connected) return false;
  const runId = state.chatRunId;
  try {
    await state.client.request(
      "chat.abort",
      runId ? { sessionKey: state.sessionKey, runId } : { sessionKey: state.sessionKey },
    );
    return true;
  } catch (err) {
    state.lastError = String(err);
    return false;
  }
}

export function handleChatEvent(state: ChatState, payload?: ChatEventPayload) {
  if (!payload) return null;
  if (payload.sessionKey !== state.sessionKey) return null;

  // Final from another run (e.g. sub-agent announce): refresh history to show new message.
  // See https://github.com/openclaw/openclaw/issues/1909
  if (payload.runId && state.chatRunId && payload.runId !== state.chatRunId) {
    if (payload.state === "final") return "final";
    return null;
  }

  if (payload.state === "delta") {
    const next = extractText(payload.message);
    if (typeof next === "string") {
      const current = state.chatStream ?? "";
      if (!current || next.length >= current.length) {
        state.chatStream = next;
      }
    }
  } else if (payload.state === "final") {
    // Add the final message to chat history
    if (payload.message) {
      console.log("[DEBUG handleChatEvent] Adding message to chatMessages, current length:", state.chatMessages.length);
      state.chatMessages = [...state.chatMessages, payload.message];
      console.log("[DEBUG handleChatEvent] New chatMessages length:", state.chatMessages.length);
    }
    state.chatStream = null;
    state.chatRunId = null;
    state.chatStreamStartedAt = null;
    // Reset thinking state when chat completes
    resetThinkingState(state);
  } else if (payload.state === "aborted") {
    state.chatStream = null;
    state.chatRunId = null;
    state.chatStreamStartedAt = null;
    // Reset thinking state when chat is aborted
    resetThinkingState(state);
  } else if (payload.state === "error") {
    state.chatStream = null;
    state.chatRunId = null;
    state.chatStreamStartedAt = null;
    state.lastError = payload.errorMessage ?? "chat error";
    // Reset thinking state when chat errors
    resetThinkingState(state);
  }
  return payload.state;
}

export function handleThinkingEvent(state: ChatState, payload?: ThinkingEventPayload): boolean {
  if (!payload || payload.type !== "thinking") return false;
  if (payload.sessionKey !== state.sessionKey) return false;
  if (payload.runId && state.chatRunId && payload.runId !== state.chatRunId) return false;

  // Initialize thinking state if not already active
  if (!state.chatThinkingActive) {
    state.chatThinkingActive = true;
    state.chatThinkingSteps = [];
    state.chatThinkingCurrentStepIndex = 0;
    state.chatThinkingStartedAt = Date.now();
    state.chatThinkingCompletedAt = null;
    state.chatThinkingSummary = null;
  }

  // Update thinking level
  if (payload.level) {
    state.chatThinkingLevel = payload.level;
  }

  // Add new step if provided
  if (payload.step) {
    const existingIndex = state.chatThinkingSteps.findIndex(s => s.id === payload.step!.id);
    if (existingIndex >= 0) {
      // Update existing step
      state.chatThinkingSteps[existingIndex] = {
        ...payload.step,
        completed: payload.stepIndex !== undefined && payload.stepIndex > existingIndex
      };
    } else {
      // Add new step
      state.chatThinkingSteps.push({
        ...payload.step,
        completed: false
      });
    }
  }

  // Update current step index
  if (payload.stepIndex !== undefined) {
    state.chatThinkingCurrentStepIndex = payload.stepIndex;
    // Mark previous steps as completed
    state.chatThinkingSteps = state.chatThinkingSteps.map((step, idx) => ({
      ...step,
      completed: idx < payload.stepIndex!
    }));
  }

  // Handle completion
  if (payload.completed) {
    state.chatThinkingActive = false;
    state.chatThinkingCompletedAt = Date.now();
    if (payload.summary) {
      state.chatThinkingSummary = payload.summary;
    }
    // Mark all steps as completed
    state.chatThinkingSteps = state.chatThinkingSteps.map(step => ({
      ...step,
      completed: true
    }));
  }

  return true;
}

export function resetThinkingState(state: ChatState): void {
  state.chatThinkingActive = false;
  state.chatThinkingSteps = [];
  state.chatThinkingCurrentStepIndex = 0;
  state.chatThinkingStartedAt = null;
  state.chatThinkingCompletedAt = null;
  state.chatThinkingSummary = null;
}
