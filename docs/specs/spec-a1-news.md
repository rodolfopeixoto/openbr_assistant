# Spec A1: News System - Backend Completo + UI Fix

## 🎯 Objetivo
Implementar backend completo para o sistema de News e corrigir a UI quebrada, seguindo padrões consistentes com outras views (MCP, OpenCode).

## 📋 Estado Atual
- **UI:** Existe (351 linhas) mas funciona como placeholder
- **Backend:** TODO vazio - `handleNewsLoad()` sempre retorna array vazio
- **Problemas:** 
  - Sem aggregation de RSS feeds
  - Sem AI summarization
  - Category filters não funcionam
  - Sources hardcoded/empty

## 🏗️ Arquitetura

### Backend
```
src/
├── gateway/server-methods/news.ts          # Handlers RPC
├── services/news-aggregator.ts             # Serviço de agregação
├── services/news-sources/
│   ├── hackernews.ts                       # HackerNews API
│   ├── devto.ts                           # Dev.to API
│   └── rss-parser.ts                      # Parser RSS genérico
└── config/types.news.ts                   # Tipos TypeScript
```

### Frontend
```
ui/src/ui/
├── views/news.ts                          # ATUALIZAR - seguir padrão MCP
├── controllers/news.ts                    # NOVO - lógica de negócio
├── services/news-formatter.ts            # Formatação de datas, etc.
└── app.ts                                 # ADICIONAR handlers
```

## 🔧 Implementação Backend

### 1. Gateway Handlers

#### `news.list`
```typescript
interface ListNewsParams {
  source?: string;           // Filtrar por source específico
  category?: string;         // Filtrar por categoria
  timeRange?: 'all' | 'today' | 'week' | 'month';
  search?: string;          // Busca em título/summary
  sentiment?: 'positive' | 'negative' | 'neutral';
  limit?: number;           // Default: 50
  offset?: number;          // Default: 0
}

interface NewsItem {
  id: string;               // UUID
  title: string;
  url: string;             // Link externo
  summary: string;         // Resumo gerado por AI
  content?: string;        // Conteúdo completo (se disponível)
  source: 'hackernews' | 'devto' | 'rss';
  sourceName: string;      // Nome amigável
  sourceUrl: string;       // URL do source
  categories: string[];    // Tech, Business, AI, etc.
  sentiment: 'positive' | 'negative' | 'neutral';
  publishedAt: string;     // ISO 8601
  fetchedAt: string;       // Quando foi buscado
  imageUrl?: string;       // Thumbnail (se disponível)
  author?: string;         // Autor do artigo
  engagement?: {
    score: number;         // HN points, etc.
    comments?: number;     // Número de comentários
  };
}

// Retorna: { items: NewsItem[], total: number, hasMore: boolean }
```

#### `news.sources`
```typescript
// Retorna sources configuradas
interface NewsSource {
  id: string;
  name: string;
  type: 'hackernews' | 'devto' | 'rss';
  url: string;            // URL do feed/API
  enabled: boolean;
  lastFetchedAt?: string;
  itemCount: number;      // Quantos itens no banco
  categories: string[];   // Categorias disponíveis deste source
}

// Retorna: { sources: NewsSource[] }
```

#### `news.refresh`
```typescript
// Força fetch de todas as sources
// Retorna: { added: number, updated: number, errors: string[] }
```

#### `news.source.add`
```typescript
interface AddSourceParams {
  name: string;
  type: 'rss';
  url: string;
  categories?: string[];  // Mapeamento manual de categorias
}

// Valida: URL acessível, formato RSS válido
// Retorna: { source: NewsSource }
```

#### `news.source.remove`
```typescript
interface RemoveSourceParams {
  sourceId: string;
}

// Remove source e todos os seus itens
// Retorna: { removed: number }
```

#### `news.source.test`
```typescript
// Testa se URL RSS é válida sem salvar
// Retorna: { valid: boolean, title?: string, error?: string }
```

### 2. News Aggregator Service

