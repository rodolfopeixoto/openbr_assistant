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
  relevanceScore?: number;
  categories?: string[];
  engagement?: {
    score?: number;
    likes?: number;
    comments?: number;
  };
}

export function renderNewsView(state: AppViewState) {
  const items = (state.newsItems || []) as NewsItem[];
  const filteredItems = filterNews(items, state);
  
  return html`
    <div class="news-page-layout">
      <!-- Sidebar with Filters -->
      <aside class="news-sidebar">
        <!-- Twitter/X Integration -->
        <div class="sidebar-section twitter-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Twitter/X Integration
          </h3>
          ${state.twitterConfigured ? html`
            <div class="twitter-status configured">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <span>Connected</span>
            </div>
            <button class="btn-secondary" @click="${() => state.handleTwitterFetch('@OpenAI')}">
              Fetch @OpenAI
            </button>
            <button class="btn-secondary" @click="${() => state.handleTwitterFetch('@AnthropicAI')}">
              Fetch @AnthropicAI
            </button>
          ` : html`
            <div class="twitter-status not-configured">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>Not configured</span>
            </div>
            <button class="btn-primary" @click="${() => state.showTwitterConfig = true}">
              Configure Twitter/X
            </button>
          `}
        </div>

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

        <!-- Relevance Filter -->
        <div class="sidebar-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Relevance Score
          </h3>
          <div class="relevance-filter">
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked="${state.newsMinRelevance === 70}"
                @change="${(e: Event) => {
                  const target = e.target as HTMLInputElement;
                  state.handleNewsMinRelevanceChange(target.checked ? 70 : 0);
                }}"
              />
              High relevance only (70+)
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked="${state.newsMinRelevance === 50}"
                @change="${(e: Event) => {
                  const target = e.target as HTMLInputElement;
                  state.handleNewsMinRelevanceChange(target.checked ? 50 : 0);
                }}"
              />
              Medium relevance+ (50+)
            </label>
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

        <!-- AI Categories -->
        <div class="sidebar-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            AI Categories
          </h3>
          <div class="category-chips">
            ${renderAICategoryChip('all', 'All', state)}
            ${renderAICategoryChip('llm', '🤖 LLM', state)}
            ${renderAICategoryChip('vision', '👁️ Vision', state)}
            ${renderAICategoryChip('robotics', '🦾 Robotics', state)}
            ${renderAICategoryChip('research', '🔬 Research', state)}
            ${renderAICategoryChip('security', '🔒 Security', state)}
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

        <!-- Actions -->
        <div class="sidebar-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="12 6 16 14 8 14 12 6"/>
            </svg>
            Actions
          </h3>
          <button class="btn-secondary" @click="${() => state.handleNewsRefresh()}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh News
          </button>
          <button class="btn-secondary" @click="${() => state.handleNewsClassify()}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            Classify Content
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="news-main">
        <div class="news-header">
          <h1>News & Intelligence</h1>
          <p class="subtitle">AI-powered news aggregation from various sources</p>
          ${state.newsItems?.length ? html`
            <div class="news-stats">
              <span class="stat">${state.newsItems.length} articles</span>
              <span class="stat">${filteredItems.length} filtered</span>
            </div>
          ` : null}
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
      ${state.showTwitterConfig ? renderTwitterConfigModal(state) : null}
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

function renderAICategoryChip(value: string, label: string, state: AppViewState) {
  const isActive = state.newsAICategory === value;
  return html`
    <button
      class="category-chip ${isActive ? 'active' : ''}"
      @click="${() => state.handleNewsAICategoryChange(value)}"
    >
      ${label}
    </button>
  `;
}

function renderNewsCard(item: NewsItem, state: AppViewState) {
  const sentiment = item.sentiment || 'neutral';
  const relevance = item.relevanceScore || 0;
  const category = item.categories?.[0] || item.category || 'general';
  
  return html`
    <article
      class="news-card ${sentiment}"
      @click="${() => state.handleNewsSelectItem(item)}"
    >
      <div class="card-content">
        <div class="card-header">
          <div class="card-meta">
            <span class="source-badge">${item.source}</span>
            <span class="time-badge">${formatDate(item.publishedAt)}</span>
            <span class="sentiment-icon">${getSentimentIcon(sentiment)}</span>
          </div>
          ${relevance > 0 ? html`
            <div class="relevance-badge" style="--score: ${relevance}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              ${relevance}
            </div>
          ` : null}
        </div>
        
        <h3 class="card-title">${item.title}</h3>
        
        ${item.summary ? html`
          <p class="card-summary">${item.summary}</p>
        ` : null}
        
        <div class="card-footer">
          <div class="card-tags">
            ${item.categories?.slice(0, 3).map(cat => html`
              <span class="category-tag ${cat}">${cat}</span>
            `)}
            ${item.engagement?.likes ? html`
              <span class="engagement-tag">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                ${formatNumber(item.engagement.likes)}
              </span>
            ` : null}
          </div>
          
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
  const relevance = item.relevanceScore || 0;
  
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
            ${relevance > 0 ? html`
              <span class="relevance-badge" style="--score: ${relevance}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Relevance: ${relevance}/100
              </span>
            ` : null}
          </div>
          
          <h2>${item.title}</h2>
          
          ${item.categories?.length ? html`
            <div class="detail-section">
              <h4>AI Categories</h4>
              <div class="tags">
                ${item.categories.map(cat => html`<span class="category-tag ${cat}">${cat}</span>`)}
              </div>
            </div>
          ` : null}
          
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

function renderTwitterConfigModal(state: AppViewState) {
  return html`
    <div class="modal-overlay" @click="${(e: Event) => {
      if (e.target === e.currentTarget) {
        state.showTwitterConfig = false;
      }
    }}">
      <div class="modal-content twitter-config">
        <h3>Configure Twitter/X API</h3>
        <p class="modal-description">
          Enter your Twitter/X API credentials to enable news fetching from Twitter.
          You can get these from <a href="https://developer.twitter.com" target="_blank">developer.twitter.com</a>
        </p>
        
        <div class="form-group">
          <label>API Key</label>
          <input
            type="password"
            .value="${state.twitterApiKey || ''}"
            @input="${(e: InputEvent) => state.twitterApiKey = (e.target as HTMLInputElement).value}"
            placeholder="Enter your API Key"
          />
        </div>
        
        <div class="form-group">
          <label>API Secret</label>
          <input
            type="password"
            .value="${state.twitterApiSecret || ''}"
            @input="${(e: InputEvent) => state.twitterApiSecret = (e.target as HTMLInputElement).value}"
            placeholder="Enter your API Secret"
          />
        </div>
        
        <div class="form-group">
          <label>Bearer Token</label>
          <input
            type="password"
            .value="${state.twitterBearerToken || ''}"
            @input="${(e: InputEvent) => state.twitterBearerToken = (e.target as HTMLInputElement).value}"
            placeholder="Enter your Bearer Token"
          />
        </div>
        
        <div class="modal-actions">
          <button class="btn-secondary" @click="${() => state.showTwitterConfig = false}">
            Cancel
          </button>
          <button class="btn-primary" @click="${() => state.handleTwitterConfigure()}">
            Save Configuration
          </button>
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

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
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
      item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      item.categories?.some(cat => cat.toLowerCase().includes(query))
    );
  }
  
  // Filter by AI category
  if (state.newsAICategory && state.newsAICategory !== 'all') {
    filtered = filtered.filter(item => 
      item.categories?.includes(state.newsAICategory!) ||
      item.category === state.newsAICategory
    );
  }
  
  // Filter by minimum relevance
  if (state.newsMinRelevance && state.newsMinRelevance > 0) {
    filtered = filtered.filter(item => (item.relevanceScore || 0) >= state.newsMinRelevance!);
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
