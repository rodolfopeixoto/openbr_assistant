/**
 * ProviderConfigModal Component Tests
 * 
 * Tests for the providers-config-modal Lit element.
 */

import { describe, it, expect, vi } from "vitest";
import "./ProviderConfigModal.js";
import type { Provider, ProviderModel } from "../types/providers.js";

function createMockProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    id: "openai",
    name: "OpenAI",
    description: "OpenAI API for GPT-4, GPT-3.5, and other models",
    status: "unconfigured",
    credentialType: "api_key",
    credentialCount: 0,
    modelsCount: 5,
    supportedAuthMethods: ["api_key"],
    apiKeyUrl: "https://platform.openai.com/api-keys",
    ...overrides,
  };
}

function createMockModels(): ProviderModel[] {
  return [
    {
      id: "gpt-4",
      name: "GPT-4",
      providerId: "openai",
      description: "Most capable GPT-4 model",
      supportsStreaming: true,
      supportsTools: true,
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      providerId: "openai",
      description: "Fast and efficient",
      supportsStreaming: true,
      supportsTools: true,
    },
  ];
}

describe("ProviderConfigModal", () => {
  it("renders modal when open is true", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
    };
    modal.provider = provider;
    modal.open = true;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const backdrop = modal.shadowRoot?.querySelector(".modal-backdrop");
    expect(backdrop).toBeTruthy();
    expect(modal.textContent).toContain("OpenAI");
    
    document.body.removeChild(container);
  });

  it("does not render when open is false", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
    };
    modal.provider = provider;
    modal.open = false;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const backdrop = modal.shadowRoot?.querySelector(".modal-backdrop");
    expect(backdrop).toBeFalsy();
    
    document.body.removeChild(container);
  });

  it("emits close event when close button is clicked", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    const onClose = vi.fn();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
    };
    modal.provider = provider;
    modal.open = true;
    modal.addEventListener("close", onClose as EventListener);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const closeBtn = modal.shadowRoot?.querySelector(".close-btn") as HTMLButtonElement;
    closeBtn?.click();
    
    expect(onClose).toHaveBeenCalledTimes(1);
    
    document.body.removeChild(container);
  });

  it("validates profile name is required", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
    };
    modal.provider = provider;
    modal.open = true;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Clear profile name
    const profileInput = modal.shadowRoot?.querySelector('input[type="text"]') as HTMLInputElement;
    profileInput.value = "";
    profileInput.dispatchEvent(new Event("input"));
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Click next button
    const nextBtn = Array.from(modal.shadowRoot?.querySelectorAll(".btn") || [])
      .find(btn => btn.textContent?.includes("Next")) as HTMLButtonElement;
    nextBtn?.click();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(modal.textContent).toContain("Profile name is required");
    
    document.body.removeChild(container);
  });

  it("validates API key is required", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
    };
    modal.provider = provider;
    modal.open = true;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Click next without entering API key
    const nextBtn = Array.from(modal.shadowRoot?.querySelectorAll(".btn") || [])
      .find(btn => btn.textContent?.includes("Next")) as HTMLButtonElement;
    nextBtn?.click();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(modal.textContent).toContain("API key is required");
    
    document.body.removeChild(container);
  });

  it("emits test event when Test & Save is clicked", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    const onTest = vi.fn();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
      availableModels: ProviderModel[];
    };
    modal.provider = provider;
    modal.open = true;
    modal.availableModels = createMockModels();
    modal.addEventListener("test", onTest as EventListener);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Fill in API key
    const apiKeyInput = modal.shadowRoot?.querySelector('input[type="password"]') as HTMLInputElement;
    apiKeyInput.value = "sk-test-key";
    apiKeyInput.dispatchEvent(new Event("input"));
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Click next to go to models step
    const nextBtn = Array.from(modal.shadowRoot?.querySelectorAll(".btn") || [])
      .find(btn => btn.textContent?.includes("Next")) as HTMLButtonElement;
    nextBtn?.click();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Click Test & Save
    const saveBtn = Array.from(modal.shadowRoot?.querySelectorAll(".btn") || [])
      .find(btn => btn.textContent?.includes("Test & Save")) as HTMLButtonElement;
    saveBtn?.click();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(onTest).toHaveBeenCalledTimes(1);
    
    document.body.removeChild(container);
  });

  it("toggles test connection checkbox", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
    };
    modal.provider = provider;
    modal.open = true;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const checkboxGroup = modal.shadowRoot?.querySelector(".checkbox-group") as HTMLElement;
    const checkbox = modal.shadowRoot?.querySelector(".checkbox") as HTMLElement;
    
    expect(checkbox?.classList.contains("checked")).toBe(true);
    
    checkboxGroup?.click();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(checkbox?.classList.contains("checked")).toBe(false);
    
    document.body.removeChild(container);
  });

  it("allows model selection", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
      availableModels: ProviderModel[];
    };
    modal.provider = provider;
    modal.open = true;
    modal.availableModels = createMockModels();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Fill in API key and proceed to models step
    const apiKeyInput = modal.shadowRoot?.querySelector('input[type="password"]') as HTMLInputElement;
    apiKeyInput.value = "sk-test-key";
    apiKeyInput.dispatchEvent(new Event("input"));
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const nextBtn = Array.from(modal.shadowRoot?.querySelectorAll(".btn") || [])
      .find(btn => btn.textContent?.includes("Next")) as HTMLButtonElement;
    nextBtn?.click();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(modal.textContent).toContain("Select Models");
    expect(modal.textContent).toContain("GPT-4");
    expect(modal.textContent).toContain("GPT-3.5 Turbo");
    
    document.body.removeChild(container);
  });

  it("shows success state after successful save", async () => {
    const container = document.createElement("div");
    const provider = createMockProvider();
    
    container.innerHTML = `
      <providers-config-modal id="test-modal"></providers-config-modal>
    `;
    document.body.appendChild(container);
    
    const modal = container.querySelector("#test-modal") as HTMLElement & { 
      provider: Provider;
      open: boolean;
      handleTestSuccess: (result: unknown) => void;
    };
    modal.provider = provider;
    modal.open = true;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Simulate successful test
    modal.handleTestSuccess({ success: true, latency: 150, modelsAvailable: 5 });
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(modal.textContent).toContain("Configuration Saved!");
    expect(modal.textContent).toContain("Connection Test Passed");
    
    document.body.removeChild(container);
  });
});
