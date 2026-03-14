# Spec: News RSS Real Implementation

## 🎯 Objetivo
Implementar backend completo para agregação de RSS feeds reais, substituindo dados mock/empty por dados reais de HackerNews, Dev.to e RSS feeds configuráveis.

## 📋 Estado Atual
- ✅ UI completa (351 linhas) com filtros, search, cards
- ❌ Backend retorna array vazio ou mock data
- ❌ Sem agregação real de feeds RSS
- ❌ Sem atualização automática

## 🏗️ Arquitetura

### Serviços Backend
```
src/services/news/
├── aggregator.ts          # Orquestrador principal
├── sources/
│   ├── hackernews.ts     # API HackerNews
│   ├── devto.ts          # API Dev.to
│   └── rss-feed.ts       # Parser RSS genérico
├── storage.ts            # SQLite storage
└── scheduler.ts          # Atualização automática
```

## 🔧 Implementação Detalhada

### 1. Agregador Principal (src/services/news/aggregator.ts)

```typescript
interface NewsAggregatorConfig {
  sources: NewsSource[];
  updateIntervalMs: number;
  maxItemsPerSource: number;
  aiSummarization: boolean;
}

class NewsAggregator {
  private sources: Map<string, NewsSourceAdapter>;
  private storage: NewsStorage;
  private scheduler: Scheduler;
  
  async initialize(): Promise<void> {
    // Carregar sources do config
    // Inicializar adapters
    // Configurar scheduler
  }
  
  async fetchAll(): Promise<NewsItem[]> {
    // Fetch paralelo de todos os sources
    // Merge e ordenar por data
    // Salvar no storage
  }
  
  async fetchSource(sourceId: string): Promise<NewsItem[]> {
    // Fetch de source específico
  }
}
```

### 2. HackerNews Adapter (src/services/news/sources/hackernews.ts)

```typescript
class HackerNewsAdapter implements NewsSourceAdapter {
  name = "Hacker News";
  type = "hackernews";
  
  async fetch(options: FetchOptions): Promise<NewsItem[]> {
    // API: https://hacker-news.firebaseio.com/v0/
    // Endpoints:
    // - /topstories.json (500 top stories)
    // - /newstories.json (500 new stories)
    // - /item/{id}.json (detalhes do item)
    
    const storyIds = await fetchTopStories();
    const stories = await Promise.all(
      storyIds.slice(0, options.limit).map(id => fetchStory(id))
    );
    
    return stories.map(story => ({
      id: `hn-${story.id}`,
      title: story.title,
      url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      summary: story.text?.substring(0, 500) || "",
      source: "hackernews",
      sourceName: "Hacker News",
      categories: this.categorize(story),
      sentiment: "neutral",
      publishedAt: new Date(story.time * 1000).toISOString(),
      author: story.by,
      engagement: {
        score: story.score,
        comments: story.descendants
      }
    }));
  }
  
  private categorize(story: HNItem): string[] {
    // Categorização baseada em título/texto
    const categories = [];
    const text = (story.title + " " + story.text).toLowerCase();
    
    if (text.includes("ai") || text.includes("machine learning")) categories.push("ai");
    if (text.includes("startup")) categories.push("startup");
    if (text.includes("security")) categories.push("security");
    if (text.includes("programming") || text.includes("code")) categories.push("programming");
    if (text.includes("web") || text.includes("javascript")) categories.push("web");
    
    return categories.length > 0 ? categories : ["tech"];
  }
}
```

### 3. Dev.to Adapter (src/services/news/sources/devto.ts)

```typescript
class DevToAdapter implements NewsSourceAdapter {
  name = "Dev.to";
  type = "devto";
  baseUrl = "https://dev.to/api/articles";
  
  async fetch(options: FetchOptions): Promise<NewsItem[]> {
    // API: https://dev.to/api/articles
    // Query params:
    // - page: número da página
    // - per_page: items por página (max 1000)
    // - tag: filtrar por tag
    
    const articles = await fetch(`${this.baseUrl}?per_page=30&page=1`).then(r => r.json());
    
    return articles.map(article => ({
      id: `devto-${article.id}`,
      title: article.title,
      url: article.url,
      summary: article.description || article.body_markdown?.substring(0, 500),
      source: "devto",
      sourceName: "Dev.to",
      categories: article.tag_list || ["programming"],
      sentiment: "neutral",
      publishedAt: article.published_at,
      author: article.user?.name,
      imageUrl: article.cover_image,
      engagement: {
        score: article.positive_reactions_count,
        comments: article.comments_count
      }
    }));
  }
}
```

