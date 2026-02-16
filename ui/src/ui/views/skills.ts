import { html, nothing, type TemplateResult } from "lit";
import type { SkillMessageMap } from "../controllers/skills";
import type { RichSkillDescription, SkillSecurityScan, SkillStatusEntry, SkillStatusReport } from "../types";
import { clampText } from "../format";
import { icons } from "../icons";

export type SkillsProps = {
  loading: boolean;
  report: SkillStatusReport | null;
  error: string | null;
  filter: string;
  edits: Record<string, string>;
  busyKey: string | null;
  messages: SkillMessageMap;
  activeFilter: "all" | "active" | "needs-setup" | "disabled";
  selectedSkill: string | null;
  selectedSkillTab: SkillDetailTab;
  analyzingSkill: string | null;
  skillAnalysis: Record<string, { securityScan?: SkillSecurityScan; richDescription?: RichSkillDescription }>;
  onFilterChange: (next: string) => void;
  onActiveFilterChange: (filter: "all" | "active" | "needs-setup" | "disabled") => void;
  onRefresh: () => void;
  onToggle: (skillKey: string, enabled: boolean) => void;
  onEdit: (skillKey: string, value: string) => void;
  onSaveKey: (skillKey: string) => void;
  onInstall: (skillKey: string, name: string, installId: string) => void;
  onSelectSkill: (skillKey: string | null) => void;
  onSelectSkillTab: (tab: SkillDetailTab) => void;
  onAnalyzeSkill: (skillKey: string, filePath: string) => Promise<void>;
};

export type SkillDetailTab = "overview" | "security" | "permissions" | "source";

// Skill categories with icons
const SKILL_CATEGORIES: Record<string, { icon: TemplateResult; label: string }> = {
  communication: { icon: icons.messageSquare, label: "Communication" },
  search: { icon: icons.search, label: "Search & Browse" },
  development: { icon: icons.fileCode, label: "Development" },
  automation: { icon: icons.zap, label: "Automation" },
  media: { icon: icons.image, label: "Media & Files" },
  system: { icon: icons.monitor, label: "System" },
  other: { icon: icons.star, label: "Other" },
};

// Permission types and their descriptions
const PERMISSION_TYPES: Record<string, { icon: TemplateResult; label: string; description: string }> = {
  filesystem: { 
    icon: icons.folder, 
    label: "File System", 
    description: "Can read and write files on your system" 
  },
  network: { 
    icon: icons.network, 
    label: "Network Access", 
    description: "Can make HTTP requests and access the internet" 
  },
  env: { 
    icon: icons.terminal, 
    label: "Environment Variables", 
    description: "Can access environment variables and secrets" 
  },
  execution: { 
    icon: icons.cpu, 
    label: "Command Execution", 
    description: "Can execute shell commands and processes" 
  },
  database: { 
    icon: icons.database, 
    label: "Database Access", 
    description: "Can read from and write to databases" 
  },
};

// Get category for a skill based on name/description
function getSkillCategory(skill: SkillStatusEntry): string {
  const text = `${skill.name} ${skill.description}`.toLowerCase();
  if (text.includes("telegram") || text.includes("discord") || text.includes("slack") || text.includes("whatsapp")) return "communication";
  if (text.includes("search") || text.includes("browse") || text.includes("web")) return "search";
  if (text.includes("code") || text.includes("git") || text.includes("file") || text.includes("edit")) return "development";
  if (text.includes("cron") || text.includes("schedule") || text.includes("auto")) return "automation";
  if (text.includes("image") || text.includes("media") || text.includes("audio") || text.includes("video")) return "media";
  if (text.includes("system") || text.includes("config") || text.includes("admin")) return "system";
  return "other";
}

// Get status info for a skill
function getSkillStatus(skill: SkillStatusEntry): { 
  status: "active" | "needs-setup" | "disabled" | "blocked"; 
  label: string; 
  color: string;
  icon: TemplateResult;
} {
  if (skill.disabled) {
    return { 
      status: "disabled", 
      label: "Disabled", 
      color: "var(--muted)",
      icon: icons.circle
    };
  }
  if (skill.blockedByAllowlist) {
    return { 
      status: "blocked", 
      label: "Blocked", 
      color: "var(--danger)",
      icon: icons.shield
    };
  }
  if (!skill.eligible || skill.missing.bins.length > 0 || skill.missing.env.length > 0) {
    return { 
      status: "needs-setup", 
      label: "Needs Setup", 
      color: "var(--warn)",
      icon: icons.alertCircle
    };
  }
  return { 
    status: "active", 
    label: "Active", 
    color: "var(--ok)",
    icon: icons.checkCircle
  };
}

