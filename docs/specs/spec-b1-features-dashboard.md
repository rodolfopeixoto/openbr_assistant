# Spec B1: Centralized Features Dashboard

## 🎯 Objetivo
Criar um dashboard centralizado para gerenciar todas as features, reorganizando o menu para melhor UX.

## 📋 Problema Atual
- Features espalhadas em vários menus (Settings, System, etc.)
- Difícil encontrar e configurar features
- News aparece em Features mas não funciona
- Inconsistência de UI entre features

## 🏗️ Nova Estrutura de Menu

```
Chat
├── Chat

Control
├── Overview
├── Dashboard (novo) ← Spec 8.1
├── Channels
├── Instances
├── Sessions
├── Cron
├── News

Agent
├── Skills
├── Nodes
├── OpenCode
├── Model Routing ← Spec C1
├── Memory ← Spec D1
└── Ollama ← Spec C2

Settings
├── Models
├── Config
├── Environment
├── Workspace
├── Rate Limits ← Spec E1
├── Budget ← Spec E2
└── Compliance

System
├── Features (novo - este spec)
├── MCP
├── Cache ← Spec F1
├── Containers ← Spec A3
├── Security ← Spec A2
├── Metrics ← Spec E3
├── Debug
└── Logs
```

## 🔧 Implementação Backend

### 1. Expandir `features.list`

```typescript
// Atualizar para retornar organizado por categoria

interface FeaturesDashboardResponse {
  categories: FeatureCategory[];
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    needsConfig: number;
  };
}

interface FeatureCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  features: DashboardFeature[];
}

interface DashboardFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'enabled' | 'disabled' | 'needs_config' | 'unavailable';
  configurable: boolean;
  hasConfigModal: boolean;  // Se abre modal ou vai para view separada
  configRoute?: string;     // Rota da view de config (ex: 'news', 'security')
  icon: string;
  tags: string[];
  requires: string[];       // IDs de features dependentes
  quickActions: QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  handler: string;  // 'toggle', 'config', 'view'
}

// Categorias:
const CATEGORIES = [
  {
    id: 'speech',
    name: 'Speech & Voice',
    icon: 'mic',
    description: 'Voice recognition, text-to-speech, and wake word detection'
  },
  {
    id: 'channels',
    name: 'Channels',
    icon: 'messageSquare',
    description: 'Messaging platforms and communication channels'
  },
  {
    id: 'ai',
    name: 'AI & Models',
    icon: 'brain',
    description: 'AI providers, model routing, and local models'
  },
  {
    id: 'memory',
    name: 'Memory & Context',
    icon: 'database',
    description: 'Session memory, context management, and storage'
  },
  {
    id: 'tools',
    name: 'Tools',
    icon: 'tool',
    description: 'External tools, browsers, and integrations'
  },
  {
    id: 'security',
    name: 'Security',
    icon: 'shield',
    description: 'Vulnerability scanning and security controls'
  },
  {
    id: 'system',
    name: 'System',
    icon: 'settings',
    description: 'Cache, rate limits, and system settings'
  }
];
```

### 2. Novo Handler `features.dashboard`

```typescript
// Retorna estrutura completa para o dashboard
// Inclui: todas as features organizadas, summary, ações disponíveis
```

### 3. Feature Registry

