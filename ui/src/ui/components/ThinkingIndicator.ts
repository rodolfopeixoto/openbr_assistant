import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { icons } from "../icons";

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high";

export interface ThinkingStep {
  id: string;
  text: string;
  timestamp: number;
  completed?: boolean;
}

export interface ThinkingEvent {
  level: ThinkingLevel;
  steps: ThinkingStep[];
  currentStepIndex: number;
  startedAt: number;
  completedAt?: number;
  summary?: string;
}

const LEVEL_CONFIG: Record<ThinkingLevel, { 
  color: string; 
  bgColor: string; 
  label: string;
  icon: keyof typeof icons;
}> = {
  off: { 
    color: "#9ca3af", 
    bgColor: "rgba(156, 163, 175, 0.15)", 
    label: "Off",
    icon: "brain"
  },
  minimal: { 
    color: "#9ca3af", 
    bgColor: "rgba(156, 163, 175, 0.15)", 
    label: "Min",
    icon: "info"
  },
  low: { 
    color: "#60a5fa", 
    bgColor: "rgba(96, 165, 250, 0.15)", 
    label: "Low",
    icon: "sparkles"
  },
  medium: { 
    color: "#c084fc", 
    bgColor: "rgba(192, 132, 252, 0.15)", 
    label: "Medium",
    icon: "zap"
  },
  high: { 
    color: "#f472b6", 
    bgColor: "rgba(244, 114, 182, 0.15)", 
    label: "High",
    icon: "cpu"
  },
};