// Get security score for a skill
function getSecurityScore(skill: SkillStatusEntry): {
  score: number;
  level: "high" | "medium" | "low";
  label: string;
  icon: TemplateResult;
  color: string;
} {
  let score = 100;
  let concerns: string[] = [];
  
  // Check if it's from a verified source
  if (!skill.source?.includes("openclaw") && !skill.source?.includes("@openclaw")) {
    score -= 15;
    concerns.push("Third-party source");
  }
  
  // Check if it requires sensitive permissions
  const hasSensitivePermissions = skill.missing.env.some(e => 
    e.toLowerCase().includes("key") || 
    e.toLowerCase().includes("secret") ||
    e.toLowerCase().includes("token")
  );
  if (hasSensitivePermissions) {
    score -= 10;
    concerns.push("Requires sensitive credentials");
  }
  
  // Check if it executes commands
  if (skill.missing.bins.length > 0) {
    score -= 20;
    concerns.push("Executes external binaries");
  }
  
  // Determine level
  let level: "high" | "medium" | "low";
  let label: string;
  let icon: TemplateResult;
  let color: string;
  
  if (score >= 80) {
    level = "high";
    label = concerns.length > 0 ? `Secure (${concerns.join(", ")})` : "Secure";
    icon = icons.verified;
    color = "var(--ok)";
  } else if (score >= 50) {
    level = "medium";
    label = concerns.join(", ");
    icon = icons.alertCircle;
    color = "var(--warn)";
  } else {
    level = "low";
    label = concerns.join(", ") || "Review recommended";
    icon = icons.alertTriangle;
    color = "var(--danger)";
  }
  
  return { score, level, label, icon, color };
}

// Get vulnerability info (simulated based on skill data)
function getVulnerabilityInfo(skill: SkillStatusEntry): {
  hasVulnerabilities: boolean;
  cveCount: number;
  severity: "critical" | "high" | "medium" | "low" | "none";
  lastScan: string;
  issues: string[];
} {
  // This would be replaced with actual vulnerability scanning data
  // For now, we simulate based on the skill's characteristics
  const issues: string[] = [];
  let severity: "critical" | "high" | "medium" | "low" | "none" = "none";
  
  // Check for common issues
  if (skill.missing.bins.length > 0 && skill.source?.includes("http")) {
    issues.push("Downloads external binaries from untrusted source");
    severity = "high";
  }
  
  if (skill.missing.env.some(e => e.includes("API_KEY"))) {
    issues.push("Stores API keys in environment variables");
    if (severity === "none") severity = "low";
  }
  
  if (!skill.description || skill.description.length < 20) {
    issues.push("Insufficient documentation");
  }
  
  return {
    hasVulnerabilities: issues.length > 0,
    cveCount: issues.length,
    severity,
    lastScan: new Date().toISOString().split("T")[0],
    issues
  };
}