```typescript
// Centralizar definição de features

const FEATURE_REGISTRY = {
  // Speech
  voice_recorder: {
    category: 'speech',
    configRoute: null,  // Modal inline
    quickActions: ['toggle', 'config']
  },
  tts: {
    category: 'speech',
    configRoute: null,
    quickActions: ['toggle', 'config']
  },
  wake_word: {
    category: 'speech',
    configRoute: null,
    quickActions: ['toggle', 'config']
  },
  
  // Channels
  whatsapp: {
    category: 'channels',
    configRoute: 'channels',  // Vai para view de channels
    quickActions: ['toggle', 'view']
  },
  telegram: {
    category: 'channels',
    configRoute: 'channels',
    quickActions: ['toggle', 'view']
  },
  discord: {
    category: 'channels',
    configRoute: 'channels',
    quickActions: ['toggle', 'view']
  },
  slack: {
    category: 'channels',
    configRoute: 'channels',
    quickActions: ['toggle', 'view']
  },
  signal: {
    category: 'channels',
    configRoute: 'channels',
    quickActions: ['toggle', 'view']
  },
  
  // AI
  model_routing: {
    category: 'ai',
    configRoute: 'model-routing',
    quickActions: ['toggle', 'view'],
    isNew: true
  },
  ollama: {
    category: 'ai',
    configRoute: 'ollama',
    quickActions: ['toggle', 'view'],
    isNew: true
  },
  
  // Memory
  memory_management: {
    category: 'memory',
    configRoute: 'memory',
    quickActions: ['toggle', 'view'],
    isNew: true
  },
  
  // Tools
  browser: {
    category: 'tools',
    configRoute: null,
    quickActions: ['toggle']
  },
  web_search: {
    category: 'tools',
    configRoute: null,
    quickActions: ['toggle', 'config']
  },
  opencode: {
    category: 'tools',
    configRoute: 'opencode',
    quickActions: ['toggle', 'view']
  },
  mcp: {
    category: 'tools',
    configRoute: 'mcp',
    quickActions: ['view']  // Sempre enabled
  },
  
  // Security
  security_scanning: {
    category: 'security',
    configRoute: 'security',
    quickActions: ['toggle', 'view'],
    isNew: true
  },
  
  // System
  cache_management: {
    category: 'system',
    configRoute: 'cache',
    quickActions: ['view'],
    isNew: true
  },
  rate_limits: {
    category: 'system',
    configRoute: 'rate-limits',
    quickActions: ['toggle', 'view'],
    isNew: true
  },
  budget_controls: {
    category: 'system',
    configRoute: 'budget',
    quickActions: ['toggle', 'view'],
    isNew: true
  }
};
```

## 🎨 Implementação Frontend

### Nova View: Features Dashboard

