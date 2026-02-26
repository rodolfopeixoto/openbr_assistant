# Spec: Ollama Real Integration

## 🎯 Objetivo
Substituir dados mock do Ollama por integração real com o serviço Ollama local, permitindo gerenciamento real de modelos.

## 📋 Estado Atual
- ✅ UI existe (65 linhas) - layout básico
- ❌ Backend retorna mock data fixo
- ❌ Não detecta se Ollama está instalado
- ❌ Não lista modelos reais
- ❌ Não permite pull/start/stop reais

## 🏗️ Arquitetura

```
src/
├── gateway/server-methods/ollama.ts    # Handlers RPC
├── services/ollama/
│   ├── client.ts                       # Cliente HTTP Ollama
│   ├── models.ts                       # Gerenciamento de modelos
│   └── system.ts                       # Controle do serviço
└── config/feature-registry.ts          # Feature flag
```

## 🔧 Implementação Backend

### 1. Ollama Client (src/services/ollama/client.ts)

```typescript
interface OllamaClientConfig {
  baseUrl: string;        // Default: http://localhost:11434
  timeout: number;        // Default: 30000ms
}

class OllamaClient {
  private baseUrl: string;
  private timeout: number;
  
  constructor(config: OllamaClientConfig = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.timeout = config.timeout || 30000;
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) throw new Error("Failed to list models");
    
    const data = await response.json();
    return data.models.map((m: any) => ({
      name: m.name,
      size: this.formatSize(m.size),
      modified: m.modified_at,
      digest: m.digest,
      details: m.details,
    }));
  }
  
  async pullModel(modelName: string, onProgress?: (progress: PullProgress) => void): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    });
    
    if (!response.ok) throw new Error("Failed to pull model");
    if (!response.body) throw new Error("No response body");
    
    // Stream progress
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const progress = JSON.parse(line);
          onProgress?.(progress);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
  
  async deleteModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    });
    
    if (!response.ok) throw new Error("Failed to delete model");
  }
  
  async getVersion(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/version`);
    if (!response.ok) throw new Error("Failed to get version");
    const data = await response.json();
    return data.version;
  }
  
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) throw new Error("Failed to generate");
    return response.json();
  }
  
  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }
}
```

### 2. Service Control (src/services/ollama/system.ts)

```typescriptnimport { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";

const execAsync = promisify(exec);

class OllamaSystem {
  async isInstalled(): Promise<boolean> {
    try {
      if (platform() === "darwin" || platform() === "linux") {
        await execAsync("which ollama");
        return true;
      } else if (platform() === "win32") {
        await execAsync("where ollama");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  
  async isRunning(): Promise<boolean> {
    try {
      if (platform() === "darwin" || platform() === "linux") {
        await execAsync("pgrep -x ollama");
        return true;
      } else if (platform() === "win32") {
        await execAsync('tasklist /FI "IMAGENAME eq ollama.exe"');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  
  async start(): Promise<void> {
    if (await this.isRunning()) {
      throw new Error("Ollama is already running");
    }
    
    try {
      if (platform() === "darwin" || platform() === "linux") {
        // Start in background
        exec("ollama serve > /dev/null 2>&1 &");
      } else if (platform() === "win32") {
        exec("start ollama serve");
      }
      
      // Wait for service to be ready
      await this.waitForReady(10000);
    } catch (err) {
      throw new Error(`Failed to start Ollama: ${err}`);
    }
  }
  
  async stop(): Promise<void> {
    try {
      if (platform() === "darwin" || platform() === "linux") {
        await execAsync("pkill -x ollama");
      } else if (platform() === "win32") {
        await execAsync('taskkill /F /IM ollama.exe');
      }
    } catch (err) {
      throw new Error(`Failed to stop Ollama: ${err}`);
    }
  }
  
  private async waitForReady(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const response = await fetch("http://localhost:11434/api/tags", {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) return;
      } catch {
        // Wait and retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
    throw new Error("Timeout waiting for Ollama to start");
  }
  
  async getResourceUsage(): Promise<ResourceUsage> {
    // Implementar baseado no sistema operacional
    // macOS: ps aux | grep ollama
    // Linux: cat /proc/{pid}/status
    // Windows: wmic process where "name='ollama.exe'" get WorkingSetSize
    
    return {
      cpu: "N/A",
      memory: "N/A",
      gpu: "N/A",
    };
  }
}
```

### 3. Gateway Handlers (src/gateway/server-methods/ollama.ts)

```typescript
import { OllamaClient } from "../../services/ollama/client.js";
import { OllamaSystem } from "../../services/ollama/system.js";

const client = new OllamaClient();
const system = new OllamaSystem();

export const ollamaHandlers: GatewayRequestHandlers = {
  "ollama.status": async ({ respond }) => {
    try {
      const isInstalled = await system.isInstalled();
      const isRunning = await system.isRunning();
      const isAvailable = isRunning && await client.isAvailable();
      
      let version = null;
      let models = [];
      
      if (isAvailable) {
        try {
          version = await client.getVersion();
          models = await client.listModels();
        } catch (err) {
          console.error("[Ollama] Error fetching models:", err);
        }
      }
      
      respond(true, {
        enabled: loadConfig().features?.ollama !== false,
        installed: isInstalled,
        running: isRunning,
        available: isAvailable,
        version,
        models,
        baseUrl: "http://localhost:11434",
      });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to get Ollama status: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "ollama.models": async ({ respond }) => {
    try {
      if (!(await client.isAvailable())) {
        return respond(false, undefined, errorShape(
          ErrorCodes.SERVICE_UNAVAILABLE,
          "Ollama service is not available"
        ));
      }
      
      const models = await client.listModels();
      respond(true, { models });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to list models: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "ollama.pull": async ({ params, respond }) => {
    const { model } = params;
    
    try {
      if (!(await client.isAvailable())) {
        return respond(false, undefined, errorShape(
          ErrorCodes.SERVICE_UNAVAILABLE,
          "Ollama service is not available"
        ));
      }
      
      // Iniciar pull em background
      const pullPromise = client.pullModel(model, (progress) => {
        // Emitir evento de progresso via WebSocket
        emitOllamaProgress(model, progress);
      });
      
      respond(true, { 
        message: `Started pulling ${model}`,
        model,
      });
      
      // Continuar pull em background
      pullPromise.catch(err => {
        console.error(`[Ollama] Failed to pull ${model}:`, err);
      });
      
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to pull model: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "ollama.remove": async ({ params, respond }) => {
    const { model } = params;
    
    try {
      if (!(await client.isAvailable())) {
        return respond(false, undefined, errorShape(
          ErrorCodes.SERVICE_UNAVAILABLE,
          "Ollama service is not available"
        ));
      }
      
      await client.deleteModel(model);
      respond(true, { message: `Model ${model} removed successfully` });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to remove model: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "ollama.start": async ({ respond }) => {
    try {
      await system.start();
      respond(true, { message: "Ollama service started successfully" });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to start Ollama: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "ollama.stop": async ({ respond }) => {
    try {
      await system.stop();
      respond(true, { message: "Ollama service stopped successfully" });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to stop Ollama: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "ollama.generate": async ({ params, respond }) => {
    const { model, prompt, stream = false, options = {} } = params;
    
    try {
      if (!(await client.isAvailable())) {
        return respond(false, undefined, errorShape(
          ErrorCodes.SERVICE_UNAVAILABLE,
          "Ollama service is not available"
        ));
      }
      
      const result = await client.generate({
        model,
        prompt,
        stream,
        options,
      });
      
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to generate: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
};

// Helper para emitir progresso
function emitOllamaProgress(model: string, progress: PullProgress) {
  // Implementar via WebSocket ou event bus
  // Isso permitirá a UI mostrar progresso em tempo real
}
```

## 🎨 UI Improvements

### 1. Status Card Melhorado (ui/src/ui/views/ollama.ts)

```typescript
function renderStatusCard(state: AppViewState) {
  const status = state.ollamaStatus as OllamaStatus | null;
  
  if (!status) {
    return html`<div class="loading">Loading Ollama status...</div>`;
  }
  
  return html`
    <div class="ollama-status-card ${status.running ? 'running' : 'stopped'}">
      <div class="status-header">
        <div class="status-indicator">
          ${status.running 
            ? html`<span class="dot green"></span> Running` 
            : html`<span class="dot red"></span> Stopped`}
        </div>
        ${status.version ? html`<span class="version">v${status.version}</span>` : nothing}
      </div>
      
      <div class="status-details">
        <div class="detail">
          <span class="label">Installed:</span>
          <span class="value">${status.installed ? '✅ Yes' : '❌ No'}</span>
        </div>
        <div class="detail">
          <span class="label">Models:</span>
          <span class="value">${status.models?.length || 0}</span>
        </div>
      </div>
      
      <div class="status-actions">
        ${!status.running 
          ? html`<button class="btn-primary" @click="${() => state.handleOllamaStart()}">Start Service</button>`
          : html`<button class="btn-danger" @click="${() => state.handleOllamaStop()}">Stop Service</button>`}
      </div>
    </div>
  `;
}
```

### 2. Model List com Pull (ui/src/ui/views/ollama.ts)

```typescript
function renderModelsList(state: AppViewState) {
  const models = (state.ollamaStatus as OllamaStatus)?.models || [];
  
  return html`
    <div class="models-section">
      <div class="section-header">
        <h3>Installed Models</h3>
        <button class="btn-secondary" @click="${() => state.handleOllamaShowPullModal()}">
          + Pull Model
        </button>
      </div>
      
      ${models.length === 0 
        ? html`<div class="empty-state">No models installed</div>`
        : html`
          <div class="models-grid">
            ${models.map(model => html`
              <div class="model-card">
                <div class="model-name">${model.name}</div>
                <div class="model-meta">
                  <span>${model.size}</span>
                  <span>Modified: ${formatDate(model.modified)}</span>
                </div>
                <div class="model-actions">
                  <button class="btn-icon" @click="${() => state.handleOllamaTestModel(model.name)}" title="Test">▶️</button>
                  <button class="btn-icon" @click="${() => state.handleOllamaRemoveModel(model.name)}" title="Remove">🗑️</button>
                </div>
              </div>
            `)}
          </div>
        `}
    </div>
  `;
}
```

### 3. Pull Modal com Progresso

```typescript
function renderPullModal(state: AppViewState) {
  if (!state.ollamaPullModalOpen) return nothing;
  
  return html`
    <div class="modal-overlay" @click="${() => state.handleOllamaClosePullModal()}">
      <div class="modal-content" @click="${(e: Event) => e.stopPropagation()}">
        <h3>Pull Model</h3>
        
        <div class="form-group">
          <label>Model Name</label>
          <input 
            type="text" 
            .value="${state.ollamaPullModelName}"
            @input="${(e: InputEvent) => state.handleOllamaPullModelNameChange((e.target as HTMLInputElement).value)}"
            placeholder="e.g., llama3.2, codellama, mistral"
          />
          <small>Popular: llama3.2, codellama, mistral, gemma</small>
        </div>
        
        ${state.ollamaPullProgress ? html`
          <div class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${state.ollamaPullProgress.percent || 0}%"></div>
            </div>
            <div class="progress-text">
              ${state.ollamaPullProgress.status} 
              ${state.ollamaPullProgress.completed ? state.ollamaPullProgress.completed : ''} 
              ${state.ollamaPullProgress.total ? `/ ${state.ollamaPullProgress.total}` : ''}
            </div>
          </div>
        ` : nothing}
        
        <div class="modal-actions">
          <button class="btn-secondary" @click="${() => state.handleOllamaClosePullModal()}">Cancel</button>
          <button 
            class="btn-primary" 
            @click="${() => state.handleOllamaPullModel()}"
            ?disabled="${!state.ollamaPullModelName || state.ollamaPulling}"
          >
            ${state.ollamaPulling ? 'Pulling...' : 'Pull Model'}
          </button>
        </div>
      </div>
    </div>
  `;
}
```

## ⚙️ Configuração

### 1. Feature Flag (src/config/feature-registry.ts)

```typescript
export const DEFAULT_FEATURES: FeatureRegistry = {
  // ... outras features
  
  ollama: {
    id: "ollama",
    name: "Ollama Integration",
    description: "Local LLM management via Ollama",
    category: "ai",
    enabled: false,  // Desabilitado por padrão (usuário precisa instalar Ollama)
    configurable: true,
    config: {
      baseUrl: "http://localhost:11434",
      autoStart: false,
      defaultModel: null,
    },
  },
};
```

### 2. Config Schema (src/config/zod-schema.ts)

```typescript
export const configSchema = z.object({
  // ... outras configurações
  
  ollama: z.object({
    enabled: z.boolean().default(false),
    baseUrl: z.string().default("http://localhost:11434"),
    autoStart: z.boolean().default(false),
    defaultModel: z.string().nullable().default(null),
  }).optional(),
});
```

## 📦 Dependências

```json
{
  "dependencies": {
    // Sem dependências externas - usa fetch nativo
  }
}
```

## ✅ Acceptance Criteria

- [ ] Detecta automaticamente se Ollama está instalado
- [ ] Mostra status real (installed/running/available)
- [ ] Lista modelos reais instalados
- [ ] Permite pull de novos modelos com progresso
- [ ] Permite remover modelos
- [ ] Permite start/stop do serviço Ollama
- [ ] Feature flag funcional (pode desabilitar)
- [ ] UI mostra versão do Ollama
- [ ] Teste rápido de modelos
- [ ] Tratamento de erros adequado

## 🚀 Testing

```bash
# Verificar se Ollama está instalado
which ollama

# Testar API local
curl http://localhost:11434/api/tags

# Testar via gateway
curl -X POST http://localhost:18789/api \
  -H "Content-Type: application/json" \
  -d '{"method": "ollama.status"}'
```