### 4. RSS Generic Adapter (src/services/news/sources/rss-feed.ts)

```typescript
import Parser from "rss-parser";

class RSSFeedAdapter implements NewsSourceAdapter {
  private parser: Parser;
  
  constructor(private feedUrl: string, private feedName: string) {
    this.parser = new Parser();
  }
  
  name = this.feedName;
  type = "rss";
  
  async fetch(options: FetchOptions): Promise<NewsItem[]> {
    const feed = await this.parser.parseURL(this.feedUrl);
    
    return feed.items.slice(0, options.limit).map(item => ({
      id: `rss-${hashCode(item.link || item.guid)}`,
      title: item.title || "Untitled",
      url: item.link,
      summary: item.contentSnippet || item.content?.substring(0, 500) || "",
      source: this.feedUrl,
      sourceName: this.feedName,
      categories: item.categories || ["general"],
      sentiment: "neutral",
      publishedAt: item.isoDate || item.pubDate,
      author: item.creator || item.author,
      imageUrl: this.extractImage(item),
    }));
  }
  
  private extractImage(item: Parser.Item): string | undefined {
    // Extrair imagem do content ou media:thumbnail
    const mediaMatch = item["media:thumbnail"] || item["media:content"];
    if (mediaMatch && mediaMatch.$ && mediaMatch.$.url) {
      return mediaMatch.$.url;
    }
    
    // Extrair primeira imagem do content HTML
    const imgMatch = item.content?.match(/<img[^>]+src="([^"]+)"/);
    return imgMatch ? imgMatch[1] : undefined;
  }
}
```

### 5. Configuração de Sources (src/config/feature-registry.ts)

```typescript
export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    id: "hackernews",
    name: "Hacker News",
    type: "hackernews",
    enabled: true,
    url: "https://news.ycombinator.com",
    categories: ["tech", "startup"],
    itemCount: 0,
  },
  {
    id: "devto",
    name: "Dev.to",
    type: "devto", 
    enabled: true,
    url: "https://dev.to",
    categories: ["programming", "tech"],
    itemCount: 0,
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    type: "rss",
    url: "https://techcrunch.com/feed/",
    enabled: true,
    categories: ["tech", "startup", "business"],
    itemCount: 0,
  },
  {
    id: "verge",
    name: "The Verge",
    type: "rss",
    url: "https://www.theverge.com/rss/index.xml",
    enabled: true,
    categories: ["tech", "culture"],
    itemCount: 0,
  },
  {
    id: "ars",
    name: "Ars Technica",
    type: "rss",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    enabled: true,
    categories: ["tech", "science"],
    itemCount: 0,
  },
  {
    id: "wired",
    name: "Wired",
    type: "rss",
    url: "https://www.wired.com/feed/rss",
    enabled: true,
    categories: ["tech", "science", "culture"],
    itemCount: 0,
  },
];
```

### 6. Scheduler (src/services/news/scheduler.ts)

