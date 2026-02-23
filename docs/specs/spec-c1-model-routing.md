# Spec C1: Model Routing System

## 🎯 Objetivo
Implementar sistema de roteamento automático de modelos baseado em complexidade da tarefa, com 3 tiers (Simple/Medium/Complex) para otimização de custo e performance.

## 📋 Requisitos

**Roteamento Inteligente:**
- Tiers configuráveis: Simple, Medium, Complex
- Seleção automática baseada em heurísticas
- Fallback automático se modelo não disponível
- Cost optimization

**Heurísticas:**
```
Simple Tier:
- Prompt curto (<100 tokens)
- Sem tools complexas
- Respostas diretas
- Uso: Ollama local, GPT-4o-mini

Medium Tier:
- Prompt médio (100-1000 tokens)
- Tools padrão (browser, search)
- Tarefas comuns
- Uso: GPT-4o, Claude Sonnet

Complex Tier:
- Prompt longo (>1000 tokens)
- Tools complexas (code, analysis)
- Coding, reasoning, multi-step
- Uso: GPT-4.5, Claude Opus
```

## 🏗️ Arquitetura

### Backend
```
src/
├── gateway/server-methods/model-routing.ts
├── services/model-router/
│   ├── router.ts                    # Lógica de roteamento
│   ├── heuristics.ts                # Cálculo de complexidade
│   └── fallback.ts                  # Chain de fallback
└── config/types.model-routing.ts
```

### Frontend
```
ui/src/ui/
├── views/model-routing.ts
├── controllers/model-routing.ts
└── app.ts
```

## 🔧 Implementação Backend

### 1. Gateway Handlers

#### `model-routing.status`
```typescript
interface ModelRoutingStatus {
  enabled: boolean;
  currentTier: 'simple' | 'medium' | 'complex' | null;
  tiers: {
    simple: TierConfig;
    medium: TierConfig;
    complex: TierConfig;
  };
  stats: {
    totalRouted: number;
    costSavings: number;  // vs usar sempre modelo mais caro
    avgLatency: number;
  };
}

interface TierConfig {
  name: string;
  models: string[];           // Ordem de preferência
  criteria: {
    maxTokens: number;
    minTokens?: number;
    toolsAllowed: string[];
    complexity: 'low' | 'medium' | 'high';
  };
  costPer1kTokens: {
    input: number;
    output: number;
  };
}

// Retorna ModelRoutingStatus
```

#### `model-routing.configure`
```typescript
interface ConfigureRoutingParams {
  enabled: boolean;
  tiers: {
    simple: TierUpdate;
    medium: TierUpdate;
    complex: TierUpdate;
  };
  fallbackChain?: string[];  // Ordem de fallback entre tiers
}

interface TierUpdate {
  models: string[];
  criteria?: Partial<TierCriteria>;
}

// Atualiza configuração
```

#### `model-routing.select` (Chamado internamente pelo agente)
```typescript
interface SelectModelParams {
  prompt: string;
  estimatedTokens: number;
  tools: string[];
  complexity?: 'auto' | 'low' | 'medium' | 'high';
}

interface ModelSelection {
  tier: 'simple' | 'medium' | 'complex';
  model: string;
  reason: string;  // Por que este modelo foi escolhido
  estimatedCost: number;
  fallbackChain: string[];
}

// Retorna ModelSelection
```

#### `model-routing.stats`
```typescript
interface RoutingStatsParams {
  period: 'day' | 'week' | 'month';
}

interface RoutingStats {
  period: string;
  totalRequests: number;
  tierDistribution: {
    simple: number;
    medium: number;
    complex: number;
  };
  costComparison: {
    withRouting: number;
    withoutRouting: number;
    savings: number;
    savingsPercent: number;
  };
  latency: {
    avg: number;
    byTier: Record<string, number>;
  };
  modelUsage: Array<{
    model: string;
    count: number;
    cost: number;
  }>;
}

// Retorna estatísticas de uso
```

### 2. Model Router Service

