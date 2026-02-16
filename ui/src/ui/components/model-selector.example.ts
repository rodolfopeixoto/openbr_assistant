/**
 * Model Selector Usage Example
 * 
 * This example demonstrates how to use the model-selector component
 * in the OpenClaw Control UI.
 */

import { html } from "lit";
import type { ModelProvider } from "./model-selector.js";

// Example data structure for providers
const exampleProviders: ModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    status: "configured",
    models: [
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "Most capable model",
        features: ["vision", "tools", "json"],
        costPer1kTokens: { input: 10, output: 30 },
        contextWindow: 128000,
        isDefault: true
      },
      {
        id: "gpt-4-vision",
        name: "GPT-4 Vision",
        description: "With image understanding",
        features: ["vision", "tools"],
        costPer1kTokens: { input: 10, output: 30 },
        contextWindow: 128000
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Fast and cost-effective",
        features: ["tools", "json"],
        costPer1kTokens: { input: 0.5, output: 1.5 },
        contextWindow: 16385
      }
    ]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🧠",
    status: "configured",
    models: [
      {
        id: "claude-3-opus",
        name: "Claude 3 Opus",
        description: "Most intelligent",
        features: ["vision", "tools"],
        costPer1kTokens: { input: 15, output: 75 },
        contextWindow: 200000
      },
      {
        id: "claude-3-sonnet",
        name: "Claude 3 Sonnet",
        description: "Balanced performance",
        features: ["vision", "tools"],
        costPer1kTokens: { input: 3, output: 15 },
        contextWindow: 200000
      },
      {
        id: "claude-3-haiku",
        name: "Claude 3 Haiku",
        description: "Fastest",
        features: ["vision"],
        costPer1kTokens: { input: 0.25, output: 1.25 },
        contextWindow: 200000
      }
    ]
  },
  {
    id: "kimi",
    name: "Moonshot (Kimi)",
    icon: "🌙",
    status: "unconfigured",
    models: [
      {
        id: "kimi-k2",
        name: "Kimi K2",
        description: "Advanced Chinese model",
        features: ["vision"],
        contextWindow: 128000
      }
    ]
  },
  {
    id: "glm",
    name: "GLM-5 (Zhipu)",
    icon: "🔬",
    status: "unconfigured",
    models: [
      {
        id: "glm-5",
        name: "GLM-5",
        description: "General Language Model",
        features: ["tools"],
        contextWindow: 128000
      }
    ]
  }
];

// Usage in a LitElement component:
export function renderModelSelectorExample() {
  return html`
    <model-selector
      .providers=${exampleProviders}
      .selectedProvider="openai"
      .selectedModel="gpt-4-turbo"
      @model-selected=${handleModelSelected}
      @configure-provider=${handleConfigureProvider}
      @manage-providers=${handleManageProviders}
    ></model-selector>
  `;
}

// Event handlers
function handleModelSelected(event: CustomEvent) {
  const { providerId, modelId } = event.detail;
  console.log("Selected:", providerId, modelId);
  
  // Update configuration
  // await saveModelSelection(providerId, modelId);
}

function handleConfigureProvider(event: CustomEvent) {
  const { providerId } = event.detail;
  console.log("Configure:", providerId);
  
  // Open configuration modal/wizard
  // openProviderConfigWizard(providerId);
}

function handleManageProviders() {
  console.log("Manage all providers");
  
  // Navigate to providers management page
  // navigateTo("/settings/providers");
}

// Integration in app-render.ts (chat header):
/*
import "./components/model-selector.js";

// In the chat header render function:
html`
  <div class="chat-controls">
    <model-selector
      .providers=${state.modelProviders}
      .selectedProvider=${state.selectedProvider}
      .selectedModel=${state.selectedModel}
      @model-selected=${(e) => {
        state.selectedProvider = e.detail.providerId;
        state.selectedModel = e.detail.modelId;
        saveModelConfig();
      }}
    ></model-selector>
    
    <thinking-level-selector ...></thinking-level-selector>
    <tools-toggle ...></tools-toggle>
  </div>
`
*/

// TypeScript types for state management:
export interface ModelState {
  providers: ModelProvider[];
  selectedProvider: string;
  selectedModel: string;
}

// API integration example:
async function loadModelProviders(): Promise<ModelProvider[]> {
  const response = await fetch("/api/v1/models/providers");
  return response.json();
}

async function saveModelSelection(providerId: string, modelId: string): Promise<void> {
  await fetch("/api/v1/models/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId, modelId })
  });
}
