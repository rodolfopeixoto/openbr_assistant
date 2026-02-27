import { html } from "lit";
import type { AppViewState } from "../app-view-state";

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative";
  tags?: string[];
  category?: string;
}

export function renderNewsView(state: AppViewState) {
  const items = (state.newsItems || []) as NewsItem[];
  const filteredItems = filterNews(items, state);
  const hasActiveFilters = state.newsSearchQuery || 
    (state.newsSelectedSources?.length > 0) || 
    (state.newsFilter && state.newsFilter !== 'all');
  
  return html`
    <section class="content-header">
      <div>
        <div class="page-title">News</div>
        <div class="page-sub">News and intelligence aggregation from ${state.newsSources?.length || 0} sources</div>
      </div>
      <div class="page-meta">
        ${hasActiveFilters ? html`
          <button class="btn-secondary btn-small" @click="${() => clearFilters(state)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
            Clear Filters
          </button>
        ` : null}
        <button 
          class="btn-secondary btn-small ${state.newsRefreshing ? 'refreshing' : ''}" 
          @click="${() => state.handleNewsRefresh()}"
          ?disabled="${state.newsRefreshing}"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${state.newsRefreshing ? 'animation: spin 1s linear infinite;' : ''}">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          ${state.newsRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </section>

    <!-- News Content with Sidebar Layout -->
    <div class="news-container">
      <!-- Filters Sidebar -->
      <aside class="news-filters">
        <!-- Search -->
        <div class="filter-section">
          <h4 class="filter-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            Search
          </h4>
          <div class="search-box">
            <input
              type="text"
              class="search-input"
              placeholder="Search news..."
              .value="${state.newsSearchQuery || ''}"
              @input="${(e: InputEvent) => {
                const target = e.target as HTMLInputElement;
                state.handleNewsSearchChange(target.value);
              }}"
            />
          </div>
        </div>

        <!-- Time Range -->
        <div class="filter-section">
          <h4 class="filter-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Time Range
          </h4>
          <div class="filter-options">
            ${renderFilterOption('all', 'All Time', state)}
            ${renderFilterOption('48h', 'Last 48h', state)}
            ${renderFilterOption('today', 'Today', state)}
            ${renderFilterOption('week', 'This Week', state)}
            ${renderFilterOption('month', 'This Month', state)}
          </div>
        </div>

        <!-- Sources -->
        <div class="filter-section">
          <h4 class="filter-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
            </svg>
            Sources (${state.newsSources?.length || 0})
          </h4>
          ${!state.newsSources || state.newsSources.length === 0 ? html`
            <div class="loading-small">Loading sources...</div>
          ` : html`
            <div class="filter-checkboxes">
              ${state.newsSources.slice(0, 10).map(source => html`
                <label class="filter-checkbox">
                  <input
                    type="checkbox"
                    .checked="${state.newsSelectedSources?.includes(source.id)}"
                    @change="${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      state.handleNewsSourceToggle(source.id, target.checked);
                    }}"
                  />
                  <span class="checkbox-text">${source.name}</span>
                  <span class="checkbox-badge">${source.itemCount || 0}</span>
                </label>
              `)}
            </div>
          `}
        </div>

        <!-- Sentiment Filter -->
        <div class="filter-section">
          <h4 class="filter-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            Sentiment
          </h4>
          <div class="sentiment-filters">
            <button 
              class="sentiment-btn positive ${state.newsSelectedSentiment === 'positive' ? 'active' : ''}"
              @click="${() => state.handleNewsSentimentChange(state.newsSelectedSentiment === 'positive' ? null : 'positive')}"
            >
              <span class="sentiment-dot positive"></span>
              Positive
            </button>
            <button 
              class="sentiment-btn neutral ${state.newsSelectedSentiment === 'neutral' ? 'active' : ''}"
              @click="${() => state.handleNewsSentimentChange(state.newsSelectedSentiment === 'neutral' ? null : 'neutral')}"
            >
              <span class="sentiment-dot neutral"></span>
              Neutral
            </button>
            <button 
              class="sentiment-btn negative ${state.newsSelectedSentiment === 'negative' ? 'active' : ''}"
              @click="${() => state.handleNewsSentimentChange(state.newsSelectedSentiment === 'negative' ? null : 'negative')}"
            >
              <span class="sentiment-dot negative"></span>
              Negative
            </button>
          </div>
        </div>
      </aside>

      <!-- Main News List -->
      <main class="news-content">
        <!-- Stats Bar -->
        ${!state.newsLoading && !state.newsError && items.length > 0 ? html`
          <div class="news-stats">
            <div class="stat">
              <span class="stat-number">${filteredItems.length}</span>
              <span class="stat-label">articles</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-number">${state.newsSources?.length || 0}</span>
              <span class="stat-label">sources</span>
            </div>
            <div class="stat-sentiments">
              <span class="sentiment-stat positive" title="Positive">
                <span class="sentiment-dot"></span>${items.filter(i => i.sentiment === 'positive').length}
              </span>
              <span class="sentiment-stat neutral" title="Neutral">
                <span class="sentiment-dot"></span>${items.filter(i => i.sentiment === 'neutral').length}
              </span>
              <span class="sentiment-stat negative" title="Negative">
                <span class="sentiment-dot"></span>${items.filter(i => i.sentiment === 'negative').length}
              </span>
            </div>
          </div>
        ` : null}

        ${state.newsLoading && items.length === 0 ? html`
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading news...</p>
          </div>
        ` : state.newsError ? html`
          <div class="error-container">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p>${state.newsError}</p>
            <button @click="${() => state.handleNewsLoad()}" class="btn-primary">Retry</button>
          </div>
        ` : filteredItems.length === 0 ? html`
          <div class="empty-container">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Z"/>
              <path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h8"/>
            </svg>
            <h3>No news found</h3>
            <p>${hasActiveFilters ? 'Try adjusting your filters to see more results.' : 'Check back later for new content.'}</p>
            ${hasActiveFilters ? html`
              <button @click="${() => clearFilters(state)}" class="btn-primary">Clear Filters</button>
            ` : null}
          </div>
        ` : html`
          <div class="articles-list">
            ${filteredItems.map(item => renderArticleCard(item, state))}
          </div>
          
          ${state.newsHasMore ? html`
            <div class="load-more">
              <button 
                class="btn-secondary" 
                @click="${() => state.handleNewsLoad()}"
                ?disabled="${state.newsLoading}"
              >
                ${state.newsLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          ` : null}
        `}
      </main>
    </div>

    ${state.newsSelectedItem ? renderArticleModal(state.newsSelectedItem as NewsItem, state) : null}
  `;
}

