import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("field-tooltip")
export class FieldTooltip extends LitElement {
  @property({ type: String }) content = "";
  @property({ type: Boolean }) show = false;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      position: relative;
    }

    .tooltip-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-left: 6px;
      border-radius: 50%;
      background: var(--bg-muted);
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      cursor: help;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .tooltip-trigger:hover {
      background: var(--accent);
      color: white;
    }

    .tooltip-content {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 12px;
      background: var(--popover);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      font-size: 12px;
      line-height: 1.4;
      color: var(--text);
      white-space: normal;
      max-width: 280px;
      min-width: 200px;
      z-index: 1000;
      box-shadow: var(--shadow-lg);
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s ease, visibility 0.15s ease;
      margin-bottom: 8px;
    }

    .tooltip-content::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: var(--border);
    }

    .tooltip-trigger:hover + .tooltip-content,
    .tooltip-content:hover {
      opacity: 1;
      visibility: visible;
    }

    .tooltip-content.show {
      opacity: 1;
      visibility: visible;
    }

    .tooltip-title {
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--text-strong);
    }

    .tooltip-desc {
      color: var(--muted-strong);
    }
  `;

  render() {
    return html`
      <span class="tooltip-trigger">?</span>
      <div class="tooltip-content">
        <div class="tooltip-desc">${this.content}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "field-tooltip": FieldTooltip;
  }
}
