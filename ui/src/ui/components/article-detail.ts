import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ArticleView } from "./newsletter-reader.js";

@customElement("article-detail")
export class ArticleDetail extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
      max-height: 90vh;
      overflow: hidden;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-primary, #0f0f1a);
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--border, #2d2d44);
      background: var(--bg-elevated, #1a1a2e);
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      color: var(--text-primary, #e2e8f0);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: all 0.2s ease;
    }

    .btn-icon:hover {
      background: var(--bg-secondary, #0f0f1a);
    }

    .btn-icon.saved {
      color: #f59e0b;
    }

    /* Scrollable content */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .image {
      width: 100%;
      max-height: 300px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .source-badge {
      padding: 4px 12px;
      background: var(--accent, #6366f1);
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .date {
      font-size: 14px;
      color: var(--text-secondary, #94a3b8);
    }

    .read-time {
      font-size: 14px;
      color: var(--text-secondary, #94a3b8);
    }

    .sentiment {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .sentiment.positive {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .sentiment.negative {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 20px 0;
      color: var(--text-primary, #e2e8f0);
    }

    .summary {
      font-size: 16px;
      line-height: 1.7;
      color: var(--text-secondary, #94a3b8);
      margin-bottom: 24px;
      padding: 16px;
      background: var(--bg-secondary, #0f0f1a);
      border-radius: 8px;
      border-left: 3px solid var(--accent, #6366f1);
    }

    .full-content {
      font-size: 16px;
      line-height: 1.8;
      color: var(--text-primary, #e2e8f0);
    }

    .full-content p {
      margin-bottom: 16px;
    }

    /* Actions bar */
    .actions-bar {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid var(--border, #2d2d44);
      background: var(--bg-elevated, #1a1a2e);
    }

    .btn {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: var(--accent, #6366f1);
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover, #4f46e5);
    }

    .btn-secondary {
      background: var(--bg-secondary, #0f0f1a);
      color: var(--text-primary, #e2e8f0);
      border: 1px solid var(--border, #2d2d44);
    }

    .btn-secondary:hover {
      background: var(--bg-hover, #252540);
    }

    /* Tablet and up */
    @media (min-width: 768px) {
      .content {
        padding: 32px;
      }

      .title {
        font-size: 32px;
      }

      .summary {
        font-size: 18px;
      }

      .full-content {
        font-size: 18px;
      }
    }
  `;

  @property({ type: Object }) article!: ArticleView;

  render() {
    return html`
      <div class="container">
        <div class="header">
          <button class="btn-icon" @click="${this.handleClose}" title="Close">
            ✕
          </button>

          <div class="header-actions">
            <button
              class="btn-icon ${this.article.isSaved ? "saved" : ""}"
              @click="${this.handleSave}"
              title="${this.article.isSaved ? "Unsave" : "Save"}"
            >
              ${this.article.isSaved ? "★" : "☆"}
            </button>

            <button class="btn-icon" @click="${this.handleShare}" title="Share">
              ↗️
            </button>
          </div>
        </div>

        <div class="content">
          ${this.article.imageUrl
            ? html`
                <img
                  class="image"
                  src="${this.article.imageUrl}"
                  alt="${this.article.title}"
                />
              `
            : ""}

          <div class="meta">
            <span class="source-badge">${this.article.sourceName}</span>
            <span class="date">${this.formatDate(this.article.publishedAt)}</span>
            <span class="read-time">${this.article.readTime} min read</span>
            ${this.article.sentiment !== "neutral"
              ? html`
                  <span class="sentiment ${this.article.sentiment}">
                    ${this.article.sentiment}
                  </span>
                `
              : ""}
          </div>

          <h1 class="title">${this.article.title}</h1>

          <div class="summary">${this.article.summary}</div>

          <div class="full-content">
            <p>
              This is where the full article content would be displayed. In the
              actual implementation, this would fetch and display the complete
              article content from the source.
            </p>

            <p>
              For now, this is a placeholder showing that the detail view is
              working correctly. The summary above gives you the key points from
              the article.
            </p>
          </div>
        </div>

        <div class="actions-bar">
          <button
            class="btn btn-secondary"
            @click="${this.handleMarkAsRead}"
            ?disabled="${this.article.isRead}"
          >
            ${this.article.isRead ? "✓ Read" : "Mark as Read"}
          </button>

          <button class="btn btn-primary" @click="${this.handleReadOriginal}">
            Read Original ↗️
          </button>
        </div>
      </div>
    `;
  }

  private handleClose() {
    this.dispatchEvent(
      new CustomEvent("close", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleSave() {
    this.dispatchEvent(
      new CustomEvent("save", {
        detail: { id: this.article.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleShare() {
    this.dispatchEvent(
      new CustomEvent("share", {
        detail: { id: this.article.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleMarkAsRead() {
    this.dispatchEvent(
      new CustomEvent("mark-read", {
        detail: { id: this.article.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleReadOriginal() {
    window.open(this.article.url, "_blank");
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "article-detail": ArticleDetail;
  }
}