export function renderSkills(props: SkillsProps) {
  const skills = props.report?.skills ?? [];
  const filter = props.filter.trim().toLowerCase();
  
  // Filter by search text
  let filtered = filter
    ? skills.filter((skill) =>
        [skill.name, skill.description, skill.source].join(" ").toLowerCase().includes(filter),
      )
    : skills;
  
  // Filter by status tab
  filtered = filtered.filter((skill) => {
    const status = getSkillStatus(skill).status;
    if (props.activeFilter === "all") return true;
    if (props.activeFilter === "active") return status === "active";
    if (props.activeFilter === "needs-setup") return status === "needs-setup";
    if (props.activeFilter === "disabled") return status === "disabled";
    return true;
  });
  
  // Group by category
  const grouped = filtered.reduce((acc, skill) => {
    const category = getSkillCategory(skill);
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, SkillStatusEntry[]>);
  
  // Count by status
  const counts = {
    all: skills.length,
    active: skills.filter(s => getSkillStatus(s).status === "active").length,
    "needs-setup": skills.filter(s => getSkillStatus(s).status === "needs-setup").length,
    disabled: skills.filter(s => getSkillStatus(s).status === "disabled").length,
  };

  return html`
    <div class="skills-page">
      <!-- Header Section -->
      <header class="skills-header">
        <div class="skills-header__content">
          <h1 class="skills-header__title">
            <span class="skills-header__icon">${icons.zap}</span>
            Skills
          </h1>
          <p class="skills-header__subtitle">
            Manage and configure your agent's capabilities
          </p>
        </div>
        <div class="skills-header__stats">
          <div class="stat-card">
            <span class="stat-card__value" style="color: var(--ok)">${counts.active}</span>
            <span class="stat-card__label">Active</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__value" style="color: var(--warn)">${counts["needs-setup"]}</span>
            <span class="stat-card__label">Need Setup</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__value" style="color: var(--muted)">${counts.disabled}</span>
            <span class="stat-card__label">Disabled</span>
          </div>
        </div>
      </header>

      <!-- Filter Bar -->
      <div class="skills-filter-bar">
        <div class="skills-filter-tabs">
          ${renderFilterTab("all", "All Skills", counts.all, props)}
          ${renderFilterTab("active", "Active", counts.active, props)}
          ${renderFilterTab("needs-setup", "Needs Setup", counts["needs-setup"], props)}
          ${renderFilterTab("disabled", "Disabled", counts.disabled, props)}
        </div>
        
        <div class="skills-search">
          <span class="skills-search__icon">${icons.search}</span>
          <input
            class="skills-search__input"
            .value=${props.filter}
            @input=${(e: Event) => props.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder="Search skills by name or description..."
            aria-label="Search skills"
          />
          ${props.filter ? html`
            <button 
              class="skills-search__clear" 
              @click=${() => props.onFilterChange("")}
              title="Clear search"
            >
              ${icons.x}
            </button>
          ` : nothing}
        </div>
        
        <button 
          class="btn btn--secondary skills-refresh-btn" 
          ?disabled=${props.loading} 
          @click=${props.onRefresh}
          title="Refresh skills list"
        >
          ${props.loading ? html`<span class="spinner"></span>` : icons.refreshCw}
          ${props.loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <!-- Error Message -->
      ${props.error
        ? html`
          <div class="skills-error" role="alert">
            <span class="skills-error__icon">${icons.alertTriangle}</span>
            <span>${props.error}</span>
          </div>
        `
        : nothing}

      <!-- Skills Grid -->
      ${filtered.length === 0
        ? html`
          <div class="skills-empty">
            <div class="skills-empty__icon">${icons.star}</div>
            <h3 class="skills-empty__title">No skills found</h3>
            <p class="skills-empty__text">
              ${props.filter 
                ? "Try adjusting your search or filters" 
                : "No skills available. Check your configuration."}
            </p>
          </div>
        `
        : html`
          <div class="skills-content">
            ${Object.entries(grouped).map(([category, categorySkills]) => 
              renderCategory(category, categorySkills, props)
            )}
          </div>
        `}

      <!-- Skill Detail Modal -->
      ${props.selectedSkill ? renderSkillDetailModal(props) : nothing}
    </div>
  `;
}

function renderFilterTab(
  key: "all" | "active" | "needs-setup" | "disabled",
  label: string,
  count: number,
  props: SkillsProps
) {
  const isActive = props.activeFilter === key;
  return html`
    <button
      class="skills-filter-tab ${isActive ? "active" : ""}"
      @click=${() => props.onActiveFilterChange(key)}
      aria-pressed=${isActive}
    >
      <span class="skills-filter-tab__label">${label}</span>
      <span class="skills-filter-tab__count">${count}</span>
    </button>
  `;
}

function renderCategory(category: string, skills: SkillStatusEntry[], props: SkillsProps) {
  const categoryInfo = SKILL_CATEGORIES[category] || SKILL_CATEGORIES.other;
  
  return html`
    <section class="skills-category">
      <h2 class="skills-category__header">
        <span class="skills-category__icon">${categoryInfo.icon}</span>
        <span class="skills-category__title">${categoryInfo.label}</span>
        <span class="skills-category__count">${skills.length}</span>
      </h2>
      
      <div class="skills-grid">
        ${skills.map((skill) => renderSkillCard(skill, props))}
      </div>
    </section>
  `;
}

function renderSkillCard(skill: SkillStatusEntry, props: SkillsProps) {
  const busy = props.busyKey === skill.skillKey;
  const message = props.messages[skill.skillKey] ?? null;
  const status = getSkillStatus(skill);
  const canInstall = skill.install.length > 0 && skill.missing.bins.length > 0;
  const hasConfig = skill.primaryEnv && !skill.disabled;
  const security = getSecurityScore(skill);
  
  return html`
    <article 
      class="skill-card ${skill.disabled ? "skill-card--disabled" : ""} ${status.status === "needs-setup" ? "skill-card--needs-setup" : ""}"
      data-status=${status.status}
    >
      <!-- Card Header -->
      <div class="skill-card__header">
        <div class="skill-card__emoji">${skill.emoji || "🔧"}</div>
        <div class="skill-card__info">
          <h3 class="skill-card__name">${skill.name}</h3>
          <span class="skill-card__source">${skill.source}</span>
        </div>
        <div class="skill-card__status" style="color: ${status.color}">
          <span class="skill-card__status-icon">${status.icon}</span>
          <span class="skill-card__status-text">${status.label}</span>
        </div>
      </div>
      
      <!-- Card Body -->
      <div class="skill-card__body">
        ${skill.richDescription
          ? html`<p class="skill-card__description">${skill.richDescription.short}</p>`
          : html`<p class="skill-card__description">${clampText(skill.description, 120)}</p>`
        }
        
        <!-- Security Badge -->
        <div class="skill-card__security" style="color: ${security.color}">
          <span class="skill-card__security-icon">${security.icon}</span>
          <span class="skill-card__security-text">${security.label}</span>
          <button 
            class="skill-card__security-info" 
            @click=${() => {
              props.onSelectSkill(skill.skillKey);
              props.onSelectSkillTab("security");
            }}
            title="View security details"
          >
            ${icons.info}
          </button>
        </div>
        
        <!-- Missing Requirements -->
        ${renderMissingRequirements(skill)}
      </div>
      
      <!-- Card Footer -->
      <div class="skill-card__footer">
        <div class="skill-card__actions">
          <!-- View Details Button -->
          <button
            class="btn btn--secondary"
            @click=${() => {
              props.onSelectSkill(skill.skillKey);
              props.onSelectSkillTab("overview");
            }}
            title="View skill details"
          >
            ${icons.eye}
            Details
          </button>
          
          <!-- Toggle Button -->
          <button
            class="btn ${skill.disabled ? "btn--primary" : ""}"
            ?disabled=${busy}
            @click=${() => props.onToggle(skill.skillKey, skill.disabled)}
            title=${skill.disabled ? "Enable this skill" : "Disable this skill"}
          >
            ${skill.disabled ? "Enable" : "Disable"}
          </button>
          
          <!-- Install Button -->
          ${canInstall
            ? html`
              <button
                class="btn btn--secondary"
                ?disabled=${busy}
                @click=${() => props.onInstall(skill.skillKey, skill.name, skill.install[0].id)}
              >
                ${busy ? html`<span class="spinner spinner--sm"></span>` : icons.download}
                ${skill.install[0].label}
              </button>
            `
            : nothing}
          
          <!-- Configure Button -->
          ${hasConfig
            ? html`
              <button
                class="btn btn--secondary"
                @click=${() => {
                  props.onSelectSkill(skill.skillKey);
                  props.onSelectSkillTab("overview");
                }}
                title="Configure API key"
              >
                ${icons.key}
                Configure
              </button>
            `
            : nothing}
        </div>
        
        <!-- Message -->
        ${message
          ? html`
            <div class="skill-card__message skill-card__message--${message.kind}">
              <span class="skill-card__message-icon">
                ${message.kind === "error" ? icons.alertCircle : icons.checkCircle}
              </span>
              <span>${message.message}</span>
            </div>
          `
          : nothing}
      </div>
    </article>
  `;
}

function renderMissingRequirements(skill: SkillStatusEntry): TemplateResult | typeof nothing {
  const missing: TemplateResult[] = [];
  
  if (skill.missing.bins.length > 0) {
    missing.push(html`<span class="req-tag req-tag--bin">Missing: ${skill.missing.bins.join(", ")}</span>`);
  }
  if (skill.missing.env.length > 0) {
    missing.push(html`<span class="req-tag req-tag--env">Needs: ${skill.missing.env.join(", ")}</span>`);
  }
  if (skill.missing.config.length > 0) {
    missing.push(html`<span class="req-tag req-tag--config">Config: ${skill.missing.config.join(", ")}</span>`);
  }
  if (skill.blockedByAllowlist) {
    missing.push(html`<span class="req-tag req-tag--blocked">Blocked by allowlist</span>`);
  }
  
  if (missing.length === 0) return nothing;
  
  return html`
    <div class="skill-card__requirements">
      ${missing.map(m => m)}
    </div>
  `;
}

function renderSkillDetailModal(props: SkillsProps) {
  const skill = props.report?.skills.find(s => s.skillKey === props.selectedSkill);
  if (!skill) return nothing;
  
  const activeTab = props.selectedSkillTab;
  
  return html`
    <div class="modal-backdrop" @click=${() => props.onSelectSkill(null)}>
      <div class="modal modal--large" @click=${(e: Event) => e.stopPropagation()}>
        <header class="modal__header">
          <div class="modal__header-content">
            <span class="modal__emoji">${skill.emoji || "🔧"}</span>
            <div class="modal__header-text">
              <h2 class="modal__title">${skill.name}</h2>
              <span class="modal__source">${skill.source}</span>
            </div>
          </div>
          <button 
            class="modal__close" 
            @click=${() => props.onSelectSkill(null)}
            title="Close"
          >
            ${icons.x}
          </button>
        </header>
        
        <!-- Tab Navigation -->
        <nav class="modal__tabs">
          ${renderTab("overview", "Overview", icons.fileText, activeTab, props)}
          ${renderTab("security", "Security", icons.shield, activeTab, props)}
          ${renderTab("permissions", "Permissions", icons.lock, activeTab, props)}
          ${renderTab("source", "Source", icons.code, activeTab, props)}
        </nav>
        
        <div class="modal__body">
          ${activeTab === "overview" ? renderOverviewTab(skill, props) : nothing}
          ${activeTab === "security" ? renderSecurityTab(skill, props) : nothing}
          ${activeTab === "permissions" ? renderPermissionsTab(skill) : nothing}
          ${activeTab === "source" ? renderSourceTab(skill) : nothing}
        </div>
        
        <footer class="modal__footer">
          <button 
            class="btn btn--secondary" 
            @click=${() => props.onSelectSkill(null)}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  `;
}

function renderTab(
  id: SkillDetailTab,
  label: string,
  icon: TemplateResult,
  activeTab: SkillDetailTab,
  props: SkillsProps
) {
  const isActive = activeTab === id;
  return html`
    <button
      class="modal__tab ${isActive ? "active" : ""}"
      @click=${() => props.onSelectSkillTab(id)}
      aria-selected=${isActive}
    >
      <span class="modal__tab-icon">${icon}</span>
      <span class="modal__tab-label">${label}</span>
    </button>
  `;
}

function renderOverviewTab(skill: SkillStatusEntry, props: SkillsProps) {
  const status = getSkillStatus(skill);
  const security = getSecurityScore(skill);
  const apiKey = props.edits[skill.skillKey] ?? "";
  const busy = props.busyKey === skill.skillKey;
  const message = props.messages[skill.skillKey] ?? null;
  const richDesc = skill.richDescription;
  
  return html`
    <div class="skill-detail-section">
      ${richDesc ? html`
        <div class="skill-whatis">
          <h3 class="skill-whatis__title">${richDesc.whatIs}</h3>
          <p class="skill-whatis__description">${richDesc.full || skill.description}</p>
        </div>
        
        ${richDesc.capabilities.length > 0 ? html`
          <div class="skill-capabilities">
            <h4 class="skill-section-title">What You Can Do</h4>
            <ul class="skill-capabilities__list">
              ${richDesc.capabilities.map(cap => html`<li>${cap}</li>`)}
            </ul>
          </div>
        ` : nothing}
        
        ${richDesc.examples.length > 0 ? html`
          <div class="skill-examples">
            <h4 class="skill-section-title">Examples</h4>
            <div class="skill-examples__list">
              ${richDesc.examples.map(ex => html`<code class="skill-example">${ex}</code>`)}
            </div>
          </div>
        ` : nothing}
        
        ${richDesc.requirements.length > 0 ? html`
          <div class="skill-requirements">
            <h4 class="skill-section-title">Requirements</h4>
            <ul class="skill-requirements__list">
              ${richDesc.requirements.map(req => html`<li>${req}</li>`)}
            </ul>
          </div>
        ` : nothing}
      ` : html`
        <h3 class="skill-detail-section__title">Description</h3>
        <p class="skill-detail__description">${skill.description || "No description available."}</p>
        
        <div class="skill-load-details">
          <p class="skill-load-details__text">
            Detailed information about this skill is not loaded yet. 
            Load details to see capabilities, examples, and security analysis.
          </p>
          <button 
            class="btn btn--primary"
            ?disabled=${props.analyzingSkill === skill.skillKey}
            @click=${() => props.onAnalyzeSkill(skill.skillKey, skill.filePath)}
          >
            ${props.analyzingSkill === skill.skillKey 
              ? html`<span class="spinner spinner--sm"></span> Loading...` 
              : html`${icons.download} Load Details`}
          </button>
        </div>
      `}
      
      <div class="skill-detail__meta">
        <div class="skill-detail__meta-item">
          <span class="skill-detail__meta-label">Status</span>
          <span class="skill-detail__meta-value" style="color: ${status.color}">
            ${status.icon} ${status.label}
          </span>
        </div>
        <div class="skill-detail__meta-item">
          <span class="skill-detail__meta-label">Source</span>
          <span class="skill-detail__meta-value">${skill.source}</span>
        </div>
        <div class="skill-detail__meta-item">
          <span class="skill-detail__meta-label">Security Score</span>
          <span class="skill-detail__meta-value" style="color: ${security.color}">
            ${security.icon} ${security.score}/100
          </span>
        </div>
      </div>
      
      ${skill.primaryEnv ? html`
        <div class="skill-detail__config">
          <h4 class="skill-detail__config-title">Configuration</h4>
          <div class="skill-detail__field">
            <label class="skill-detail__label" for="api-key-input">
              ${skill.primaryEnv} API Key
              <span class="skill-detail__required">*</span>
            </label>
            <div class="skill-detail__input-wrap">
              <input
                id="api-key-input"
                class="skill-detail__input"
                type="password"
                .value=${apiKey}
                @input=${(e: Event) =>
                  props.onEdit(skill.skillKey, (e.target as HTMLInputElement).value)}
                placeholder="Enter your API key..."
                autocomplete="off"
              />
              ${apiKey ? html`
                <button 
                  class="skill-detail__input-clear"
                  @click=${() => props.onEdit(skill.skillKey, "")}
                  title="Clear"
                >
                  ${icons.x}
                </button>
              ` : nothing}
            </div>
            <p class="skill-detail__help">
              This API key will be used to authenticate requests for this skill.
              Your key is stored securely and never shared.
            </p>
            
            <button
              class="btn btn--primary skill-detail__save-btn"
              ?disabled=${busy || !apiKey}
              @click=${() => props.onSaveKey(skill.skillKey)}
            >
              ${busy ? html`<span class="spinner spinner--sm"></span>` : icons.save}
              Save API Key
            </button>
          </div>
        </div>
      ` : nothing}
      
      ${message
        ? html`
          <div class="skill-detail__message skill-detail__message--${message.kind}">
            <span class="skill-detail__message-icon">
              ${message.kind === "error" ? icons.alertCircle : icons.checkCircle}
            </span>
            <span>${message.message}</span>
          </div>
        `
        : nothing}
    </div>
  `;
}

function renderSecurityTab(skill: SkillStatusEntry, props: SkillsProps) {
  // Use real security scan data if available
  const analysis = props.skillAnalysis[skill.skillKey];
  const securityScan = skill.securityScan || analysis?.securityScan;
  const isAnalyzing = props.analyzingSkill === skill.skillKey;
  
  if (!securityScan) {
    return html`
      <div class="skill-detail-section">
        <h3 class="skill-detail-section__title">Security Assessment</h3>
        <div class="security-empty">
          ${icons.shield}
          <p>No security analysis available yet.</p>
          <button 
            class="btn btn--primary"
            ?disabled=${isAnalyzing}
            @click=${() => props.onAnalyzeSkill(skill.skillKey, skill.filePath)}
          >
            ${isAnalyzing ? html`<span class="spinner spinner--sm"></span>` : icons.scan}
            ${isAnalyzing ? "Scanning..." : "Scan Now"}
          </button>
        </div>
      </div>
    `;
  }
  
  const score = securityScan.score;
  const level = securityScan.level;
  const issues = securityScan.issues || [];
  const checks = securityScan.checks;
  
  // Determine colors based on level
  const levelColors: Record<string, string> = {
    safe: "var(--ok)",
    low: "var(--info)",
    medium: "var(--warn)",
    high: "var(--danger)",
    critical: "var(--danger)",
  };
  
  const levelIcons: Record<string, TemplateResult> = {
    safe: icons.shieldCheck,
    low: icons.shield,
    medium: icons.shieldAlert,
    high: icons.alertTriangle,
    critical: icons.alertOctagon,
  };
  
  const levelLabels: Record<string, string> = {
    safe: "Safe",
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
    critical: "Critical Risk",
  };
  
  const color = levelColors[level] || levelColors.medium;
  const icon = levelIcons[level] || icons.shieldAlert;
  const label = levelLabels[level] || "Unknown";
  
  // Calculate SVG circle stroke-dashoffset for progress ring
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  return html`
    <div class="skill-detail-section">
      <div class="security-header">
        <h3 class="skill-detail-section__title">Security Assessment</h3>
        <button 
          class="btn btn--secondary"
          ?disabled=${isAnalyzing}
          @click=${() => props.onAnalyzeSkill(skill.skillKey, skill.filePath)}
        >
          ${isAnalyzing ? html`<span class="spinner spinner--sm"></span>` : icons.refreshCw}
          ${isAnalyzing ? "Scanning..." : "Re-scan"}
        </button>
      </div>
      
      <div class="security-score">
        <div class="security-score__ring" style="--color: ${color}">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="${radius}" stroke-dasharray="${circumference}" />
            <circle class="ring-fill" cx="50" cy="50" r="${radius}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
          </svg>
          <span class="security-score__value">${score}</span>
          <span class="security-score__label">Score</span>
        </div>
        <div class="security-score__details">
          <div class="security-score__level" style="color: ${color}">
            ${icon}
            <span>${label}</span>
          </div>
          <p class="security-score__description">
            ${score >= 80 ? "This skill follows good security practices." : 
              score >= 60 ? "This skill has minor security considerations." :
              score >= 40 ? "Review this skill carefully before enabling." :
              "This skill has significant security concerns."}
          </p>
          <div class="scan-info">
            <span class="scan-info__label">Last scanned:</span>
            <span class="scan-info__value">${new Date(securityScan.lastScan).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      ${issues.length > 0 ? html`
        <div class="security-section">
          <h4 class="security-section__title">
            ${icons.alertTriangle}
            Issues Found (${issues.length})
          </h4>
          <div class="security-section__content">
            ${issues.map(issue => html`
              <div class="vuln-alert vuln-alert--${issue.severity}">
                <span class="vuln-alert__icon">
                  ${issue.severity === "critical" || issue.severity === "high" ? icons.alertOctagon : 
                    issue.severity === "medium" ? icons.alertTriangle : icons.info}
                </span>
                <div class="vuln-alert__content">
                  <span class="vuln-alert__title">${issue.message}</span>
                  ${issue.context ? html`<code class="vuln-alert__context">${issue.context}</code>` : nothing}
                  ${issue.line ? html`<span class="vuln-alert__meta">Line ${issue.line}</span>` : nothing}
                </div>
              </div>
            `)}
          </div>
        </div>
      ` : html`
        <div class="vuln-alert vuln-alert--none">
          <span class="vuln-alert__icon">${icons.shieldCheck}</span>
          <span class="vuln-alert__content">
            No security issues detected
          </span>
        </div>
      `}
      
      <div class="security-section">
        <h4 class="security-section__title">
          ${icons.clipboard}
          Security Checks
        </h4>
        <ul class="security-checks">
          <li class="security-checks__item ${checks.hasHttpsDownloads ? "pass" : "fail"}">
            <span class="security-checks__icon">
              ${checks.hasHttpsDownloads ? icons.checkCircle : icons.alertCircle}
            </span>
            <span>Uses HTTPS for downloads</span>
          </li>
          <li class="security-checks__item ${checks.hasSignedBinaries ? "pass" : "neutral"}">
            <span class="security-checks__icon">
              ${checks.hasSignedBinaries ? icons.checkCircle : icons.circle}
            </span>
            <span>Signed binaries</span>
          </li>
          <li class="security-checks__item ${checks.usesTrustedPackageManager ? "pass" : "neutral"}">
            <span class="security-checks__icon">
              ${checks.usesTrustedPackageManager ? icons.checkCircle : icons.circle}
            </span>
            <span>Uses trusted package manager</span>
          </li>
          <li class="security-checks__item ${!checks.hasDangerousCommands ? "pass" : "fail"}">
            <span class="security-checks__icon">
              ${!checks.hasDangerousCommands ? icons.checkCircle : icons.alertCircle}
            </span>
            <span>No dangerous commands detected</span>
          </li>
          <li class="security-checks__item ${!checks.requiresRoot ? "pass" : "warning"}">
            <span class="security-checks__icon">
              ${!checks.requiresRoot ? icons.checkCircle : icons.alertTriangle}
            </span>
            <span>Does not require root privileges</span>
          </li>
        </ul>
      </div>
    </div>
  `;
}

function renderPermissionsTab(skill: SkillStatusEntry) {
  // Determine permissions based on skill characteristics
  const permissions: { type: string; granted: boolean; reason: string }[] = [];
  
  if (skill.missing.bins.length > 0) {
    permissions.push({
      type: "execution",
      granted: true,
      reason: `Requires binaries: ${skill.missing.bins.join(", ")}`
    });
  }
  
  if (skill.missing.env.length > 0) {
    const hasSensitive = skill.missing.env.some(e => 
      e.toLowerCase().includes("key") || 
      e.toLowerCase().includes("secret") ||
      e.toLowerCase().includes("token")
    );
    permissions.push({
      type: "env",
      granted: true,
      reason: hasSensitive 
        ? `Access to sensitive credentials: ${skill.missing.env.filter(e => e.toLowerCase().includes("key") || e.toLowerCase().includes("secret")).join(", ")}`
        : `Environment variables: ${skill.missing.env.join(", ")}`
    });
  }
  
  // Check for network access (most skills need this)
  if (skill.description?.toLowerCase().includes("api") || 
      skill.description?.toLowerCase().includes("web") ||
      skill.description?.toLowerCase().includes("http")) {
    permissions.push({
      type: "network",
      granted: true,
      reason: "Makes HTTP requests to external APIs"
    });
  }
  
  // Check for filesystem access
  if (skill.missing.bins.length > 0 || skill.description?.toLowerCase().includes("file")) {
    permissions.push({
      type: "filesystem",
      granted: true,
      reason: "Reads and writes files"
    });
  }
  
  return html`
    <div class="skill-detail-section">
      <h3 class="skill-detail-section__title">Permissions</h3>
      
      <p class="skill-detail__intro">
        This skill has requested the following permissions. Review them carefully before enabling.
      </p>
      
      <div class="permissions-list">
        ${permissions.length === 0 ? html`
          <div class="permissions-empty">
            ${icons.verified}
            <span>No specific permissions required</span>
          </div>
        ` : nothing}
        
        ${permissions.map(perm => {
          const permInfo = PERMISSION_TYPES[perm.type];
          return html`
            <div class="permission-item">
              <div class="permission-item__header">
                <span class="permission-item__icon">${permInfo?.icon || icons.lock}</span>
                <div class="permission-item__info">
                  <span class="permission-item__name">${permInfo?.label || perm.type}</span>
                  <span class="permission-item__description">${permInfo?.description || ""}</span>
                </div>
                <span class="permission-item__status permission-item__status--${perm.granted ? "granted" : "denied"}">
                  ${perm.granted ? icons.check : icons.x}
                  ${perm.granted ? "Granted" : "Denied"}
                </span>
              </div>
              <div class="permission-item__reason">
                <span class="permission-item__reason-label">Reason:</span>
                <span class="permission-item__reason-text">${perm.reason}</span>
              </div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

function renderSourceTab(skill: SkillStatusEntry) {
  return html`
    <div class="skill-detail-section">
      <h3 class="skill-detail-section__title">Source Information</h3>
      
      <div class="source-info">
        <div class="source-info__item">
          <span class="source-info__label">Source Package</span>
          <span class="source-info__value">${skill.source}</span>
        </div>
        
        <div class="source-info__item">
          <span class="source-info__label">Skill Key</span>
          <code class="source-info__code">${skill.skillKey}</code>
        </div>
        
        ${skill.missing.bins.length > 0 ? html`
          <div class="source-info__item">
            <span class="source-info__label">Required Binaries</span>
            <div class="source-info__tags">
              ${skill.missing.bins.map(bin => html`
                <span class="source-info__tag">${bin}</span>
              `)}
            </div>
          </div>
        ` : nothing}
        
        ${skill.missing.env.length > 0 ? html`
          <div class="source-info__item">
            <span class="source-info__label">Environment Variables</span>
            <div class="source-info__tags">
              ${skill.missing.env.map(env => html`
                <span class="source-info__tag">${env}</span>
              `)}
            </div>
          </div>
        ` : nothing}
      </div>
      
      <div class="source-tips">
        <h4 class="source-tips__title">
          ${icons.helpCircle}
          About Skill Sources
        </h4>
        <ul class="source-tips__list">
          <li>Skills from verified sources (like @openclaw) have been reviewed for security</li>
          <li>Third-party skills should be reviewed before installation</li>
          <li>You can inspect the source code to understand what the skill does</li>
          <li>Report suspicious skills to the OpenClaw team</li>
        </ul>
      </div>
    </div>
  `;
}