function clearFilters(state: AppViewState) {
  state.handleNewsSearchChange('');
  state.newsSelectedSources = [];
  state.handleNewsSentimentChange(null);
  state.handleNewsFilterChange('all');
}

function renderFilterOption(value: string, label: string, state: AppViewState) {
  const isActive = state.newsFilter === value;
  return html`
    <button
      class="filter-option ${isActive ? 'active' : ''}"
      @click="${() => state.handleNewsFilterChange(value as 'all' | '48h' | 'today' | 'week' | 'month')}" >
      ${label}
    </button>
  `;
}

function renderArticleCard(item: NewsItem, state: AppViewState) {
  const sentiment = item.sentiment || 'neutral';
  
  return html`
    <article class="article-card ${sentiment}">
      <a 
        href="${item.url}" 
        target="_blank" 
        rel="noopener noreferrer"
        class="article-link"
      >
        <div class="article-header">
          <span class="article-source">${item.source}</span>
          <span class="article-time">${formatDate(item.publishedAt)}</span>
          <span class="article-sentiment" title="${sentiment}">
            ${getSentimentIcon(sentiment)}
          </span>
        </div>
        
        <h3 class="article-title">${item.title}</h3>
        
        ${item.summary ? html`
          <p class="article-summary">${item.summary}</p>
        ` : null}
      </a>
      
      <div class="article-footer">
        ${item.tags?.length ? html`
          <div class="article-tags">
            ${item.tags.slice(0, 3).map(tag => html`<span class="article-tag">${tag}</span>`)}
          </div>
        ` : null}
        
        <button class="btn-text" @click="${(e: Event) => { e.stopPropagation(); state.handleNewsSelectItem(item); }}">
          Read More
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>
    </article>
  `;
}

function renderArticleModal(item: NewsItem, state: AppViewState) {
  const sentiment = item.sentiment || 'neutral';
  
  return html`
    <div class="modal-overlay" @click="${(e: Event) => {
      if (e.target === e.currentTarget) {
        state.handleNewsSelectItem(null);
      }
    }}">
      <div class="modal-panel">
        <button class="modal-close" @click="${() => state.handleNewsSelectItem(null)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
        
        <div class="modal-body">
          <div class="article-detail-header">
            <span class="article-source">${item.source}</span>
            <span class="article-time">${formatDate(item.publishedAt)}</span>
            <span class="sentiment-badge ${sentiment}">
              ${getSentimentIcon(sentiment)}
              ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
            </span>
          </div>
          
          <h2>${item.title}</h2>
          
          ${item.summary ? html`
            <div class="article-summary-box">
              <h4>Summary</h4>
              <p>${item.summary}</p>
            </div>
          ` : null}
          
          <a
            href="${item.url}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary"
          >
            Read Original Article
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          
          ${item.tags?.length ? html`
            <div class="article-tags-section">
              <h4>Tags</h4>
              <div class="article-tags">
                ${item.tags.map(tag => html`<span class="article-tag">${tag}</span>`)}
              </div>
            </div>
          ` : null}
        </div>
      </div>
    </div>
  `;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getSentimentIcon(sentiment: string) {
  switch (sentiment) {
    case 'positive':
      return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
    case 'negative':
      return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
    default:
      return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
  }
}

function filterNews(items: NewsItem[], state: AppViewState): NewsItem[] {
  let filtered = [...items];
  
  // Filter by search query
  if (state.newsSearchQuery) {
    const query = state.newsSearchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.summary?.toLowerCase().includes(query) ||
      item.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }
  
  // Filter by time range
  if (state.newsFilter && state.newsFilter !== 'all') {
    const now = new Date();
    const itemDate = (dateStr: string) => new Date(dateStr);
    
    switch (state.newsFilter) {
      case '48h':
        const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        filtered = filtered.filter(item => itemDate(item.publishedAt) >= twoDaysAgo);
        break;
      case 'today':
        filtered = filtered.filter(item => {
          const date = itemDate(item.publishedAt);
          return date.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(item => itemDate(item.publishedAt) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(item => itemDate(item.publishedAt) >= monthAgo);
        break;
    }
  }
  
  // Filter by sources
  if (state.newsSelectedSources?.length > 0) {
    filtered = filtered.filter(item => state.newsSelectedSources?.includes(item.source));
  }
  
  // Filter by sentiment
  if (state.newsSelectedSentiment) {
    filtered = filtered.filter(item => item.sentiment === state.newsSelectedSentiment);
  }
  
  return filtered;
}