@customElement("thinking-indicator")
export class ThinkingIndicator extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-body, system-ui, -apple-system, sans-serif);
    }

    .thinking-container {
      background: var(--bg-elevated, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      padding: 16px;
      margin: 8px 0;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .thinking-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .thinking-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    .thinking-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .thinking-badge svg {
      width: 12px;
      height: 12px;
    }

    .thinking-timer {
      font-size: 12px;
      color: var(--muted, #888);
      font-variant-numeric: tabular-nums;
    }

    .thinking-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .thinking-step {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: var(--bg, #0f0f1a);
      border-radius: 8px;
      border-left: 3px solid transparent;
      transition: all 0.3s ease;
      opacity: 0.6;
    }

    .thinking-step.active {
      opacity: 1;
      border-left-color: var(--step-color, #6366f1);
      background: var(--bg-hover, #252540);
    }

    .thinking-step.completed {
      opacity: 0.8;
      border-left-color: #22c55e;
    }

    .step-indicator {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .step-indicator.pending {
      background: var(--border, #2d2d44);
      color: var(--muted, #888);
    }

    .step-indicator.active {
      background: var(--step-color, #6366f1);
      color: white;
      animation: pulse 2s infinite;
    }

    .step-indicator.completed {
      background: #22c55e;
      color: white;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }

    .step-content {
      flex: 1;
      min-width: 0;
    }

    .step-text {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text, #fff);
    }

    .step-time {
      font-size: 11px;
      color: var(--muted, #888);
      margin-top: 2px;
    }

    .thinking-progress {
      height: 4px;
      background: var(--bg, #0f0f1a);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .thinking-progress-bar {
      height: 100%;
      background: var(--progress-color, #6366f1);
      border-radius: 2px;
      transition: width 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .thinking-progress-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .thinking-summary {
      padding: 12px;
      background: var(--bg, #0f0f1a);
      border-radius: 8px;
      border-left: 3px solid #22c55e;
      margin-top: 12px;
    }

    .thinking-summary-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #22c55e;
      margin-bottom: 6px;
    }

    .thinking-summary-text {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text, #fff);
    }

    .thinking-completed {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px;
      font-size: 12px;
      color: #22c55e;
      font-weight: 500;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Compact mode */
    .thinking-container.compact {
      padding: 12px;
    }

    .thinking-container.compact .thinking-steps {
      display: none;
    }

    .thinking-container.compact .thinking-progress {
      margin-bottom: 0;
    }
  `;

  @property({ type: String }) level: ThinkingLevel = "medium";
  @property({ type: Array }) steps: ThinkingStep[] = [];
  @property({ type: Number }) currentStepIndex = 0;
  @property({ type: Number }) startedAt = 0;
  @property({ type: Boolean }) isComplete = false;
  @property({ type: String }) summary = "";
  @property({ type: Boolean }) compact = false;

  @state() private elapsedMs = 0;
  private timerInterval?: number;

  connectedCallback() {
    super.connectedCallback();
    this.startTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopTimer();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("isComplete") && this.isComplete) {
      this.stopTimer();
    }
    if (changedProperties.has("startedAt")) {
      this.updateElapsed();
    }
  }

  private startTimer() {
    this.updateElapsed();
    this.timerInterval = window.setInterval(() => {
      if (!this.isComplete) {
        this.updateElapsed();
      }
    }, 100) as unknown as number;
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private updateElapsed() {
    this.elapsedMs = Date.now() - this.startedAt;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${tenths}`;
    }
    return `${remainingSeconds}.${tenths}s`;
  }

  private getStepStatus(index: number): "pending" | "active" | "completed" {
    if (index < this.currentStepIndex) return "completed";
    if (index === this.currentStepIndex) return "active";
    return "pending";
  }

  private get progressPercentage(): number {
    if (this.steps.length === 0) return 0;
    if (this.isComplete) return 100;
    return Math.min(100, (this.currentStepIndex / this.steps.length) * 100);
  }

  private get config() {
    return LEVEL_CONFIG[this.level];
  }

  render() {
    const config = this.config;
    const progressColor = config.color;

    return html`
      <div 
        class="thinking-container ${this.compact ? "compact" : ""}"
        style="--step-color: ${progressColor}; --progress-color: ${progressColor};"
      >
        <div class="thinking-header">
          <div class="thinking-title">
            <span 
              class="thinking-badge"
              style="background: ${config.bgColor}; color: ${config.color};"
            >
              ${icons[config.icon]}
              ${config.label}
            </span>
            <span>Thinking</span>
          </div>
          <div class="thinking-timer">
            ${this.isComplete 
              ? `Completed in ${this.formatDuration(this.elapsedMs)}`
              : this.formatDuration(this.elapsedMs)
            }
          </div>
        </div>

        <div class="thinking-progress">
          <div 
            class="thinking-progress-bar" 
            style="width: ${this.progressPercentage}%"
          ></div>
        </div>

        ${!this.compact ? html`
          <div class="thinking-steps">
            ${this.steps.map((step, index) => {
              const status = this.getStepStatus(index);
              return html`
                <div class="thinking-step ${status}">
                  <div class="step-indicator ${status}">
                    ${status === "completed" 
                      ? html`${icons.check}` 
                      : status === "active" 
                        ? html`<span class="spinner">${icons.loader}</span>`
                        : index + 1
                    }
                  </div>
                  <div class="step-content">
                    <div class="step-text">${step.text}</div>
                    ${status === "completed" ? html`
                      <div class="step-time">
                        ${this.formatDuration(step.timestamp - this.startedAt)}
                      </div>
                    ` : null}
                  </div>
                </div>
              `;
            })}
          </div>
        ` : null}

        ${this.isComplete ? html`
          ${this.summary ? html`
            <div class="thinking-summary">
              <div class="thinking-summary-header">
                ${icons.checkCircle}
                Summary
              </div>
              <div class="thinking-summary-text">${this.summary}</div>
            </div>
          ` : html`
            <div class="thinking-completed">
              ${icons.checkCircle}
              Thinking complete
            </div>
          `}
        ` : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "thinking-indicator": ThinkingIndicator;
  }
}

export function renderThinkingBadge(level: ThinkingLevel) {
  const config = LEVEL_CONFIG[level];
  return html`
    <span 
      class="thinking-badge"
      style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        background: ${config.bgColor};
        color: ${config.color};
      "
    >
      ${icons[config.icon]}
      ${config.label}
    </span>
  `;
}
