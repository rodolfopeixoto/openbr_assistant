import type { AppViewState } from "../app-view-state.js";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  content?: string;
  source: string;
  sourceName: string;
  sourceUrl: string;
  categories: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  publishedAt: string;
  fetchedAt: string;
  imageUrl?: string;
  author?: string;
  engagement?: {
    score: number;
    comments?: number;
  };
}

export interface NewsSource {
  id: string;
  name: string;
  type: string;
  url: string;
  enabled: boolean;
  lastFetchedAt?: string;
  itemCount: number;
  categories: string[];
}

export async function loadNews(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.newsLoading = true;
  state.newsError = null;

  try {
    // Load sources first if not loaded
    if (!state.newsSources || state.newsSources.length === 0) {
      await loadNewsSources(state);
    }

    const result = await state.client.request("news.list", {
      source: state.newsSelectedSource || undefined,
      category: state.newsSelectedCategory || undefined,
      timeRange: state.newsTimeRange,
      search: state.newsSearchQuery || undefined,
      sentiment: state.newsSelectedSentiment || undefined,
      limit: state.newsLimit,
      offset: state.newsOffset,
    }) as { 
      items: NewsItem[]; 
      total: number; 
      hasMore: boolean;
      offset: number;
      limit: number;
    };

    let items = result.items;
    
    // Apply client-side source filtering if sources are selected
    if (state.newsSelectedSources && state.newsSelectedSources.length > 0) {
      items = items.filter(item => state.newsSelectedSources?.includes(item.source));
    }
    
    // Apply client-side time range filtering
    if (state.newsFilter && state.newsFilter !== 'all') {
      const now = new Date();
      items = items.filter(item => {
        const itemDate = new Date(item.publishedAt);
        switch (state.newsFilter) {
          case 'today':
            return itemDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return itemDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return itemDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    if (state.newsOffset === 0) {
      state.newsItems = items;
    } else {
      state.newsItems = [...state.newsItems, ...items];
    }
    
    state.newsTotalCount = items.length;
    state.newsHasMore = result.hasMore;
  } catch (err) {
    state.newsError = err instanceof Error ? err.message : "Failed to load news";
    console.error("[News] Failed to load:", err);
  } finally {
    state.newsLoading = false;
  }
}

export async function refreshNews(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  state.newsRefreshing = true;

  try {
    await state.client.request("news.refresh");

    // Reload news after refresh
    state.newsOffset = 0;
    await loadNews(state);
  } catch (err) {
    console.error("[News] Failed to refresh:", err);
  } finally {
    state.newsRefreshing = false;
  }
}

export async function loadNewsSources(state: AppViewState): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    const result = await state.client.request("news.sources") as { sources: NewsSource[] };

    state.newsSources = result.sources;
  } catch (err) {
    console.error("[News] Failed to load sources:", err);
    state.newsSources = [];
  }
}

export async function addNewsSource(
  state: AppViewState,
  name: string,
  url: string,
  categories?: string[]
): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("news.source.add", {
      name,
      type: "rss",
      url,
      categories,
    });

    await loadNewsSources(state);
  } catch (err) {
    console.error("[News] Failed to add source:", err);
    throw err;
  }
}

export async function removeNewsSource(state: AppViewState, sourceId: string): Promise<void> {
  if (!state.client?.connected) {
    return;
  }

  try {
    await state.client.request("news.source.remove", { sourceId });

    await loadNewsSources(state);
    await loadNews(state);
  } catch (err) {
    console.error("[News] Failed to remove source:", err);
    throw err;
  }
}

export function filterNewsByCategory(state: AppViewState, category: string | null): void {
  state.newsSelectedCategory = category;
  state.newsOffset = 0;
  loadNews(state);
}

export function filterNewsBySource(state: AppViewState, sourceId: string | null): void {
  state.newsSelectedSource = sourceId;
  state.newsOffset = 0;
  loadNews(state);
}

export function searchNews(state: AppViewState, query: string): void {
  state.newsSearchQuery = query;
  state.newsOffset = 0;
  loadNews(state);
}

export function setNewsTimeRange(
  state: AppViewState,
  range: 'all' | 'today' | 'week' | 'month'
): void {
  state.newsTimeRange = range;
  state.newsOffset = 0;
  loadNews(state);
}

export async function loadMoreNews(state: AppViewState): Promise<void> {
  state.newsOffset += state.newsLimit;
  await loadNews(state);
}

export function selectNewsItem(
  state: AppViewState,
  item: NewsItem | null
): void {
  state.newsSelectedItem = item;
  state.newsModalOpen = item !== null;
}
