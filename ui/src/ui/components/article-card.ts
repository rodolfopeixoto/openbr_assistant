import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ArticleView } from "./newsletter-reader.js";

@customElement("article-card")
export class ArticleCard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .card {
      background: var(--bg-secondary, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .card:hover {
      border-color: var(--accent, #6366f1);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
    }

    .card.unread {
      border-left: 3px solid var(--accent, #6366f1);
    }

    .image-container {
      width: 100%;
      height: 160px;
      overflow: hidden;
      background: var(--bg-elevated, #252540);
    }

    .image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .content {
      padding: 16px;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
    }

    .source {
      font-weight: 500;
    }

    .dot {
      width: 4px;
      height: 4px;
      background: var(--text-secondary, #94a3b8);
      border-radius: 50%;
    }

    .sentiment {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .sentiment.positive {
      color: #22c55e;
    }

    .sentiment.negative {
      color: #ef4444;
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.4;
      margin: 0 0 8px 0;
      color: var(--text-primary, #e2e8f0);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .summary {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary, #94a3b8);
      margin: 0 0 12px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--border, #2d2d44);
    }

    .read-time {
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--text-secondary, #94a3b8);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      background: var(--bg-elevated, #252540);
      color: var(--text-primary, #e2e8f0);
    }

    .action-btn.saved {
      color: #f59e0b;
    }

    /* No image variant */
    .card.no-image .content {
      padding-top: 20px;
    }

    /* Tablet and up */
    @media (min-width: 768px) {
      .image-container {
        height: 180px;
      }

      .content {
        padding: 20px;
      }

      .title {
        font-size: 18px;
      }

      .summary {
        font-size: 14px;
      }
    }
  `;

  @property({ type: Object }) article!: ArticleView;

  render() {
    return html`
      <div
        class="card ${!this.article.isRead ? "unread" : ""} ${!this.article.imageUrl
          ? "no-image"
          : ""}"
        @click="${this.handleClick}"
      >
        ${this.article.imageUrl
          ? html`
              <div class="image-container">
                <img
                  class="image"
                  src="${this.article.imageUrl}"
                  alt="${this.article.title}"
                  loading="lazy"
                />
              </div>
            `
          : ""}

        <div class="content">
          <div class="meta">
            <span class="source">${this.article.sourceName}</span>
            <span class="dot"></span>
            <span>${this.formatDate(this.article.publishedAt)}</span>
            ${this.article.sentiment !== "neutral"
              ? html`
                  <span class="dot"></span>
                  <span class="sentiment ${this.article.sentiment}">
                    ${this.getSentimentEmoji(this.article.sentiment)}
                  </span>
                `
              : ""}
          </div>

          <h3 class="title">${this.article.title}</h3>

          <p class="summary">${this.article.summary}</p>

          <div class="footer">
            <span class="read-time">${this.article.readTime} min read</span>

            <div class="actions">
              <button
                class="action-btn ${this.article.isSaved ? "saved" : ""}"
                @click="${this.handleSave}"
                title="${this.article.isSaved ? "Unsave" : "Save"}"
              >
                ${this.article.isSaved ? "★" : "☆"}
              </button>

              <button
                class="action-btn"
                @click="${this.handleShare}"
                title="Share"
              >
                ↗️
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private handleClick(e: Event) {
    // Don't trigger if clicking on action buttons
    if ((e.target as HTMLElement).closest(".action-btn")) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("click", {
        detail: { article: this.article },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleSave(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("save", {
        detail: { id: this.article.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleShare(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("share", {
        detail: { id: this.article.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }

  private getSentimentEmoji(sentiment: string): string {
    switch (sentiment) {
      case "positive":
        return "📈";
      case "negative":
        return "📉";
      default:
        return "➡️";
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "article-card": ArticleCard;
  }
}
