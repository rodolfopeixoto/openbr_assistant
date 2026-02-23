---
summary: "Developer documentation for the OpenClaw provider management system"
read_when:
  - You want to add a new provider template
  - You need to integrate with the provider API
  - You want to understand provider architecture
title: "Provider Management Developer Guide"
---

# Provider Management Developer Guide

This guide is for developers who want to extend OpenClaw's provider system, add new provider templates, or integrate with the provider management API.

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Provider System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │   CLI / UI      │────▶│   Provider Registry         │   │
│  │   (User Layer)  │     │   (src/providers/registry)  │   │
│  └─────────────────┘     └──────────────┬──────────────┘   │
│                                         │                   │
│  ┌─────────────────┐     ┌─────────────▼──────────────┐   │
│  │  Gateway API    │◀────│   Provider Store           │   │
│  │  (REST Routes)  │     │   (src/providers/store)    │   │
│  └────────┬────────┘     └──────────────┬───────────────┘   │
│           │                             │                   │
│           ▼                             ▼                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │          Provider Templates                      │      │
│  │  (Built-in definitions for each provider)        │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| **Registry** | `src/providers/registry/` | Manages provider templates and configured instances |
| **Store** | `src/providers/store/` | Persistent storage for configured providers |
| **Types** | `src/providers/types.ts` | Core type definitions |
| **Gateway Routes** | `src/gateway/routes/providers.ts` | REST API endpoints |
| **UI Types** | `ui/src/types/providers.ts` | Frontend type definitions |

## Provider Template Structure

A provider template defines how to connect to an AI service.

### Template Interface

```typescript
interface ProviderTemplate {
  id: string;                    // Unique identifier
  version: string;               // Semver version
  metadata: ProviderMetadata;    // Display info
  connection: ConnectionConfig;  // Connection settings
  models: ModelTemplate[];       // Available models
  globalParameters?: ParameterDefinition[];  // Shared params
  validation: ValidationConfig;  // Validation rules
}
```

### Complete Template Example

Here's the NVIDIA provider template as a reference:

```typescript
export const NVIDIA_PROVIDER: ProviderTemplate = {
  id: 'nvidia',
  version: '1.0.0',

  metadata: {
    name: 'NVIDIA API Catalog',
    description: 'Access production-grade models via NVIDIA API',
    icon: 'nvidia-logo',
    color: '#76B900',
    category: 'cloud',
    tags: ['enterprise', 'vision', 'multimodal'],
    docsUrl: 'https://docs.nvidia.com/nim/',
    apiKeyUrl: 'https://build.nvidia.com/',
  },

  connection: {
    type: 'openai-compatible',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    auth: {
      type: 'api-key',
      headerName: 'Authorization',
      headerPrefix: 'Bearer ',
    },
    endpoints: {
      models: '/v1/models',
      chat: '/v1/chat/completions',
      embeddings: '/v1/embeddings',
    },
  },

  models: [
    {
      id: 'z-ai/glm5',
      name: 'GLM5',
      description: 'Excels in agentic coding and browser use',
      capabilities: ['chat', 'vision', 'function-calling'],
      contextWindow: 256000,
      maxTokens: 16384,
      pricing: {
        input: 0.002,
        output: 0.006,
        currency: 'USD',
      },
      defaults: {
        temperature: 1.0,
        topP: 1.0,
      },
      parameters: [
        {
          key: 'chat_template_kwargs.enable_thinking',
          label: 'Enable Thinking',
          type: 'boolean',
          default: true,
          description: 'Enable reasoning mode',
        },
      ],
    },
  ],

  globalParameters: [
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'number',
      min: 0,
      max: 2,
      step: 0.1,
      default: 1.0,
      description: 'Controls randomness',
    },
  ],

  validation: {
    testEndpoint: '/v1/models',
    testMethod: 'GET',
    requiredFields: ['apiKey'],
  },
};
```

## Adding a New Provider Template

### Step 1: Create Template File

Create `src/providers/registry/<provider>.ts`:

