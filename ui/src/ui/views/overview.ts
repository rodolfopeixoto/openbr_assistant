import { html, nothing } from "lit";
import type { GatewayHelloOk } from "../gateway";
import type { UiSettings } from "../storage";
import { formatAgo, formatDurationMs } from "../format";
import { formatNextRun } from "../presenter";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  restarting?: boolean;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
  onRestart?: () => void;
};

// Icons as SVG strings
const icons = {
  activity: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  users: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  clock: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  checkCircle: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  xCircle: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  refresh: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  server: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
  link: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  key: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  shield: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  terminal: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  info: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  alert: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  network: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
};

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | { uptimeMs?: number; policy?: { tickIntervalMs?: number } }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationMs(snapshot.uptimeMs) : "n/a";
  const tick = snapshot?.policy?.tickIntervalMs ? `${snapshot.policy.tickIntervalMs}ms` : "n/a";

  const authHint = (() => {
    if (props.connected || !props.lastError) return null;
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) return null;
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="info-card info-card--warning mt-4">
          <div class="info-card__title">
            ${icons.alert}
            Authentication Required
          </div>
          <div>This gateway requires authentication. Add a token or password, then click Connect.</div>
          <div class="mt-2" style="font-family: var(--mono); font-size: var(--font-size-sm);">
            <div>openclaw dashboard --no-open → tokenized URL</div>
            <div>openclaw doctor --generate-gateway-token → generate token</div>
          </div>
          <div class="mt-2">
            <a class="btn btn--sm btn--ghost" href="https://docs.openclaw.ai/web/dashboard" target="_blank" rel="noreferrer">
              View docs →
            </a>
          </div>
        </div>
      `;
    }
    return html`
      <div class="info-card info-card--danger mt-4">
        <div class="info-card__title">
          ${icons.xCircle}
          Authentication Failed
        </div>
        <div>Auth failed. Re-copy a tokenized URL with openclaw dashboard --no-open, or update the token.</div>
      </div>
    `;
  })();

  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) return null;
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext !== false) return null;
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="info-card info-card--warning mt-4">
        <div class="info-card__title">
          ${icons.alert}
          Insecure Context
        </div>
        <div>This page is HTTP, so the browser blocks device identity. Use HTTPS (Tailscale Serve) or open http://127.0.0.1:18789 on the gateway host.</div>
        <div class="mt-2" style="font-family: var(--mono); font-size: var(--font-size-sm);">
          gateway.controlUi.allowInsecureAuth: true (token-only)
        </div>
      </div>
    `;
  })();

  return html`
    <div class="overview-container">
      <!-- Stats Row -->
      <section class="cards-grid cards-grid--4 mb-6">
        <div class="stat-card stat-card--${props.connected ? 'success' : 'warning'} card--animate-in">
          <div class="stat-card__icon">
            ${props.connected ? icons.checkCircle : icons.xCircle}
          </div>
          <div class="stat-card__content">
            <div class="stat-card__label">Status</div>
            <div class="stat-card__value stat-card__value--sm">
              ${props.connected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>

        <div class="stat-card card--animate-in" style="animation-delay: 50ms;">
          <div class="stat-card__icon">
            ${icons.activity}
          </div>
          <div class="stat-card__content">
            <div class="stat-card__label">Uptime</div>
            <div class="stat-card__value stat-card__value--sm">${uptime}</div>
          </div>
        </div>

        <div class="stat-card card--animate-in" style="animation-delay: 100ms;">
          <div class="stat-card__icon">
            ${icons.clock}
          </div>
          <div class="stat-card__content">
            <div class="stat-card__label">Tick Interval</div>
            <div class="stat-card__value stat-card__value--sm">${tick}</div>
          </div>
        </div>

        <div class="stat-card card--animate-in" style="animation-delay: 150ms;">
          <div class="stat-card__icon">
            ${icons.refresh}
          </div>
          <div class="stat-card__content">
            <div class="stat-card__label">Last Refresh</div>
            <div class="stat-card__value stat-card__value--sm">
              ${props.lastChannelsRefresh ? formatAgo(props.lastChannelsRefresh) : "n/a"}
            </div>
          </div>
        </div>
      </section>

      <!-- Main Content Grid -->
      <section class="cards-grid cards-grid--2 mb-6">
        <!-- Gateway Access Card -->
        <div class="card card--animate-in">
          <div class="card__header">
            <div class="card__header-left">
              <h3 class="card__title">
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  ${icons.server}
                  Gateway Access
                </span>
              </h3>
              <p class="card__subtitle">Configure dashboard connection and authentication</p>
            </div>
          </div>
          
          <div class="card__body">
            <div class="form-grid form-grid--2">
              <div class="field">
                <label class="field__label">WebSocket URL</label>
                <input
                  class="input"
                  .value=${props.settings.gatewayUrl}
                  @input=${(e: Event) => {
                    const v = (e.target as HTMLInputElement).value;
                    props.onSettingsChange({ ...props.settings, gatewayUrl: v });
                  }}
                  placeholder="ws://100.x.y.z:18789"
                />
                <span class="field__hint">Gateway WebSocket address</span>
              </div>

              <div class="field">
                <label class="field__label">Gateway Token</label>
                <input
                  class="input"
                  type="password"
                  .value=${props.settings.token}
                  @input=${(e: Event) => {
                    const v = (e.target as HTMLInputElement).value;
                    props.onSettingsChange({ ...props.settings, token: v });
                  }}
                  placeholder="OPENCLAW_GATEWAY_TOKEN"
                />
                <span class="field__hint">Gateway authentication token</span>
              </div>

              <div class="field">
                <label class="field__label">Password (not stored)</label>
                <input
                  class="input"
                  type="password"
                  .value=${props.password}
                  @input=${(e: Event) => {
                    const v = (e.target as HTMLInputElement).value;
                    props.onPasswordChange(v);
                  }}
                  placeholder="system password"
                />
                <span class="field__hint">Temporary shared password</span>
              </div>

              <div class="field">
                <label class="field__label">Default Session Key</label>
                <input
                  class="input"
                  .value=${props.settings.sessionKey}
                  @input=${(e: Event) => {
                    const v = (e.target as HTMLInputElement).value;
                    props.onSessionKeyChange(v);
                  }}
                  placeholder="session-key"
                />
                <span class="field__hint">Default session key</span>
              </div>
            </div>

            ${authHint}
            ${insecureContextHint}
          </div>

          <div class="card__footer">
            <div class="flex gap-2">
              <button class="btn btn--primary" @click=${() => props.onConnect()}>
                ${icons.link}
                Connect
              </button>
              <button class="btn" @click=${() => props.onRefresh()}>
                ${icons.refresh}
                Refresh
              </button>
              ${props.onRestart ? html`
                <button
                  class="btn btn--danger"
                  @click=${() => {
                    if (confirm("Are you sure you want to restart the gateway?\n\nThis will briefly interrupt all active sessions.")) {
                      props.onRestart?.();
                    }
                  }}
                  ?disabled=${props.restarting}
                >
                  ${props.restarting 
                    ? html`<span class="spinner-small"></span>Restarting...`
                    : html`${icons.refresh}Restart`
                  }
                </button>
              ` : nothing}
            </div>
            <span class="text-sm text-muted">Click Connect to apply changes</span>
          </div>
        </div>

        <!-- System Stats Card -->
        <div class="card card--animate-in" style="animation-delay: 100ms;">
          <div class="card__header">
            <div class="card__header-left">
              <h3 class="card__title">
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  ${icons.activity}
                  System Stats
                </span>
              </h3>
              <p class="card__subtitle">Gateway metrics and information</p>
            </div>
          </div>

          <div class="card__body">
            <div class="stats-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);">
              <div class="stat-item" style="text-align: center; padding: var(--space-3); background: var(--bg-elevated); border-radius: var(--radius-md);">
                <div style="font-size: var(--font-size-xs); color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1);">Instances</div>
                <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--text-strong);">${props.presenceCount}</div>
                <div style="font-size: var(--font-size-xs); color: var(--muted); margin-top: var(--space-1);">Presence beacons (5min)</div>
              </div>

              <div class="stat-item" style="text-align: center; padding: var(--space-3); background: var(--bg-elevated); border-radius: var(--radius-md);">
                <div style="font-size: var(--font-size-xs); color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1);">Sessions</div>
                <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--text-strong);">${props.sessionsCount ?? "n/a"}</div>
                <div style="font-size: var(--font-size-xs); color: var(--muted); margin-top: var(--space-1);">Recent session keys</div>
              </div>

              <div class="stat-item" style="text-align: center; padding: var(--space-3); background: var(--bg-elevated); border-radius: var(--radius-md);">
                <div style="font-size: var(--font-size-xs); color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1);">Cron</div>
                <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--text-strong);">
                  ${props.cronEnabled == null ? "n/a" : props.cronEnabled ? "Active" : "Inactive"}
                </div>
                <div style="font-size: var(--font-size-xs); color: var(--muted); margin-top: var(--space-1);">Next: ${formatNextRun(props.cronNext)}</div>
              </div>
            </div>

            ${props.lastError ? html`
              <div class="info-card info-card--danger mt-4">
                <div class="info-card__title">
                  ${icons.alert}
                  Error
                </div>
                <div>${props.lastError}</div>
              </div>
            ` : html`
              <div class="info-card info-card--success mt-4">
                <div class="info-card__title">
                  ${icons.checkCircle}
                  System Operational
                </div>
                <div>Use the Channels tab to connect WhatsApp, Telegram, Discord, Signal or iMessage.</div>
              </div>
            `}
          </div>
        </div>
      </section>

      <!-- Quick Tips Section -->
      <section class="card card--animate-in" style="animation-delay: 200ms;">
        <div class="card__header">
          <div class="card__header-left">
            <h3 class="card__title">
              <span style="display: inline-flex; align-items: center; gap: 8px;">
                ${icons.info}
                Quick Tips
              </span>
            </h3>
            <p class="card__subtitle">Useful reminders for remote configuration</p>
          </div>
        </div>

        <div class="card__body">
          <div class="note-grid">
            <div class="tip-card">
              <div class="tip-card__icon">
                ${icons.network}
              </div>
              <div class="tip-card__content">
                <div class="tip-card__title">Tailscale Serve</div>
                <div class="tip-card__description">Prefer serve mode to keep the gateway on loopback with tailnet authentication.</div>
              </div>
            </div>

            <div class="tip-card">
              <div class="tip-card__icon">
                ${icons.terminal}
              </div>
              <div class="tip-card__content">
                <div class="tip-card__title">Session Hygiene</div>
                <div class="tip-card__description">Use /new or sessions.patch to reset context when needed.</div>
              </div>
            </div>

            <div class="tip-card">
              <div class="tip-card__icon">
                ${icons.clock}
              </div>
              <div class="tip-card__content">
                <div class="tip-card__title">Cron</div>
                <div class="tip-card__description">Use isolated sessions for recurring and automated runs.</div>
              </div>
            </div>

            <div class="tip-card">
              <div class="tip-card__icon">
                ${icons.shield}
              </div>
              <div class="tip-card__content">
                <div class="tip-card__title">Security</div>
                <div class="tip-card__description">Always use HTTPS in production and keep tokens secure.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}
