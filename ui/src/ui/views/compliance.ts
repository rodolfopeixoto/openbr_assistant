import { html, nothing } from "lit";
import type { ComplianceStatus, ComplianceReport, ComplianceViolation, ComplianceFramework } from "../types";

export type ComplianceProps = {
  loading: boolean;
  error: string | null;
  status: ComplianceStatus | null;
  reports: ComplianceReport[];
  selectedFramework: ComplianceFramework | "all";
  activeTab: "overview" | "reports" | "violations" | "settings";
  onTabChange: (tab: "overview" | "reports" | "violations" | "settings") => void;
  onFrameworkChange: (framework: ComplianceFramework | "all") => void;
  onRefresh: () => Promise<void>;
  onGenerateReport: (framework: ComplianceFramework) => Promise<void>;
  onExportData: () => Promise<void>;
  onViolationAcknowledge: (id: string) => Promise<void>;
  onViolationResolve: (id: string) => Promise<void>;
};

// Framework configurations
const FRAMEWORKS: Record<ComplianceFramework, { label: string; color: string; icon: string }> = {
  gdpr: { label: "GDPR", color: "#6366f1", icon: "shield" },
  lgpd: { label: "LGPD", color: "#22c55e", icon: "shield" },
  soc2: { label: "SOC 2", color: "#f59e0b", icon: "lock" },
  hipaa: { label: "HIPAA", color: "#ef4444", icon: "heart" },
};

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  compliant: { bg: "rgba(34, 197, 94, 0.1)", text: "#22c55e", border: "rgba(34, 197, 94, 0.3)" },
  "at-risk": { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  "non-compliant": { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
  pending: { bg: "rgba(99, 102, 241, 0.1)", text: "#6366f1", border: "rgba(99, 102, 241, 0.3)" },
};

// Severity colors
const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#fbbf24",
  low: "#22c55e",
};

export function renderCompliance(props: ComplianceProps) {
  return html`
    <div class="compliance-layout">
      <!-- Header with tabs and actions -->
      <div class="compliance-header">
        <div class="compliance-header__left">
          <div class="compliance-tabs">
            ${renderTab("overview", "Overview", props.activeTab, props.onTabChange)}
            ${renderTab("reports", "Reports", props.activeTab, props.onTabChange)}
            ${renderTab("violations", "Violations", props.activeTab, props.onTabChange)}
            ${renderTab("settings", "Settings", props.activeTab, props.onTabChange)}
          </div>
        </div>
        <div class="compliance-header__right">
          <select 
            class="compliance-framework-select"
            .value=${props.selectedFramework}
            @change=${(e: Event) => props.onFrameworkChange((e.target as HTMLSelectElement).value as ComplianceFramework | "all")}
          >
            <option value="all">All Frameworks</option>
            ${Object.entries(FRAMEWORKS).map(([key, config]) => html`
              <option value=${key}>${config.label}</option>
            `)}
          </select>
          <button class="btn btn--secondary" @click=${props.onRefresh} ?disabled=${props.loading}>
            ${props.loading ? html`<span class="spinner"></span>` : "Refresh"}
          </button>
          <button class="btn btn--primary" @click=${() => props.onExportData()}>
            Export Data
          </button>
        </div>
      </div>

      <!-- Main content -->
      <div class="compliance-content">
        ${props.loading && !props.status
          ? renderLoading()
          : props.error
            ? renderError(props.error)
            : renderActiveTab(props)}
      </div>
    </div>
  `;
}

function renderTab(
  id: "overview" | "reports" | "violations" | "settings",
  label: string,
  active: string,
  onChange: (tab: "overview" | "reports" | "violations" | "settings") => void
) {
  const isActive = active === id;
  return html`
    <button 
      class="compliance-tab ${isActive ? "active" : ""}"
      @click=${() => onChange(id)}
    >
      ${label}
    </button>
  `;
}

function renderLoading() {
  return html`
    <div class="compliance-loading">
      <div class="spinner"></div>
      <p>Loading compliance data...</p>
    </div>
  `;
}

function renderError(error: string) {
  return html`
    <div class="compliance-error">
      <div class="compliance-error__icon">⚠️</div>
      <h3>Error Loading Compliance Data</h3>
      <p>${error}</p>
    </div>
  `;
}

function renderActiveTab(props: ComplianceProps) {
  switch (props.activeTab) {
    case "overview":
      return renderOverview(props);
    case "reports":
      return renderReports(props);
    case "violations":
      return renderViolations(props);
    case "settings":
      return renderSettings(props);
    default:
      return renderOverview(props);
  }
}

// ==================== OVERVIEW TAB ====================

