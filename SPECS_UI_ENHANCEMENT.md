# OpenClaw UI Enhancement Specifications

## Document Version: 1.0
## Last Updated: 2024
## Status: Ready for Implementation

---

## EXECUTIVE SUMMARY

This document outlines comprehensive specifications for upgrading all OpenClaw UI interfaces to production-ready status, following prompt engineering best practices and end-to-end integration standards.

### Critical Requirements (Non-Negotiable):
- **NO EMOJIS** - Use only SVG icons from `icons.ts`
- **NO MOCK DATA** - All features must have real backend integration
- **PERSISTENCE REQUIRED** - No in-memory configurations
- **END-TO-END** - UI ↔ Controller ↔ Gateway Handler must all work

---

## PHASE 1: CRITICAL FIXES (Days 1-3)

### 1.1 EMOJI REPLACEMENT ACROSS ALL INTERFACES

#### Affected Files:
| File | Line Numbers | Current | Required Action |
|------|--------------|---------|-----------------|
| `compliance.ts` | 118, 147, 161-163, 197, 206, 215, 224, 322, 430, 605-608 | ⚠️📊🕐📅📝🔒🏥📥✅❌⏳ | Replace with SVG equivalents |
| `model-routing.ts` | 7-22 | ⚡📊🧠✓✕⚙️⏻$🕐🔄🔍⋮⋮ | Replace with icons.ts |
| `nodes.ts` | 436-437 | 🟢🔴 | Use status-dot CSS classes |
| `onboarding-wizard.ts` | 53, 57, 170, 205-206, 228 | 🔒⚡✓🎉⚙️ | Replace with SVG |
| `rate-limits.ts` | 25 | ✓✗ | Replace with check/x SVGs |

#### Icon Mapping:
```typescript
// Map emojis to icons.ts
⚠️  → icons.warning or icons.alertTriangle
📊  → icons.barChart or icons.activity
🕐  → icons.clock
📅  → icons.calendar
📝  → icons.fileText
🔒  → icons.lock
🏥  → icons.heart (healthcare) or icons.shield
📥  → icons.download
✅  → icons.check
❌  → icons.x or icons.close
⏳  → icons.hourglass
⚡  → icons.zap
🧠  → icons.brain or icons.cpu
✓   → icons.check
✕   → icons.x
⚙️  → icons.settings
⏻   → icons.power
🔄  → icons.refreshCw
🔍  → icons.search
⋮   → icons.moreVertical
🎉  → icons.partyPopper or icons.sparkles
🟢  → CSS class .status-dot.active
🔴  → CSS class .status-dot.error
```

#### Technical Requirements:
- Import icons from `../icons.ts`
- Maintain consistent sizing (16x16, 20x20, 24x24)
- Use `stroke="currentColor"` for theme compatibility
- Add `aria-label` for accessibility

---

### 1.2 BUDGET + METRICS CONSOLIDATION

#### New Interface: `analytics.ts` (Replaces separate budget/metrics)

##### User Story:
As a user, I want a unified dashboard showing costs and performance metrics so I can monitor spending and system health in one place.

##### Technical Architecture:

**State Management:**
```typescript
interface AnalyticsState {
  // Budget Data
  budgetLoading: boolean;
  budgetError: string | null;
  budgetConfig: BudgetConfig;
  budgetCurrent: BudgetStatus;
  budgetHistory: BudgetHistoryEntry[];
  
  // Metrics Data
  metricsLoading: boolean;
  metricsError: string | null;
  metricsPeriod: 'day' | 'week' | 'month';
  metricsUsage: UsageMetrics;
  metricsCosts: CostMetrics;
  metricsModels: ModelUsageMetrics[];
  
  // Unified
  selectedTimeRange: string;
  comparisonMode: boolean;
}
```

**Backend Integration:**
```typescript
// Gateway Handlers to implement/modify:
"analytics.dashboard": () => AnalyticsDashboardData
"analytics.budget.set": (config: BudgetConfig) => void
"analytics.budget.reset": () => void
"analytics.budget.check": () => BudgetStatus
"analytics.metrics.usage": (period: string) => UsageMetrics
"analytics.metrics.costs": (period: string, breakdown: string) => CostMetrics
"analytics.metrics.models": (period: string) => ModelUsageMetrics[]
"analytics.metrics.export": (format: 'csv' | 'json') => ExportData
"analytics.projection": (months: number) => BudgetProjection
```

**UI Components:**
1. **Overview Cards:**
   - Total Spent (with trend indicator)
   - Budget Remaining (progress bar)
   - Active Period
   - Cost per Request
   - Top Model by Usage
   - Top Model by Cost

