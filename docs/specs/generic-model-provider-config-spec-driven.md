# Spec Driven Development: Generic Model Provider Configuration

## Status: DRAFT → READY FOR IMPLEMENTATION

---

## 1. VISÃO GERAL

### 1.1 Objetivo
Sistema completo para adicionar, configurar e gerenciar providers de modelos de IA (OpenAI, NVIDIA, Anthropic, custom endpoints) através de interface unificada.

### 1.2 Definição de Sucesso
- Usuário adiciona NVIDIA em < 2 minutos
- Usuário adiciona endpoint custom em < 5 minutos  
- Sistema funciona sem bugs críticos
- Interface intuitiva (teste de usabilidade > 4/5)

### 1.3 Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (UI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ ProviderList │  │ ConfigModal  │  │ ModelManager    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                   GATEWAY API                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ ProviderCtrl │  │ AuthCtrl     │  │ ModelCtrl       │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   DATA LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ ConfigStore  │  │ CredVault    │  │ ProviderReg     │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. FLUXOS DETALHADOS

### 2.1 Fluxo 1: Adicionar Provider (NVIDIA)

#### 2.1.1 Diagrama de Sequência

```
Usuário          Frontend              Backend              External
   │                │                      │                    │
   │ 1. Clica "+"   │                      │                    │
   │────────────────│                      │                    │
   │                │                      │                    │
   │ 2. Abre Modal  │                      │                    │
   │◄───────────────│                      │                    │
   │                │                      │                    │
   │ 3. Seleciona   │                      │                    │
   │    "NVIDIA"    │                      │                    │
   │────────────────│                      │                    │
   │                │                      │                    │
   │                │ 4. GET /providers/   │                    │
   │                │    templates/nvidia  │                    │
   │                │─────────────────────▶│                    │
   │                │                      │                    │
   │                │ 5. Retorna schema    │                    │
   │                │    + modelos         │                    │
   │                │◄─────────────────────│                    │
   │                │                      │                    │
   │ 6. Mostra      │                      │                    │
   │    formulário  │                      │                    │
   │◄───────────────│                      │                    │
   │                │                      │                    │
   │ 7. Preenche    │                      │                    │
   │    API Key     │                      │                    │
   │────────────────│                      │                    │
   │                │                      │                    │
   │ 8. Clica       │                      │                    │
   │    "Testar"    │                      │                    │
   │────────────────│                      │                    │
   │                │                      │                    │
   │                │ 9. POST /providers/  │                    │
   │                │     test             │                    │
   │                │─────────────────────▶│                    │
   │                │                      │                    │
   │                │                      │ 10. Chama NVIDIA   │
   │                │                      │     /v1/models     │
   │                │                      │────────────────────▶│
   │                │                      │                    │
   │                │                      │ 11. Retorna lista  │
   │                │                      │◄────────────────────│
   │                │                      │                    │
   │                │ 12. Retorna sucesso  │                    │
   │                │     + modelos        │                    │
   │                │◄─────────────────────│                    │
   │                │                      │                    │
   │ 13. Mostra     │                      │                    │
   │     sucesso    │                      │                    │
   │◄───────────────│                      │                    │
   │                │                      │                    │
   │ 14. Clica      │                      │                    │
   │     "Salvar"   │                      │                    │
   │────────────────│                      │                    │
   │                │                      │                    │
   │                │ 15. POST /providers/ │                    │
   │                │     configured       │                    │
   │                │─────────────────────▶│                    │
   │                │                      │                    │
   │                │                      │ 16. Salva no       │
   │                │                      │     config + vault │
   │                │                      │                    │
   │                │ 17. Retorna          │                    │
   │                │     instanceId       │                    │
   │                │◄─────────────────────│                    │
   │                │                      │                    │
   │ 18. Fecha      │                      │                    │
   │     modal      │                      │                    │
   │◄───────────────│                      │                    │
   │                │                      │                    │
   │ 19. Lista      │                      │                    │
   │     atualizada │                      │                    │
   │◄───────────────│                      │                    │
   │                │                      │                    │
```

#### 2.1.2 Estados da UI

```
[INITIAL] ──click──▶ [SELECTING_PROVIDER]
                          │
                          ▼
[SHOWING_FORM] ◀───receive schema──┘
   │
   ├──input──▶ [FORM_DIRTY]
   │              │
   │              ├──test──▶ [TESTING]
   │              │             │
   │              │             ▼
   │              │◀─────── [SHOWING_RESULT]
   │              │             │
   │              │             ├──success──▶ [VALIDATED]
   │              │             │               │
   │              │             │               ├──save──▶ [SAVING]
   │              │             │               │            │
   │              │             │               │            ▼
   │              │             │               │         [SUCCESS] ──▶ [CLOSED]
   │              │             │               │
   │              │             └──error───────▶ [SHOWING_ERROR]
   │              │                               │
   │              │                               └──retry──▶ [FORM_DIRTY]
   │              │
   │              └──cancel──▶ [CLOSED]
   │
   └──close──▶ [CLOSED]
```

