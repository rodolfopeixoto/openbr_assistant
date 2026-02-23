# Spec: Generic Model Provider Configuration Interface

## Overview

Create a flexible, extensible interface for adding and configuring AI model providers dynamically. The system should allow users to add models from any provider (NVIDIA, OpenAI, Anthropic, local models, etc.) through a simple, unified interface.

## Goals

1. **Simple Addition**: Users can add new providers in < 5 minutes
2. **Unified Interface**: Single form works for all providers
3. **Template-Based**: Pre-configured templates for popular providers
4. **Custom Models**: Support for custom/private models
5. **Validation**: Real-time testing of connections

## User Stories

### Story 1: Adding NVIDIA Models
As a user, I want to add NVIDIA-hosted models (GLM5, Kimi, Qwen) so I can use them through the gateway.

**Acceptance Criteria:**
- Select "NVIDIA" from provider list
- Enter NVIDIA API key
- Choose from available NVIDIA models or enter custom model ID
- Test connection before saving

### Story 2: Adding Custom OpenAI-Compatible Endpoint
As a user, I want to add a custom OpenAI-compatible API (like LocalAI, vLLM) so I can use local/self-hosted models.

**Acceptance Criteria:**
- Select "Custom OpenAI Endpoint"
- Enter base URL, API key, and model ID
- Configure parameters (temperature, max_tokens, etc.)
- Save and use immediately

### Story 3: Quick-Add from Template
As a user, I want to add popular providers with one click using pre-configured templates.

**Acceptance Criteria:**
- Click "Add Provider"
- Select from templates: OpenAI, Anthropic, NVIDIA, Groq, etc.
- Only enter API key
- All other settings pre-filled

## Data Model

### Provider Definition

```typescript
interface ModelProvider {
  id: string;                    // Unique identifier (e.g., "nvidia", "openai-custom")
  name: string;                  // Display name (e.g., "NVIDIA API Catalog")
  type: "openai-compatible" | "anthropic" | "google" | "custom";
  
  // Connection settings
  baseUrl: string;              // API base URL
  authType: "api-key" | "oauth" | "bearer";
  
  // Optional: Pre-configured models
  models?: PreConfiguredModel[];
  
  // Optional: Discovery endpoint
  modelDiscovery?: {
    enabled: boolean;
    endpoint?: string;          // e.g., "/v1/models"
    method: "GET" | "POST";
  };
  
  // Default parameters
  defaults: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    [key: string]: unknown;
  };
  
  // UI Configuration
  ui: {
    icon: string;               // Provider icon/icon name
    color: string;              // Brand color
    description: string;
    docsUrl?: string;           // Link to API docs
    apiKeyUrl?: string;         // Link to get API key
  };
  
  // Custom parameters this provider supports
  customParams?: CustomParam[];
}

interface PreConfiguredModel {
  id: string;                   // Model ID used in API calls
  name: string;                 // Display name
  description?: string;
  contextWindow?: number;
  capabilities: ("chat" | "vision" | "function-calling" | "json-mode")[];
  pricing?: {
    input: number;             // Per 1K tokens
    output: number;
  };
}

interface CustomParam {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  required: boolean;
  default?: unknown;
  options?: { value: string; label: string }[];  // For select type
  description?: string;
}

// User's configured provider instance
interface ConfiguredProvider {
  instanceId: string;          // Unique for this user configuration
  providerId: string;          // Reference to ModelProvider
  name: string;                // User-defined name (e.g., "My NVIDIA Account")
  
  // Credentials (encrypted)
  credentials: {
    apiKey?: string;
    bearerToken?: string;
    [key: string]: string | undefined;
  };
  
  // Override base URL (for custom endpoints)
  baseUrlOverride?: string;
  
  // Enabled models (subset of provider.models or custom)
  enabledModels: string[];
  
  // Custom models added by user
  customModels?: CustomModel[];
  
  // Default parameters override
  defaultParams?: Partial<ModelProvider['defaults']>;
  
  // When user adds custom parameters
  customParamValues?: Record<string, unknown>;
  
  createdAt: Date;
  updatedAt: Date;
}

interface CustomModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  capabilities: string[];
}
```

## UI/UX Specification

### 1. Provider Selection Screen

**Layout:** Grid of provider cards

```
+------------------------------------------+
|  Configure AI Model Providers            |
|  Add credentials to enable AI providers  |
+------------------------------------------+
|                                          |
|  +-----------+  +-----------+  +--------+|
|  |   🤖      |  |   🔷      |  |   🟢   ||
|  |  OpenAI   |  |  NVIDIA   |  |  Groq  ||
|  |           |  |   API     |  |        ||
|  |  Configure|  |  Configure|  |Configure||
|  +-----------+  +-----------+  +--------+|
|                                          |
|  +-----------+  +-----------+  +--------+|
|  |   🟣      |  |   🔴      |  |   ➕   ||
|  | Anthropic |  |  Custom   |  |  Add   ||
|  |           |  | Endpoint  |  |Custom  ||
|  |  Configure|  |  Configure|  |Provider||
|  +-----------+  +-----------+  +--------+|
|                                          |
+------------------------------------------+
```