2. **Charts:**
   - Cost over time (line chart)
   - Usage by model (bar chart)
   - Budget vs Actual (comparison chart)
   - Cost breakdown by category (pie chart)

3. **Tables:**
   - Model Usage Details (model, requests, tokens, cost)
   - Daily Breakdown (date, requests, cost, budget)
   - Alerts History

4. **Configuration Panel:**
   - Budget limit input
   - Period selector (monthly/quarterly/yearly)
   - Alert thresholds (% of budget)
   - Email notifications toggle

##### Acceptance Criteria:
- [ ] Single interface showing both budget and metrics
- [ ] Real-time data from backend (no mocks)
- [ ] Interactive charts that filter data
- [ ] Export to CSV/JSON functionality
- [ ] Budget alerts when approaching limits
- [ ] Historical comparison (current vs previous period)

---

## PHASE 2: MOCK → FUNCTIONAL (Days 4-10)

### 2.1 SECURITY SCANNER REAL

#### Current State:
- Basic file permission checks
- Environment variable validation
- Simulated security score

#### Required State:
Full security scanning with real vulnerability detection

##### Technical Specifications:

**Scanner Modules:**
```typescript
interface SecurityScanner {
  // Dependency Scanner
  scanDependencies(): Promise<Vulnerability[]>;
  // Uses npm audit or integrates with Snyk API
  
  // Secret Scanner
  scanSecrets(): Promise<SecretFinding[]>;
  // Uses regex patterns + entropy analysis
  
  // Configuration Scanner
  scanConfiguration(): Promise<ConfigIssue[]>;
  // Checks for insecure defaults, missing security headers
  
  // File Permission Scanner
  scanPermissions(): Promise<PermissionIssue[]>;
  // Checks sensitive file permissions
}

interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  package: string;
  currentVersion: string;
  fixedVersion: string;
  title: string;
  description: string;
  cve?: string;
  recommendation: string;
}
```

**Gateway Handlers:**
```typescript
"security.scan": () => ScanResults
"security.vulnerabilities": () => Vulnerability[]
"security.secrets": () => SecretFinding[]
"security.config-issues": () => ConfigIssue[]
"security.remediate": (issueId: string) => RemediationResult
"security.schedule": (config: ScheduleConfig) => void
```

**UI Features:**
1. **Security Dashboard:**
   - Overall Security Score (0-100)
   - Vulnerability Count by Severity
   - Last Scan Timestamp
   - Trend (improving/degrading)

2. **Vulnerability List:**
   - Sortable/filterable table
   - Severity badges (color-coded)
   - One-click remediation where possible
   - Link to CVE details
   - Affected file locations

3. **Secret Scanner Results:**
   - File path and line number
   - Secret type (API key, password, token)
   - Risk level
   - Recommendation

4. **Configuration Audit:**
   - Checklist of security settings
   - Current vs Recommended
   - One-click fix buttons

##### Implementation Notes:
- Integrate with `npm audit` for dependency scanning
- Use `gitleaks` or similar for secret detection
- Implement caching (scan every 24h or on-demand)
- Store scan history for trend analysis

---

### 2.2 COMPLIANCE FRAMEWORK REAL

#### Current State:
- In-memory checklist
- Basic environment checks
- No real compliance validation

#### Required State:
Real compliance auditing for GDPR, LGPD, SOC2, HIPAA

##### Technical Specifications:

**Compliance Engine:**
```typescript
interface ComplianceFramework {
  name: 'GDPR' | 'LGPD' | 'SOC2' | 'HIPAA';
  version: string;
  checks: ComplianceCheck[];
}

interface ComplianceCheck {
  id: string;
  category: string;
  requirement: string;
  severity: 'critical' | 'required' | 'recommended';
  validator: () => Promise<CheckResult>;
}

interface CheckResult {
  passed: boolean;
  evidence: string;
  remediation?: string;
  automated: boolean; // Can be auto-fixed?
}
```

**Real Checks to Implement:**

**GDPR Checks:**
- [ ] Data retention policy configured
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enforced
- [ ] Access logs enabled
- [ ] Data processing agreement (DPA) on file
- [ ] Right to deletion procedure
- [ ] Data portability mechanism
- [ ] Privacy policy accessible

**LGPD Checks:**
- [ ] Brazilian data residency (if applicable)
- [ ] Consent management
- [ ] Data protection officer assigned
- [ ] Incident response plan

**SOC2 Checks:**
- [ ] Access controls documented
- [ ] Change management process
- [ ] Backup and recovery tested
- [ ] Monitoring and alerting enabled
- [ ] Vendor management policy