#### 2.1.3 Componentes React/Lit Específicos

```typescript
// ProviderCard.tsx
interface ProviderCardProps {
  provider: ProviderTemplate;
  isConfigured: boolean;
  onConfigure: () => void;
  onManage: () => void;
}

// Component structure:
// ┌─────────────────────────────┐
// │ [ICON] Provider Name    [▶] │
// │ Description                 │
// │                             │
// │ [Model1] [Model2] [+3]      │
// │                             │
// │ [Configure] or [Manage]     │
// └─────────────────────────────┘

// ConfigModal.tsx
interface ConfigModalProps {
  provider: ProviderTemplate;
  initialData?: ConfiguredProvider;
  onSave: (data: SaveProviderRequest) => Promise<void>;
  onTest: (data: TestProviderRequest) => Promise<TestResult>;
  onClose: () => void;
}

// State Machine:
const [step, setStep] = useState<ConfigStep>('form'); // 'form' | 'testing' | 'success' | 'error'
const [formData, setFormData] = useState<FormData>({});
const [testResult, setTestResult] = useState<TestResult | null>(null);
const [error, setError] = useState<string | null>(null);
```

---

## 3. ESTRUTURA DE DADOS DETALHADA

### 3.1 Provider Template (Backend Registry)

```typescript
// src/providers/registry/nvidia.ts
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
      description: 'Excels in agentic coding and browser use with 256K context',
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
      // Custom parameters for this specific model
      parameters: [
        {
          key: 'chat_template_kwargs.enable_thinking',
          label: 'Enable Thinking',
          type: 'boolean',
          default: true,
          description: 'Enable reasoning mode for better problem-solving',
        },
        {
          key: 'chat_template_kwargs.clear_thinking',
          label: 'Clear Thinking',
          type: 'boolean',
          default: false,
          description: 'Remove thinking tokens from output',
        },
      ],
    },
    {
      id: 'moonshotai/kimi-k2.5',
      name: 'Kimi K2.5',
      description: 'Advanced reasoning model with long context',
      capabilities: ['chat'],
      contextWindow: 256000,
      maxTokens: 16384,
      pricing: { input: 0.003, output: 0.009 },
      parameters: [
        {
          key: 'chat_template_kwargs.thinking',
          label: 'Thinking Mode',
          type: 'boolean',
          default: true,
        },
      ],
    },
    {
      id: 'qwen/qwen3-coder-480b-a35b-instruct',
      name: 'Qwen3 Coder',
      description: 'Specialized for coding and technical tasks',
      capabilities: ['chat', 'code'],
      contextWindow: 131072,
      maxTokens: 8192,
      pricing: { input: 0.001, output: 0.003 },
    },
  ],
  
  // Global parameters for all models in this provider
  globalParameters: [
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'number',
      min: 0,
      max: 2,
      step: 0.1,
      default: 1.0,
      description: 'Controls randomness: 0 = deterministic, 2 = very random',
    },
    {
      key: 'topP',
      label: 'Top P',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.1,
      default: 1.0,
      description: 'Nucleus sampling threshold',
    },
  ],
  
  // Validation rules
  validation: {
    testEndpoint: '/v1/models',
    testMethod: 'GET',
    requiredFields: ['apiKey'],
  },
};
```

### 3.2 Configured Provider Instance (User Data)

```typescript
// Stored in: ~/.openclaw/providers/{instanceId}.json
interface ConfiguredProvider {
  // Identity
  instanceId: string;           // UUID v4
  providerId: string;           // 'nvidia', 'openai', etc.
  
  // User-defined
  name: string;                 // "My NVIDIA Production"
  description?: string;         // "Production API key for customer apps"
  
  // Credentials (encrypted)
  credentials: {
    apiKey?: string;            // Encrypted
    bearerToken?: string;       // Encrypted  
    username?: string;          // For basic auth
    password?: string;          // Encrypted
  };
  
  // Connection overrides
  connectionOverrides?: {
    baseUrl?: string;           // For proxies/custom endpoints
    timeout?: number;           // Request timeout in ms
    retries?: number;           // Retry attempts
    customHeaders?: Record<string, string>;
  };
  
  // Model configuration
  models: {
    // Map of modelId -> ModelConfig
    [modelId: string]: {
      enabled: boolean;
      displayName?: string;     // Override default name
      defaults?: {              // Override model defaults
        temperature?: number;
        maxTokens?: number;
        [key: string]: unknown;
      };
      // Model-specific custom parameters
      customParams?: Record<string, unknown>;
    };
  };
  
  // Global defaults for this provider instance
  globalDefaults?: {
    temperature?: number;
    topP?: number;
    [key: string]: unknown;
  };
  
  // Status
  status: 'active' | 'error' | 'disabled';
  lastError?: string;
  lastTestedAt?: ISO8601;
  
  // Metadata
  createdAt: ISO8601;
  updatedAt: ISO8601;
  createdBy: string;            // User/agent ID
}
```