**Behavior:**
- Clicking "Configure" opens provider configuration modal
- "Add Custom Provider" allows creating new provider definitions

### 2. Configuration Modal (Template-Based)

**For Pre-configured Providers (e.g., NVIDIA):**

```
+----------------------------------+
|  Configure NVIDIA API Catalog  X |
+----------------------------------+
|                                  |
|  🔷 NVIDIA API Catalog          |
|  Access models via NVIDIA API   |
|                                  |
|  Profile Name *                  |
|  [My NVIDIA Account          ]   |
|                                  |
|  API Key *                       |
|  [sk-...                      ]   |
|  [Get API Key →]                 |
|                                  |
|  +---------------------------+   |
|  | Available Models          |   |
|  | [x] GLM5                  |   |
|  | [x] Kimi K2.5            |   |
|  | [x] Qwen3 Coder          |   |
|  | [ ] Mixtral 8x22B        |   |
|  +---------------------------+   |
|                                  |
|  Advanced Options ▼              |
|                                  |
|          [Test]  [Cancel] [Save] |
+----------------------------------+
```

**Fields:**
- **Profile Name**: User-defined identifier
- **API Key**: Provider-specific API key
- **Model Selection**: Checkboxes for available models
- **Advanced Options** (collapsible):
  - Base URL override (for proxies)
  - Default parameters (temperature, max_tokens)
  - Custom headers

### 3. Custom Provider Configuration

**For Custom/OpenAI-Compatible Endpoints:**

```
+----------------------------------+
|  Add Custom Provider            X |
+----------------------------------+
|                                   |
|  Provider Type *                  |
|  [OpenAI-Compatible API    ▼]    |
|                                   |
|  Display Name *                   |
|  [My Local AI              ]      |
|                                   |
|  Base URL *                       |
|  [http://localhost:8080/v1]       |
|                                   |
|  API Key                          |
|  [optional                 ]      |
|                                   |
|  + Add Model                      |
|  +---------------------------+    |
|  | Model ID: local-llama     |    |
|  | Name: Llama 3.1 8B        |    |
|  | Context: 8192            |    |
|  +---------------------------+    |
|                                   |
|          [Test]  [Cancel] [Save]  |
+----------------------------------+
```

### 4. Model Card Interface

**When viewing configured models:**

```
+------------------------------------------+
|  Models                          [+ Add] |
+------------------------------------------+
|                                          |
|  ┌────────────────────────────────────┐  |
|  │ 🔷 NVIDIA API Catalog              │  |
|  │ my-nvidia-account                  │  |
|  │                                    │  |
|  │  ┌──────────┐ ┌──────────┐        │  |
|  │  │ 🤖 GLM5  │ │ 🧠 Kimi  │        │  |
|  │  │ Active   │ │ Active   │        │  |
|  │  └──────────┘ └──────────┘        │  |
|  │                                    │  |
|  │ [Manage] [Test] [Delete]          │  |
|  └────────────────────────────────────┘  |
|                                          |
|  ┌────────────────────────────────────┐  |
|  │ 🤖 Custom Endpoint                 │  |
|  │ LocalAI Server                     │  |
|  │                                    │  |
|  │  ┌──────────────┐                  │  |
|  │  │ 🦙 Llama 3.1 │                  │  |
|  │  │ Active       │                  │  |
|  │  └──────────────┘                  │  |
|  │                                    │  |
|  │ [Manage] [Test] [Delete]          │  |
|  └────────────────────────────────────┘  |
|                                          |
+------------------------------------------+
```

**Model Card Details:**
- Provider icon + name
- Profile name
- Grid of enabled models with status
- Action buttons: Manage, Test, Delete

## API Endpoints

### 1. List Available Providers
```http
GET /v1/providers/templates

Response:
{
  "providers": [
    {
      "id": "nvidia",
      "name": "NVIDIA API Catalog",
      "type": "openai-compatible",
      "ui": {
        "icon": "nvidia",
        "color": "#76B900",
        "description": "Access 100+ models via NVIDIA API"
      },
      "models": [
        {
          "id": "z-ai/glm5",
          "name": "GLM5",
          "description": "Excels in agentic coding...",
          "contextWindow": 256000
        }
      ]
    }
  ]
}
```

### 2. Test Provider Connection
```http
POST /v1/providers/test

Body:
{
  "providerId": "nvidia",
  "credentials": {
    "apiKey": "nvapi-xxxxx"
  },
  "baseUrlOverride": null,
  "testModel": "z-ai/glm5"
}

Response:
{
  "success": true,
  "models": ["z-ai/glm5", "moonshotai/kimi-k2.5"],
  "error": null
}
```

