import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { icons } from "../ui/icons.js";

/**
 * Scroll-to-top button component for chat interface.
 * Shows when user scrolls down, allowing quick return to top.
 */
@customElement("scroll-to-top-button")
export class ScrollToTopButton extends LitElement {
  @property({ type: Boolean }) visible = false;
  @property({ type: String }) label = "Scroll to top";

  static styles = css`
    :host {
      position: fixed;
      top: 100px;
      right: 24px;
      z-index: 100;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-10px);
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

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      :host,
      .scroll-button {
        transition: none;
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
          ${icons.chevronUp}
        </button>
      </div>
    `;
  }

  private handleClick() {
    this.dispatchEvent(
      new CustomEvent("scroll-to-top", {
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "scroll-to-top-button": ScrollToTopButton;
  }
}