### 3.3 API Response Types

```typescript
// GET /api/v1/providers/templates
interface ListProviderTemplatesResponse {
  providers: ProviderTemplateSummary[];
}

interface ProviderTemplateSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'cloud' | 'local' | 'enterprise';
  isConfigured: boolean;
  configuredInstances: number;
}

// GET /api/v1/providers/templates/:id
interface GetProviderTemplateResponse {
  provider: ProviderTemplate;
}

// POST /api/v1/providers/test
interface TestProviderRequest {
  providerId: string;
  credentials: {
    apiKey?: string;
    bearerToken?: string;
    [key: string]: string | undefined;
  };
  connectionOverrides?: {
    baseUrl?: string;
    timeout?: number;
  };
}

interface TestProviderResponse {
  success: boolean;
  message: string;
  models?: AvailableModel[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface AvailableModel {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  contextWindow: number;
  pricing?: {
    input: number;
    output: number;
  };
}

// POST /api/v1/providers
interface CreateProviderRequest {
  providerId: string;
  name: string;
  description?: string;
  credentials: {
    apiKey?: string;
    [key: string]: string | undefined;
  };
  connectionOverrides?: {
    baseUrl?: string;
    timeout?: number;
  };
  models: {
    id: string;
    enabled: boolean;
    displayName?: string;
    defaults?: Record<string, unknown>;
  }[];
  globalDefaults?: Record<string, unknown>;
}

interface CreateProviderResponse {
  instanceId: string;
  provider: ConfiguredProvider;
  enabledModels: Model[];
}
```

---

## 4. ENDPOINTS DA API (BACKEND)

### 4.1 Provider Registry Endpoints

```typescript
// src/gateway/routes/providers.ts

/**
 * List all available provider templates
 * GET /api/v1/providers/templates
 */
router.get('/templates', async (req, res) => {
  // 1. Load all provider templates from registry
  const templates = await providerRegistry.listAll();
  
  // 2. Check which ones are already configured
  const configured = await providerStore.listConfigured();
  
  // 3. Build response with configuration status
  const response = templates.map(template => ({
    id: template.id,
    name: template.metadata.name,
    description: template.metadata.description,
    icon: template.metadata.icon,
    color: template.metadata.color,
    category: template.metadata.category,
    isConfigured: configured.some(c => c.providerId === template.id),
    configuredInstances: configured.filter(c => c.providerId === template.id).length,
  }));
  
  res.json({ providers: response });
});

/**
 * Get specific provider template details
 * GET /api/v1/providers/templates/:id
 */
router.get('/templates/:id', async (req, res) => {
  const { id } = req.params;
  
  // 1. Load template from registry
  const template = await providerRegistry.get(id);
  if (!template) {
    return res.status(404).json({ error: 'Provider template not found' });
  }
  
  // 2. Return full template schema
  res.json({ provider: template });
});

/**
 * Test provider connection
 * POST /api/v1/providers/test
 */
router.post('/test', async (req, res) => {
  const { providerId, credentials, connectionOverrides }: TestProviderRequest = req.body;
  
  try {
    // 1. Load provider template
    const template = await providerRegistry.get(providerId);
    if (!template) {
      return res.status(404).json({ 
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Provider template not found' }
      });
    }
    
    // 2. Build connection config
    const config = {
      baseUrl: connectionOverrides?.baseUrl || template.connection.baseUrl,
      auth: {
        ...template.connection.auth,
        credentials,
      },
      timeout: connectionOverrides?.timeout || 30000,
    };
    
    // 3. Test connection
    const tester = new ProviderTester(config);
    const result = await tester.test(template.validation.testEndpoint);
    
    // 4. If successful, discover available models
    let models: AvailableModel[] = [];
    if (result.success) {
      models = await tester.discoverModels(template);
    }
    
    res.json({
      success: result.success,
      message: result.success ? 'Connection successful' : result.error,
      models: result.success ? models : undefined,
      error: !result.success ? {
        code: result.errorCode || 'CONNECTION_FAILED',
        message: result.error,
        details: result.details,
      } : undefined,
    });
  } catch (error) {
    logger.error('Provider test failed', { error, providerId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to test provider connection',
      },
    });
  }
});

/**
 * Create new provider configuration
 * POST /api/v1/providers
 */
router.post('/', async (req, res) => {
  const data: CreateProviderRequest = req.body;
  
  try {
    // 1. Validate request
    const template = await providerRegistry.get(data.providerId);
    if (!template) {
      return res.status(400).json({ error: 'Invalid provider ID' });
    }
    
    // 2. Encrypt credentials
    const encryptedCreds = await credentialVault.encrypt(data.credentials);
    
    // 3. Create provider instance
    const provider: ConfiguredProvider = {
      instanceId: generateUUID(),
      providerId: data.providerId,
      name: data.name,
      description: data.description,
      credentials: encryptedCreds,
      connectionOverrides: data.connectionOverrides,
      models: Object.fromEntries(
        data.models.map(m => [m.id, {
          enabled: m.enabled,
          displayName: m.displayName,
          defaults: m.defaults,
        }])
      ),
      globalDefaults: data.globalDefaults,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user?.id || 'system',
    };
    
    // 4. Save to storage
    await providerStore.save(provider);
    
    // 5. Register models with the system
    const enabledModels = await modelRegistry.registerProvider(provider);
    
    res.status(201).json({
      instanceId: provider.instanceId,
      provider: sanitizeProviderForResponse(provider),
      enabledModels,
    });
  } catch (error) {
    logger.error('Failed to create provider', { error, data });
    res.status(500).json({ error: 'Failed to create provider configuration' });
  }
});

/**
 * List configured providers
 * GET /api/v1/providers
 */
router.get('/', async (req, res) => {
  const providers = await providerStore.listAll();
  
  // Return sanitized version (no credentials)
  res.json({
    providers: providers.map(sanitizeProviderForResponse),
  });
});

/**
 * Update provider configuration
 * PATCH /api/v1/providers/:instanceId
 */
router.patch('/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  const updates = req.body;
  
  // 1. Load existing
  const existing = await providerStore.get(instanceId);
  if (!existing) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  // 2. Apply updates
  const updated = {
    ...existing,
    ...updates,
    credentials: updates.credentials 
      ? await credentialVault.encrypt(updates.credentials)
      : existing.credentials,
    updatedAt: new Date().toISOString(),
  };
  
  // 3. Save
  await providerStore.save(updated);
  
  // 4. Update model registry
  await modelRegistry.updateProvider(updated);
  
  res.json({ provider: sanitizeProviderForResponse(updated) });
});

/**
 * Delete provider configuration
 * DELETE /api/v1/providers/:instanceId
 */
router.delete('/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  
  // 1. Unregister from model registry
  await modelRegistry.unregisterProvider(instanceId);
  
  // 2. Delete from storage
  await providerStore.delete(instanceId);
  
  res.status(204).send();
});
```