```typescript
// src/services/model-router/router.ts

class ModelRouter {
  private config: RoutingConfig;
  
  async selectModel(params: SelectModelParams): Promise<ModelSelection> {
    // 1. Calcular complexidade se 'auto'
    const complexity = params.complexity === 'auto' 
      ? this.calculateComplexity(params)
      : params.complexity;
    
    // 2. Mapear complexidade para tier
    const tier = this.mapComplexityToTier(complexity);
    
    // 3. Selecionar primeiro modelo disponível do tier
    const model = await this.selectAvailableModel(tier);
    
    // 4. Calcular custo estimado
    const estimatedCost = this.estimateCost(model, params.estimatedTokens);
    
    // 5. Construir fallback chain
    const fallbackChain = this.buildFallbackChain(tier, model);
    
    return {
      tier,
      model,
      reason: this.explainSelection(tier, complexity, model),
      estimatedCost,
      fallbackChain
    };
  }
  
  private calculateComplexity(params: SelectModelParams): 'low' | 'medium' | 'high' {
    let score = 0;
    
    // Baseado em tokens
    if (params.estimatedTokens < 100) score += 1;
    else if (params.estimatedTokens < 1000) score += 2;
    else score += 3;
    
    // Baseado em tools
    const complexTools = ['code', 'analyze', 'multi-step'];
    const toolComplexity = params.tools.filter(t => 
      complexTools.some(ct => t.includes(ct))
    ).length;
    score += toolComplexity;
    
    // Baseado em keywords no prompt
    const complexKeywords = ['analyze', 'compare', 'explain in detail', 'step by step'];
    const keywordMatches = complexKeywords.filter(kw => 
      params.prompt.toLowerCase().includes(kw)
    ).length;
    score += keywordMatches;
    
    if (score <= 2) return 'low';
    if (score <= 4) return 'medium';
    return 'high';
  }
  
  private mapComplexityToTier(complexity: string): 'simple' | 'medium' | 'complex' {
    switch (complexity) {
      case 'low': return 'simple';
      case 'medium': return 'medium';
      case 'high': return 'complex';
      default: return 'medium';
    }
  }
  
  private async selectAvailableModel(tier: string): Promise<string> {
    const tierConfig = this.config.tiers[tier];
    
    for (const model of tierConfig.models) {
      if (await this.isModelAvailable(model)) {
        return model;
      }
    }
    
    // Fallback para próximo tier
    return this.fallbackToNextTier(tier);
  }
  
  private async isModelAvailable(model: string): Promise<boolean> {
    // Verificar se modelo está online e respondendo
    // Cachear status por 30 segundos
  }
  
  private estimateCost(model: string, tokens: number): number {
    const costConfig = this.getModelCost(model);
    return (tokens / 1000) * (costConfig.input + costConfig.output);
  }
}
```

### 3. Integração com Agente

```typescript
// src/agents/agent.ts - Modificar para usar router

async function routeToModel(request: AgentRequest): Promise<ModelResponse> {
  // Se routing habilitado
  if (config.modelRouting?.enabled) {
    const selection = await modelRouter.selectModel({
      prompt: request.prompt,
      estimatedTokens: estimateTokens(request.prompt),
      tools: request.tools.map(t => t.name),
      complexity: request.complexityHint
    });
    
    // Log da seleção
    logger.info(`Model routed: ${selection.model} (${selection.tier}) - ${selection.reason}`);
    
    // Chamar modelo selecionado
    return callModel(selection.model, request, selection.fallbackChain);
  }
  
  // Fallback: usar modelo default
  return callModel(config.defaultModel, request);
}
```

### 4. Configuração

```typescript
// src/config/types.model-routing.ts

interface ModelRoutingConfig {
  enabled: boolean;
  autoSelect: boolean;        // Se true, agente escolhe automaticamente
  tiers: {
    simple: {
      models: string[];       // ['ollama-llama3.2', 'gpt-4o-mini']
      criteria: {
        maxTokens: 500;
        toolsAllowed: ['memory_search', 'basic_chat'];
      };
    };
    medium: {
      models: string[];       // ['gpt-4o', 'claude-sonnet']
      criteria: {
        maxTokens: 4000;
        toolsAllowed: ['*'];  // Todas exceto code
      };
    };
    complex: {
      models: string[];       // ['gpt-4.5', 'claude-opus']
      criteria: {
        maxTokens: 128000;
        toolsAllowed: ['*'];  // Todas
      };
    };
  };
  fallbackChain: ['complex', 'medium', 'simple'];  // Se complex falha, tenta medium, etc.
  costOptimization: {
    targetSavings: 30;        // Tentar economizar 30% vs sempre usar modelo mais caro
    maxLatency: 5000;         // Máximo 5s de latency
  };
}
```

## 🎨 Implementação Frontend

### View: Model Routing

