import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";

interface SecurityStatus {
  score: number;
  grade?: string;
  lastScan?: string;
  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  vulnerabilities?: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
  }>;
}

export function renderSecurityView(state: AppViewState) {
  const status = state.securityStatus as SecurityStatus | null;

  return html`
    <div class="security-view">
      <div class="security-header">
        <h1>Security</h1>
        <p class="subtitle">Security dashboard and vulnerability scanning</p>
      </div>

      ${state.securityLoading ? html`
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading security data...</p>
        </div>
      ` : state.securityError ? html`
        <div class="error-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>${state.securityError}</p>
          <button @click=${() => state.handleSecurityLoad()} class="btn-primary">Retry</button>
        </div>
      ` : html`
        <div class="security-content">
          <div class="security-overview">
            <div class="security-score-card">
              <div class="score-header">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <div class="score-info">
                  <h2>Security Score</h2>
                  <div class="score-value ${status && status.score >= 80 ? 'good' : status && status.score >= 50 ? 'warning' : 'bad'}">
                    ${status ? status.score : 0}%
                  </div>
                  ${status && status.grade ? html`<span class="score-grade">Grade ${status.grade}</span>` : nothing}
                </div>
              </div>
              
              ${status && status.lastScan ? html`
                <p class="last-scan">Last scan: ${new Date(status.lastScan).toLocaleString()}</p>
              ` : html`
                <p class="last-scan">No scan performed yet</p>
              `}
              
              <button @click=${() => state.handleSecurityScan()} class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
                Run Security Scan
              </button>
            </div>

            <div class="security-stats">
              <div class="stat-card">
                <div class="stat-icon critical">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <span class="stat-value">${status?.summary ? status.summary.critical + status.summary.high : 0}</span>
                  <span class="stat-label">Critical/High</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon warning">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <span class="stat-value">${status?.summary ? status.summary.medium + status.summary.low : 0}</span>
                  <span class="stat-label">Medium/Low</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon info">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div class="stat-info">
                  <span class="stat-value">${status?.vulnerabilities?.length ?? 0}</span>
                  <span class="stat-label">Total Issues</span>
                </div>
              </div>
            </div>
          </div>

          <div class="security-recommendations">
            <h3>Security Recommendations</h3>
            <div class="recommendations-list">
              <div class="recommendation-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Enable two-factor authentication for admin accounts</span>
              </div>
              
              <div class="recommendation-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Regularly rotate API keys and tokens</span>
              </div>
              
              <div class="recommendation-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Review and update security policies quarterly</span>
              </div>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}
