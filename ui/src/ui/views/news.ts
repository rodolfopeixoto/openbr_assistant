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
  
  return html`
    <div class="news-page-layout">
      <!-- Sidebar with Filters -->
      <aside class="news-sidebar">
        <!-- Search -->
        <div class="sidebar-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            Search
          </h3>
          <div class="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
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
        <div class="sidebar-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Time Range
          </h3>
          <div class="toggle-group">
            ${renderTimeToggle('all', 'All Time', state)}
            ${renderTimeToggle('today', 'Today', state)}
            ${renderTimeToggle('week', 'This Week', state)}
            ${renderTimeToggle('month', 'This Month', state)}
          </div>
        </div>

        <!-- Sources -->
        <div class="sidebar-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            Sources
          </h3>
          ${(state.newsSources || []).map(source => html`
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked="${state.newsSelectedSources?.includes(source.id)}"
                @change="${(e: Event) => {
                  const target = e.target as HTMLInputElement;
                  state.handleNewsSourceToggle(source.id, target.checked);
                }}"
              />
              ${source.name}
              <span class="checkbox-count">${source.itemCount || 0}</span>
            </label>
          `)}
        </div>

        <!-- Categories -->
        <div class="sidebar-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 7l-8-4-8 4v10l8 4 8-4V7z"/>
              <path d="M4 7l8 4 8-4"/>
              <path d="M12 11v10"/>
            </svg>
            Categories
          </h3>
          <div class="chip-group">
            ${renderCategoryChip('all', 'All', state)}
            ${renderCategoryChip('technology', 'Technology', state)}
            ${renderCategoryChip('ai', 'AI', state)}
            ${renderCategoryChip('business', 'Business', state)}
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="news-main">
        <div class="news-header">
          <h1>News & Intelligence</h1>
          <p class="subtitle">AI-powered news aggregation from various sources</p>
        </div>

        ${state.newsLoading ? html`
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading latest news...</p>
          </div>
        ` : state.newsError ? html`
          <div class="error-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p>${state.newsError}</p>
            <button @click="${() => state.handleNewsLoad()}" class="btn-primary">Retry</button>
          </div>
        ` : filteredItems.length === 0 ? html`
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Z"/>
              <path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h8"/>
            </svg>
            <h3>No news found</h3>
            <p>Try adjusting your filters or check back later for new content.</p>
          </div>
        ` : html`
          <div class="news-list">
            ${filteredItems.map(item => renderNewsCard(item, state))}
          </div>
        `}
      </main>

      ${state.newsSelectedItem ? renderNewsModal(state.newsSelectedItem as NewsItem, state) : null}
    </div>
  `;
}

function renderTimeToggle(value: string, label: string, state: AppViewState) {
  const isActive = state.newsFilter === value;
  return html`
    <button
      class="toggle-btn ${isActive ? 'active' : ''}"
      @click="${() => state.handleNewsFilterChange(value as 'all' | 'today' | 'week' | 'month')}" >
      ${label}
    </button>
  `;
}

function renderCategoryChip(value: string, label: string, state: AppViewState) {
  // For now, category filtering is not implemented in state
  // Just showing the UI
  return html`
    <span class="chip">${label}</span>
  `;
}

function renderNewsCard(item: NewsItem, state: AppViewState) {
  const sentiment = item.sentiment || 'neutral';
  
  return html`
    <article
      class="news-card ${sentiment}"
      @click="${() => state.handleNewsSelectItem(item)}"
    >
      <div class="card-content">
        <div class="card-meta">
          <span class="source-badge">${item.source}</span>
          <span class="time-badge">${formatDate(item.publishedAt)}</span>
          <span class="sentiment-icon">${getSentimentIcon(sentiment)}</span>
        </div>
        
        <h3 class="card-title">${item.title}</h3>
        
        ${item.summary ? html`
          <p class="card-summary">${item.summary}</p>
        ` : null}
        
        <div class="card-footer">
          ${item.tags?.length ? html`
            <div class="tags">
              ${item.tags.slice(0, 3).map(tag => html`<span class="tag">${tag}</span>`)}
            </div>
          ` : html`<div></div>`}
          
          <button class="read-more-btn" @click="${(e: Event) => { e.stopPropagation(); state.handleNewsSelectItem(item); }}">
            Read More
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderNewsModal(item: NewsItem, state: AppViewState) {
  const sentiment = item.sentiment || 'neutral';
  
  return html`
    <div class="news-detail-modal" @click="${(e: Event) => {
      if (e.target === e.currentTarget) {
        state.handleNewsSelectItem(null);
      }
    }}">
      <div class="modal-content">
        <button class="close-btn" @click="${() => state.handleNewsSelectItem(null)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
        
        <article class="news-detail">
          <div class="detail-header">
            <span class="source-badge">${item.source}</span>
            <span class="time-badge">${formatDate(item.publishedAt)}</span>
            <span class="sentiment-badge ${sentiment}">
              ${getSentimentIcon(sentiment)}
              ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
            </span>
          </div>
          
          <h2>${item.title}</h2>
          
          ${item.summary ? html`
            <div class="detail-section">
              <h4>AI Summary</h4>
              <div class="detail-summary">${item.summary}</div>
            </div>
          ` : null}
          
          <div class="detail-section">
            <a
              href="${item.url}"
              target="_blank"
              rel="noopener noreferrer"
              class="read-original-btn"
            >
              Read Original Article
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
          
          ${item.tags?.length ? html`
            <div class="detail-section">
              <h4>Tags</h4>
              <div class="tags">
                ${item.tags.map(tag => html`<span class="tag">${tag}</span>`)}
              </div>
            </div>
          ` : null}
        </article>
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

function getSourceCount(items: NewsItem[], source: string): number {
  return items.filter(item => item.source === source).length;
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
  
  return filtered;
}
