import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { SessionsListResult } from "../types";
import { renderChat, type ChatProps } from "./chat";

function createSessions(): SessionsListResult {
  return {
    ts: 0,
    path: "",
    count: 0,
    defaults: { model: null, contextTokens: null },
    sessions: [],
  };
}

function createProps(overrides: Partial<ChatProps> = {}): ChatProps {
  return {
    sessionKey: "main",
    onSessionKeyChange: () => undefined,
    thinkingLevel: null,
    showThinking: false,
    loading: false,
    sending: false,
    canAbort: false,
    compactionStatus: null,
    messages: [],
    toolMessages: [],
    stream: null,
    streamStartedAt: null,
    assistantAvatarUrl: null,
    draft: "",
    queue: [],
    connected: true,
    canSend: true,
    disabledReason: null,
    error: null,
    sessions: createSessions(),
    focusMode: false,
    assistantName: "OpenClaw",
    assistantAvatar: null,
    onRefresh: () => undefined,
    onToggleFocusMode: () => undefined,
    onDraftChange: () => undefined,
    onSend: () => undefined,
    onQueueRemove: () => undefined,
    onNewSession: () => undefined,
    ...overrides,
  };
}

describe("chat view", () => {
  it("shows a stop button when aborting is available", () => {
    const container = document.createElement("div");
    const onAbort = vi.fn();
    render(
      renderChat(
        createProps({
          canAbort: true,
          onAbort,
        }),
      ),
      container,
    );

    const stopButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "Stop",
    );
    expect(stopButton).not.toBeUndefined();
    stopButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onAbort).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("New session");
  });

  it("shows a new session button when aborting is unavailable", () => {
    const container = document.createElement("div");
    const onNewSession = vi.fn();
    render(
      renderChat(
        createProps({
          canAbort: false,
          onNewSession,
        }),
      ),
      container,
    );

    const newSessionButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "New session",
    );
    expect(newSessionButton).not.toBeUndefined();
    newSessionButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onNewSession).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("Stop");
  });

  it("renders scroll-to-bottom button when showScrollToBottom is true", () => {
    const container = document.createElement("div");
    const onScrollToBottom = vi.fn();
    render(
      renderChat(
        createProps({
          showScrollToBottom: true,
          onScrollToBottom,
        }),
      ),
      container,
    );

    const button = container.querySelector("scroll-to-bottom-button");
    expect(button).not.toBeNull();
  });

  it("hides scroll-to-bottom button when showScrollToBottom is false", () => {
    const container = document.createElement("div");
    render(
      renderChat(
        createProps({
          showScrollToBottom: false,
        }),
      ),
      container,
    );

    const button = container.querySelector("scroll-to-bottom-button");
    // Button should still be in DOM but not visible
    expect(button).not.toBeNull();
    expect(button?.hasAttribute("visible")).toBe(false);
  });

  it("passes newMessageCount to scroll-to-bottom button", () => {
    const container = document.createElement("div");
    render(
      renderChat(
        createProps({
          showScrollToBottom: true,
          newMessageCount: 5,
        }),
      ),
      container,
    );

    const button = container.querySelector("scroll-to-bottom-button");
    expect(button).not.toBeNull();
    expect((button as any)?.newMessageCount).toBe(5);
  });

  it("dispatches scroll-to-bottom event", () => {
    const container = document.createElement("div");
    const onScrollToBottom = vi.fn();
    render(
      renderChat(
        createProps({
          showScrollToBottom: true,
          onScrollToBottom,
        }),
      ),
      container,
    );

    const button = container.querySelector("scroll-to-bottom-button");
    expect(button).not.toBeNull();
    
    // Dispatch event from the button
    button?.dispatchEvent(
      new CustomEvent("scroll-to-bottom", { bubbles: true, composed: true })
    );
    
    expect(onScrollToBottom).toHaveBeenCalledTimes(1);
  });
});