```typescript
import type { ProviderTemplate } from './types.js';

export const NEW_PROVIDER: ProviderTemplate = {
  id: 'newprovider',
  version: '1.0.0',
  
  metadata: {
    name: 'New Provider',
    description: 'Description of the provider',
    icon: 'provider-icon',
    color: '#FF5733',
    category: 'cloud',
    tags: ['chat', 'enterprise'],
    docsUrl: 'https://docs.provider.com',
    apiKeyUrl: 'https://provider.com/api-keys',
  },

  connection: {
    type: 'openai-compatible',
    baseUrl: 'https://api.provider.com/v1',
    auth: {
      type: 'api-key',
      headerName: 'Authorization',
      headerPrefix: 'Bearer ',
    },
    endpoints: {
      models: '/v1/models',
      chat: '/v1/chat/completions',
    },
  },

  models: [
    {
      id: 'model-id',
      name: 'Model Name',
      description: 'Model description',
      capabilities: ['chat', 'vision'],
      contextWindow: 128000,
      maxTokens: 8192,
      pricing: {
        input: 0.001,
        output: 0.003,
        currency: 'USD',
      },
      defaults: {
        temperature: 0.7,
        topP: 1.0,
      },
    },
  ],

  validation: {
    testEndpoint: '/v1/models',
    testMethod: 'GET',
    requiredFields: ['apiKey'],
  },
};
```

### Step 2: Register Template

Update `src/providers/registry/index.ts`:

```typescript
export { NEW_PROVIDER } from './newprovider.js';

import { NEW_PROVIDER } from './newprovider.js';

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  // ... existing providers
  NEW_PROVIDER,
];

export const PROVIDER_TEMPLATE_MAP: Record<string, ProviderTemplate> = {
  // ... existing providers
  [NEW_PROVIDER.id]: NEW_PROVIDER,
};
```

### Step 3: Add Documentation

Create `docs/providers/newprovider.md`:

```markdown
---
summary: "New Provider setup and configuration"
title: "New Provider"
---

# New Provider

Description...

## Setup

1. Get API key from [provider.com](https://provider.com)
2. Run: `openclaw providers add newprovider --api-key KEY`

## Models

- `newprovider/model-id` - Description

## Pricing

Input: $0.001/1K tokens
Output: $0.003/1K tokens
```

### Step 4: Add Tests

Create `src/providers/registry/newprovider.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { NEW_PROVIDER } from './newprovider.js';

describe('New Provider Template', () => {
  it('should have valid structure', () => {
    expect(NEW_PROVIDER.id).toBe('newprovider');
    expect(NEW_PROVIDER.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(NEW_PROVIDER.metadata.name).toBeDefined();
  });

  it('should have required validation fields', () => {
    expect(NEW_PROVIDER.validation.requiredFields).toContain('apiKey');
  });
});
```

## API Reference

### REST Endpoints

All provider endpoints are prefixed with `/api/v1/providers`.

#### List Provider Templates

```
GET /api/v1/providers/templates
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "openai",
      "metadata": { "name": "OpenAI", ... },
      "models": [...]
    }
  ]
}
```

#### Get Template

```
GET /api/v1/providers/templates/:id
```

#### List Configured Providers

```
GET /api/v1/providers
```

**Query Parameters:**
- `status` - Filter by status (configured, error, disabled)
- `templateId` - Filter by template
- `enabledOnly=true` - Only enabled providers

#### Create Provider

```
POST /api/v1/providers
```

**Request Body:**
```json
{
  "templateId": "openai",
  "name": "Production OpenAI",
  "config": {
    "apiKey": "sk-..."
  },
  "isDefault": false
}
```

#### Update Provider

```
PUT /api/v1/providers/:id
```

#### Delete Provider

```
DELETE /api/v1/providers/:id
```

#### Test Connection

```
POST /api/v1/providers/test
```

**Request Body:**
```json
{
  "templateId": "openai",
  "config": {
    "apiKey": "sk-..."
  },
  "baseUrl": "https://api.openai.com/v1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "status": "connected",
    "latency": 45,
    "message": "Connection successful"
  }
}
```

## Data Models

### ProviderTemplate

```typescript
interface ProviderTemplate {
  id: string;                    // Unique identifier
  version: string;               // Semver
  metadata: ProviderMetadata;
  connection: ConnectionConfig;
  models: ModelTemplate[];
  globalParameters?: ParameterDefinition[];
  validation: ValidationConfig;
}
```

### ProviderMetadata

```typescript
interface ProviderMetadata {
  name: string;                  // Display name
  description: string;
  icon: string;                  // Icon identifier
  color: string;                 // Brand color (hex)
  category: 'cloud' | 'local' | 'enterprise' | 'custom';
  tags: string[];               // Search/filter tags
  docsUrl: string;              // Documentation link
  apiKeyUrl: string;            // Where to get API keys
}
```

### ConnectionConfig

```typescript
interface ConnectionConfig {
  type: 'openai-compatible' | 'anthropic' | 'google' | 'custom';
  baseUrl: string;
  auth: AuthConfig;
  endpoints: EndpointConfig;
}

interface AuthConfig {
  type: 'api-key' | 'bearer-token' | 'oauth';
  headerName?: string;          // e.g., "Authorization"
  headerPrefix?: string;        // e.g., "Bearer "
}

interface EndpointConfig {
  models: string;               // e.g., "/v1/models"
  chat: string;                 // e.g., "/v1/chat/completions"
  embeddings?: string;
}
```

