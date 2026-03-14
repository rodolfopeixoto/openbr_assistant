import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "lit";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

describe("ScrollToBottomButton", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("renders button with default state", () => {
    const button = document.createElement("scroll-to-bottom-button") as ScrollToBottomButton;
    container.appendChild(button);

    const shadowRoot = button.shadowRoot;
    expect(shadowRoot).toBeDefined();
    
    const buttonElement = shadowRoot?.querySelector(".scroll-button");
    expect(buttonElement).toBeDefined();
  });

  it("shows badge with new message count", async () => {
    const button = document.createElement("scroll-to-bottom-button") as ScrollToBottomButton;
    button.newMessageCount = 5;
    container.appendChild(button);

    // Wait for Lit to render
    await button.updateComplete;

    const shadowRoot = button.shadowRoot;
    const badge = shadowRoot?.querySelector(".badge");
    expect(badge).toBeDefined();
    expect(badge?.textContent).toBe("5");
  });

  it("hides badge when no new messages", async () => {
    const button = document.createElement("scroll-to-bottom-button") as ScrollToBottomButton;
    button.newMessageCount = 0;
    container.appendChild(button);

    await button.updateComplete;

    const shadowRoot = button.shadowRoot;
    const badge = shadowRoot?.querySelector(".badge");
    expect(badge).toBeNull();
  });

  it("dispatches scroll-to-bottom event when clicked", async () => {
    const button = document.createElement("scroll-to-bottom-button") as ScrollToBottomButton;
    container.appendChild(button);

    const clickHandler = vi.fn();
    button.addEventListener("scroll-to-bottom", clickHandler);

    await button.updateComplete;

    const buttonElement = button.shadowRoot?.querySelector(".scroll-button") as HTMLButtonElement;
    buttonElement.click();

    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  it("applies visible attribute correctly", async () => {
    const button = document.createElement("scroll-to-bottom-button") as ScrollToBottomButton;
    button.visible = true;
    container.appendChild(button);

    await button.updateComplete;

    expect(button.hasAttribute("visible")).toBe(true);
  });

  it("uses correct aria-label", async () => {
    const button = document.createElement("scroll-to-bottom-button") as ScrollToBottomButton;
    button.label = "Jump to bottom";
    container.appendChild(button);

    await button.updateComplete;

    const buttonElement = button.shadowRoot?.querySelector(".scroll-button") as HTMLButtonElement;
    expect(buttonElement.getAttribute("aria-label")).toBe("Jump to bottom");
  });
});