---

## 5. COMPONENTES FRONTEND (UI)

### 5.1 ProviderCard Component

```typescript
// ui/src/components/ProviderCard.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ProviderTemplateSummary } from '../types/providers';

@customElement('provider-card')
export class ProviderCard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    .card {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s ease;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    
    .card:hover {
      border-color: var(--border-strong, #3d3d5c);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    
    .card.configured {
      border-left: 3px solid #22c55e;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .info {
      flex: 1;
      min-width: 0;
    }
    
    .name {
      font-size: 16px;
      font-weight: 600;
      color: var(--text, #fff);
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .badge {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    
    .description {
      font-size: 13px;
      color: var(--muted, #888);
      line-height: 1.4;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .models {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }
    
    .model-tag {
      font-size: 11px;
      padding: 4px 8px;
      background: var(--bg, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 4px;
      color: var(--text, #fff);
    }
    
    .model-tag.more {
      background: var(--accent, #6366f1);
      border-color: var(--accent, #6366f1);
    }
    
    .actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }
    
    .btn {
      flex: 1;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      text-align: center;
    }
    
    .btn-primary {
      background: var(--accent, #6366f1);
      color: white;
    }
    
    .btn-primary:hover {
      background: var(--accent-hover, #818cf8);
    }
    
    .btn-secondary {
      background: var(--bg-accent, #2d2d44);
      color: var(--text, #fff);
      border: 1px solid var(--border, #2d2d44);
    }
    
    .btn-secondary:hover {
      background: var(--bg-hover, #252540);
    }
  `;
  
  @property({ type: Object }) provider!: ProviderTemplateSummary;
  
  private handleConfigure() {
    this.dispatchEvent(new CustomEvent('configure', {
      detail: { providerId: this.provider.id },
      bubbles: true,
      composed: true,
    }));
  }
  
  private handleManage() {
    this.dispatchEvent(new CustomEvent('manage', {
      detail: { providerId: this.provider.id },
      bubbles: true,
      composed: true,
    }));
  }
  
  render() {
    const { provider } = this;
    
    return html`
      <div class="card ${provider.isConfigured ? 'configured' : ''}">
        <div class="header">
          <div class="icon" style="background: ${provider.color}20; color: ${provider.color};">
            ${provider.icon}
          </div>
          <div class="info">
            <h3 class="name">
              ${provider.name}
              ${provider.isConfigured ? html`<span class="badge">Active</span>` : null}
            </h3>
            <p class="description">${provider.description}</p>
          </div>
        </div>
        
        ${provider.configuredInstances > 0 ? html`
          <div class="models">
            <span class="model-tag">${provider.configuredInstances} instance${provider.configuredInstances > 1 ? 's' : ''}</span>
          </div>
        ` : null}
        
        <div class="actions">
          ${provider.isConfigured 
            ? html`
              <button class="btn btn-secondary" @click=${this.handleManage}>Manage</button>
              <button class="btn btn-primary" @click=${this.handleConfigure}>Add Another</button>
            `
            : html`
              <button class="btn btn-primary" @click=${this.handleConfigure}>Configure</button>
            `
          }
        </div>
      </div>
    `;
  }
}
```

### 5.2 ProviderConfigModal Component

```typescript
// ui/src/components/ProviderConfigModal.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ProviderTemplate, AvailableModel } from '../types/providers';