### ModelTemplate

```typescript
interface ModelTemplate {
  id: string;                   // Provider model ID
  name: string;                 // Display name
  description: string;
  capabilities: string[];      // e.g., ['chat', 'vision']
  contextWindow: number;
  maxTokens: number;
  pricing: PricingInfo;
  defaults?: ModelDefaults;
  parameters?: ParameterDefinition[];
}
```

### ConfiguredProvider

```typescript
interface ConfiguredProvider {
  id: string;                   // Generated unique ID
  templateId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  isDefault: boolean;
  config: Record<string, unknown>;
  baseUrl?: string;
  status: 'unconfigured' | 'configured' | 'testing' | 'connected' | 'error' | 'disabled';
  lastTestedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}
```

### ParameterDefinition

```typescript
interface ParameterDefinition {
  key: string;                  // Parameter key
  label: string;               // Display label
  type: 'number' | 'boolean' | 'string' | 'enum';
  min?: number;                // For number type
  max?: number;
  step?: number;
  default: unknown;
  description?: string;
  options?: string[];          // For enum type
}
```

## Error Handling

### Error Codes

```typescript
enum ProviderErrorCode {
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  INVALID_CONFIG = 'INVALID_CONFIG',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  DUPLICATE_ID = 'DUPLICATE_ID',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid API key",
    "details": {
      "statusCode": 401
    }
  }
}
```

## Provider Registry API

### TypeScript API

```typescript
// Initialize storage
import { initializeConfiguredProviders } from './registry/index.js';
await initializeConfiguredProviders('/path/to/storage');

// List templates
import { listProviderTemplates, getProviderTemplate } from './registry/index.js';
const templates = listProviderTemplates();
const openai = getProviderTemplate('openai');

// Manage configured providers
import {
  getConfiguredProviders,
  createConfiguredProvider,
  updateConfiguredProvider,
  deleteConfiguredProvider,
  testProviderConnection,
} from './registry/index.js';

// Create provider
const provider = await createConfiguredProvider({
  templateId: 'openai',
  name: 'Production',
  config: { apiKey: 'sk-...' },
});

// Test connection
const result = await testProviderConnection({
  templateId: 'openai',
  config: { apiKey: 'sk-...' },
});

// Subscribe to events
import { onProviderEvent } from './registry/index.js';
const unsubscribe = onProviderEvent((event) => {
  console.log('Provider event:', event.type, event.providerId);
});
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createConfiguredProvider,
  resetConfiguredProviders,
} from './registry/index.js';

describe('Provider Registry', () => {
  beforeEach(() => {
    resetConfiguredProviders();
  });

  it('should create provider with valid config', async () => {
    const provider = await createConfiguredProvider({
      templateId: 'openai',
      name: 'Test Provider',
      config: { apiKey: 'test-key' },
    });

    expect(provider.name).toBe('Test Provider');
    expect(provider.status).toBe('configured');
  });
});
```

### Integration Tests

```typescript
import { testProviderConnection } from './registry/index.js';

describe('Provider Connection Tests', () => {
  it('should test OpenAI connection', async () => {
    const result = await testProviderConnection({
      templateId: 'openai',
      config: { apiKey: process.env.OPENAI_API_KEY },
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('connected');
  });
});
```

## Best Practices

### Template Design

1. **Use semantic versioning** for templates
2. **Document all parameters** with clear descriptions
3. **Include pricing information** when available
4. **Set sensible defaults** for model parameters
5. **Validate required fields** explicitly

### Error Handling

1. **Return detailed error messages** for configuration issues
2. **Include HTTP status codes** in connection errors
3. **Log errors** with context for debugging
4. **Gracefully handle timeouts** and network issues

### Security

1. **Never log API keys** in full
2. **Store keys encrypted** at rest
3. **Validate API key format** before testing
4. **Support key rotation** without downtime

## Contributing

When adding a new provider:

1. Follow existing template patterns
2. Add comprehensive tests
3. Document in `docs/providers/`
4. Update `docs/providers/index.md`
5. Add example usage to examples directory
6. Test with real API keys before submitting

## Related Documentation

- [User Guide](/providers/user-guide) - End-user documentation
- [Model Providers](/providers) - Full provider list
- [Configuration](/gateway/configuration) - Gateway configuration
- [REST API](/gateway/openai-http-api) - Gateway API reference
