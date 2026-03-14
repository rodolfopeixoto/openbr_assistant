import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../../../src/i18n/index.js";

export interface ArticleView {
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  sourceName: string;
  publishedAt: string;
  sentiment: "positive" | "neutral" | "negative";
  readTime: number;
  isRead: boolean;
  isSaved: boolean;
}

export interface TrendView {
  topic: string;
  count: number;
  sentiment: "positive" | "neutral" | "negative";
}

@customElement("newsletter-reader")
export class NewsletterReader extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
      background: var(--bg-primary, #0f0f1a);
      color: var(--text-primary, #e2e8f0);
      font-family: var(--font-family, system-ui, -apple-system, sans-serif);
    }

    .container {
      height: 100%;
      display: flex;
      flex-direction: column;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header */
    .header {
      padding: 16px;
      border-bottom: 1px solid var(--border, #2d2d44);
      background: var(--bg-elevated, #1a1a2e);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }

    .refresh-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: var(--bg-secondary, #0f0f1a);
      color: var(--text-primary, #e2e8f0);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s ease;
    }

    .refresh-btn:hover {
      background: var(--bg-hover, #252540);
    }

    .refresh-btn.spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Filter tabs */
    .filter-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .filter-tabs::-webkit-scrollbar {
      display: none;
    }

    .filter-tab {
      padding: 6px 14px;
      border: 1px solid var(--border, #2d2d44);
      background: transparent;
      color: var(--text-secondary, #94a3b8);
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .filter-tab:hover {
      border-color: var(--accent, #6366f1);
      color: var(--text-primary, #e2e8f0);
    }

    .filter-tab.active {
      background: var(--accent, #6366f1);
      border-color: var(--accent, #6366f1);
      color: white;
    }

    /* Stats bar */
    .stats-bar {
      display: flex;
      gap: 16px;
      padding: 12px 16px;
      background: var(--bg-secondary, #0f0f1a);
      border-bottom: 1px solid var(--border, #2d2d44);
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-value {
      color: var(--text-primary, #e2e8f0);
      font-weight: 600;
    }

    /* Content area */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    /* Articles list */
    .articles-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .empty-text {
      font-size: 14px;
      color: var(--text-secondary, #94a3b8);
      max-width: 300px;
    }

    /* Loading state */
    .loading-skeleton {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .skeleton-card {
      height: 140px;
      background: var(--bg-secondary, #0f0f1a);
      border-radius: 12px;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Pull to refresh indicator */
    .pull-indicator {
      text-align: center;
      padding: 16px;
      color: var(--text-secondary, #94a3b8);
      font-size: 14px;
      display: none;
    }

    .pull-indicator.visible {
      display: block;
    }

    /* Bottom sheet for article detail */
    .bottom-sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 100;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .bottom-sheet.open {
      opacity: 1;
      pointer-events: all;
    }

    .sheet-content {
      background: var(--bg-primary, #0f0f1a);
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      border-radius: 20px 20px 0 0;
      overflow: hidden;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    }

    .bottom-sheet.open .sheet-content {
      transform: translateY(0);
    }

    /* Tablet and up */
    @media (min-width: 768px) {
      .container {
        max-width: 720px;
      }

      .header {
        padding: 20px 24px;
      }

      .title {
        font-size: 24px;
      }

      .content {
        padding: 24px;
      }

      .articles-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }

      .bottom-sheet {
        align-items: center;
        padding: 20px;
      }

      .sheet-content {
        max-height: 80vh;
        border-radius: 16px;
      }
    }

    /* Desktop */
    @media (min-width: 1024px) {
      .container {
        max-width: 960px;
      }

      .articles-list {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `;

  @property({ type: Array }) articles: ArticleView[] = [];
  @property({ type: Array }) trends: TrendView[] = [];
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) lastUpdated = "";

  @state() private activeFilter = "all";
  @state() private selectedArticle: ArticleView | null = null;
  @state() private isRefreshing = false;

  render() {
    return html`
      <div class="container">
        ${this.renderHeader()}
        ${this.renderStatsBar()}
        
        <div class="content" @scroll="${this.handleScroll}">
          <div class="pull-indicator ${this.isRefreshing ? "visible" : ""}">
            ${t("newsletter.loadingArticles")}
          </div>
          
          ${this.loading
            ? this.renderSkeleton()
            : this.articles.length === 0
            ? this.renderEmptyState()
            : this.renderArticlesList()}
        </div>

        ${this.renderBottomSheet()}
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="header">
        <div class="header-top">
          <h1 class="title">${t("newsletter.title")}</h1>
          <button
            class="refresh-btn ${this.isRefreshing ? "spinning" : ""}"
            @click="${this.handleRefresh}"
            ?disabled="${this.isRefreshing}"
            title="${t("newsletter.refresh")}"
          >
            🔄
          </button>
        </div>

        <div class="filter-tabs">
          <button
            class="filter-tab ${this.activeFilter === "all" ? "active" : ""}"
            @click="${() => this.setFilter("all")}"
          >
            ${t("newsletter.allArticles")}
          </button>
          <button
            class="filter-tab ${this.activeFilter === "saved" ? "active" : ""}"
            @click="${() => this.setFilter("saved")}"
          >
            ${t("newsletter.saved")}
          </button>
          <button
            class="filter-tab ${this.activeFilter === "insights" ? "active" : ""}"
            @click="${() => this.setFilter("insights")}"
          >
            ${t("newsletter.insights")}
          </button>
        </div>
      </div>
    `;
  }

  private renderStatsBar() {
    const unreadCount = this.articles.filter((a) => !a.isRead).length;
    const savedCount = this.articles.filter((a) => a.isSaved).length;

    return html`
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">${this.articles.length}</span>
          <span>articles</span>
        </div>
        <div class="stat">
          <span class="stat-value">${unreadCount}</span>
          <span>unread</span>
        </div>
        <div class="stat">
          <span class="stat-value">${savedCount}</span>
          <span>saved</span>
        </div>
        ${this.lastUpdated
          ? html`
              <div class="stat" style="margin-left: auto;">
                <span>${t("newsletter.lastUpdated")}: ${this.lastUpdated}</span>
              </div>
            `
          : ""}
      </div>
    `;
  }

  private renderArticlesList() {
    const filteredArticles = this.filterArticles();

    return html`
      <div class="articles-list">
        ${filteredArticles.map(
          (article) => html`
            <article-card
              .article="${article}"
              @click="${() => this.selectArticle(article)}"
              @save="${(e: CustomEvent) => this.handleSaveArticle(e.detail.id)}"
              @share="${(e: CustomEvent) => this.handleShareArticle(e.detail.id)}"
            >
            </article-card>
          `
        )}
      </div>
    `;
  }

  private renderSkeleton() {
    return html`
      <div class="loading-skeleton">
        ${Array(6).fill(0).map(() => html` <div class="skeleton-card"></div> `)}
      </div>
    `;
  }

  private renderEmptyState() {
    return html`
      <div class="empty-state">
        <div class="empty-icon">📰</div>
        <div class="empty-title">${t("newsletter.noArticles")}</div>
        <div class="empty-text">
          ${t("newsletter.loadingArticles")}
        </div>
      </div>
    `;
  }

  private renderBottomSheet() {
    if (!this.selectedArticle) return null;

    return html`
      <div
        class="bottom-sheet ${this.selectedArticle ? "open" : ""}"
        @click="${this.closeBottomSheet}"
      >
        <div class="sheet-content" @click="${(e: Event) => e.stopPropagation()}">
          <article-detail
            .article="${this.selectedArticle}"
            @close="${this.closeBottomSheet}"
            @mark-read="${(e: CustomEvent) =>
              this.handleMarkAsRead(e.detail.id)}"
            @save="${(e: CustomEvent) => this.handleSaveArticle(e.detail.id)}"
          >
          </article-detail>
        </div>
      </div>
    `;
  }

  private filterArticles(): ArticleView[] {
    switch (this.activeFilter) {
      case "saved":
        return this.articles.filter((a) => a.isSaved);
      case "insights":
        return this.articles.filter(
          (a) => a.sentiment !== "neutral" || a.readTime > 5
        );
      default:
        return this.articles;
    }
  }

  private setFilter(filter: string) {
    this.activeFilter = filter;
    this.dispatchEvent(
      new CustomEvent("filter-change", {
        detail: { filter },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleRefresh() {
    this.isRefreshing = true;
    this.dispatchEvent(
      new CustomEvent("refresh", {
        bubbles: true,
        composed: true,
      })
    );

    // Reset spinning after animation
    setTimeout(() => {
      this.isRefreshing = false;
    }, 1000);
  }

  private selectArticle(article: ArticleView) {
    this.selectedArticle = article;
    this.dispatchEvent(
      new CustomEvent("article-select", {
        detail: { article },
        bubbles: true,
        composed: true,
      })
    );
  }

  private closeBottomSheet() {
    this.selectedArticle = null;
  }

  private handleSaveArticle(id: string) {
    this.dispatchEvent(
      new CustomEvent("save-article", {
        detail: { id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleShareArticle(id: string) {
    this.dispatchEvent(
      new CustomEvent("share-article", {
        detail: { id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleMarkAsRead(id: string) {
    this.dispatchEvent(
      new CustomEvent("mark-read", {
        detail: { id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    const scrollTop = target.scrollTop;

    // Detect pull to refresh
    if (scrollTop < -50 && !this.isRefreshing) {
      this.handleRefresh();
    }

    // Detect infinite scroll
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 100) {
      this.dispatchEvent(
        new CustomEvent("load-more", {
          bubbles: true,
          composed: true,
        })
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "newsletter-reader": NewsletterReader;
  }
}
