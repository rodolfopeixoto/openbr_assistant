import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { icons } from "../ui/icons.js";

/**
 * Scroll-to-bottom button component for chat interface.
 * Shows when user scrolls up, with badge for new messages.
 */
@customElement("scroll-to-bottom-button")
export class ScrollToBottomButton extends LitElement {
  @property({ type: Boolean }) visible = false;
  @property({ type: Number }) newMessageCount = 0;
  @property({ type: String }) label = "Scroll to bottom";

  static styles = css`
    :host {
      position: fixed;
      bottom: 100px;
      right: 24px;
      z-index: 100;
      pointer-events: none;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    :host([visible]) {
      pointer-events: auto;
      opacity: 1;
      transform: translateY(0);
    }

    .button-container {
      position: relative;
    }

    .scroll-button {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: var(--accent, #6366f1);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.15s ease;
    }

    .scroll-button:hover {
      background: var(--accent-hover, #4f46e5);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
    }

    .scroll-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .scroll-button svg {
      width: 24px;
      height: 24px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      animation: badge-appear 0.2s ease;
    }

    @keyframes badge-appear {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      :host,
      .scroll-button,
      .badge {
        transition: none;
        animation: none;
      }
    }
  `;

  render() {
    return html`
      <div class="button-container">
        <button
          class="scroll-button"
          aria-label=${this.label}
          title=${this.label}
          @click=${this.handleClick}
        >
          ${icons.chevronDown}
        </button>
        ${this.newMessageCount > 0
          ? html`<span class="badge">${this.newMessageCount}</span>`
          : ""}
      </div>
    `;
  }

  private handleClick() {
    this.dispatchEvent(
      new CustomEvent("scroll-to-bottom", {
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "scroll-to-bottom-button": ScrollToBottomButton;
  }
}