**HIPAA Checks:**
- [ ] Business Associate Agreements (BAAs)
- [ ] Audit logs retained for 6 years
- [ ] Unique user identification
- [ ] Automatic logoff configured
- [ ] Encryption standards (AES-256)

**Gateway Handlers:**
```typescript
"compliance.frameworks": () => Framework[]
"compliance.check": (framework: string) => ComplianceReport
"compliance.run": (framework: string) => void
"compliance.report": (framework: string, format: string) => ReportData
"compliance.remediate": (checkId: string) => RemediationResult
"compliance.history": (framework: string) => HistoricalReport[]
```

**UI Features:**
1. **Framework Selector:**
   - Tabbed interface for GDPR/LGPD/SOC2/HIPAA
   - Progress indicator per framework
   - Overall compliance score

2. **Check List:**
   - Expandable categories
   - Status indicators (✓ Pass, ✗ Fail, ⚠️ Warning)
   - Evidence links
   - Remediation buttons

3. **Compliance Report:**
   - Generate PDF report
   - Executive summary
   - Detailed findings
   - Remediation roadmap

4. **Monitoring:**
   - Scheduled compliance scans
   - Alert on new failures
   - Trend dashboard

---

### 2.3 RATE LIMITS FULLY FUNCTIONAL

#### Current State:
- Hardcoded limits in UI
- No dynamic configuration
- No real-time tracking

#### Required State:
Dynamic rate limiting with per-tool configuration

##### Technical Specifications:

**Rate Limiting Service:**
```typescript
interface RateLimitConfig {
  toolId: string;
  toolName: string;
  enabled: boolean;
  limits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  userOverrides: Map<string, UserLimit>;
}

interface RateLimitStatus {
  toolId: string;
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
  };
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
  resetAt: Date;
  throttled: boolean;
}
```

**Storage:**
- Use Redis or in-memory with persistence
- Track sliding window counters
- Store configuration in `~/.openclaw/rate-limits.json`

**Gateway Handlers:**
```typescript
"rate-limits.config.get": () => RateLimitConfig[]
"rate-limits.config.set": (config: RateLimitConfig) => void
"rate-limits.config.reset": (toolId: string) => void
"rate-limits.status": () => RateLimitStatus[]
"rate-limits.check": (toolId: string) => CheckResult
"rate-limits.history": (toolId: string, period: string) => UsageHistory
```

**UI Features:**
1. **Rate Limits Dashboard:**
   - Grid of all tools with current usage
   - Color-coded status (green/yellow/red)
   - Quick enable/disable toggles

2. **Configuration Modal:**
   - Tool selector
   - Limit inputs (RPM, RPH, RPD)
   - Burst allowance configuration
   - User override management

3. **Usage Analytics:**
   - Usage graphs over time
   - Peak usage identification
   - Throttling events log

4. **Alerting:**
   - Webhook notifications on limit reached
   - Email alerts
   - Slack integration

---

## PHASE 3: FEATURE ENHANCEMENTS (Days 11-20)

### 3.1 CONFIG INTERFACE VISUAL EDITOR

#### Current State:
- Form-based editor
- Raw JSON editor
- Limited validation feedback

#### Enhanced Requirements:

**Visual Schema Editor:**
```typescript
interface ConfigEditorFeatures {
  // Schema Visualization
  schemaTree: SchemaNode[];
  propertyTypes: Map<string, PropertyType>;
  validation: ValidationRules;
  
  // Editor Features
  dragDrop: boolean;
  inlineValidation: boolean;
  autocomplete: boolean;
  diffView: boolean;
  
  // History
  versions: ConfigVersion[];
  rollback: boolean;
}
```

**New UI Components:**
1. **Schema Navigator:**
   - Tree view of all config properties
   - Search and filter
   - Collapsible sections

2. **Property Editor:**
   - Type-specific inputs (string, number, boolean, array, object)
   - Inline validation with error messages
   - Help tooltips from schema
   - Default value restoration

3. **Diff Viewer:**
   - Side-by-side current vs previous
   - Highlight changes (add/remove/modify)
   - Accept/reject individual changes

4. **Validation Panel:**
   - Real-time validation errors
   - Warnings for deprecated fields
   - Suggestions for improvements

5. **History Timeline:**
   - List of previous versions
   - Who changed what when
   - One-click rollback
   - Compare any two versions

6. **Import/Export:**
   - Import from JSON/YAML
   - Export to JSON/YAML/ENV
   - Validate before import

