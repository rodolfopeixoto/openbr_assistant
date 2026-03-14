/**
 * ProviderCard Component Tests
 * 
 * Tests for the providers-card Lit element using Vitest and browser testing.
 */

import { describe, it, expect, vi } from "vitest";
import "./ProviderCard.js";
import type { Provider } from "../types/providers.js";

function createMockProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    id: "openai",
    name: "OpenAI",
    description: "OpenAI API for GPT-4, GPT-3.5, and other models",
    status: "configured",
    credentialType: "api_key",
    credentialCount: 2,
    modelsCount: 5,
    supportedAuthMethods: ["api_key"],
    apiKeyUrl: "https://platform.openai.com/api-keys",
    ...overrides,
  };
}

describe("ProviderCard", () => {
  it("renders provider information correctly", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    
    container.innerHTML = `
      <providers-card id="test-card"></providers-card>
    `;
    document.body.appendChild(container);
    
    const card = container.querySelector("#test-card") as HTMLElement & { provider: Provider };
    (card as unknown as { provider: Provider }).provider = provider;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(card.textContent).toContain("OpenAI");
    expect(card.textContent).toContain("Configured");
    expect(card.textContent).toContain("2");
    expect(card.textContent).toContain("5");
    
    document.body.removeChild(container);
  });

  it("displays correct status styling for configured provider", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider({ status: "configured" });
    
    container.innerHTML = `
      <providers-card id="test-card"></providers-card>
    `;
    document.body.appendChild(container);
    
    const card = container.querySelector("#test-card") as HTMLElement;
    (card as unknown as { provider: Provider }).provider = provider;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const cardElement = card.shadowRoot?.querySelector(".card");
    expect(cardElement?.classList.contains("configured")).toBe(true);
    
    document.body.removeChild(container);
  });

  it("displays correct status styling for error provider", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider({ 
      status: "error",
      lastError: "Invalid API key"
    });
    
    container.innerHTML = `
      <providers-card id="test-card"></providers-card>
    `;
    document.body.appendChild(container);
    
    const card = container.querySelector("#test-card") as HTMLElement;
    (card as unknown as { provider: Provider }).provider = provider;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(card.textContent).toContain("Invalid API key");
    const cardElement = card.shadowRoot?.querySelector(".card");
    expect(cardElement?.classList.contains("error")).toBe(true);
    
    document.body.removeChild(container);
  });

  it("emits configure event when configure button is clicked", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider({ status: "unconfigured" });
    const onConfigure = vi.fn();
    
    container.innerHTML = `
      <providers-card id="test-card"></providers-card>
    `;
    document.body.appendChild(container);
    
    const card = container.querySelector("#test-card") as HTMLElement;
    (card as unknown as { provider: Provider }).provider = provider;
    card.addEventListener("configure", onConfigure as EventListener);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const configureBtn = card.shadowRoot?.querySelector(".btn-primary") as HTMLButtonElement;
    configureBtn?.click();
    
    expect(onConfigure).toHaveBeenCalledTimes(1);
    expect(onConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { providerId: "openai" }
      })
    );
    
    document.body.removeChild(container);
  });

  it("emits manage event when manage button is clicked", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider({ status: "configured" });
    const onManage = vi.fn();
    
    container.innerHTML = `
      <providers-card id="test-card"></providers-card>
    `;
    document.body.appendChild(container);
    
    const card = container.querySelector("#test-card") as HTMLElement;
    (card as unknown as { provider: Provider }).provider = provider;
    card.addEventListener("manage", onManage as EventListener);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const manageBtn = card.shadowRoot?.querySelector(".btn-secondary") as HTMLButtonElement;
    manageBtn?.click();
    
    expect(onManage).toHaveBeenCalledTimes(1);
    expect(onManage).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { providerId: "openai" }
      })
    );
    
    document.body.removeChild(container);
  });

  it("shows Fix button when provider has error status", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider({ status: "error" });
    
    container.innerHTML = `
      <providers-card id="test-card"></providers-card>
    `;
    document.body.appendChild(container);
    
    const card = container.querySelector("#test-card") as HTMLElement;
    (card as unknown as { provider: Provider }).provider = provider;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const buttons = card.shadowRoot?.querySelectorAll(".btn");
    const buttonTexts = Array.from(buttons || []).map(btn => btn.textContent);
    
    expect(buttonTexts).toContain("Manage");
    expect(buttonTexts).toContain("Fix");
    
    document.body.removeChild(container);
  });

  it("renders different providers with correct branding", async () => {
    const providers: Array<{ id: string; letter: string }> = [
      { id: "openai", letter: "O" },
      { id: "anthropic", letter: "A" },
      { id: "google", letter: "G" },
      { id: "kimi", letter: "K" },
    ];

    for (const { id, letter } of providers) {
      const container = document.createElement("div");
      const provider = createMockProvider({ id, name: id });
      
      container.innerHTML = `
        <providers-card id="test-card-${id}"></providers-card>
      `;
      document.body.appendChild(container);
      
      const card = container.querySelector(`#test-card-${id}`) as HTMLElement;
      (card as unknown as { provider: Provider }).provider = provider;
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const iconElement = card.shadowRoot?.querySelector(".provider-icon");
      expect(iconElement?.textContent?.trim()).toBe(letter);
      
      document.body.removeChild(container);
    }
  });
});