### 3. Save Provider Configuration
```http
POST /v1/providers/configured

Body:
{
  "providerId": "nvidia",
  "name": "My NVIDIA Account",
  "credentials": {
    "apiKey": "nvapi-xxxxx"
  },
  "enabledModels": ["z-ai/glm5", "moonshotai/kimi-k2.5"],
  "defaultParams": {
    "temperature": 0.7
  }
}

Response:
{
  "instanceId": "nvidia-uuid",
  "status": "active",
  "models": [
    {
      "id": "nvidia-uuid:z-ai/glm5",
      "name": "GLM5",
      "provider": "My NVIDIA Account"
    }
  ]
}
```

### 4. Discover Models (Optional)
```http
POST /v1/providers/discover

Body:
{
  "providerId": "nvidia",
  "credentials": {
    "apiKey": "nvapi-xxxxx"
  }
}

Response:
{
  "models": [
    {
      "id": "z-ai/glm5",
      "name": "GLM5",
      "description": "...",
      "capabilities": ["chat", "vision"]
    }
  ]
}
```

## Implementation Phases

### Phase 1: Basic Provider Support (Week 1)
- [ ] Create provider registry system
- [ ] Implement pre-configured provider templates (OpenAI, Anthropic, NVIDIA)
- [ ] Build configuration modal UI
- [ ] Add test connection functionality

### Phase 2: Custom Providers (Week 2)
- [ ] Add custom provider creation
- [ ] Support OpenAI-compatible endpoints
- [ ] Model discovery API integration
- [ ] Advanced parameters configuration

### Phase 3: Management Interface (Week 3)
- [ ] Provider management dashboard
- [ ] Model enable/disable toggles
- [ ] Edit/delete configurations
- [ ] Bulk operations

### Phase 4: Polish (Week 4)
- [ ] Search/filter providers
- [ ] Import/export configurations
- [ ] Usage analytics per provider
- [ ] Documentation & examples

## Example: Adding NVIDIA as Provider

### 1. Provider Definition (Backend)
```typescript
// providers/nvidia.ts
export const nvidiaProvider: ModelProvider = {
  id: "nvidia",
  name: "NVIDIA API Catalog",
  type: "openai-compatible",
  baseUrl: "https://integrate.api.nvidia.com/v1",
  authType: "api-key",
  
  models: [
    {
      id: "z-ai/glm5",
      name: "GLM5",
      description: "Excels in agentic coding and browser use...",
      contextWindow: 256000,
      capabilities: ["chat", "vision"],
      pricing: { input: 0.002, output: 0.006 }
    },
    {
      id: "moonshotai/kimi-k2.5",
      name: "Kimi K2.5",
      description: "Advanced reasoning model",
      contextWindow: 256000,
      capabilities: ["chat"]
    },
    {
      id: "qwen/qwen3-coder-480b-a35b-instruct",
      name: "Qwen3 Coder",
      description: "Specialized for coding tasks",
      contextWindow: 131072,
      capabilities: ["chat"]
    }
  ],
  
  defaults: {
    temperature: 1.0,
    maxTokens: 16384,
    topP: 1.0
  },
  
  ui: {
    icon: "nvidia",
    color: "#76B900",
    description: "Access 100+ production-grade models via NVIDIA API",
    docsUrl: "https://docs.nvidia.com/nim/",
    apiKeyUrl: "https://build.nvidia.com/"
  },
  
  customParams: [
    {
      key: "chat_template_kwargs",
      label: "Chat Template Options",
      type: "select",
      required: false,
      default: "default",
      options: [
        { value: "default", label: "Default" },
        { value: "thinking", label: "Enable Thinking" }
      ],
      description: "Additional options for model chat template"
    }
  ]
};
```

### 2. Usage in UI
```typescript
// User configures NVIDIA
const config: ConfiguredProvider = {
  instanceId: "nvidia-001",
  providerId: "nvidia",
  name: "Production NVIDIA",
  credentials: { apiKey: "nvapi-xxxxx" },
  enabledModels: ["z-ai/glm5", "moonshotai/kimi-k2.5"],
  defaultParams: { temperature: 0.7 }
};

// Results in available models:
// - "nvidia-001:z-ai/glm5" → "GLM5 (via Production NVIDIA)"
// - "nvidia-001:moonshotai/kimi-k2.5" → "Kimi K2.5 (via Production NVIDIA)"
```

## Success Metrics

1. **Time to Add Provider**: < 5 minutes for known providers
2. **Time to Add Custom**: < 10 minutes for new OpenAI-compatible endpoints
3. **Provider Coverage**: Support top 10 providers by month 1
4. **User Satisfaction**: > 4.0/5 rating on ease of configuration

## Security Considerations

1. **Credential Encryption**: All API keys encrypted at rest
2. **Scoped Access**: Credentials only accessible by gateway, not UI
3. **Audit Logging**: Log all provider additions/removals
4. **Validation**: Never expose credentials in API responses

## Future Enhancements

1. **Provider Marketplace**: Community-contributed provider templates
2. **Auto-Discovery**: Automatic model discovery for compatible endpoints
3. **Usage Tracking**: Per-provider cost and token tracking
4. **Fallback Chain**: Automatic fallback between providers
5. **Model Routing**: Route requests to optimal provider based on model availability