interface FormData {
  name: string;
  description: string;
  apiKey: string;
  baseUrl: string;
  selectedModels: string[];
  globalDefaults: Record<string, unknown>;
  modelDefaults: Record<string, Record<string, unknown>>;
}

type ConfigStep = 'form' | 'testing' | 'success' | 'error';

@customElement('provider-config-modal')
export class ProviderConfigModal extends LitElement {
  static styles = css`
    /* Modal overlay and container */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
      animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .modal {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    /* Header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border, #2d2d44);
    }
    
    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .provider-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    
    .header-text h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text, #fff);
      margin: 0 0 2px 0;
    }
    
    .header-text p {
      font-size: 13px;
      color: var(--muted, #888);
      margin: 0;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: var(--muted, #888);
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    
    .close-btn:hover {
      color: var(--text, #fff);
      background: var(--bg-hover, #252540);
    }
    
    /* Body */
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    
    /* Form elements */
    .form-section {
      margin-bottom: 24px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #fff);
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text, #fff);
      margin-bottom: 6px;
    }
    
    .required::after {
      content: ' *';
      color: #ef4444;
    }
    
    input[type="text"],
    input[type="password"],
    textarea,
    select {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text, #fff);
      transition: all 0.15s ease;
    }
    
    input:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: var(--accent, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    input::placeholder,
    textarea::placeholder {
      color: var(--muted, #666);
    }
    
    .help-text {
      font-size: 12px;
      color: var(--muted, #888);
      margin-top: 4px;
    }
    
    .help-text a {
      color: var(--accent, #6366f1);
      text-decoration: none;
    }
    
    .help-text a:hover {
      text-decoration: underline;
    }
    
    /* Models selection */
    .models-grid {
      display: grid;
      gap: 8px;
    }
    
    .model-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg, #0f0f1a);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .model-item:hover {
      border-color: var(--border-strong, #3d3d5c);
    }
    
    .model-item.selected {
      border-color: var(--accent, #6366f1);
      background: rgba(99, 102, 241, 0.1);
    }
    
    .model-checkbox {
      width: 18px;
      height: 18px;
      accent-color: var(--accent, #6366f1);
    }
    
    .model-info {
      flex: 1;
    }
    
    .model-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text, #fff);
      margin: 0 0 2px 0;
    }
    
    .model-description {
      font-size: 12px;
      color: var(--muted, #888);
      margin: 0;
    }
    
    .model-badges {
      display: flex;
      gap: 4px;
    }
    
    .badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--bg-accent, #2d2d44);
      color: var(--muted, #888);
    }
    
    /* Test result */
    .test-result {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .test-result.success {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #22c55e;
    }
    
    .test-result.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }
    
    .test-result.loading {
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: var(--accent, #6366f1);
    }
    
    /* Footer */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid var(--border, #2d2d44);
      background: var(--bg, #0f0f1a);
    }
    
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-primary {
      background: var(--accent, #6366f1);
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: var(--accent-hover, #818cf8);
    }
    
    .btn-secondary {
      background: var(--bg-accent, #2d2d44);
      color: var(--text, #fff);
      border: 1px solid var(--border, #2d2d44);
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: var(--bg-hover, #252540);
    }
    
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Advanced options */
    .advanced-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--accent, #6366f1);
      cursor: pointer;
      margin-top: 16px;
    }
    
    .advanced-content {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border, #2d2d44);
    }
  `;
  
  @property({ type: Object }) provider!: ProviderTemplate;
  @property({ type: Boolean }) open = false;
  
  @state() private step: ConfigStep = 'form';
  @state() private formData: FormData = {
    name: '',
    description: '',
    apiKey: '',
    baseUrl: '',
    selectedModels: [],
    globalDefaults: {},
    modelDefaults: {},
  };
  @state() private testResult: { success: boolean; message: string; models?: AvailableModel[] } | null = null;
  @state() private error: string | null = null;
  @state() private isLoading = false;
  @state() private showAdvanced = false;
  