```typescript
// ui/src/ui/views/model-routing.ts

export function renderModelRoutingView(state: AppViewState) {
  return html`
    <div class="model-routing-view">
      ${renderHeader(state)}
      ${renderTiers(state)}
      ${renderStats(state)}
      ${renderTestSection(state)}
    </div>
  `;
}

function renderHeader(state: AppViewState) {
  const status = state.modelRoutingStatus;
  
  return html`
    <div class="view-header">
      <div class="header-title">
        <h1>Model Routing</h1>
        <p class="subtitle">Automatic model selection based on task complexity</p>
      </div>
      <div class="header-actions">
        <label class="toggle-switch">
          <input type="checkbox" 
                 .checked="${status?.enabled}"
                 @change="${(e: InputEvent) => state.handleModelRoutingToggle((e.target as HTMLInputElement).checked)}" />
          <span class="slider"></span>
          <span class="label">${status?.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>
      
      <div class="header-stats">
        <div class="stat">
          <span class="value">${formatCurrency(status?.stats.costSavings || 0)}</span>
          <span class="label">Saved</span>
        </div>
        <div class="stat">
          <span class="value">${status?.stats.totalRouted || 0}</span>
          <span class="label">Routed</span>
        </div>
        <div class="stat">
          <span class="value">${status?.stats.avgLatency || 0}ms</span>
          <span class="label">Avg Latency</span>
        </div>
      </div>
    </div>
  `;
}

function renderTiers(state: AppViewState) {
  const tiers = [
    { id: 'simple', name: 'Simple', color: 'success', icon: 'zap' },
    { id: 'medium', name: 'Medium', color: 'info', icon: 'activity' },
    { id: 'complex', name: 'Complex', color: 'warning', icon: 'brain' }
  ];
  
  return html`
    <div class="tiers-section">
      <h2>Routing Tiers</h2>
      <div class="tiers-grid">
        ${tiers.map(tier => renderTierCard(tier, state))}
      </div>
    </div>
  `;
}

function renderTierCard(tier: any, state: AppViewState) {
  const config = state.modelRoutingStatus?.tiers[tier.id];
  
  return html`
    <div class="tier-card ${tier.id}">
      <div class="tier-header">
        <div class="tier-icon ${tier.color}">${icons[tier.icon]}</div>
        <h3>${tier.name}</h3>
      </div>
      
      <div class="tier-criteria">
        <div class="criteria-item">
          <span class="label">Max Tokens:</span>
          <span class="value">${config?.criteria.maxTokens}</span>
        </div>
        <div class="criteria-item">
          <span class="label">Complexity:</span>
          <span class="value">${config?.criteria.complexity}</span>
        </div>
      </div>
      
      <div class="tier-models">
        <label>Models (in preference order)</label>
        <div class="models-list" 
             @dragover="${handleDragOver}"
             @drop="${(e: DragEvent) => handleDrop(e, tier.id, state)}">
          ${config?.models.map((model, index) => html`
            <div class="model-item" draggable="true" 
                 @dragstart="${(e: DragEvent) => handleDragStart(e, tier.id, index)}"
                 data-index="${index}">
              <span class="model-rank">#${index + 1}</span>
              <span class="model-name">${model}</span>
              <button @click="${() => state.handleRemoveModelFromTier(tier.id, index)}"
                      class="btn-icon">${icons.x}</button>
            </div>
          `)}
        </div>
        
        <div class="add-model">
          <select @change="${(e: InputEvent) => state.handleAddModelToTier(tier.id, (e.target as HTMLSelectElement).value)}">
            <option value="">Add model...</option>
            ${state.availableModels.map(m => html`<option value="${m.id}">${m.name}</option>`)}
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderTestSection(state: AppViewState) {
  return html`
    <div class="test-section">
      <h2>Test Routing</h2>      
      <div class="test-form">
        <textarea placeholder="Enter a prompt to test which model would be selected..."
                  .value="${state.routingTestPrompt}"
                  @input="${(e: InputEvent) => state.handleRoutingTestChange((e.target as HTMLTextAreaElement).value)}"></textarea>
        
        <button @click="${() => state.handleTestRouting()}" 
                ?disabled="${!state.routingTestPrompt}"
                class="btn-primary">
          Test Routing
        </button>
      </div>
      
      ${state.routingTestResult ? html`
        <div class="test-result">
          <h4>Selected Model</h4>          
          <div class="result-row">
            <span class="label">Tier:</span>
            <span class="value tier-${state.routingTestResult.tier}">
              ${state.routingTestResult.tier}
            </span>
          </div>
          
          <div class="result-row">
            <span class="label">Model:</span>
            <span class="value">${state.routingTestResult.model}</span>
          </div>          
          <div class="result-row">
            <span class="label">Reason:</span>
            <span class="value">${state.routingTestResult.reason}</span>
          </div>          
          <div class="result-row">
            <span class="label">Est. Cost:</span>
            <span class="value">${formatCurrency(state.routingTestResult.estimatedCost)}</span>
          </div>
        </div>
      ` : nothing}
    </div>  `;
}
```

## 🧪 Testes

```typescript
describe('model-routing', () => {
  it('routes simple prompts to simple tier', async () => {
    const result = await router.selectModel({
      prompt: 'Hello',
      estimatedTokens: 50,
      tools: []
    });
    expect(result.tier).toBe('simple');
  });
  
  it('routes complex prompts to complex tier', async () => {
    const result = await router.selectModel({
      prompt: 'Analyze this code and explain step by step...',
      estimatedTokens: 2000,
      tools: ['code_interpreter']
    });
    expect(result.tier).toBe('complex');
  });
  
  it('falls back when primary model unavailable', async () => {
    // Mock primary model offline
    const result = await router.selectModel({...});
    expect(result.model).not.toBe(primaryModel);
  });
});
```

## 📊 Critérios de Aceitação

- [ ] Backend: `model-routing.status` handler
- [ ] Backend: `model-routing.configure` handler
- [ ] Backend: `model-routing.select` (interno)
- [ ] Backend: Heurísticas de complexidade
- [ ] Backend: Fallback automático
- [ ] Backend: Tracking de savings
- [ ] Frontend: Toggle enable/disable
- [ ] Frontend: 3 tier cards configuráveis
- [ ] Frontend: Drag-and-drop para ordenar modelos
- [ ] Frontend: Seção de teste interativa
- [ ] Frontend: Stats de savings e uso
- [ ] Testes: >80% coverage

## ⏱️ Estimativa
- Backend: 3 dias
- Frontend: 2 dias
- Testes: 1 dia
- **Total: 6 dias**