```typescript
// src/services/news-aggregator.ts

class NewsAggregator {
  // Agendador: Rodar a cada 30 minutos
  private schedule = '*/30 * * * *';
  
  async fetchAll(): Promise<FetchResult> {
    // 1. Buscar de todas as sources habilitadas (paralelo)
    // 2. Parsear conteúdo
    // 3. Gerar resumos com AI (se habilitado)
    // 4. Analisar sentimento
    // 5. Salvar no banco
  }
  
  async fetchHackerNews(): Promise<NewsItem[]> {
    // Usar HN API: https://github.com/HackerNews/API
    // /v0/topstories.json
    // /v0/item/{id}.json
  }
  
  async fetchDevTo(): Promise<NewsItem[]> {
    // Usar Dev.to API: https://developers.forem.com/api/v1
    // GET /api/articles
  }
  
  async fetchRSS(url: string): Promise<NewsItem[]> {
    // Parser RSS/Atom
    // Extrair: title, link, description, pubDate, content:encoded
  }
  
  async summarize(content: string): Promise<string> {
    // Chamar LLM para gerar resumo curto (3-4 frases)
    // Cachear resultados
  }
  
  async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    // Análise simples baseada em keywords ou LLM
  }
  
  categorize(title: string, content: string): string[] {
    // Regras baseadas em keywords:
    // - AI/ML: "AI", "machine learning", "neural", "LLM"
    // - Web/Dev: "React", "JavaScript", "web", "frontend"
    // - Mobile: "iOS", "Android", "React Native"
    // - DevOps: "Docker", "Kubernetes", "CI/CD", "cloud"
    // - Security: "security", "vulnerability", "CVE"
    // - Business: "startup", "funding", "IPO"
  }
}
```

### 3. Storage

```typescript
// SQLite schema

create table news_items (
  id text primary key,
  title text not null,
  url text not null unique,  -- Evitar duplicatas
  summary text,
  content text,
  source text not null,
  source_name text not null,
  source_url text not null,
  categories text,          -- JSON array
  sentiment text,
  published_at datetime not null,
  fetched_at datetime not null,
  image_url text,
  author text,
  engagement_score integer,
  engagement_comments integer
);

create index idx_news_source on news_items(source);
create index idx_news_categories on news_items(categories);
create index idx_news_published on news_items(published_at);
create index idx_news_sentiment on news_items(sentiment);
create virtual table news_fts using fts5(title, summary, content);
```

### 4. Configuração

```typescript
// src/config/types.news.ts

interface NewsConfig {
  enabled: boolean;
  refreshInterval: number;      // Minutos (default: 30)
  aiSummarization: boolean;     // Usar LLM para resumos
  maxItemsPerSource: number;    // Manter últimos N itens (default: 100)
  retentionDays: number;        // Deletar após N dias (default: 30)
  sources: NewsSourceConfig[];
}

interface NewsSourceConfig {
  id: string;
  name: string;
  type: 'hackernews' | 'devto' | 'rss';
  url: string;
  enabled: boolean;
  categories?: string[];        // Mapeamento manual
}
```

## 🎨 Implementação Frontend

### 1. Controller (Novo)

```typescript
// ui/src/ui/controllers/news.ts

export interface NewsContext {
  client: GatewayBrowserClient | null;
  connected: boolean;
  newsLoading: boolean;
  newsError: string | null;
  newsItems: NewsItem[];
  newsSources: NewsSource[];
  newsSearchQuery: string;
  newsTimeRange: 'all' | 'today' | 'week' | 'month';
  newsSelectedSource: string | null;
  newsSelectedCategory: string | null;
  newsSelectedSentiment: 'positive' | 'negative' | 'neutral' | null;
  newsRefreshing: boolean;
  newsModalOpen: boolean;
  newsModalItem: NewsItem | null;
  newsTotalCount: number;
  newsHasMore: boolean;
}

export async function loadNews(ctx: NewsContext): Promise<void> {
  // Chamar news.list com filtros atuais
  // Paginação: carregar mais quando scroll
}

export async function refreshNews(ctx: NewsContext): Promise<void> {
  // Chamar news.refresh
  // Recarregar lista após completar
}

export async function loadNewsSources(ctx: NewsContext): Promise<void> {
  // Chamar news.sources
}

export function filterNews(ctx: NewsContext): void {
  // Aplicar filtros locais (categoria, sentimento)
  // Recarregar do backend se necessário
}
```

### 2. View (Atualizar)