  connectedCallback() {
    super.connectedCallback();
    if (this.provider) {
      this.formData = {
        ...this.formData,
        baseUrl: this.provider.connection.baseUrl,
        selectedModels: this.provider.models?.map(m => m.id) || [],
      };
    }
  }
  
  private close() {
    this.open = false;
    this.resetForm();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
  
  private resetForm() {
    this.step = 'form';
    this.formData = {
      name: '',
      description: '',
      apiKey: '',
      baseUrl: this.provider?.connection.baseUrl || '',
      selectedModels: this.provider?.models?.map(m => m.id) || [],
      globalDefaults: {},
      modelDefaults: {},
    };
    this.testResult = null;
    this.error = null;
  }
  
  private async handleTest() {
    this.step = 'testing';
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await fetch('/api/v1/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: this.provider.id,
          credentials: { apiKey: this.formData.apiKey },
          connectionOverrides: this.formData.baseUrl !== this.provider.connection.baseUrl
            ? { baseUrl: this.formData.baseUrl }
            : undefined,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.testResult = result;
        this.step = 'success';
      } else {
        this.error = result.error?.message || 'Connection failed';
        this.step = 'error';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Network error';
      this.step = 'error';
    } finally {
      this.isLoading = false;
    }
  }
  
  private async handleSave() {
    this.isLoading = true;
    
    try {
      const response = await fetch('/api/v1/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: this.provider.id,
          name: this.formData.name || `${this.provider.metadata.name} Account`,
          description: this.formData.description,
          credentials: { apiKey: this.formData.apiKey },
          connectionOverrides: this.formData.baseUrl !== this.provider.connection.baseUrl
            ? { baseUrl: this.formData.baseUrl }
            : undefined,
          models: this.formData.selectedModels.map(id => ({
            id,
            enabled: true,
          })),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save provider');
      }
      
      const result = await response.json();
      
      this.dispatchEvent(new CustomEvent('save', {
        detail: result,
        bubbles: true,
        composed: true,
      }));
      
      this.close();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to save';
      this.step = 'error';
    } finally {
      this.isLoading = false;
    }
  }
  
  private toggleModel(modelId: string) {
    const selected = new Set(this.formData.selectedModels);
    if (selected.has(modelId)) {
      selected.delete(modelId);
    } else {
      selected.add(modelId);
    }
    this.formData = { ...this.formData, selectedModels: Array.from(selected) };
  }
  
  private canTest(): boolean {
    return !!this.formData.apiKey && this.formData.selectedModels.length > 0;
  }
  
  private canSave(): boolean {
    return this.canTest() && this.step === 'success';
  }
  
  render() {
    if (!this.open) return null;
    
    return html`
      <div class="modal-overlay" @click=${(e: Event) => {
        if (e.target === e.currentTarget) this.close();
      }}>
        <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <div class="header-info">
              <div class="provider-icon" style="background: ${this.provider.metadata.color}20; color: ${this.provider.metadata.color};">
                ${this.provider.metadata.icon}
              </div>
              <div class="header-text">
                <h2>Configure ${this.provider.metadata.name}</h2>
                <p>${this.provider.metadata.description}</p>
              </div>
            </div>
            <button class="close-btn" @click=${this.close}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            ${this.step === 'testing' ? html`
              <div class="test-result loading">
                <div class="spinner"></div>
                <span>Testing connection...</span>
              </div>
            ` : null}
            
            ${this.step === 'success' && this.testResult ? html`
              <div class="test-result success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Connection successful! Found ${this.testResult.models?.length || 0} models.</span>
              </div>
            ` : null}
            
            ${this.step === 'error' ? html`
              <div class="test-result error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>${this.error}</span>
              </div>
            ` : null}
            
            <div class="form-section">
              <h3 class="section-title">Basic Information</h3>
              
              <div class="form-group">
                <label class="required">Profile Name</label>
                <input
                  type="text"
                  .value=${this.formData.name}
                  @input=${(e: Event) => this.formData = { ...this.formData, name: (e.target as HTMLInputElement).value }}
                  placeholder="e.g., Production, Personal, Development"
                />
              </div>
              
              <div class="form-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  .value=${this.formData.description}
                  @input=${(e: Event) => this.formData = { ...this.formData, description: (e.target as HTMLInputElement).value }}
                  placeholder="e.g., API key for production deployment"
                />
              </div>
            </div>
            
            <div class="form-section">
              <h3 class="section-title">Authentication</h3>
              
              <div class="form-group">
                <label class="required">API Key</label>
                <input
                  type="password"
                  .value=${this.formData.apiKey}
                  @input=${(e: Event) => this.formData = { ...this.formData, apiKey: (e.target as HTMLInputElement).value }}
                  placeholder="Enter your API key"
                />
                <p class="help-text">
                  Get your API key from 
                  <a href="${this.provider.metadata.apiKeyUrl}" target="_blank" rel="noopener">
                    ${this.provider.metadata.name} dashboard →
                  </a>
                </p>
              </div>
            </div>
            
            ${this.provider.models && this.provider.models.length > 0 ? html`
              <div class="form-section">
                <h3 class="section-title">Select Models</h3>
                <div class="models-grid">
                  ${this.provider.models.map(model => html`
                    <div 
                      class="model-item ${this.formData.selectedModels.includes(model.id) ? 'selected' : ''}"
                      @click=${() => this.toggleModel(model.id)}
                    >
                      <input
                        type="checkbox"
                        class="model-checkbox"
                        .checked=${this.formData.selectedModels.includes(model.id)}
                        @click=${(e: Event) => e.stopPropagation()}
                        @change=${() => this.toggleModel(model.id)}
                      />
                      <div class="model-info">
                        <p class="model-name">${model.name}</p>
                        ${model.description ? html`<p class="model-description">${model.description}</p>` : null}
                      </div>
                      <div class="model-badges">
                        ${model.contextWindow ? html`<span class="badge">${(model.contextWindow / 1000).toFixed(0)}k ctx</span>` : null}
                      </div>
                    </div>
                  `)}
                </div>
              </div>
            ` : null}
            
            <div class="advanced-toggle" @click=${() => this.showAdvanced = !this.showAdvanced}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(${this.showAdvanced ? 180 : 0}deg); transition: transform 0.2s;">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              Advanced Options
            </div>
            
            ${this.showAdvanced ? html`
              <div class="advanced-content">
                <div class="form-group">
                  <label>Base URL (optional)</label>
                  <input
                    type="text"
                    .value=${this.formData.baseUrl}
                    @input=${(e: Event) => this.formData = { ...this.formData, baseUrl: (e.target as HTMLInputElement).value }}
                    placeholder="${this.provider.connection.baseUrl}"
                  />
                  <p class="help-text">Override the default API endpoint</p>
                </div>
              </div>
            ` : null}
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" @click=${this.close} ?disabled=${this.isLoading}>
              Cancel
            </button>
            <button 
              class="btn btn-secondary" 
              @click=${this.handleTest}
              ?disabled=${!this.canTest() || this.isLoading}
            >
              ${this.isLoading && this.step === 'testing' ? html`<div class="spinner"></div> Testing...` : 'Test Connection'}
            </button>
            <button 
              class="btn btn-primary" 
              @click=${this.handleSave}
              ?disabled=${!this.canSave() || this.isLoading}
            >
              ${this.isLoading && this.step !== 'testing' ? html`<div class="spinner"></div> Saving...` : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
```

---

## 6. IMPLEMENTAÇÃO PASSO A PASSO

### Fase 1: Backend Foundation (Dias 1-3)

#### Dia 1: Estrutura e Registry
```bash
# Criar estrutura de pastas
mkdir -p src/providers/{registry,types,store}
mkdir -p src/gateway/routes
mkdir -p src/services

# Criar arquivos base
touch src/providers/types.ts
touch src/providers/registry/index.ts
touch src/providers/store/index.ts
touch src/services/provider-tester.ts
```

**Arquivos a implementar:**
1. `src/providers/types.ts` - Todas as interfaces
2. `src/providers/registry/index.ts` - Sistema de registro
3. `src/providers/registry/nvidia.ts` - Template NVIDIA
4. `src/providers/store/index.ts` - Persistência

#### Dia 2: API Routes
**Arquivos:**
1. `src/gateway/routes/providers.ts` - Endpoints REST
2. `src/services/provider-tester.ts` - Teste de conexão
3. `src/services/credential-vault.ts` - Criptografia

#### Dia 3: Integração
- Conectar rotas ao gateway
- Testes manuais com curl
- Validação de erros

### Fase 2: Frontend Components (Dias 4-6)

#### Dia 4: Core Components
**Arquivos:**
1. `ui/src/types/providers.ts` - Tipos TypeScript
2. `ui/src/components/ProviderCard.ts` - Card do provider
3. `ui/src/components/ProviderConfigModal.ts` - Modal de config

#### Dia 5: Pages e Integration
**Arquivos:**
1. `ui/src/views/providers.ts` - Página de providers
2. `ui/src/services/provider-api.ts` - Cliente HTTP

#### Dia 6: Estado e Eventos
- Integrar com app.ts
- Fluxo de estado global
- Testes de integração

### Fase 3: Testes e Polish (Dias 7-8)

#### Dia 7: Testes
- Unit tests para backend
- Component tests frontend
- E2E tests (happy path)

#### Dia 8: Polish
- Animações e transições
- Error handling UI
- Documentação

---

## 7. ESTRUTURA DE ARQUIVOS FINAL

```
/Users/ropeixoto/Project/experiments/openbr_assistant/
├── src/
│   ├── providers/
│   │   ├── types.ts                    # Interfaces principais
│   │   ├── registry/
│   │   │   ├── index.ts                # Registry manager
│   │   │   ├── nvidia.ts               # NVIDIA template
│   │   │   ├── openai.ts               # OpenAI template
│   │   │   ├── anthropic.ts            # Anthropic template
│   │   │   └── groq.ts                 # Groq template
│   │   └── store/
│   │       ├── index.ts                # ConfiguredProvider store
│   │       └── utils.ts                # Helpers
│   ├── services/
│   │   ├── provider-tester.ts          # Testa conexões
│   │   └── credential-vault.ts         # Criptografia
│   └── gateway/
│       └── routes/
│           └── providers.ts            # API endpoints
├── ui/
│   └── src/
│       ├── types/
│       │   └── providers.ts            # Tipos frontend
│       ├── components/
│       │   ├── ProviderCard.ts         # Card component
│       │   ├── ProviderConfigModal.ts  # Modal component
│       │   └── ProviderList.ts         # Grid component
│       ├── services/
│       │   └── provider-api.ts         # API client
│       └── views/
│           └── providers.ts            # Main view
└── docs/
    └── specs/
        └── generic-model-provider-config.md  # This spec
```

---

## 8. CHECKLIST DE IMPLEMENTAÇÃO

### Backend ✅
- [ ] Criar interfaces TypeScript
- [ ] Implementar ProviderRegistry
- [ ] Criar templates (NVIDIA, OpenAI, Anthropic)
- [ ] Implementar ProviderStore
- [ ] Criar ProviderTester
- [ ] Implementar CredentialVault
- [ ] Criar API routes
- [ ] Adicionar validações
- [ ] Testar endpoints

### Frontend ✅
- [ ] Criar tipos TypeScript
- [ ] Implementar ProviderCard
- [ ] Implementar ProviderConfigModal
- [ ] Criar ProviderList
- [ ] Implementar provider-api
- [ ] Criar view providers.ts
- [ ] Integrar com app.ts
- [ ] Adicionar rotas

### Testes ✅
- [ ] Unit tests backend
- [ ] Component tests frontend
- [ ] E2E tests
- [ ] Teste manual NVIDIA
- [ ] Teste manual OpenAI
- [ ] Teste endpoint custom

### Documentação ✅
- [ ] API documentation
- [ ] User guide
- [ ] Developer guide

---

## 9. PRÓXIMOS PASSOS IMEDIATOS

**Para começar a implementação agora:**

1. **Criar branch:** `feature/generic-model-providers`
2. **Backend primeiro:** Começar pelos types e registry
3. **Template NVIDIA:** Usar como caso de teste
4. **Frontend depois:** Quando API estiver estável

**Ordem de implementação sugerida:**

```
1. src/providers/types.ts
2. src/providers/registry/index.ts
3. src/providers/registry/nvidia.ts
4. src/providers/store/index.ts
5. src/services/provider-tester.ts
6. src/gateway/routes/providers.ts
7. Testar com curl
8. ui/src/types/providers.ts
9. ui/src/components/ProviderCard.ts
10. ui/src/components/ProviderConfigModal.ts
11. Integrar e testar E2E
```

---

## 10. EXEMPLO DE USO FINAL

### Adicionando NVIDIA (Cenário Completo)

```typescript
// 1. Usuário clica "Configure" no card NVIDIA
// 2. Modal abre com template pré-carregado

// 3. Usuário preenche:
const formData = {
  name: "Production NVIDIA",
  apiKey: "nvapi-sw3ze99V...",
  selectedModels: ["z-ai/glm5", "moonshotai/kimi-k2.5"]
};

// 4. Clica "Test Connection"
// Backend testa e retorna:
const testResult = {
  success: true,
  models: [
    { id: "z-ai/glm5", name: "GLM5" },
    { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5" }
  ]
};

// 5. Clica "Save Configuration"
// Backend salva e retorna:
const savedProvider = {
  instanceId: "uuid-123",
  providerId: "nvidia",
  name: "Production NVIDIA",
  models: {
    "z-ai/glm5": { enabled: true },
    "moonshotai/kimi-k2.5": { enabled: true }
  }
};

// 6. Models ficam disponíveis:
// - "uuid-123:z-ai/glm5" → "GLM5 (via Production NVIDIA)"
// - "uuid-123:moonshotai/kimi-k2.5" → "Kimi K2.5 (via Production NVIDIA)"
```

---

**Status:** ✅ SPEC PRONTA PARA IMPLEMENTAÇÃO

**Prioridade:** ALTA
**Estimativa:** 8 dias (2 semanas)
**Complexidade:** MÉDIA

**Pronto para começar?** 🚀