function renderOverview(props: ComplianceProps) {
  const status = props.status;
  if (!status) {
    return html`
      <div class="compliance-empty">
        <div class="compliance-empty__icon">📊</div>
        <p>No compliance data available. Run a scan to get started.</p>
        <button class="btn btn--primary" @click=${() => props.onGenerateReport("gdpr")}>
          Run First Scan
        </button>
      </div>
    `;
  }

  return html`
    <div class="compliance-overview">
      <!-- Summary cards -->
      <div class="compliance-cards">
        ${renderSummaryCard("Overall Status", status.overallStatus, getFrameworkIcon(status.overallStatus))}
        ${renderSummaryCard("Active Violations", status.violationsCount.toString(), "⚠️")}
        ${renderSummaryCard("Last Scan", formatDate(status.lastScanAt), "🕐")}
        ${renderSummaryCard("Next Audit", formatDate(status.nextAuditAt), "📅")}
      </div>

      <!-- Framework status grid -->
      <div class="compliance-section">
        <h2 class="compliance-section__title">Framework Compliance</h2>
        <div class="compliance-framework-grid">
          ${Object.entries(status.frameworks).map(([framework, data]) => 
            renderFrameworkCard(framework as ComplianceFramework, data)
          )}
        </div>
      </div>

      <!-- Recent violations -->
      ${status.recentViolations.length > 0 ? html`
        <div class="compliance-section">
          <div class="compliance-section__header">
            <h2 class="compliance-section__title">Recent Violations</h2>
            <button class="btn btn--text" @click=${() => props.onTabChange("violations")}>
              View All →
            </button>
          </div>
          <div class="compliance-violations-list">
            ${status.recentViolations.slice(0, 5).map(v => renderViolationRow(v, props))}
          </div>
        </div>
      ` : nothing}

      <!-- Quick actions -->
      <div class="compliance-section">
        <h2 class="compliance-section__title">Quick Actions</h2>
        <div class="compliance-actions">
          <button class="compliance-action-card" @click=${() => props.onGenerateReport("gdpr")}>
            <div class="compliance-action-card__icon" style="background: ${FRAMEWORKS.gdpr.color}">
              📝
            </div>
            <div class="compliance-action-card__content">
              <h3>GDPR Report</h3>
              <p>Generate GDPR compliance report</p>
            </div>
          </button>
          <button class="compliance-action-card" @click=${() => props.onGenerateReport("soc2")}>
            <div class="compliance-action-card__icon" style="background: ${FRAMEWORKS.soc2.color}">
              🔒
            </div>
            <div class="compliance-action-card__content">
              <h3>SOC 2 Report</h3>
              <p>Generate SOC 2 Type II report</p>
            </div>
          </button>
          <button class="compliance-action-card" @click=${() => props.onGenerateReport("hipaa")}>
            <div class="compliance-action-card__icon" style="background: ${FRAMEWORKS.hipaa.color}">
              🏥
            </div>
            <div class="compliance-action-card__content">
              <h3>HIPAA Audit</h3>
              <p>Run HIPAA compliance audit</p>
            </div>
          </button>
          <button class="compliance-action-card" @click=${() => props.onExportData()}>
            <div class="compliance-action-card__icon" style="background: #6366f1">
              📥
            </div>
            <div class="compliance-action-card__content">
              <h3>Export Data</h3>
              <p>Export compliance data (JSON/CSV)</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSummaryCard(label: string, value: string, icon: string) {
  const statusColor = STATUS_COLORS[value] || STATUS_COLORS.pending;
  return html`
    <div class="compliance-summary-card">
      <div class="compliance-summary-card__icon">${icon}</div>
      <div class="compliance-summary-card__content">
        <div class="compliance-summary-card__label">${label}</div>
        <div 
          class="compliance-summary-card__value"
          style="color: ${statusColor.text}"
        >
          ${value}
        </div>
      </div>
    </div>
  `;
}

function renderFrameworkCard(framework: ComplianceFramework, data: { status: string; score: number; lastAudit: string }) {
  const config = FRAMEWORKS[framework];
  const statusColor = STATUS_COLORS[data.status] || STATUS_COLORS.pending;
  
  return html`
    <div class="compliance-framework-card">
      <div class="compliance-framework-card__header">
        <div 
          class="compliance-framework-card__icon"
          style="background: ${config.color}"
        >
          ${config.icon}
        </div>
        <div class="compliance-framework-card__title">${config.label}</div>
      </div>
      <div class="compliance-framework-card__body">
        <div class="compliance-framework-card__score">
          <div class="compliance-score-ring" style="--score: ${data.score}; --color: ${config.color}">
            <span>${data.score}%</span>
          </div>
        </div>
        <div class="compliance-framework-card__status">
          <span 
            class="compliance-status-badge"
            style="
              background: ${statusColor.bg};
              color: ${statusColor.text};
              border-color: ${statusColor.border};
            "
          >
            ${data.status}
          </span>
        </div>
        <div class="compliance-framework-card__meta">
          Last audit: ${formatDate(data.lastAudit)}
        </div>
      </div>
    </div>
  `;
}

// ==================== REPORTS TAB ====================

function renderReports(props: ComplianceProps) {
  const filteredReports = props.selectedFramework === "all" 
    ? props.reports 
    : props.reports.filter(r => r.framework === props.selectedFramework);

  return html`
    <div class="compliance-reports">
      <div class="compliance-section__header">
        <h2 class="compliance-section__title">Compliance Reports</h2>
        <div class="compliance-reports__actions">
          <button class="btn btn--secondary" @click=${() => props.onGenerateReport("gdpr")}>
            + GDPR Report
          </button>
          <button class="btn btn--secondary" @click=${() => props.onGenerateReport("soc2")}>
            + SOC 2 Report
          </button>
          <button class="btn btn--secondary" @click=${() => props.onGenerateReport("hipaa")}>
            + HIPAA Report
          </button>
        </div>
      </div>

      ${filteredReports.length === 0 ? html`
        <div class="compliance-empty">
          <div class="compliance-empty__icon">📄</div>
          <p>No reports generated yet.</p>
          <button class="btn btn--primary" @click=${() => props.onGenerateReport("gdpr")}>
            Generate First Report
          </button>
        </div>
      ` : html`
        <div class="compliance-reports-table-container">
          <table class="compliance-reports-table">
            <thead>
              <tr>
                <th>Framework</th>
                <th>Generated</th>
                <th>Status</th>
                <th>Score</th>
                <th>Violations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReports.map(report => html`
                <tr>
                  <td>
                    <div class="compliance-report-framework">
                      <span 
                        class="compliance-framework-dot"
                        style="background: ${FRAMEWORKS[report.framework].color}"
                      ></span>
                      ${FRAMEWORKS[report.framework].label}
                    </div>
                  </td>
                  <td>${formatDate(report.generatedAt)}</td>
                  <td>
                    <span 
                      class="compliance-status-badge"
                      style="
                        background: ${STATUS_COLORS[report.status].bg};
                        color: ${STATUS_COLORS[report.status].text};
                        border-color: ${STATUS_COLORS[report.status].border};
                      "
                    >
                      ${report.status}
                    </span>
                  </td>
                  <td>
                    <div class="compliance-score-bar">
                      <div 
                        class="compliance-score-bar__fill"
                        style="width: ${report.score}%; background: ${getScoreColor(report.score)}"
                      ></div>
                      <span>${report.score}%</span>
                    </div>
                  </td>
                  <td>${report.violationsCount}</td>
                  <td>
                    <button class="btn btn--text" @click=${() => downloadReport(report.id)}>
                      Download
                    </button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ==================== VIOLATIONS TAB ====================

function renderViolations(props: ComplianceProps) {
  const violations = props.status?.recentViolations || [];
  const filteredViolations = props.selectedFramework === "all"
    ? violations
    : violations.filter(v => v.framework === props.selectedFramework);

  // Group by severity
  const grouped = filteredViolations.reduce((acc, v) => {
    acc[v.severity] = acc[v.severity] || [];
    acc[v.severity].push(v);
    return acc;
  }, {} as Record<string, ComplianceViolation[]>);

  const severities = ["critical", "high", "medium", "low"];

  return html`
    <div class="compliance-violations">
      <div class="compliance-section__header">
        <h2 class="compliance-section__title">Compliance Violations</h2>
        <div class="compliance-violations__stats">
          ${severities.map(sev => {
            const count = grouped[sev]?.length || 0;
            if (count === 0) return nothing;
            return html`
              <span 
                class="compliance-violation-stat"
                style="color: ${SEVERITY_COLORS[sev]}"
              >
                ${count} ${sev}
              </span>
            `;
          })}
        </div>
      </div>

      ${filteredViolations.length === 0 ? html`
        <div class="compliance-empty">
          <div class="compliance-empty__icon">✅</div>
          <p>No violations found! Your system is compliant.</p>
        </div>
      ` : html`
        <div class="compliance-violations-list">
          ${filteredViolations.map(v => renderViolationRow(v, props))}
        </div>
      `}
    </div>
  `;
}

function renderViolationRow(violation: ComplianceViolation, props: ComplianceProps) {
  const severityColor = SEVERITY_COLORS[violation.severity];
  const frameworkConfig = FRAMEWORKS[violation.framework];

  return html`
    <div class="compliance-violation-row">
      <div class="compliance-violation-row__severity">
        <span 
          class="compliance-severity-badge"
          style="background: ${severityColor}20; color: ${severityColor}; border-color: ${severityColor}40"
        >
          ${violation.severity}
        </span>
      </div>
      <div class="compliance-violation-row__content">
        <div class="compliance-violation-row__title">${violation.title}</div>
        <div class="compliance-violation-row__description">${violation.description}</div>
        <div class="compliance-violation-row__meta">
          <span 
            class="compliance-framework-tag"
            style="background: ${frameworkConfig.color}20; color: ${frameworkConfig.color}"
          >
            ${frameworkConfig.label}
          </span>
          <span>Detected: ${formatDate(violation.detectedAt)}</span>
          ${violation.resource ? html`<span>Resource: ${violation.resource}</span>` : nothing}
        </div>
      </div>
      <div class="compliance-violation-row__actions">
        ${violation.status === "open" ? html`
          <button 
            class="btn btn--text"
            @click=${() => props.onViolationAcknowledge(violation.id)}
          >
            Acknowledge
          </button>
          <button 
            class="btn btn--primary btn--sm"
            @click=${() => props.onViolationResolve(violation.id)}
          >
            Resolve
          </button>
        ` : html`
          <span class="compliance-violation-row__status">${violation.status}</span>
        `}
      </div>
    </div>
  `;
}

// ==================== SETTINGS TAB ====================

function renderSettings(props: ComplianceProps) {
  return html`
    <div class="compliance-settings">
      <div class="compliance-section">
        <h2 class="compliance-section__title">Compliance Settings</h2>
        
        <div class="compliance-settings__section">
          <h3>Automated Scanning</h3>
          <div class="compliance-setting-row">
            <div class="compliance-setting-row__info">
              <label>Enable Automated Scans</label>
              <p>Automatically run compliance checks daily</p>
            </div>
            <label class="cfg-toggle">
              <input type="checkbox" checked />
              <span class="cfg-toggle__track"></span>
            </label>
          </div>
          <div class="compliance-setting-row">
            <div class="compliance-setting-row__info">
              <label>Scan Schedule</label>
              <p>Time to run daily compliance scans</p>
            </div>
            <input type="time" class="cfg-input" value="02:00" />
          </div>
        </div>

        <div class="compliance-settings__section">
          <h3>Notifications</h3>
          <div class="compliance-setting-row">
            <div class="compliance-setting-row__info">
              <label>Email Alerts</label>
              <p>Send email notifications for new violations</p>
            </div>
            <label class="cfg-toggle">
              <input type="checkbox" checked />
              <span class="cfg-toggle__track"></span>
            </label>
          </div>
          <div class="compliance-setting-row">
            <div class="compliance-setting-row__info">
              <label>Slack Integration</label>
              <p>Post compliance alerts to Slack channel</p>
            </div>
            <label class="cfg-toggle">
              <input type="checkbox" />
              <span class="cfg-toggle__track"></span>
            </label>
          </div>
        </div>

        <div class="compliance-settings__section">
          <h3>Data Retention</h3>
          <div class="compliance-setting-row">
            <div class="compliance-setting-row__info">
              <label>Report Retention</label>
              <p>How long to keep generated reports</p>
            </div>
            <select class="cfg-select">
              <option value="30">30 days</option>
              <option value="90" selected>90 days</option>
              <option value="365">1 year</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          <div class="compliance-setting-row">
            <div class="compliance-setting-row__info">
              <label>Violation History</label>
              <p>How long to keep resolved violations</p>
            </div>
            <select class="cfg-select">
              <option value="90">90 days</option>
              <option value="365" selected>1 year</option>
              <option value="1825">5 years</option>
              <option value="forever">Forever</option>
            </select>
          </div>
        </div>

        <div class="compliance-settings__section">
          <h3>Framework Configuration</h3>
          ${Object.entries(FRAMEWORKS).map(([key, config]) => html`
            <div class="compliance-toggle-row">
              <div class="compliance-toggle-row__info">
                <div 
                  class="compliance-toggle-row__icon"
                  style="background: ${config.color}"
                >
                  ${config.icon}
                </div>
                <div>
                  <label>${config.label}</label>
                  <p>Enable ${config.label} compliance monitoring</p>
                </div>
              </div>
              <label class="cfg-toggle">
                <input type="checkbox" checked />
                <span class="cfg-toggle__track"></span>
              </label>
            </div>
          `)}
        </div>
      </div>
    </div>
  `;
}

// ==================== HELPERS ====================

function getFrameworkIcon(status: string): string {
  switch (status) {
    case "compliant": return "✅";
    case "at-risk": return "⚠️";
    case "non-compliant": return "❌";
    default: return "⏳";
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

async function downloadReport(reportId: string) {
  // Placeholder for report download
  console.log("Downloading report:", reportId);
}
