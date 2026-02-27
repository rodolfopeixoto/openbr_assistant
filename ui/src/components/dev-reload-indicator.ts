import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

declare const __BUILD_TIMESTAMP__: string;

/**
 * Development reload indicator
 * Shows a banner when the UI code has changed and needs reload
 */
@customElement("dev-reload-indicator")
export class DevReloadIndicator extends LitElement {
  @state()
  private hasUpdate = false;

  @state()
  private checking = false;

  private checkInterval?: number;
  private lastBuildTimestamp = __BUILD_TIMESTAMP__;

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      display: block;
    }

    .banner {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
      }
      to {
        transform: translateY(0);
      }
    }

    .message {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon {
      width: 18px;
      height: 18px;
    }

    button {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .close {
      background: transparent;
      border: none;
      padding: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .checking {
      opacity: 0.7;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.startChecking();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopChecking();
  }

  private startChecking() {
    // Check every 2 seconds for updates
    this.checkInterval = window.setInterval(() => {
      this.checkForUpdates();
    }, 2000);
  }

  private stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  private async checkForUpdates() {
    if (this.checking || this.hasUpdate) return;

    this.checking = true;
    try {
      // Fetch index.html to check build timestamp
      const response = await fetch("/index.html?_=" + Date.now(), {
        method: "HEAD",
        cache: "no-store",
      });

      // Check if we can detect a different version
      const buildTime = response.headers.get("x-build-time") || 
                       response.headers.get("last-modified");
      
      // Alternative: fetch a version endpoint
      try {
        const versionRes = await fetch("/api/version?_=" + Date.now(), {
          cache: "no-store",
        });
        if (versionRes.ok) {
          const data = await versionRes.json();
          if (data.buildTimestamp && data.buildTimestamp !== this.lastBuildTimestamp) {
            this.hasUpdate = true;
          }
        }
      } catch {
        // Version endpoint not available, use timestamp comparison
        // In development, always suggest reload after file changes
      }
    } catch (err) {
      // Ignore errors
    } finally {
      this.checking = false;
    }
  }

  private reload() {
    window.location.reload();
  }

  private dismiss() {
    this.hasUpdate = false;
  }

  render() {
    if (!this.hasUpdate) return null;

    return html`
      <div class="banner">
        <div class="message">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 21h5v-5"/>
          </svg>
          <span>UI Updated - Reload to see changes</span>
        </div>
        <button @click="${this.reload}" ?disabled="${this.checking}">
          ${this.checking ? "Checking..." : "Reload Now"}
        </button>
        <button class="close" @click="${this.dismiss}" title="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dev-reload-indicator": DevReloadIndicator;
  }
}