**Backend:**
```typescript
"config.schema": () => ConfigSchema
"config.validate": (config: object) => ValidationResult
"config.history": () => ConfigVersion[]
"config.rollback": (version: number) => void
"config.diff": (v1: number, v2: number) => DiffResult
"config.import": (data: string, format: string) => ImportResult
```

---

### 3.2 OLLAMA ONE-CLICK INSTALLATION

#### Current State:
- Shows status of Ollama
- Can pull models if Ollama is installed
- No installation assistance

#### Enhanced Requirements:

**Auto-Installation Flow:**
```typescript
interface OllamaSetupFlow {
  // Detection
  checkInstalled(): Promise<boolean>;
  getVersion(): Promise<string>;
  
  // Installation
  detectOS(): 'mac' | 'linux' | 'windows';
  downloadInstaller(): Promise<DownloadProgress>;
  install(): Promise<InstallResult>;
  
  // Configuration
  configureService(): Promise<void>;
  testConnection(): Promise<boolean>;
}
```

**Installation Scripts:**
- **Mac:** `brew install ollama` or DMG download
- **Linux:** Official install script + systemd service
- **Windows:** Winget or MSI download

**UI Flow:**
1. **Detection Screen:**
   - Check if Ollama installed
   - Show current version
   - "Install Ollama" button (if not installed)

2. **Installation Progress:**
   - Download progress bar
   - Installation steps
   - Error handling with retry

3. **Model Download:**
   - Grid of recommended small models:
     - llama3.2 (3B params, fast)
     - phi4 (14B params, good quality)
     - qwen2.5 (7B params, multilingual)
     - mistral (7B params, balanced)
   - One-click download
   - Progress indicator per model
   - Cancel button

4. **Auto-Configuration:**
   - Configure OpenClaw to use local Ollama
   - Test connection
   - Set as default for specific tasks
   - Show usage examples

**Backend Handlers:**
```typescript
"ollama.setup.status": () => SetupStatus
"ollama.setup.install": () => Stream<InstallProgress>
"ollama.setup.configure": () => void
"ollama.models.recommended": () => ModelInfo[]
"ollama.models.download": (model: string) => Stream<DownloadProgress>
"ollama.models.delete": (model: string) => void
```

---

### 3.3 MODELS INTERFACE - FULL OPENAI INTEGRATION

#### Current State:
- Basic model configuration
- Limited to predefined models
- No auto-discovery

#### Enhanced Requirements:

**Auto-Discovery:**
```typescript
interface ModelDiscoveryService {
  // OpenAI
  fetchOpenAIModels(apiKey: string): Promise<OpenAIModel[]>;
  fetchCodexVersions(apiKey: string): Promise<CodexModel[]>;
  
  // Other providers
  fetchAnthropicModels(apiKey: string): Promise<AnthropicModel[]>;
  fetchGoogleModels(apiKey: string): Promise<GoogleModel[]>;
  fetchMistralModels(apiKey: string): Promise<MistralModel[]>;
}
```

**UI Features:**
1. **Provider Tabs:**
   - OpenAI (GPT-4, GPT-3.5, Codex variants)
   - Anthropic (Claude 3.5, 3, etc.)
   - Google (Gemini variants)
   - Mistral
   - Local (Ollama)

2. **Auto-Discovery:**
   - "Refresh Models" button
   - Fetches all available models from API
   - Shows new models with "New" badge
   - Shows deprecated models

3. **Model Cards:**
   - Model name and description
   - Context window size
   - Pricing per 1K tokens
   - Capabilities (vision, code, etc.)
   - Test button (quick inference test)

4. **Version Management:**
   - Codex: all versions (2024-05, 2024-02, etc.)
   - GPT-4: turbo, preview, etc.
   - Auto-update notifications

5. **Connection Testing:**
   - Real-time API key validation
   - Test inference with sample prompt
   - Show latency and response

**Backend:**
```typescript
"models.discover": (provider: string) => ModelInfo[]
"models.test": (model: string, prompt: string) => TestResult
"models.versions": (model: string) => VersionInfo[]
"models.pricing": (model: string) => PricingInfo
```

---

### 3.4 CONTAINER MANAGEMENT INTERFACE

#### Current State:
- Basic container listing
- Limited actions

#### Enhanced Requirements:

**Full Container Lifecycle Management:**
```typescript
interface ContainerService {
  // CRUD
  list(): Promise<Container[]>;
  create(config: ContainerConfig): Promise<Container>;
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  restart(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  
  // Monitoring
  logs(id: string, tail?: number): Stream<LogEntry>;
  stats(id: string): Promise<ContainerStats>;
  exec(id: string, command: string[]): Promise<ExecResult>;
  
  // Management
  inspect(id: string): Promise<ContainerDetails>;
  export(id: string): Promise<Blob>;
  import(data: Blob, name: string): Promise<Container>;
}
```