```typescript
class NewsScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  
  start(intervalMs: number = 15 * 60 * 1000): void {
    // Atualizar a cada 15 minutos por padrão
    this.intervalId = setInterval(async () => {
      console.log("[News] Running scheduled update...");
      try {
        await aggregator.fetchAll();
      } catch (err) {
        console.error("[News] Scheduled update failed:", err);
      }
    }, intervalMs);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

### 7. Gateway Handlers (src/gateway/server-methods/news.ts)

```typescript
export const newsHandlers: GatewayRequestHandlers = {
  "news.list": async ({ params, respond }) => {
    const {
      source,
      category,
      timeRange = "all",
      search,
      sentiment,
      limit = 50,
      offset = 0,
    } = params;
    
    // Buscar do storage (SQLite)
    let items = await newsStorage.getItems({
      source,
      category,
      timeRange,
      search,
      sentiment,
      limit,
      offset,
    });
    
    // Se storage vazio ou stale, fazer fetch
    if (items.length === 0 || await newsStorage.isStale()) {
      await aggregator.fetchAll();
      items = await newsStorage.getItems({ limit, offset });
    }
    
    respond(true, {
      items,
      total: await newsStorage.getCount({ source, category, search }),
      hasMore: items.length === limit,
      offset,
      limit,
    });
  },
  
  "news.sources": async ({ respond }) => {
    const sources = await newsStorage.getSources();
    respond(true, { sources });
  },
  
  "news.refresh": async ({ respond }) => {
    try {
      await aggregator.fetchAll();
      respond(true, { success: true, message: "News refreshed successfully" });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to refresh news: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "news.source.add": async ({ params, respond }) => {
    const { name, type, url, categories } = params;
    const source = await newsStorage.addSource({
      id: randomUUID(),
      name,
      type,
      url,
      enabled: true,
      categories: categories || ["general"],
      itemCount: 0,
    });
    respond(true, { source });
  },
  
  "news.source.remove": async ({ params, respond }) => {
    const { sourceId } = params;
    await newsStorage.removeSource(sourceId);
    respond(true, { success: true });
  },
  
  "news.source.test": async ({ params, respond }) => {
    const { url, type } = params;
    try {
      const adapter = createAdapter(type, url, "Test");
      const items = await adapter.fetch({ limit: 1 });
      respond(true, { 
        success: true, 
        message: `Successfully fetched ${items.length} items`,
        sample: items[0] 
      });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to test source: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
};
```

## 🎨 UI Improvements

### 1. Melhorar Cards (ui/src/ui/views/news.ts)

```typescript
// Adicionar preview de imagens
function renderNewsCard(item: NewsItem) {
  return html`
    <div class="news-card" @click=${() => state.handleNewsSelectItem(item)}>
      ${item.imageUrl ? html`
        <div class="news-card-image">
          <img src="${item.imageUrl}" alt="" loading="lazy" />
        </div>
      ` : nothing}
      <div class="news-card-content">
        <div class="news-card-header">
          <span class="news-source-badge">${item.sourceName}</span>
          <span class="news-time">${formatTimeAgo(item.publishedAt)}</span>
        </div>
        <h3 class="news-title">${item.title}</h3>
        <p class="news-summary">${item.summary}</p>
        <div class="news-footer">
          <div class="news-tags">
            ${item.categories.map(cat => html`
              <span class="news-tag">${cat}</span>
            `)}
          </div>
          ${item.engagement ? html`
            <div class="news-engagement">
              <span>▲ ${item.engagement.score}</span>
              ${item.engagement.comments ? html`
                <span>💬 ${item.engagement.comments}</span>
              ` : nothing}
            </div>
          ` : nothing}
        </div>
      </div>
    </div>
  `;
}
```

### 2. Adicionar Source Management UI

```typescript
function renderSourceManagement(state: AppViewState) {
  return html`
    <div class="news-sources-panel">
      <h3>News Sources</h3>
      <div class="sources-list">
        ${state.newsSources.map(source => html`
          <div class="source-item">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                .checked="${source.enabled}"
                @change="${(e: Event) => state.handleNewsSourceToggle(source.id, (e.target as HTMLInputElement).checked)}"
              />
              <span class="source-name">${source.name}</span>
              <span class="source-count">${source.itemCount}</span>
            </label>
            <button 
              class="btn-icon" 
              @click="${() => state.handleNewsSourceRemove(source.id)}"
              title="Remove source"
            >
              🗑️
            </button>
          </div>
        `)}
      </div>
      <button class="btn-primary" @click="${() => state.handleNewsShowAddSourceModal()}">
        + Add RSS Source
      </button>
    </div>
  `;
}
```

## 📦 Dependências

```json
{
  "dependencies": {
    "rss-parser": "^3.13.0",
    "node-cron": "^3.0.3"
  }
}
```

## ✅ Acceptance Criteria

- [ ] HackerNews API integrada e buscando posts reais
- [ ] Dev.to API integrada e buscando artigos reais
- [ ] RSS feeds configuráveis funcionando
- [ ] Atualização automática a cada 15 minutos
- [ ] Storage SQLite com FTS para search
- [ ] UI mostrando imagens previews
- [ ] Source management funcionando (add/remove/enable)
- [ ] Filtros por categoria funcionando
- [ ] Search em tempo real
- [ ] Cache para evitar re-fetch desnecessário

## 🚀 Testing

```bash
# Testar manualmente
curl http://localhost:18789/api/news/list

# Deve retornar posts reais do HackerNews e Dev.to
```
