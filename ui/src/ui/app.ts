import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { EventLogEntry } from "./app-events";
import type { DevicePairingList } from "./controllers/devices";
import type { ExecApprovalRequest } from "./controllers/exec-approval";
import type { ExecApprovalsFile, ExecApprovalsSnapshot } from "./controllers/exec-approvals";
import type { GatewayBrowserClient, GatewayHelloOk } from "./gateway";
import type { Tab } from "./navigation";
import type { ResolvedTheme, ThemeMode } from "./theme";
import type {
  AgentsListResult,
  ConfigSnapshot,
  ConfigUiHints,
  CronJob,
  CronRunLogEntry,
  CronStatus,
  HealthSnapshot,
  LogEntry,
  LogLevel,
  PresenceEntry,
  ChannelsStatusSnapshot,
  SessionsListResult,
  SkillStatusReport,
  StatusSummary,
  NostrProfile,
} from "./types";
import type { NostrProfileFormState } from "./views/channels.nostr-profile-form";
import {
  handleChannelConfigReload as handleChannelConfigReloadInternal,
  handleChannelConfigSave as handleChannelConfigSaveInternal,
  handleNostrProfileCancel as handleNostrProfileCancelInternal,
  handleNostrProfileEdit as handleNostrProfileEditInternal,
  handleNostrProfileFieldChange as handleNostrProfileFieldChangeInternal,
  handleNostrProfileImport as handleNostrProfileImportInternal,
  handleNostrProfileSave as handleNostrProfileSaveInternal,
  handleNostrProfileToggleAdvanced as handleNostrProfileToggleAdvancedInternal,
  handleWhatsAppLogout as handleWhatsAppLogoutInternal,
  handleWhatsAppStart as handleWhatsAppStartInternal,
  handleWhatsAppWait as handleWhatsAppWaitInternal,
} from "./app-channels";
import {
  handleAbortChat as handleAbortChatInternal,
  handleSendChat as handleSendChatInternal,
  removeQueuedMessage as removeQueuedMessageInternal,
} from "./app-chat";
import { DEFAULT_CRON_FORM, DEFAULT_LOG_LEVEL_FILTERS } from "./app-defaults";
import { connectGateway as connectGatewayInternal } from "./app-gateway";
import {
  handleConnected,
  handleDisconnected,
  handleFirstUpdated,
  handleUpdated,
} from "./app-lifecycle";
import { renderApp } from "./app-render";
import {
  exportLogs as exportLogsInternal,
  handleChatScroll as handleChatScrollInternal,
  handleLogsScroll as handleLogsScrollInternal,
  resetChatScroll as resetChatScrollInternal,
} from "./app-scroll";
import {
  applySettings as applySettingsInternal,
  loadCron as loadCronInternal,
  loadOverview as loadOverviewInternal,
  setTab as setTabInternal,
  setTheme as setThemeInternal,
  onPopState as onPopStateInternal,
} from "./app-settings";
import {
  resetToolStream as resetToolStreamInternal,
  type ToolStreamEntry,
} from "./app-tool-stream";
import { resolveInjectedAssistantIdentity } from "./assistant-identity";
import { loadAssistantIdentity as loadAssistantIdentityInternal } from "./controllers/assistant-identity";
import { loadSettings, type UiSettings } from "./storage";
import { type ChatAttachment, type ChatQueueItem, type CronFormState } from "./ui-types";
import type { SkillMessage } from "./controllers/skills";
import { analyzeSkill as analyzeSkillInternal } from "./controllers/skills";

declare global {
  interface Window {
    __OPENCLAW_CONTROL_UI_BASE_PATH__?: string;
  }
}

const injectedAssistantIdentity = resolveInjectedAssistantIdentity();

