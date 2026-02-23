/**
 * ProviderList Component Tests
 * 
 * Tests for the providers-list Lit element.
 */

import { describe, it, expect, vi } from "vitest";
import "./ProviderList.js";
import type { Provider } from "../types/providers.js";

function createMockProviders(): Provider[] {
  return [
    {
      id: "openai",
      name: "OpenAI",
      description: "OpenAI API for GPT models",
      status: "configured",
      credentialType: "api_key",
      credentialCount: 2,
      modelsCount: 5,
      supportedAuthMethods: ["api_key"],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Anthropic Claude models",
      status: "unconfigured",
      credentialType: "api_key",
      credentialCount: 0,
      modelsCount: 3,
      supportedAuthMethods: ["api_key"],
    },
    {
      id: "google",
      name: "Google",
      description: "Google Gemini models",
      status: "error",
      credentialType: "api_key",
      credentialCount: 1,
      modelsCount: 4,
      supportedAuthMethods: ["api_key", "oauth"],
      lastError: "Invalid credentials",
    },
  ];
}

describe("ProviderList", () => {
  it("renders title and subtitle", async () => {
    const container = document.createElement("div");
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(list.textContent).toContain("AI Providers");
    expect(list.textContent).toContain("Manage your AI model providers and credentials");
    
    document.body.removeChild(container);
  });

  it("renders provider cards when providers are provided", async () => {
    const container = document.createElement("div");
    const providers = createMockProviders();
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { providers: Provider[] };
    list.providers = providers;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(list.textContent).toContain("OpenAI");
    expect(list.textContent).toContain("Anthropic");
    expect(list.textContent).toContain("Google");
    
    document.body.removeChild(container);
  });

  it("shows loading state when loading is true", async () => {
    const container = document.createElement("div");
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { loading: boolean };
    list.loading = true;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const skeletons = list.shadowRoot?.querySelectorAll(".skeleton-card");
    expect(skeletons?.length).toBe(6);
    
    document.body.removeChild(container);
  });

  it("shows empty state when no providers match filters", async () => {
    const container = document.createElement("div");
    const providers = createMockProviders();
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { providers: Provider[] };
    list.providers = providers;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Search for non-existent provider
    const searchInput = list.shadowRoot?.querySelector('.search-input') as HTMLInputElement;
    searchInput.value = "nonexistent";
    searchInput.dispatchEvent(new Event('input'));
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(list.textContent).toContain("No providers found");
    expect(list.textContent).toContain("Try adjusting your filters");
    
    document.body.removeChild(container);
  });

  it("filters providers by status", async () => {
    const container = document.createElement("div");
    const providers = createMockProviders();
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { providers: Provider[] };
    list.providers = providers;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Filter by configured
    const filterSelect = list.shadowRoot?.querySelector('.filter-select') as HTMLSelectElement;
    filterSelect.value = "configured";
    filterSelect.dispatchEvent(new Event('change'));
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(list.textContent).toContain("OpenAI");
    expect(list.textContent).not.toContain("Anthropic");
    expect(list.textContent).not.toContain("Google");
    
    document.body.removeChild(container);
  });

  it("filters providers by search query", async () => {
    const container = document.createElement("div");
    const providers = createMockProviders();
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { providers: Provider[] };
    list.providers = providers;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Search for "anthropic"
    const searchInput = list.shadowRoot?.querySelector('.search-input') as HTMLInputElement;
    searchInput.value = "anthropic";
    searchInput.dispatchEvent(new Event('input'));
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(list.textContent).not.toContain("OpenAI");
    expect(list.textContent).toContain("Anthropic");
    expect(list.textContent).not.toContain("Google");
    
    document.body.removeChild(container);
  });

  it("switches between grid and list view", async () => {
    const container = document.createElement("div");
    const providers = createMockProviders();
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { providers: Provider[] };
    list.providers = providers;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Default is grid view
    let gridView = list.shadowRoot?.querySelector('.grid');
    expect(gridView).toBeTruthy();
    
    // Switch to list view
    const listBtn = list.shadowRoot?.querySelectorAll('.view-btn')[1] as HTMLButtonElement;
    listBtn?.click();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const listView = list.shadowRoot?.querySelector('.list');
    expect(listView).toBeTruthy();
    
    document.body.removeChild(container);
  });

  it("emits configure event when provider card fires configure", async () => {
    const container = document.createElement("div");
    const providers = createMockProviders();
    const onConfigure = vi.fn();
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { providers: Provider[] };
    list.providers = providers;
    list.addEventListener("configure", onConfigure as EventListener);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Click configure on the unconfigured provider (Anthropic)
    const cards = list.shadowRoot?.querySelectorAll('providers-card');
    const unconfiguredCard = Array.from(cards || [])
      .find(card => card.textContent?.includes("Anthropic"));
    
    const configureBtn = unconfiguredCard?.shadowRoot?.querySelector('.btn-primary') as HTMLButtonElement;
    configureBtn?.click();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(onConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { providerId: "anthropic" }
      })
    );
    
    document.body.removeChild(container);
  });

  it("emits manage event when provider card fires manage", async () => {
    const container = document.createElement("div");
    const providers = createMockProviders();
    const onManage = vi.fn();
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { providers: Provider[] };
    list.providers = providers;
    list.addEventListener("manage", onManage as EventListener);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Click manage on the configured provider (OpenAI)
    const cards = list.shadowRoot?.querySelectorAll('providers-card');
    const configuredCard = Array.from(cards || [])
      .find(card => card.textContent?.includes("OpenAI"));
    
    const manageBtn = configuredCard?.shadowRoot?.querySelector('.btn-secondary') as HTMLButtonElement;
    manageBtn?.click();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(onManage).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { providerId: "openai" }
      })
    );
    
    document.body.removeChild(container);
  });

  it("displays correct statistics", async () => {
    const container = document.createElement("div");
    const providers = createMockProviders();
    
    container.innerHTML = `
      <providers-list id="test-list"></providers-list>
    `;
    document.body.appendChild(container);
    
    const list = container.querySelector("#test-list") as HTMLElement & { providers: Provider[] };
    list.providers = providers;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(list.textContent).toContain("3");
    expect(list.textContent).toContain("Total Providers");
    expect(list.textContent).toContain("1");
    expect(list.textContent).toContain("Configured");
    expect(list.textContent).toContain("1"); // errors
    expect(list.textContent).toContain("Errors");
    expect(list.textContent).toContain("12"); // 5 + 3 + 4
    expect(list.textContent).toContain("Available Models");
    
    document.body.removeChild(container);
  });
});