**UI Features:**
1. **Container List:**
   - Status indicators (running, stopped, error)
   - Resource usage (CPU, Memory)
   - Quick actions (start/stop/restart)
   - Port mappings
   - Image info

2. **Container Details:**
   - Full inspection data
   - Environment variables
   - Volume mounts
   - Network config
   - Labels

3. **Terminal:**
   - Web-based terminal (xterm.js)
   - Execute commands inside container
   - Full shell access
   - Copy/paste support

4. **Logs Viewer:**
   - Real-time log streaming
   - Search/filter
   - Download logs
   - Clear logs

5. **Resource Monitoring:**
   - CPU usage graph
   - Memory usage graph
   - Network I/O
   - Disk I/O

6. **Create Container:**
   - Form-based creation
   - Image search (Docker Hub)
   - Volume mapping
   - Port mapping
   - Environment variables
   - Resource limits

**Backend Handlers:**
```typescript
"containers.list": () => Container[]
"containers.create": (config: ContainerConfig) => Container
"containers.start": (id: string) => void
"containers.stop": (id: string) => void
"containers.restart": (id: string) => void
"containers.delete": (id: string) => void
"containers.logs": (id: string) => Stream<LogEntry>
"containers.exec": (id: string, command: string[]) => ExecResult
"containers.stats": (id: string) => ContainerStats
```

---

## PHASE 4: PERSISTENCE & INTEGRATION (Days 21-24)

### 4.1 MODEL ROUTING PERSISTENCE

**Current:** Config in memory only
**Required:** Persist to config file

```typescript
// Save to ~/.openclaw/config.json
interface ModelRoutingConfig {
  enabled: boolean;
  tiers: TierConfig[];
  routingRules: RoutingRule[];
  fallbackEnabled: boolean;
  lastUpdated: Date;
}

// Auto-save on every change
// Reload from disk on startup
```

---

## IMPLEMENTATION CHECKLIST

### Before Starting:
- [ ] User approves specifications
- [ ] Priority order confirmed
- [ ] Dependencies identified

### Phase 1:
- [ ] All emojis replaced with SVGs
- [ ] Budget+Metrics consolidated
- [ ] No TypeScript errors
- [ ] All tests passing

### Phase 2:
- [ ] Security scanner finds real vulnerabilities
- [ ] Compliance checks real requirements
- [ ] Rate limits are configurable and enforced
- [ ] No mock data in production

### Phase 3:
- [ ] Config editor has visual schema
- [ ] Ollama installs with one click
- [ ] Models auto-discover from APIs
- [ ] Containers fully manageable

### Phase 4:
- [ ] All configs persisted
- [ ] End-to-end integration verified
- [ ] Documentation updated
- [ ] User acceptance testing passed

---

## QUESTIONS FOR USER

1. **Priority Confirmation:**
   - Confirm Phase 1 → Phase 3 → Phase 2 → Phase 4 order?
   - Or different priority?

2. **Budget+Metrics:**
   - New "Analytics" tab or keep separate but improved?
   - What charts are most important?

3. **Security Scanner:**
   - Integrate with Snyk/Trivy or custom implementation?
   - Budget for commercial API?

4. **Compliance:**
   - Which frameworks are priority? (GDPR, SOC2, HIPAA, LGPD)
   - Need PDF report generation?

5. **Ollama:**
   - Auto-install or guided installation?
   - Which small models to recommend by default?

6. **Containers:**
   - Docker only or Podman support too?
   - Need Kubernetes integration later?

7. **Testing:**
   - Who will do UAT (User Acceptance Testing)?
   - Timeline constraints?

---

## APPENDIX: TECHNICAL STANDARDS

### Code Quality:
- TypeScript strict mode
- No `any` types
- Comprehensive error handling
- Unit tests for all handlers
- E2E tests for critical paths

### UI Standards:
- SVG icons only (from icons.ts)
- Responsive design (mobile-first)
- Accessibility (ARIA labels, keyboard nav)
- Loading states for all async operations
- Error boundaries

### Backend Standards:
- Input validation (Zod schemas)
- Rate limiting on all endpoints
- Audit logging
- Graceful degradation
- Circuit breakers for external APIs

### Documentation:
- JSDoc for all functions
- README for each major feature
- API documentation
- User guides for complex features

---

## REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | OpenClaw Team | Initial comprehensive specification |

---

**STATUS: READY FOR REVIEW**

Please review and provide feedback before implementation begins.