function resolveOnboardingMode(): boolean {
  if (!window.location.search) return false;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("onboarding");
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

@customElement("openclaw-app")
export class OpenClawApp extends LitElement {
  @state() settings: UiSettings = loadSettings();
  @state() password = "";
  @state() tab: Tab = "chat";
  @state() onboarding = resolveOnboardingMode();
  @state() connected = false;
  @state() theme: ThemeMode = this.settings.theme ?? "system";
  @state() themeResolved: ResolvedTheme = "dark";
  @state() hello: GatewayHelloOk | null = null;
  @state() lastError: string | null = null;
  @state() eventLog: EventLogEntry[] = [];
  private eventLogBuffer: EventLogEntry[] = [];
  private toolStreamSyncTimer: number | null = null;
  private sidebarCloseTimer: number | null = null;

  @state() assistantName = injectedAssistantIdentity.name;
  @state() assistantAvatar = injectedAssistantIdentity.avatar;
  @state() assistantAgentId = injectedAssistantIdentity.agentId ?? null;

  @state() sessionKey = this.settings.sessionKey;
  @state() chatLoading = false;
  @state() chatSending = false;
  @state() chatMessage = "";
  @state() chatMessages: unknown[] = [];
  @state() chatToolMessages: unknown[] = [];
  @state() chatStream: string | null = null;
  @state() chatStreamStartedAt: number | null = null;
  @state() chatRunId: string | null = null;
  @state() compactionStatus: import("./app-tool-stream").CompactionStatus | null = null;
  @state() chatAvatarUrl: string | null = null;
  @state() chatThinkingLevel: string | null = null;
  @state() chatQueue: ChatQueueItem[] = [];
  @state() chatAttachments: ChatAttachment[] = [];
  @state() chatScrolledUp = false;
  @state() commandsMenuOpen = false;
  @state() voiceRecorderOpen = false;
  // Sidebar state for tool output viewing
  @state() sidebarOpen = false;
  @state() sidebarContent: string | null = null;
  @state() sidebarError: string | null = null;
  @state() splitRatio = this.settings.splitRatio;

  @state() nodesLoading = false;
  @state() nodes: Array<Record<string, unknown>> = [];
  @state() devicesLoading = false;
  @state() devicesError: string | null = null;
  @state() devicesList: DevicePairingList | null = null;
  @state() execApprovalsLoading = false;
  @state() execApprovalsSaving = false;
  @state() execApprovalsDirty = false;
  @state() execApprovalsSnapshot: ExecApprovalsSnapshot | null = null;
  @state() execApprovalsForm: ExecApprovalsFile | null = null;
  @state() execApprovalsSelectedAgent: string | null = null;
  @state() execApprovalsTarget: "gateway" | "node" = "gateway";
  @state() execApprovalsTargetNodeId: string | null = null;
  @state() execApprovalQueue: ExecApprovalRequest[] = [];
  @state() execApprovalBusy = false;
  @state() execApprovalError: string | null = null;
  @state() pendingGatewayUrl: string | null = null;

  @state() configLoading = false;
  @state() configRaw = "{\n}\n";
  @state() configRawOriginal = "";
  @state() configValid: boolean | null = null;
  @state() configIssues: unknown[] = [];
  @state() configSaving = false;
  @state() configApplying = false;
  @state() updateRunning = false;
  @state() applySessionKey = this.settings.lastActiveSessionKey;
  @state() configSnapshot: ConfigSnapshot | null = null;
  @state() configSchema: unknown | null = null;
  @state() configSchemaVersion: string | null = null;
  @state() configSchemaLoading = false;
  @state() configUiHints: ConfigUiHints = {};
  @state() configForm: Record<string, unknown> | null = null;
  @state() configFormOriginal: Record<string, unknown> | null = null;
  @state() configFormDirty = false;
  @state() configFormMode: "form" | "raw" = "form";
  @state() configSearchQuery = "";
  @state() configActiveSection: string | null = null;
  @state() configActiveSubsection: string | null = null;
  @state() configDocPanelOpen = false;
  @state() configDocSearchQuery = "";

  @state() channelsLoading = false;
  @state() channelsSnapshot: ChannelsStatusSnapshot | null = null;
  @state() channelsError: string | null = null;
  @state() channelsLastSuccess: number | null = null;
  @state() whatsappLoginMessage: string | null = null;
  @state() whatsappLoginQrDataUrl: string | null = null;
  @state() whatsappLoginConnected: boolean | null = null;
  @state() whatsappBusy = false;
  @state() nostrProfileFormState: NostrProfileFormState | null = null;
  @state() nostrProfileAccountId: string | null = null;

  @state() presenceLoading = false;
  @state() presenceEntries: PresenceEntry[] = [];
  @state() presenceError: string | null = null;
  @state() presenceStatus: string | null = null;

  @state() agentsLoading = false;
  @state() agentsList: AgentsListResult | null = null;
  @state() agentsError: string | null = null;

  @state() sessionsLoading = false;
  @state() sessionsResult: SessionsListResult | null = null;
  @state() sessionsError: string | null = null;
  @state() sessionsFilterActive = "";
  @state() sessionsFilterLimit = "120";
  @state() sessionsIncludeGlobal = true;
  @state() sessionsIncludeUnknown = false;

  @state() cronLoading = false;
  @state() cronJobs: CronJob[] = [];
  @state() cronStatus: CronStatus | null = null;
  @state() cronError: string | null = null;
  @state() cronForm: CronFormState = { ...DEFAULT_CRON_FORM };
  @state() cronRunsJobId: string | null = null;
  @state() cronRuns: CronRunLogEntry[] = [];
  @state() cronBusy = false;

  @state() skillsLoading = false;
  @state() skillsReport: SkillStatusReport | null = null;
  @state() skillsError: string | null = null;
  @state() skillsFilter = "";
  @state() skillEdits: Record<string, string> = {};
  @state() skillsBusyKey: string | null = null;
  @state() skillMessages: Record<string, SkillMessage> = {};
  @state() skillsActiveFilter: "all" | "active" | "needs-setup" | "disabled" = "all";
  @state() skillsSelectedSkill: string | null = null;
  @state() skillsSelectedSkillTab: import("./views/skills").SkillDetailTab = "overview";
  @state() analyzingSkill: string | null = null;
  @state() skillAnalysis: Record<string, { securityScan?: import("./types").SkillSecurityScan; richDescription?: import("./types").RichSkillDescription }> = {};

  @state() debugLoading = false;
  @state() debugStatus: StatusSummary | null = null;
  @state() debugHealth: HealthSnapshot | null = null;
  @state() debugModels: unknown[] = [];
  @state() debugHeartbeat: unknown | null = null;
  @state() debugCallMethod = "";
  @state() debugCallParams = "{}";
  @state() debugCallResult: string | null = null;
  @state() debugCallError: string | null = null;

  @state() logsLoading = false;
  @state() logsError: string | null = null;
  @state() logsFile: string | null = null;
  @state() logsEntries: LogEntry[] = [];
  @state() logsFilterText = "";
  @state() logsLevelFilters: Record<LogLevel, boolean> = {
    ...DEFAULT_LOG_LEVEL_FILTERS,
  };
  @state() logsAutoFollow = true;
  @state() logsTruncated = false;
  @state() logsCursor: number | null = null;
  @state() logsLastFetchAt: number | null = null;
  @state() logsLimit = 500;
  @state() logsMaxBytes = 250_000;
  @state() logsAtBottom = true;
  // Compliance state
  @state() complianceLoading = false;
  @state() complianceError: string | null = null;
  @state() complianceStatus: import("./types").ComplianceStatus | null = null;
  @state() complianceReports: import("./types").ComplianceReport[] = [];
  @state() complianceSelectedFramework: import("./types").ComplianceFramework | "all" = "all";
  @state() complianceActiveTab: "overview" | "reports" | "violations" | "settings" = "overview";

  // Models state
  @state() modelsLoading = false;
  @state() modelsError: string | null = null;
  @state() modelsProviders: import("./components/provider-card").ProviderCardData[] = [];
  @state() modelsSearchQuery = "";

  // ModelSelector state
  @state() selectedProvider: string | null = null;
  @state() selectedModel: string | null = null;
  @state() modelLoading = false;
  @state() configuredProviders: import("./components/model-selector").ModelProvider[] | null = null;
  @state() providersLoading = false;

  // Environment Variables state
  @state() envVars: Array<{
    key: string;
    encrypted: boolean;
    createdAt: number;
    updatedAt: number;
    hasValue: boolean;
    isSensitive: boolean;
  }> = [];
  @state() envLoading = false;
  @state() envSaving = false;
  @state() envError = "";
  @state() envModalOpen = false;
  @state() envEditingVar: { key: string } | null = null;
  @state() envKeyInput = "";
  @state() envValueInput = "";
  @state() envEncryptInput = true;
  @state() envValidationError = "";

  // Gateway restart state
  @state() restarting = false;

  // News state
  @state() newsLoading = false;
  @state() newsError: string | null = null;
  @state() newsItems: import("./views/news").NewsItem[] = [];
  @state() newsSelectedItem: import("./views/news").NewsItem | null = null;
  @state() newsFilter: "all" | "today" | "week" | "month" = "week";
  @state() newsSearchQuery = "";
  @state() newsSources: string[] = ["Hacker News", "Dev.to", "RSS Feeds"];
  @state() newsSelectedSources: string[] = ["Hacker News", "Dev.to", "RSS Feeds"];

  // Wizard state
  @state() wizardOpen = false;
  @state() wizardProviderId: string | null = null;
  @state() wizardProviderName: string | null = null;

  // MCP state
  @state() mcpLoading = false;
  @state() mcpError: string | null = null;
  @state() mcpServers: Array<{ id: string; name: string; url: string; status: string; category?: string; description?: string; transport?: string }> = [];
  @state() mcpSelectedServer: string | null = null;
  @state() mcpSearchQuery = "";
  @state() mcpSelectedCategory: string | null = null;
  @state() mcpShowAddModal = false;
  @state() mcpNewServerName = "";
  @state() mcpNewServerUrl = "";
  @state() mcpNewServerCategory = "development";
  // Marketplace expanded state
  @state() mcpShowMarketplace = false;
  @state() mcpMarketplace: Array<{ id: string; name: string; description: string; url: string; transport: string; category: string; installCommand?: string; tags?: string[]; official?: boolean }> = [];
  @state() mcpMarketplaceLoading = false;
  @state() mcpMarketplaceCategories: Array<{ id: string; name: string; count: number }> = [];
  @state() mcpMarketplaceTags: string[] = [];
  @state() mcpMarketplaceSearchQuery = "";
  @state() mcpMarketplaceSelectedCategory: string | null = null;
  @state() mcpMarketplaceSelectedTag: string | null = null;
  @state() mcpMarketplaceOfficialOnly = false;

  // Containers state
  @state() containersLoading = false;
  @state() containersError: string | null = null;
  @state() containers: Array<{ id: string; name: string; status: string; image: string }> = [];

  // Security state
  @state() securityLoading = false;
  @state() securityError: string | null = null;
  @state() securityStatus: { overallScore: number; lastScan: Date | null; vulnerabilities: number } | null = null;

  // Features state
  @state() featuresLoading = false;
  @state() featuresError: string | null = null;
  @state() featuresList: Array<{ id: string; name: string; description: string; icon: string; status: "enabled" | "disabled" | "needs_config" | "unavailable"; configurable: boolean; category: "speech" | "channels" | "ai" | "integrations" | "tools"; configFields?: Array<{ key: string; label: string; type: "text" | "password" | "select" | "toggle"; placeholder?: string; options?: { value: string; label: string }[]; required?: boolean }>; config?: Record<string, unknown> }> = [];
  @state() featuresSearchQuery = "";
  @state() featuresSelectedCategory: string | null = null;
  @state() featuresSelectedFeature: string | null = null;
  @state() featuresConfigModalOpen = false;
  @state() featuresConfigModalFeature: string | null = null;
  @state() featuresConfigFormData: Record<string, unknown> = {};
  @state() featuresConfigSubmitting = false;

  // OpenCode state
  @state() opencodeStatus: { enabled: boolean; runtimeAvailable: boolean; runtimeType: string | null; activeTasks: number; totalTasks: number; pendingApprovals: number } | null = null;
  @state() opencodeTasks: Array<{ id: string; prompt: string; status: string; createdAt: string; startedAt?: string; completedAt?: string; containerId?: string; workspacePath?: string; approvedBy?: string; approvedAt?: string; result?: string; error?: string; securityFlags?: string[] }> = [];
  @state() opencodeSelectedTask: { id: string; prompt: string; status: string; createdAt: string; startedAt?: string; completedAt?: string; containerId?: string; workspacePath?: string; approvedBy?: string; approvedAt?: string; result?: string; error?: string; securityFlags?: string[] } | null = null;
  @state() opencodeTaskInput = "";
  @state() opencodeTaskCreating = false;
  @state() opencodeConfig: Record<string, unknown> = {};
  @state() opencodeConfigLoading = false;
  @state() opencodeConfigError: string | null = null;
  @state() opencodeConfigDirty = false;
  @state() opencodeConfigSaving = false;
  @state() opencodeSettingsSection = "general";
  @state() opencodeSecuritySection = "overview";
  @state() opencodeSecurityConfig: Record<string, unknown> = {};
  @state() opencodeSecurityDirty = false;
  @state() opencodeSecuritySaving = false;
  @state() opencodeAuditLog: Array<{ id: string; timestamp: string; action: string; user?: string; taskId?: string; details: string; severity: string }> = [];
  @state() opencodeAuditLoading = false;

  // Channel setup modal state
  @state() channelSetupModalOpen = false;
  @state() channelSetupModalKey: string | null = null;
  @state() channelSetupModalFormData: Record<string, unknown> = {};
  @state() channelSetupModalSubmitting = false;
  @state() channelSetupModalError: string | null = null;

  client: GatewayBrowserClient | null = null;
  private chatScrollFrame: number | null = null;
  private chatScrollTimeout: number | null = null;
  private chatHasAutoScrolled = false;
  private chatUserNearBottom = true;
  private nodesPollInterval: number | null = null;
  private logsPollInterval: number | null = null;
  private debugPollInterval: number | null = null;
  private logsScrollFrame: number | null = null;
  private toolStreamById = new Map<string, ToolStreamEntry>();
  private toolStreamOrder: string[] = [];
  refreshSessionsAfterChat = new Set<string>();
  basePath = "";
  private popStateHandler = () =>
    onPopStateInternal(this as unknown as Parameters<typeof onPopStateInternal>[0]);
  private themeMedia: MediaQueryList | null = null;
  private themeMediaHandler: ((event: MediaQueryListEvent) => void) | null = null;
  private topbarObserver: ResizeObserver | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    handleConnected(this as unknown as Parameters<typeof handleConnected>[0]);
  }

  protected firstUpdated() {
    handleFirstUpdated(this as unknown as Parameters<typeof handleFirstUpdated>[0]);
  }

  disconnectedCallback() {
    handleDisconnected(this as unknown as Parameters<typeof handleDisconnected>[0]);
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    handleUpdated(this as unknown as Parameters<typeof handleUpdated>[0], changed);
  }

  connect() {
    connectGatewayInternal(this as unknown as Parameters<typeof connectGatewayInternal>[0]);
  }

  handleChatScroll(event: Event) {
    handleChatScrollInternal(
      this as unknown as Parameters<typeof handleChatScrollInternal>[0],
      event,
    );
  }

  handleLogsScroll(event: Event) {
    handleLogsScrollInternal(
      this as unknown as Parameters<typeof handleLogsScrollInternal>[0],
      event,
    );
  }

  exportLogs(lines: string[], label: string) {
    exportLogsInternal(lines, label);
  }

  resetToolStream() {
    resetToolStreamInternal(this as unknown as Parameters<typeof resetToolStreamInternal>[0]);
  }

  resetChatScroll() {
    resetChatScrollInternal(this as unknown as Parameters<typeof resetChatScrollInternal>[0]);
  }

  async loadAssistantIdentity() {
    await loadAssistantIdentityInternal(this);
  }

  applySettings(next: UiSettings) {
    applySettingsInternal(this as unknown as Parameters<typeof applySettingsInternal>[0], next);
  }

  setTab(next: Tab) {
    setTabInternal(this as unknown as Parameters<typeof setTabInternal>[0], next);
  }

  setTheme(next: ThemeMode, context?: Parameters<typeof setThemeInternal>[2]) {
    setThemeInternal(this as unknown as Parameters<typeof setThemeInternal>[0], next, context);
  }

  async loadOverview() {
    await loadOverviewInternal(this as unknown as Parameters<typeof loadOverviewInternal>[0]);
  }

  async loadCron() {
    await loadCronInternal(this as unknown as Parameters<typeof loadCronInternal>[0]);
  }

  async handleAbortChat() {
    await handleAbortChatInternal(this as unknown as Parameters<typeof handleAbortChatInternal>[0]);
  }

  removeQueuedMessage(id: string) {
    removeQueuedMessageInternal(
      this as unknown as Parameters<typeof removeQueuedMessageInternal>[0],
      id,
    );
  }

  async handleSendChat(
    messageOverride?: string,
    opts?: Parameters<typeof handleSendChatInternal>[2],
  ) {
    await handleSendChatInternal(
      this as unknown as Parameters<typeof handleSendChatInternal>[0],
      messageOverride,
      opts,
    );
  }

  async handleWhatsAppStart(force: boolean) {
    await handleWhatsAppStartInternal(this, force);
  }

  async handleWhatsAppWait() {
    await handleWhatsAppWaitInternal(this);
  }

  async handleWhatsAppLogout() {
    await handleWhatsAppLogoutInternal(this);
  }

  async handleChannelConfigSave() {
    await handleChannelConfigSaveInternal(this);
  }

  async handleChannelConfigReload() {
    await handleChannelConfigReloadInternal(this);
  }

  handleNostrProfileEdit(accountId: string, profile: NostrProfile | null) {
    handleNostrProfileEditInternal(this, accountId, profile);
  }

  handleNostrProfileCancel() {
    handleNostrProfileCancelInternal(this);
  }

  handleNostrProfileFieldChange(field: keyof NostrProfile, value: string) {
    handleNostrProfileFieldChangeInternal(this, field, value);
  }

  async handleNostrProfileSave() {
    await handleNostrProfileSaveInternal(this);
  }

  async handleNostrProfileImport() {
    await handleNostrProfileImportInternal(this);
  }

  handleNostrProfileToggleAdvanced() {
    handleNostrProfileToggleAdvancedInternal(this);
  }

  async handleExecApprovalDecision(decision: "allow-once" | "allow-always" | "deny") {
    const active = this.execApprovalQueue[0];
    if (!active || !this.client || this.execApprovalBusy) return;
    this.execApprovalBusy = true;
    this.execApprovalError = null;
    try {
      await this.client.request("exec.approval.resolve", {
        id: active.id,
        decision,
      });
      this.execApprovalQueue = this.execApprovalQueue.filter((entry) => entry.id !== active.id);
    } catch (err) {
      this.execApprovalError = `Exec approval failed: ${String(err)}`;
    } finally {
      this.execApprovalBusy = false;
    }
  }

  handleGatewayUrlConfirm() {
    const nextGatewayUrl = this.pendingGatewayUrl;
    if (!nextGatewayUrl) return;
    this.pendingGatewayUrl = null;
    applySettingsInternal(this as unknown as Parameters<typeof applySettingsInternal>[0], {
      ...this.settings,
      gatewayUrl: nextGatewayUrl,
    });
    this.connect();
  }

  handleGatewayUrlCancel() {
    this.pendingGatewayUrl = null;
  }

  // Sidebar handlers for tool output viewing
  handleOpenSidebar(content: string) {
    if (this.sidebarCloseTimer != null) {
      window.clearTimeout(this.sidebarCloseTimer);
      this.sidebarCloseTimer = null;
    }
    this.sidebarContent = content;
    this.sidebarError = null;
    this.sidebarOpen = true;
  }

  handleCloseSidebar() {
    this.sidebarOpen = false;
    // Clear content after transition
    if (this.sidebarCloseTimer != null) {
      window.clearTimeout(this.sidebarCloseTimer);
    }
    this.sidebarCloseTimer = window.setTimeout(() => {
      if (this.sidebarOpen) return;
      this.sidebarContent = null;
      this.sidebarError = null;
      this.sidebarCloseTimer = null;
    }, 200);
  }

  handleSplitRatioChange(ratio: number) {
    const newRatio = Math.max(0.4, Math.min(0.7, ratio));
    this.splitRatio = newRatio;
    this.applySettings({ ...this.settings, splitRatio: newRatio });
  }

  handleToggleCommandsMenu() {
    this.commandsMenuOpen = !this.commandsMenuOpen;
  }

  handleToggleVoiceRecorder() {
    this.voiceRecorderOpen = !this.voiceRecorderOpen;
  }

  handleScrollToBottom() {
    // Find the chat thread element and scroll to bottom
    const chatThread = document.querySelector('.chat-thread');
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight;
      this.chatScrolledUp = false;
    }
  }

  handleToggleConfigDocPanel() {
    this.configDocPanelOpen = !this.configDocPanelOpen;
  }

  handleConfigDocSearchChange(query: string) {
    this.configDocSearchQuery = query;
  }

  handleInsertConfigTemplate(template: string) {
    // Parse current config
    try {
      const current = JSON.parse(this.configRaw);
      const templateObj = JSON.parse(template);
      const key = Object.keys(templateObj)[0];
      
      // Merge template into current config
      this.configRaw = JSON.stringify({
        ...current,
        [key]: templateObj[key]
      }, null, 2);
    } catch {
      // If parsing fails, just append the template
      this.configRaw = this.configRaw.trim() + '\n' + template;
    }
  }

  handleInsertConfigField(field: string) {
    // Insert field name at cursor position or append to end
    const textarea = document.querySelector('.raw-editor__textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      this.configRaw = value.substring(0, start) + field + value.substring(end);
      
      // Restore cursor position after update
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + field.length;
        textarea.focus();
      }, 0);
    } else {
      // Fallback: append to end
      this.configRaw = this.configRaw.trim() + '\n' + field;
    }
  }

  // ==================== COMPLIANCE HANDLERS ====================
  
  handleComplianceTabChange(tab: "overview" | "reports" | "violations" | "settings") {
    this.complianceActiveTab = tab;
  }
  
  handleComplianceFrameworkChange(framework: import("./types").ComplianceFramework | "all") {
    this.complianceSelectedFramework = framework;
  }
  
  async handleComplianceRefresh() {
    this.complianceLoading = true;
    this.complianceError = null;

    try {
      const status = await this.client?.request("compliance.status", {});
      this.complianceStatus = status as import("./types").ComplianceStatus;

      const reports = await this.client?.request("compliance.reports.list", {});
      this.complianceReports = (reports as { reports: import("./types").ComplianceReport[] }).reports || [];
    } catch (err) {
      this.complianceError = String(err);
    } finally {
      this.complianceLoading = false;
    }
  }

  async handleComplianceGenerateReport(framework: import("./types").ComplianceFramework) {
    this.complianceLoading = true;

    try {
      await this.client?.request("compliance.report.generate", { framework });
      await this.handleComplianceRefresh();
    } catch (err) {
      this.complianceError = String(err);
    } finally {
      this.complianceLoading = false;
    }
  }

  async handleComplianceExportData() {
    const data = {
      status: this.complianceStatus,
      reports: this.complianceReports,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async handleComplianceViolationAcknowledge(id: string) {
    try {
      await this.client?.request("compliance.violation.acknowledge", { id });
      await this.handleComplianceRefresh();
    } catch (err) {
      this.complianceError = String(err);
    }
  }

  async handleComplianceViolationResolve(id: string) {
    try {
      await this.client?.request("compliance.violation.resolve", { id });
      await this.handleComplianceRefresh();
    } catch (err) {
      this.complianceError = String(err);
    }
  }

  // ModelSelector methods
  async loadCurrentModel() {
    if (!this.client || !this.sessionKey) {
      return;
    }
    this.modelLoading = true;
    try {
      const response = await this.client.request("models.current", {
        sessionKey: this.sessionKey,
      }) as { ok?: boolean; payload?: { provider?: string; model?: string } };
      if (response?.ok && response?.payload) {
        this.selectedProvider = response.payload.provider || null;
        this.selectedModel = response.payload.model || null;
      }
    } catch (error) {
      console.warn("[App] Failed to load current model:", error);
    } finally {
      this.modelLoading = false;
    }
  }

  async loadConfiguredProviders() {
    if (!this.client || !this.connected) {
      return;
    }
    this.providersLoading = true;
    try {
      // First, load the current selected model for this session
      const currentResponse = await this.client?.request("models.current", {
        sessionKey: this.sessionKey,
      }) as {
        provider?: string;
        model?: string;
      };
      
      if (currentResponse?.provider && currentResponse?.model) {
        this.selectedProvider = currentResponse.provider;
        this.selectedModel = currentResponse.model;
      }
      
      // Then load the configured providers list
      const response = await this.client?.request("models.configured", {}) as {
        providers?: import("./components/model-selector.js").ModelProvider[];
      };
      if (response?.providers) {
        this.configuredProviders = response.providers;
        
        // Fallback: if no selection and providers exist, select the first one
        if ((!this.selectedProvider || !this.selectedModel) && this.configuredProviders.length > 0) {
          const firstProvider = this.configuredProviders[0];
          if (firstProvider.models && firstProvider.models.length > 0) {
            this.selectedProvider = firstProvider.id;
            this.selectedModel = firstProvider.models[0].id;
            // Persist the selection
            await this.client.request("models.select", {
              sessionKey: this.sessionKey,
              providerId: this.selectedProvider,
              modelId: this.selectedModel,
            });
          }
        }
      } else {
        this.configuredProviders = [];
      }
    } catch (error) {
      console.warn("[App] Failed to load configured providers:", error);
      this.configuredProviders = [];
    } finally {
      this.providersLoading = false;
    }
  }

  // Models page handlers
  async handleModelsRefresh() {
    if (!this.client || !this.connected) {
      return;
    }
    this.modelsLoading = true;
    this.modelsError = null;
    try {
      const response = await this.client?.request("models.providers", {}) as {
        providers?: import("./components/provider-card.js").ProviderCardData[];
      };
      if (response?.providers) {
        this.modelsProviders = response.providers;
      } else {
        this.modelsProviders = [];
      }
    } catch (error) {
      console.warn("[App] Failed to load models providers:", error);
      this.modelsError = String(error);
      this.modelsProviders = [];
    } finally {
      this.modelsLoading = false;
    }
  }

  async handleModelsTest(profileId: string, credential: unknown) {
    if (!this.client || !this.connected) {
      return;
    }
    try {
      const response = await this.client.request("auth.test", {
        profileId,
        credential,
      }) as { ok?: boolean; error?: string };
      if (!response?.ok) {
        throw new Error(response?.error || "Test failed");
      }
    } catch (error) {
      console.warn("[App] Failed to test credential:", error);
      throw error;
    }
  }

  async handleModelsSave(profileId: string, credential: unknown, email?: string) {
    if (!this.client || !this.connected) {
      return;
    }
    try {
      const response = await this.client.request("auth.add", {
        profileId,
        credential,
        email,
      }) as { ok?: boolean; error?: string };
      if (!response?.ok) {
        throw new Error(response?.error || "Save failed");
      }
      // Refresh the providers list
      await this.handleModelsRefresh();
    } catch (error) {
      console.warn("[App] Failed to save credential:", error);
      throw error;
    }
  }

  async handleModelsRemove(profileId: string) {
    if (!this.client || !this.connected) {
      return;
    }
    try {
      const response = await this.client.request("auth.remove", {
        profileId,
      }) as { ok?: boolean; error?: string };
      if (!response?.ok) {
        throw new Error(response?.error || "Remove failed");
      }
      // Refresh the providers list
      await this.handleModelsRefresh();
    } catch (error) {
      console.warn("[App] Failed to remove credential:", error);
      throw error;
    }
  }

  // Skills handlers
  handleSkillsActiveFilterChange(filter: "all" | "active" | "needs-setup" | "disabled") {
    this.skillsActiveFilter = filter;
  }

  handleSkillsSelectSkill(skillKey: string | null) {
    this.skillsSelectedSkill = skillKey;
    // Reset to overview tab when selecting a new skill
    if (skillKey) {
      this.skillsSelectedSkillTab = "overview";
    }
  }

  handleSkillsSelectSkillTab(tab: import("./views/skills").SkillDetailTab) {
    this.skillsSelectedSkillTab = tab;
  }

  async handleAnalyzeSkill(skillKey: string, filePath: string) {
    if (!this.client || !this.connected) {
      return;
    }
    this.analyzingSkill = skillKey;
    this.skillsError = null;
    try {
      const result = (await this.client.request("skills.analyze", {
        skillKey,
        filePath,
      })) as { securityScan?: import("./types").SkillSecurityScan; richDescription?: import("./types").RichSkillDescription } | undefined;
      if (result) {
        this.skillAnalysis = {
          ...this.skillAnalysis,
          [skillKey]: result,
        };
        // Also update the skill in the report if it exists
        if (this.skillsReport?.skills) {
          const skillIndex = this.skillsReport.skills.findIndex(s => s.skillKey === skillKey);
          if (skillIndex >= 0) {
            const updatedSkills = [...this.skillsReport.skills];
            updatedSkills[skillIndex] = {
              ...updatedSkills[skillIndex],
              securityScan: result.securityScan,
              richDescription: result.richDescription,
            };
            this.skillsReport = {
              ...this.skillsReport,
              skills: updatedSkills,
            };
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.skillsError = message;
    } finally {
      this.analyzingSkill = null;
    }
  }

  // Environment Variables handlers
  async handleEnvLoad() {
    if (!this.client || !this.connected) {
      return;
    }
    this.envLoading = true;
    this.envError = "";
    try {
      const response = await this.client.request("env.list", {
        sessionKey: this.sessionKey,
      }) as { vars?: Array<{ key: string; encrypted: boolean; createdAt: number; updatedAt: number; hasValue: boolean; isSensitive: boolean }> };
      if (response?.vars) {
        this.envVars = response.vars;
      } else {
        this.envVars = [];
      }
    } catch (error) {
      console.warn("[App] Failed to load env vars:", error);
      this.envError = String(error);
      this.envVars = [];
    } finally {
      this.envLoading = false;
    }
  }

  handleEnvModalOpen(editVar?: { key: string }) {
    this.envEditingVar = editVar || null;
    this.envKeyInput = editVar?.key || "";
    this.envValueInput = "";
    this.envEncryptInput = true;
    this.envValidationError = "";
    this.envModalOpen = true;
  }

  handleEnvModalClose() {
    this.envModalOpen = false;
    this.envEditingVar = null;
    this.envKeyInput = "";
    this.envValueInput = "";
    this.envValidationError = "";
  }

  handleEnvKeyInput(value: string) {
    this.envKeyInput = value;
    this.envValidationError = "";
  }

  handleEnvValueInput(value: string) {
    this.envValueInput = value;
  }

  handleEnvEncryptInput(value: boolean) {
    this.envEncryptInput = value;
  }

  handleEnvValidationError(error: string) {
    this.envValidationError = error;
  }

  async handleEnvSave() {
    if (!this.client || !this.connected) {
      return;
    }
    this.envSaving = true;
    try {
      const response = await this.client.request("env.set", {
        sessionKey: this.sessionKey,
        key: this.envKeyInput,
        value: this.envValueInput,
        encrypt: this.envEncryptInput,
      }) as { ok?: boolean; error?: string };
      if (!response?.ok) {
        throw new Error(response?.error || "Save failed");
      }
      this.envModalOpen = false;
      await this.handleEnvLoad();
    } catch (error) {
      console.warn("[App] Failed to save env var:", error);
      this.envValidationError = String(error);
    } finally {
      this.envSaving = false;
    }
  }

  async handleEnvDelete(key: string) {
    if (!this.client || !this.connected) {
      return;
    }
    try {
      const response = await this.client.request("env.delete", {
        sessionKey: this.sessionKey,
        key,
      }) as { ok?: boolean; error?: string };
      if (!response?.ok) {
        throw new Error(response?.error || "Delete failed");
      }
      await this.handleEnvLoad();
    } catch (error) {
      console.warn("[App] Failed to delete env var:", error);
      this.envError = String(error);
    }
  }

  async handleRestart() {
    if (!this.client || !this.connected) {
      return;
    }
    this.restarting = true;
    try {
      // Use config.patch with restartDelayMs to trigger gateway restart
      const response = await this.client.request("config.patch", {
        raw: JSON.stringify({}),
        baseHash: "",
        sessionKey: this.sessionKey,
        restartDelayMs: 5000,
      }) as { ok?: boolean; error?: string };
      if (!response?.ok) {
        throw new Error(response?.error || "Restart failed");
      }
      // Wait a bit then refresh connection
      setTimeout(() => {
        this.connect();
      }, 6000);
    } catch (error) {
      console.warn("[App] Failed to restart gateway:", error);
      this.lastError = String(error);
    } finally {
      this.restarting = false;
    }
  }

  // News handlers
  async handleNewsLoad() {
    if (!this.client || !this.connected) {
      this.newsError = "Not connected to gateway";
      return;
    }

    this.newsLoading = true;
    this.newsError = null;
    try {
      const response = await this.client.request("news.list", {
        limit: 50,
        sources: this.newsSelectedSources,
      }) as { items?: import("./views/news").NewsItem[] };

      this.newsItems = response?.items || [];
      console.log(`[News] Loaded ${this.newsItems.length} items`);
    } catch (error) {
      console.error("[News] Failed to load:", error);
      this.newsError = error instanceof Error ? error.message : "Failed to load news";
      this.newsItems = [];
    } finally {
      this.newsLoading = false;
    }
  }

  async handleNewsRefresh() {
    await this.handleNewsLoad();
  }

  handleNewsFilterChange(filter: "all" | "today" | "week" | "month") {
    this.newsFilter = filter;
  }

  handleNewsSearchChange(query: string) {
    this.newsSearchQuery = query;
  }

  handleNewsSourceToggle(source: string, enabled: boolean) {
    if (enabled) {
      this.newsSelectedSources = [...this.newsSelectedSources, source];
    } else {
      this.newsSelectedSources = this.newsSelectedSources.filter(s => s !== source);
    }
  }

  handleNewsSelectItem(item: import("./views/news").NewsItem | null) {
    this.newsSelectedItem = item;
  }

  // Wizard handlers
  handleModelsConfigure(providerId: string) {
    const provider = this.modelsProviders?.find(p => p.id === providerId);
    this.wizardProviderId = providerId;
    this.wizardProviderName = provider?.name || null;
    this.wizardOpen = true;
  }

  handleModelsManage(providerId: string) {
    console.log("[Models] Manage provider:", providerId);
    // TODO: Implement manage functionality
  }

  handleModelsSearchChange(query: string) {
    this.modelsSearchQuery = query;
  }

  handleWizardClose() {
    this.wizardOpen = false;
    this.wizardProviderId = null;
    this.wizardProviderName = null;
  }

  async handleWizardSave(e: CustomEvent) {
    const { providerId, credential } = e.detail;
    console.log("[Wizard] Save provider:", providerId);
    try {
      await this.handleModelsSave(providerId, credential);
      this.handleWizardClose();
    } catch (error) {
      console.error("[Wizard] Failed to save:", error);
    }
  }

  handleOAuthStart(e: CustomEvent) {
    const { providerId, url } = e.detail;
    console.log("[Wizard] OAuth start for:", providerId);
    window.open(url, "_blank");
  }

  // MCP handlers
  async handleMcpLoad() {
    console.log("[MCP] Loading servers...");
    this.mcpLoading = true;
    this.mcpError = null;
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      const result = await this.client.request("mcp.list", {}) as { servers?: Array<{ id: string; name: string; url: string; status: string; category?: string; description?: string; transport?: string }> };
      this.mcpServers = result?.servers || [];
    } catch (error) {
      console.error("[MCP] Failed to load:", error);
      this.mcpError = error instanceof Error ? error.message : "Failed to load MCP servers";
    } finally {
      this.mcpLoading = false;
    }
  }

  async handleMcpAddServer(name: string, url: string, transport: string = "stdio", category?: string, description?: string) {
    console.log("[MCP] Add server:", name, url, transport, category);
    
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      const result = await this.client.request("mcp.add", { 
        name, 
        url, 
        transport,
        category: category || "other",
        description: description || ""
      }) as { server?: { id: string; name: string; url: string; status: string; category?: string; description?: string } };
      
      if (result?.server) {
        this.mcpServers = [...this.mcpServers, result.server];
      }
      
      this.handleMcpCloseAddModal();
    } catch (error) {
      console.error("[MCP] Failed to add server:", error);
      this.mcpError = error instanceof Error ? error.message : "Failed to add MCP server";
    }
  }

  async handleMcpRemoveServer(id: string) {
    console.log("[MCP] Remove server:", id);
    
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      await this.client.request("mcp.remove", { id });
      
      this.mcpServers = this.mcpServers.filter(s => s.id !== id);
      if (this.mcpSelectedServer === id) {
        this.mcpSelectedServer = null;
      }
    } catch (error) {
      console.error("[MCP] Failed to remove server:", error);
      this.mcpError = error instanceof Error ? error.message : "Failed to remove MCP server";
    }
  }

  async handleMcpToggleServer(id: string, enabled: boolean) {
    console.log(`[MCP] Toggle server ${id}:`, enabled);
    
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      await this.client.request("mcp.enable", { id, enabled });
      
      // Update local state
      const serverIndex = this.mcpServers.findIndex(s => s.id === id);
      if (serverIndex >= 0) {
        this.mcpServers[serverIndex] = {
          ...this.mcpServers[serverIndex],
          status: enabled ? "connected" : "disconnected"
        };
        this.mcpServers = [...this.mcpServers];
      }
    } catch (error) {
      console.error(`[MCP] Failed to toggle server ${id}:`, error);
      this.mcpError = error instanceof Error ? error.message : `Failed to ${enabled ? "enable" : "disable"} MCP server`;
    }
  }

  async handleMcpInstallFromMarketplace(marketplaceId: string) {
    console.log("[MCP] Install from marketplace:", marketplaceId);
    
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      const result = await this.client.request("mcp.install", { marketplaceId }) as { server?: { id: string; name: string; url: string; status: string; category?: string; description?: string }; installCommand?: string };
      
      if (result?.server) {
        this.mcpServers = [...this.mcpServers, result.server];
        
        // Show install command if available
        if (result.installCommand) {
          console.log(`[MCP] Install command: ${result.installCommand}`);
        }
      }
    } catch (error) {
      console.error("[MCP] Failed to install from marketplace:", error);
      this.mcpError = error instanceof Error ? error.message : "Failed to install MCP server";
    }
  }

  async handleMcpLoadMarketplace() {
    console.log("[MCP] Loading marketplace...");
    
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      const result = await this.client.request("mcp.marketplace", {}) as { servers?: Array<{ id: string; name: string; description: string; url: string; transport: string; category: string; installCommand?: string }> };
      return result?.servers || [];
    } catch (error) {
      console.error("[MCP] Failed to load marketplace:", error);
      return [];
    }
  }

  handleMcpSearchChange(query: string) {
    this.mcpSearchQuery = query;
  }

  handleMcpCategoryChange(category: string | null) {
    this.mcpSelectedCategory = category;
  }

  handleMcpSelectServer(id: string | null) {
    this.mcpSelectedServer = id;
  }

  handleMcpOpenAddModal() {
    this.mcpShowAddModal = true;
  }

  handleMcpCloseAddModal() {
    this.mcpShowAddModal = false;
    this.mcpNewServerName = "";
    this.mcpNewServerUrl = "";
    this.mcpNewServerCategory = "development";
    this.mcpError = null;
  }

  handleMcpUpdateNewServerName(value: string) {
    this.mcpNewServerName = value;
  }

  handleMcpUpdateNewServerUrl(value: string) {
    this.mcpNewServerUrl = value;
  }

  handleMcpUpdateNewServerCategory(value: string) {
    this.mcpNewServerCategory = value;
  }

  async handleMcpShowMarketplace() {
    console.log("[MCP] Opening marketplace...");
    this.mcpShowMarketplace = true;
    this.mcpMarketplaceLoading = true;
    this.mcpError = null;
    
    try {
      // Load categories first
      await this.handleMcpLoadMarketplaceCategories();
      // Then load all servers
      const servers = await this.handleMcpLoadMarketplace();
      this.mcpMarketplace = servers;
    } catch (error) {
      console.error("[MCP] Failed to load marketplace:", error);
      this.mcpMarketplace = [];
    } finally {
      this.mcpMarketplaceLoading = false;
    }
  }

  handleMcpCloseMarketplace() {
    console.log("[MCP] Closing marketplace...");
    this.mcpShowMarketplace = false;
    this.mcpMarketplace = [];
    this.mcpMarketplaceCategories = [];
    this.mcpMarketplaceTags = [];
    this.mcpMarketplaceSearchQuery = "";
    this.mcpMarketplaceSelectedCategory = null;
    this.mcpMarketplaceSelectedTag = null;
    this.mcpMarketplaceOfficialOnly = false;
    this.mcpError = null;
  }

  async handleMcpMarketplaceSearchChange(query: string) {
    this.mcpMarketplaceSearchQuery = query;
    await this.handleMcpRefreshMarketplace();
  }

  async handleMcpMarketplaceCategoryChange(category: string | null) {
    this.mcpMarketplaceSelectedCategory = category;
    await this.handleMcpRefreshMarketplace();
  }

  async handleMcpMarketplaceTagChange(tag: string | null) {
    this.mcpMarketplaceSelectedTag = tag;
    await this.handleMcpRefreshMarketplace();
  }

  async handleMcpMarketplaceOfficialToggle() {
    this.mcpMarketplaceOfficialOnly = !this.mcpMarketplaceOfficialOnly;
    await this.handleMcpRefreshMarketplace();
  }

  async handleMcpRefreshMarketplace() {
    if (!this.client || !this.connected) return;
    
    this.mcpMarketplaceLoading = true;
    try {
      const result = await this.client.request("mcp.marketplace", {
        search: this.mcpMarketplaceSearchQuery || undefined,
        category: this.mcpMarketplaceSelectedCategory || undefined,
        tag: this.mcpMarketplaceSelectedTag || undefined,
        official: this.mcpMarketplaceOfficialOnly || undefined,
      }) as { 
        servers?: Array<{ id: string; name: string; description: string; url: string; transport: string; category: string; installCommand?: string; tags?: string[]; official?: boolean }>;
        tags?: string[];
      };
      
      this.mcpMarketplace = result?.servers || [];
      if (result?.tags) {
        this.mcpMarketplaceTags = result.tags;
      }
    } catch (error) {
      console.error("[MCP] Failed to refresh marketplace:", error);
      this.mcpError = error instanceof Error ? error.message : "Failed to refresh marketplace";
    } finally {
      this.mcpMarketplaceLoading = false;
    }
  }

  async handleMcpLoadMarketplaceCategories() {
    if (!this.client || !this.connected) return;
    
    try {
      const result = await this.client.request("mcp.categories", {}) as { 
        categories?: Array<{ id: string; name: string; count: number }>;
      };
      this.mcpMarketplaceCategories = result?.categories || [];
    } catch (error) {
      console.error("[MCP] Failed to load categories:", error);
    }
  }

  async handleMcpResetMarketplaceFilters() {
    this.mcpMarketplaceSearchQuery = "";
    this.mcpMarketplaceSelectedCategory = null;
    this.mcpMarketplaceSelectedTag = null;
    this.mcpMarketplaceOfficialOnly = false;
    await this.handleMcpRefreshMarketplace();
  }

  // Containers handlers
  async handleContainersLoad() {
    this.containersLoading = true;
    this.containersError = null;
    try {
      const response = await fetch("/api/containers", {
        headers: {
          "Authorization": `Bearer ${this.sessionKey}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to load containers: ${response.statusText}`);
      }
      const data = await response.json() as { containers: Array<{ id: string; name: string; status: string; image: string }> };
      this.containers = data.containers || [];
    } catch (error) {
      this.containersError = error instanceof Error ? error.message : "Failed to load containers";
      this.containers = [];
    } finally {
      this.containersLoading = false;
    }
  }

  async handleContainerStart(id: string) {
    console.log("[Containers] Start:", id);
    // Note: Starting containers is handled via the sandbox system, not the containers API
    // This would require a separate sandbox creation endpoint
    this.containersError = "Container start is handled via the sandbox system";
  }

  async handleContainerStop(id: string) {
    console.log("[Containers] Stop:", id);
    try {
      const response = await fetch(`/api/containers/${id}/stop`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.sessionKey}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to stop container: ${response.statusText}`);
      }
      // Refresh the containers list
      await this.handleContainersLoad();
    } catch (error) {
      this.containersError = error instanceof Error ? error.message : "Failed to stop container";
    }
  }

  async handleContainerRestart(id: string) {
    console.log("[Containers] Restart:", id);
    // Note: Restarting containers typically involves stopping and then starting
    // For now, we'll just stop and let the user start it via sandbox
    try {
      await this.handleContainerStop(id);
      this.containersError = "Container stopped. Use sandbox system to restart.";
    } catch (error) {
      this.containersError = error instanceof Error ? error.message : "Failed to restart container";
    }
  }

  async handleContainerLogs(id: string) {
    console.log("[Containers] View logs:", id);
    try {
      const response = await fetch(`/api/containers/${id}/logs?tail=100`, {
        headers: {
          "Authorization": `Bearer ${this.sessionKey}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to get container logs: ${response.statusText}`);
      }
      const data = await response.json() as { containerId: string; logs: string; tail: number };
      // Store logs in a way that the UI can display them
      // For now, we'll use a simple alert or store in state
      this.sidebarContent = data.logs;
      this.sidebarOpen = true;
    } catch (error) {
      this.containersError = error instanceof Error ? error.message : "Failed to get container logs";
    }
  }

  // Channel toggle handler
  async handleToggleChannel(channelKey: string, enabled: boolean) {
    console.log(`[Channels] Toggle ${channelKey}:`, enabled);
    if (!this.client || !this.connected) {
      this.channelsError = "Not connected to gateway";
      return;
    }

    try {
      // Load current config to get the base hash
      const configRes = await this.client.request("config.get", {}) as {
        hash?: string;
        config?: Record<string, unknown>;
      };
      const baseHash = configRes?.hash;
      const currentConfig = configRes?.config ?? {};

      if (!baseHash) {
        throw new Error("Config hash missing; cannot update");
      }

      // Create the config patch - preserve existing channel config
      const channels = (currentConfig.channels as Record<string, unknown>) ?? {};
      const existingChannelConfig = (channels[channelKey] as Record<string, unknown>) ?? {};

      // Get channel-specific default config if enabling and no config exists
      let channelConfig: Record<string, unknown>;
      if (enabled && Object.keys(existingChannelConfig).length === 0) {
        const { getDefaultChannelConfig } = await import("./views/channels.config");
        channelConfig = getDefaultChannelConfig(channelKey as import("./views/channels.config").ChannelConfigType);
      } else {
        // Merge with existing config
        channelConfig = { ...existingChannelConfig };
        if (channelKey !== "whatsapp") {
          channelConfig.enabled = enabled;
        }
      }

      const newConfig = {
        ...currentConfig,
        channels: {
          ...channels,
          [channelKey]: channelConfig,
        },
      };

      console.log(`[Channels] Setting config for ${channelKey}:`, newConfig.channels[channelKey]);

      // Apply the config change
      const response = await this.client.request("config.set", {
        raw: JSON.stringify(newConfig),
        baseHash,
      }) as { ok?: boolean; error?: string; details?: unknown };

      if (!response?.ok) {
        throw new Error(response?.error || "Failed to update configuration");
      }

      // Clear any previous error
      this.channelsError = null;

      // Refresh channels status
      const { loadChannels } = await import("./controllers/channels");
      await loadChannels(
        {
          client: this.client,
          connected: this.connected,
          channelsLoading: this.channelsLoading,
          channelsSnapshot: this.channelsSnapshot,
          channelsError: this.channelsError,
          channelsLastSuccess: this.channelsLastSuccess,
          whatsappLoginMessage: this.whatsappLoginMessage,
          whatsappLoginQrDataUrl: this.whatsappLoginQrDataUrl,
          whatsappLoginConnected: this.whatsappLoginConnected,
          whatsappBusy: this.whatsappBusy,
        },
        true,
      );

      console.log(`[Channels] Successfully toggled ${channelKey} to ${enabled}`);
    } catch (error) {
      console.error(`[Channels] Failed to toggle ${channelKey}:`, error);
      this.channelsError = error instanceof Error ? error.message : `Failed to toggle ${channelKey}`;

      // Force a refresh to show current state
      const { loadChannels } = await import("./controllers/channels");
      await loadChannels(
        {
          client: this.client,
          connected: this.connected,
          channelsLoading: this.channelsLoading,
          channelsSnapshot: this.channelsSnapshot,
          channelsError: this.channelsError,
          channelsLastSuccess: this.channelsLastSuccess,
          whatsappLoginMessage: this.whatsappLoginMessage,
          whatsappLoginQrDataUrl: this.whatsappLoginQrDataUrl,
          whatsappLoginConnected: this.whatsappLoginConnected,
          whatsappBusy: this.whatsappBusy,
        },
        false,
      );
    }
  }

  // Security handlers
  async handleSecurityLoad() {
    this.securityLoading = true;
    this.securityError = null;
    try {
      // TODO: Load security status from backend
      this.securityStatus = { overallScore: 0, lastScan: null, vulnerabilities: 0 };
    } catch (error) {
      this.securityError = error instanceof Error ? error.message : "Failed to load security data";
    } finally {
      this.securityLoading = false;
    }
  }

  async handleSecurityScan() {
    console.log("[Security] Starting scan...");
    // TODO: Implement security scan
  }

  // Features handlers
  async handleFeaturesLoad() {
    console.log("[Features] Loading...");
    this.featuresLoading = true;
    this.featuresError = null;
    
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      const result = await this.client.request("features.list", {}) as { features?: Array<{ id: string; name: string; description: string; icon: string; status: "enabled" | "disabled" | "needs_config" | "unavailable"; configurable: boolean; category: "speech" | "channels" | "ai" | "integrations" | "tools"; configFields?: Array<{ key: string; label: string; type: "text" | "password" | "select" | "toggle"; placeholder?: string; options?: { value: string; label: string }[]; required?: boolean }>; config?: Record<string, unknown> }> };
      this.featuresList = result?.features || [];
    } catch (error) {
      console.error("[Features] Failed to load:", error);
      this.featuresError = error instanceof Error ? error.message : "Failed to load features";
    } finally {
      this.featuresLoading = false;
    }
  }

  async handleFeaturesToggle(id: string, enabled: boolean) {
    console.log(`[Features] Toggle ${id}:`, enabled);
    
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      await this.client.request("features.toggle", { id, enabled });
      
      // Update local state
      const featureIndex = this.featuresList.findIndex(f => f.id === id);
      if (featureIndex >= 0) {
        this.featuresList[featureIndex] = {
          ...this.featuresList[featureIndex],
          status: enabled ? "enabled" : "disabled"
        };
        this.featuresList = [...this.featuresList];
      }
    } catch (error) {
      console.error(`[Features] Failed to toggle ${id}:`, error);
      this.featuresError = error instanceof Error ? error.message : `Failed to toggle ${id}`;
    }
  }

  async handleFeaturesConfigure(id: string, config: Record<string, unknown>) {
    console.log(`[Features] Configure ${id}:`, config);
    this.featuresConfigSubmitting = true;
    
    try {
      if (!this.client || !this.connected) {
        throw new Error("Not connected to gateway");
      }
      
      const result = await this.client.request("features.configure", { id, config }) as { status?: string };
      
      // Update local state
      const featureIndex = this.featuresList.findIndex(f => f.id === id);
      if (featureIndex >= 0) {
        this.featuresList[featureIndex] = {
          ...this.featuresList[featureIndex],
          status: (result?.status as "enabled" | "disabled" | "needs_config" | "unavailable") || "enabled"
        };
        this.featuresList = [...this.featuresList];
      }
      
      // Close modal on success
      this.handleFeaturesCloseConfigModal();
    } catch (error) {
      console.error(`[Features] Failed to configure ${id}:`, error);
      this.featuresError = error instanceof Error ? error.message : `Failed to configure ${id}`;
    } finally {
      this.featuresConfigSubmitting = false;
    }
  }

  handleFeaturesSearchChange(query: string) {
    this.featuresSearchQuery = query;
  }

  handleFeaturesCategoryChange(category: string | null) {
    this.featuresSelectedCategory = category;
  }

  handleFeaturesSelectFeature(id: string | null) {
    this.featuresSelectedFeature = id;
  }

  handleFeaturesOpenConfigModal(id: string) {
    const feature = this.featuresList.find(f => f.id === id);
    if (!feature) return;
    
    this.featuresConfigModalFeature = id;
    // Pre-populate form with current config values
    this.featuresConfigFormData = feature.config || {};
    this.featuresConfigModalOpen = true;
    this.featuresError = null;
  }

  handleFeaturesCloseConfigModal() {
    this.featuresConfigModalOpen = false;
    this.featuresConfigModalFeature = null;
    this.featuresConfigFormData = {};
    this.featuresConfigSubmitting = false;
  }

  handleFeaturesConfigFormChange(key: string, value: unknown) {
    this.featuresConfigFormData = {
      ...this.featuresConfigFormData,
      [key]: value
    };
  }

  // OpenCode handlers
  async handleOpencodeStatusLoad() {
    const { loadOpencodeStatus } = await import("./controllers/opencode");
    await loadOpencodeStatus(this as unknown as Parameters<typeof loadOpencodeStatus>[0]);
  }

  async handleOpencodeTasksLoad() {
    const { loadOpencodeTasks } = await import("./controllers/opencode");
    await loadOpencodeTasks(this as unknown as Parameters<typeof loadOpencodeTasks>[0]);
  }

  handleOpencodeTaskInputChange(value: string) {
    this.opencodeTaskInput = value;
  }

  async handleOpencodeTaskCreate() {
    if (!this.opencodeTaskInput.trim()) return;
    const { createOpencodeTask } = await import("./controllers/opencode");
    await createOpencodeTask(this as unknown as Parameters<typeof createOpencodeTask>[0], this.opencodeTaskInput);
  }

  handleOpencodeTaskSelect(task: { id: string; prompt: string; status: string; createdAt: string } | null) {
    this.opencodeSelectedTask = task as typeof this.opencodeSelectedTask;
  }

  async handleOpencodeTaskApprove(taskId: string) {
    const { approveOpencodeTask } = await import("./controllers/opencode");
    await approveOpencodeTask(this as unknown as Parameters<typeof approveOpencodeTask>[0], taskId);
  }

  async handleOpencodeTaskCancel(taskId: string) {
    const { cancelOpencodeTask } = await import("./controllers/opencode");
    await cancelOpencodeTask(this as unknown as Parameters<typeof cancelOpencodeTask>[0], taskId);
  }

  async handleOpencodeTaskLogs(taskId: string) {
    console.log("View logs for task:", taskId);
  }

  async handleOpencodeTaskDownload(taskId: string) {
    console.log("Download workspace for task:", taskId);
  }

  async handleOpencodeConfigLoad() {
    const { loadOpencodeConfig } = await import("./controllers/opencode");
    await loadOpencodeConfig(this as unknown as Parameters<typeof loadOpencodeConfig>[0]);
  }

  async handleOpencodeConfigSave() {
    const { saveOpencodeConfig } = await import("./controllers/opencode");
    await saveOpencodeConfig(this as unknown as Parameters<typeof saveOpencodeConfig>[0]);
  }

  handleOpencodeConfigReset() {
    this.handleOpencodeConfigLoad();
  }

  async handleOpencodeConfigChange(key: string, value: unknown) {
    const { updateOpencodeConfigValue } = await import("./controllers/opencode");
    updateOpencodeConfigValue(this as unknown as Parameters<typeof updateOpencodeConfigValue>[0], key, value);
  }

  handleOpencodeSettingsSectionChange(section: string) {
    this.opencodeSettingsSection = section;
  }

  async handleOpencodeSecurityLoad() {
    const { loadOpencodeSecurity } = await import("./controllers/opencode");
    await loadOpencodeSecurity(this as unknown as Parameters<typeof loadOpencodeSecurity>[0]);
  }

  async handleOpencodeSecuritySave() {
    const { saveOpencodeSecurity } = await import("./controllers/opencode");
    await saveOpencodeSecurity(this as unknown as Parameters<typeof saveOpencodeSecurity>[0]);
  }

  handleOpencodeSecurityReset() {
    this.handleOpencodeSecurityLoad();
  }

  async handleOpencodeSecurityChange(key: string, value: unknown) {
    const { updateOpencodeSecurityValue } = await import("./controllers/opencode");
    updateOpencodeSecurityValue(this as unknown as Parameters<typeof updateOpencodeSecurityValue>[0], key, value);
  }

  handleOpencodeSecuritySectionChange(section: string) {
    this.opencodeSecuritySection = section;
  }

  async handleOpencodeAuditLoad() {
    const { loadOpencodeAudit } = await import("./controllers/opencode");
    await loadOpencodeAudit(this as unknown as Parameters<typeof loadOpencodeAudit>[0]);
  }

  async handleOpencodeAuditRefresh() {
    await this.handleOpencodeAuditLoad();
  }

  async handleOpencodeAuditExport() {
    const { exportOpencodeAudit } = await import("./controllers/opencode");
    await exportOpencodeAudit(this as unknown as Parameters<typeof exportOpencodeAudit>[0]);
  }

  // Channel setup modal handlers
  async handleChannelSetupOpen(channelKey: string) {
    console.log(`[ChannelSetup] Opening modal for ${channelKey}`);
    const { getDefaultChannelConfig } = await import("./views/channels.config");
    
    this.channelSetupModalKey = channelKey;
    this.channelSetupModalFormData = getDefaultChannelConfig(channelKey as import("./views/channels.config").ChannelConfigType);
    this.channelSetupModalOpen = true;
    this.channelSetupModalSubmitting = false;
    this.channelSetupModalError = null;
  }

  handleChannelSetupClose() {
    console.log("[ChannelSetup] Closing modal");
    this.channelSetupModalOpen = false;
    this.channelSetupModalKey = null;
    this.channelSetupModalFormData = {};
    this.channelSetupModalSubmitting = false;
    this.channelSetupModalError = null;
  }

  handleChannelSetupFieldChange(fieldName: string, value: unknown) {
    console.log(`[ChannelSetup] Field ${fieldName} changed:`, value);
    this.channelSetupModalFormData = {
      ...this.channelSetupModalFormData,
      [fieldName]: value,
    };
  }

  async handleChannelSetupSubmit(channelKey: string, config: Record<string, unknown>) {
    console.log(`[ChannelSetup] Submitting config for ${channelKey}:`, config);
    
    if (!this.client || !this.connected) {
      this.channelSetupModalError = "Not connected to gateway";
      return;
    }

    this.channelSetupModalSubmitting = true;
    this.channelSetupModalError = null;

    try {
      // Load current config to get the base hash
      const configRes = await this.client.request("config.get", {}) as {
        hash?: string;
        config?: Record<string, unknown>;
      };
      const baseHash = configRes?.hash;
      const currentConfig = configRes?.config ?? {};

      if (!baseHash) {
        throw new Error("Config hash missing; cannot update");
      }

      // Create the config patch
      const channels = (currentConfig.channels as Record<string, unknown>) ?? {};
      
      const newConfig = {
        ...currentConfig,
        channels: {
          ...channels,
          [channelKey]: config,
        },
      };

      console.log(`[ChannelSetup] Setting config for ${channelKey}:`, newConfig.channels[channelKey]);

      // Apply the config change
      const response = await this.client.request("config.set", {
        raw: JSON.stringify(newConfig),
        baseHash,
      }) as { ok?: boolean; error?: string; details?: unknown };

      if (!response?.ok) {
        throw new Error(response?.error || "Failed to update configuration");
      }

      // Close modal on success
      this.handleChannelSetupClose();

      // Refresh channels status
      const { loadChannels } = await import("./controllers/channels");
      await loadChannels(
        {
          client: this.client,
          connected: this.connected,
          channelsLoading: this.channelsLoading,
          channelsSnapshot: this.channelsSnapshot,
          channelsError: this.channelsError,
          channelsLastSuccess: this.channelsLastSuccess,
          whatsappLoginMessage: this.whatsappLoginMessage,
          whatsappLoginQrDataUrl: this.whatsappLoginQrDataUrl,
          whatsappLoginConnected: this.whatsappLoginConnected,
          whatsappBusy: this.whatsappBusy,
        },
        true,
      );

      console.log(`[ChannelSetup] Successfully configured ${channelKey}`);
    } catch (error) {
      console.error(`[ChannelSetup] Failed to configure ${channelKey}:`, error);
      this.channelSetupModalError = error instanceof Error ? error.message : `Failed to configure ${channelKey}`;
    } finally {
      this.channelSetupModalSubmitting = false;
    }
  }

  render() {
    return renderApp(this);
  }
}