```typescript
// ui/src/ui/views/features-dashboard.ts

export function renderFeaturesDashboard(state: AppViewState) {
  return html`
    <div class="features-dashboard">
      ${renderHeader(state)}
      <div class="dashboard-content">
        ${renderSummaryCards(state)}
        ${renderCategories(state)}
      </div>
    </div>
  `;
}

function renderHeader(state: AppViewState) {
  return html`
    <div class="view-header">
      <div class="header-title">
        <h1>Features</h1>
        <p class="subtitle">Manage all OpenClaw features and integrations</p>
      </div>
      <div class="header-actions">
        <input type="search" 
               .value="${state.featuresSearchQuery}"
               @input="${(e: InputEvent) => state.handleFeaturesSearch((e.target as HTMLInputElement).value)}"
               placeholder="Search features..."
               class="search-input" />
      </div>
    </div>
  `;
}

function renderSummaryCards(state: AppViewState) {
  const summary = state.featuresSummary;
  
  return html`
    <div class="summary-cards">
      <div class="summary-card">
        <div class="value">${summary.total}</div>
        <div class="label">Total Features</div>
      </div>
      
      <div class="summary-card enabled">
        <div class="value">${summary.enabled}</div>
        <div class="label">Enabled</div>
      </div>
      
      <div class="summary-card needs-config">
        <div class="value">${summary.needsConfig}</div>
        <div class="label">Needs Config</div>
      </div>
      
      <div class="summary-card disabled">
        <div class="value">${summary.disabled}</div>
        <div class="label">Disabled</div>
      </div>
    </div>
  `;
}

function renderCategories(state: AppViewState) {
  return html`
    <div class="categories-grid">
      ${state.featureCategories.map(cat => renderCategorySection(cat, state))}
    </div>
  `;
}

function renderCategorySection(category: FeatureCategory, state: AppViewState) {
  const isExpanded = state.expandedCategories.includes(category.id);
  
  return html`
    <div class="category-section ${isExpanded ? 'expanded' : 'collapsed'}">
      <div class="category-header" @click="${() => state.handleToggleCategory(category.id)}">
        <div class="category-icon">${icons[category.icon]}</div>
        <div class="category-info">
          <h3>${category.name}</h3>
          <p>${category.description}</p>
        </div>
        <div class="category-count">
          ${category.features.filter(f => f.status === 'enabled').length}/${category.features.length}
        </div>
        <div class="expand-icon">
          ${isExpanded ? icons.chevronUp : icons.chevronDown}
        </div>
      </div>
      
      ${isExpanded ? html`
        <div class="features-grid">
          ${category.features.map(f => renderFeatureCard(f, state))}
        </div>
      ` : nothing}
    </div>
  `;
}

function renderFeatureCard(feature: DashboardFeature, state: AppViewState) {
  const statusClass = {
    'enabled': 'success',
    'disabled': 'neutral',
    'needs_config': 'warning',
    'unavailable': 'error'
  }[feature.status];
  
  return html`
    <div class="feature-card ${feature.status}"
         @click="${() => handleFeatureClick(feature, state)}">
      ${feature.isNew ? html`<span class="badge-new">NEW</span>` : nothing}
      
      <div class="card-header">
        <div class="feature-icon">${icons[feature.icon]}</div>
        <div class="status-badge ${statusClass}">${feature.status}</div>
      </div>
      
      <h4>${feature.name}</h4>
      <p class="description">${feature.description}</p>
      
      <div class="feature-tags">
        ${feature.tags.map(tag => html`<span class="tag">${tag}</span>`)}
      </div>
      
      <div class="quick-actions">
        ${feature.quickActions.map(action => renderQuickAction(action, feature, state))}
      </div>
    </div>
  `;
}

function renderQuickAction(action: QuickAction, feature: DashboardFeature, state: AppViewState) {
  return html`
    <button @click="${(e: Event) => {
      e.stopPropagation();
      handleQuickAction(action, feature, state);
    }}"
            class="btn-quick ${action.id}"
            title="${action.label}">
      ${icons[action.icon]}
    </button>
  `;
}

function handleFeatureClick(feature: DashboardFeature, state: AppViewState) {
  if (feature.configRoute) {
    // Navegar para view dedicada
    window.location.hash = feature.configRoute;
  } else if (feature.configurable) {
    // Abrir modal de config
    state.handleFeaturesOpenConfigModal(feature.id);
  }
}

function handleQuickAction(action: QuickAction, feature: DashboardFeature, state: AppViewState) {
  switch (action.id) {
    case 'toggle':
      state.handleFeaturesToggle(feature.id);
      break;
    case 'config':
      if (feature.configRoute) {
        window.location.hash = feature.configRoute;
      } else {
        state.handleFeaturesOpenConfigModal(feature.id);
      }
      break;
    case 'view':
      if (feature.configRoute) {
        window.location.hash = feature.configRoute;
      }
      break;
  }
}
```

### CSS/Tema

```css
.features-dashboard {
  padding: 1rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--surface-2);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid var(--border);
}

.summary-card .value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-card.enabled .value {
  color: var(--success);
}

.summary-card.needs-config .value {
  color: var(--warning);
}

.summary-card.disabled .value {
  color: var(--neutral);
}

.categories-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-section {
  background: var(--surface-1);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.category-header:hover {
  background: var(--surface-2);
}

.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.category-info h3 {
  margin: 0;
  font-size: 1.1rem;
}

.category-info p {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--surface-2);
}

.feature-card {
  background: var(--surface-1);
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-card.enabled {
  border-color: var(--success);
}

.feature-card.needs_config {
  border-color: var(--warning);
}

.badge-new {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--primary);
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.btn-quick {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-quick:hover {
  background: var(--surface-3);
}
```

## 📝 Checklist

- [ ] Criar menu "Features" no System
- [ ] Implementar `features.dashboard` handler
- [ ] Criar Feature Registry centralizado
- [ ] Implementar view `features-dashboard.ts`
- [ ] Adicionar navegação de features para views específicas
- [ ] Implementar search/filter
- [ ] Cards com status visual
- [ ] Quick actions (toggle, config, view)
- [ ] Expandir/colapsar categorias
- [ ] Badges "NEW" para features novas
- [ ] Summary cards no topo
- [ ] Responsivo

## ⏱️ Estimativa
- Backend: 1 dia
- Frontend: 2 dias
- Testes: 0.5 dia
- **Total: 3.5 dias**