```typescript
// ui/src/ui/views/news.ts

// Seguir EXATAMENTE o padrão MCP/OpenCode

export function renderNewsView(state: AppViewState) {
  return html`
    <div class="news-view">
      ${renderHeader(state)}
      ${state.newsLoading && !state.newsItems.length
        ? renderLoading()
        : state.newsError
        ? renderError(state.newsError, () => state.handleNewsLoad())
        : html`
            <div class="news-layout">
              ${renderSidebar(state)}
              ${renderContent(state)}
            </div>
          `}
      ${state.newsModalOpen ? renderNewsModal(state) : nothing}
    </div>
  `;
}

function renderHeader(state: AppViewState) {
  return html`
    <div class="view-header">
      <div class="header-title">
        <h1>News</h1>
        <p class="subtitle">AI-powered news aggregation and analysis</p>
      </div>
      <div class="header-actions">
        <button @click=${() => state.handleNewsRefresh()} 
                ?disabled=${state.newsRefreshing}
                class="btn-secondary">
          ${state.newsRefreshing ? html`<span class="spinner"></span>` : icons.refreshCcw}
          ${state.newsRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <button @click=${() => window.location.hash = 'news-settings'} 
                class="btn-secondary">
          ${icons.settings} Sources
        </button>
      </div>
      <div class="header-stats">
        <div class="stat">
          <span class="value">${state.newsTotalCount || 0}</span>
          <span class="label">Total</span>
        </div>
        <div class="stat">
          <span class="value">${state.newsItems.filter(i => isToday(i.publishedAt)).length}</span>
          <span class="label">Today</span>
        </div>
        <div class="stat">
          <span class="value">${state.newsSources?.length || 0}</span>
          <span class="label">Sources</span>
        </div>
      </div>
    </div>
  `;
}

function renderSidebar(state: AppViewState) {
  return html`
    <div class="sidebar">
      <div class="filter-section">
        <label>Search</label>
        <input type="text" 
               .value="${state.newsSearchQuery}"
               @input="${(e: InputEvent) => state.handleNewsSearchChange((e.target as HTMLInputElement).value)}"
               placeholder="Search news..." />
      </div>
      
      <div class="filter-section">
        <label>Time Range</label>
        <div class="time-range-buttons">
          ${['all', 'today', 'week', 'month'].map(range => html`
            <button class="${state.newsTimeRange === range ? 'active' : ''}"
                    @click="${() => state.handleNewsTimeRangeChange(range)}">
              ${range}
            </button>
          `)}
        </div>
      </div>
      
      <div class="filter-section">
        <label>Sources</label>
        <div class="source-list">
          ${state.newsSources?.map(source => html`
            <label class="checkbox-label">
              <input type="checkbox" 
                     .checked="${state.newsSelectedSource === source.id || !state.newsSelectedSource}"
                     @change="${() => state.handleNewsSourceToggle(source.id)}" />
              <span>${source.name}</span>
              <span class="count">${source.itemCount}</span>
            </label>
          `)}
        </div>
      </div>
      
      <div class="filter-section">
        <label>Categories</label>
        <div class="category-chips">
          ${getUniqueCategories(state.newsItems).map(cat => html`
            <button class="chip ${state.newsSelectedCategory === cat ? 'active' : ''}"
                    @click="${() => state.handleNewsCategoryChange(cat)}">
              ${cat}
            </button>
          `)}
        </div>
      </div>
    </div>
  `;
}

function renderContent(state: AppViewState) {
  if (!state.newsItems.length) {
    return renderEmptyState();
  }
  
  return html`
    <div class="news-list">
      ${state.newsItems.map(item => renderNewsCard(item, state))}
      ${state.newsHasMore ? html`
        <button @click="${() => state.handleNewsLoadMore()}" class="btn-load-more">
          Load More
        </button>
      ` : nothing}
    </div>
  `;
}

function renderNewsCard(item: NewsItem, state: AppViewState) {
  return html`
    <div class="news-card" @click="${() => state.handleNewsItemClick(item)}">
      ${item.imageUrl ? html`
        <div class="card-image">
          <img src="${item.imageUrl}" alt="" loading="lazy" />
        </div>
      ` : nothing}
      <div class="card-content">
        <div class="card-header">
          <span class="source">${item.sourceName}</span>
          <span class="time">${formatRelativeTime(item.publishedAt)}</span>
        </div>
        <h3 class="title">${item.title}</h3>
        <p class="summary">${item.summary}</p>
        <div class="card-footer">
          <div class="categories">
            ${item.categories.map(cat => html`<span class="chip">${cat}</span>`)}
          </div>
          <span class="sentiment ${item.sentiment}">${item.sentiment}</span>
        </div>
      </div>
    </div>
  `;
}
```

### 3. Integração App

```typescript
// ui/src/ui/app.ts - Adicionar

@state() newsLoading = false;
@state() newsError: string | null = null;
@state() newsItems: NewsItem[] = [];
@state() newsSources: NewsSource[] = [];
@state() newsSearchQuery = '';
@state() newsTimeRange: 'all' | 'today' | 'week' | 'month' = 'all';
@state() newsSelectedSource: string | null = null;
@state() newsSelectedCategory: string | null = null;
@state() newsSelectedSentiment: 'positive' | 'negative' | 'neutral' | null = null;
@state() newsRefreshing = false;
@state() newsModalOpen = false;
@state() newsModalItem: NewsItem | null = null;
@state() newsTotalCount = 0;
@state() newsHasMore = false;
@state() newsOffset = 0;

async handleNewsLoad() {
  const { loadNews } = await import('./controllers/news');
  await loadNews(this as unknown as Parameters<typeof loadNews>[0]);
}

async handleNewsRefresh() {
  const { refreshNews } = await import('./controllers/news');
  await refreshNews(this as unknown as Parameters<typeof refreshNews>[0]);
}

handleNewsSearchChange(query: string) {
  this.newsSearchQuery = query;
  this.newsOffset = 0;
  this.handleNewsLoad();
}

handleNewsTimeRangeChange(range: 'all' | 'today' | 'week' | 'month') {
  this.newsTimeRange = range;
  this.newsOffset = 0;
  this.handleNewsLoad();
}

handleNewsSourceToggle(sourceId: string) {
  this.newsSelectedSource = this.newsSelectedSource === sourceId ? null : sourceId;
  this.newsOffset = 0;
  this.handleNewsLoad();
}

handleNewsCategoryChange(category: string) {
  this.newsSelectedCategory = this.newsSelectedCategory === category ? null : category;
  // Filtro local, não precisa recarregar
}

handleNewsItemClick(item: NewsItem) {
  this.newsModalItem = item;
  this.newsModalOpen = true;
}

async handleNewsLoadMore() {
  this.newsOffset += 50;
  await this.handleNewsLoad();
}
```

## 🧪 Testes

### Backend Tests
```typescript
// src/gateway/server-methods/news.test.ts

describe('news.list', () => {
  it('returns paginated news items', async () => {
    // Setup: Add test items
    // Call handler
    // Assert: items array, total count, hasMore
  });
  
  it('filters by source', async () => {
    // Test filtro por source
  });
  
  it('filters by category', async () => {
    // Test filtro por categoria
  });
  
  it('searches by text', async () => {
    // Test busca FTS
  });
});

describe('news-aggregator', () => {
  it('fetches from HackerNews', async () => {
    // Mock HN API
    // Test parser
  });
  
  it('fetches from RSS feed', async () => {
    // Mock RSS feed
    // Test parser
  });
  
  it('generates AI summaries when enabled', async () => {
    // Test integração com LLM
  });
});
```

### Frontend Tests
```typescript
// Testar:
// - Load inicial
// - Filtros atualizam lista
// - Refresh busca novos items
// - Modal abre com conteúdo correto
```

## 📊 Critérios de Aceitação

- [ ] Backend: Todos os handlers implementados
- [ ] Backend: Agregação HackerNews funcionando
- [ ] Backend: Agregação Dev.to funcionando
- [ ] Backend: RSS parser funcionando
- [ ] Backend: AI summarization (se habilitado)
- [ ] Backend: Sentiment analysis
- [ ] Frontend: UI segue padrão MCP/OpenCode
- [ ] Frontend: Header com stats
- [ ] Frontend: Sidebar com filtros funcionais
- [ ] Frontend: Lista de cards com scroll infinito
- [ ] Frontend: Modal de detalhes
- [ ] Frontend: Loading, error, empty states
- [ ] Frontend: Responsivo
- [ ] Testes: >80% coverage
- [ ] Performance: <2s para carregar 50 items

## 🚀 Notas de Implementação

1. **Cache:** Cachear resultados de fetch por 5 minutos
2. **Deduplicação:** Usar URL como unique key
3. **AI:** Só gerar resumos se `aiSummarization: true` (custo)
4. **Rate Limiting:** Respeitar rate limits das APIs
5. **Storage:** Limpar itens antigos (retentionDays)
6. **Mobile:** Cards empilham verticalmente em telas pequenas

## ⏱️ Estimativa
- Backend: 3 dias
- Frontend: 2 dias
- Testes: 1 dia
- **Total: 6 dias**
