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
import { applySettingsFromUrl } from "./app-settings";
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
  @state() onboardingStep: "welcome" | "auth" | "channels" | "features" | "complete" = "welcome";
  @state() onboardingProgress = 0;
  @state() onboardingAuthProvider: string | null = null;
  @state() onboardingApiKey: string | null = null;
  @state() onboardingChannels: string[] = [];
  @state() onboardingFeatures: string[] = ["voice_recorder", "tts", "web_search"];
  @state() onboardingSessionToken: string | null = null;
  @state() onboardingLoading = false;
  @state() onboardingError: string | null = null;
  // Provider config wizard
  @state() wizardOpen = false;
  @state() wizardProviderId: string | null = null;
  @state() wizardProviderName: string | null = null;
  // News
  @state() newsLoading = false;
  @state() newsError: string | null = null;
  @state() newsItems: unknown[] = [];
  @state() newsTotalCount = 0;
  @state() newsHasMore = false;
  @state() newsSelectedSource: string | null = null;
  @state() newsSelectedCategory: string | null = null;
  @state() newsTimeRange = "7d";
  @state() newsSearchQuery = "";
  @state() newsSelectedSentiment: string | null = null;
  @state() newsLimit = 20;
  @state() newsOffset = 0;
  @state() newsSources: Array<{ id: string; name: string; type: string; url: string; enabled: boolean; itemCount: number }> = [];
  @state() newsSelectedSources: string[] = [];
  @state() newsFilter: 'all' | 'today' | 'week' | 'month' = 'all';
  @state() newsSelectedItem: unknown | null = null;
  @state() newsModalOpen = false;
  @state() newsRefreshing = false;
  // Features
  @state() featuresLoading = false;
  @state() featuresError: string | null = null;
  @state() featuresList: unknown[] = [];
  @state() featuresSearchQuery = "";
  @state() featuresSummary: Record<string, unknown> = {};
  @state() featureCategories: string[] = [];
  @state() expandedCategories: string[] = [];
  @state() featuresConfigModalOpen = false;
  @state() featuresConfigModalFeature: string | null = null;
  @state() featuresConfigFormData: Record<string, unknown> = {};
  // Containers
  @state() containersLoading = false;
  @state() containersError: string | null = null;
  @state() containers: unknown[] = [];
  // Opencode
  @state() opencodeLoading = false;
  @state() opencodeError: string | null = null;
  @state() opencodeStatus: string | null = null;
  @state() opencodeTasks: unknown[] = [];
  @state() opencodeTaskCreating = false;
  @state() opencodeTaskInput = "";
  @state() opencodeConfigLoading = false;
  @state() opencodeConfigError: string | null = null;
  @state() opencodeConfig: Record<string, unknown> = {};
  @state() opencodeConfigDirty = false;
  @state() opencodeConfigSaving = false;
  @state() opencodeSecurityConfig: Record<string, unknown> = {};
  @state() opencodeSecurityDirty = false;
  @state() opencodeSecuritySaving = false;
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
  // Scroll buttons state
  @state() showScrollToTop = false;
  @state() showScrollToBottom = false;
  @state() newMessageCount = 0;
  @state() commandsMenuOpen = false;
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
  @state() configuredProfileIds: string[] = [];
  @state() modelsShowAddForm: string | null = null;

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

  // Security state
  @state() securityLoading = false;
  @state() securityError: string | null = null;
  @state() securityStatus: Record<string, unknown> | null = null;

  // MCP state
  @state() mcpLoading = false;
  @state() mcpError: string | null = null;
  @state() mcpServers: unknown[] = [];
  @state() mcpSearchQuery = "";
  @state() mcpSelectedCategory: string | null = null;
  @state() mcpShowAddModal = false;
  @state() mcpNewServerName = "";
  @state() mcpNewServerUrl = "";
  @state() mcpNewServerCategory = "other";
  @state() mcpShowMarketplace = false;
  @state() mcpMarketplace: unknown[] = [];
  @state() mcpMarketplaceLoading = false;
  @state() mcpMarketplaceSearchQuery = "";
  @state() mcpMarketplaceSelectedCategory: string | null = null;
  @state() mcpMarketplaceSelectedTag: string | null = null;
  @state() mcpMarketplaceOfficialOnly = false;
  @state() mcpMarketplaceCategories: string[] = [];
  @state() mcpMarketplaceTags: string[] = [];

  // Model Routing state
  @state() modelRoutingLoading = false;
  @state() modelRoutingError: string | null = null;
  @state() modelRoutingStatus: Record<string, unknown> | null = null;
  @state() routingTestPrompt = "";
  @state() routingTestResult: Record<string, unknown> | undefined = undefined;

  // Ollama/Llama state
  @state() ollamaLoading = false;
  @state() ollamaError: string | null = null;
  @state() ollamaStatus: Record<string, unknown> | null = null;
  @state() ollamaPullProgress: {
    model: string;
    progress: { status: string; completed?: number; total?: number; percent?: number };
  } | null = null;

  // Toast notifications
  @state() toasts: Array<{ id: string; message: string; type: 'error' | 'success' | 'info'; duration?: number }> = [];

  // Rate Limits state
  @state() rateLimitsLoading = false;
  @state() rateLimitsError: string | null = null;
  @state() rateLimitsStatus: Record<string, unknown> | null = null;

  // Budget state
  @state() budgetLoading = false;
  @state() budgetError: string | null = null;
  @state() budgetStatus: Record<string, unknown> | null = null;

  // Metrics state
  @state() metricsLoading = false;
  @state() metricsError: string | null = null;
  @state() metricsStatus: Record<string, unknown> | null = null;

  // Cache state
  @state() cacheLoading = false;
  @state() cacheError: string | null = null;
  @state() cacheStatus: Record<string, unknown> | null = null;

  // Voice Recorder state
  @state() voiceRecorderOpen = false;

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
    // Extract token from URL before connecting
    applySettingsFromUrl(this as unknown as Parameters<typeof applySettingsFromUrl>[0]);
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

  handleScrollToTop() {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.showScrollToTop = false;
  }

  handleScrollToBottom() {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }
    this.showScrollToBottom = false;
    this.newMessageCount = 0;
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
      console.log("[DEBUG] Calling models.providers...");
      const response = await this.client?.request("models.providers", {}) as {
        providers?: import("./components/provider-card.js").ProviderCardData[];
      };
      console.log("[DEBUG] models.providers response:", response);
      if (response?.providers) {
        console.log("[DEBUG] Got providers:", response.providers.length);
        this.modelsProviders = response.providers;
      } else {
        console.log("[DEBUG] No providers in response");
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

  // Onboarding wizard methods
  setOnboardingAuthProvider(provider: string) {
    this.onboardingAuthProvider = provider;
    this.onboardingError = null;
  }

  setOnboardingApiKey(key: string) {
    this.onboardingApiKey = key;
    this.onboardingError = null;
  }

  toggleOnboardingChannel(channel: string) {
    const idx = this.onboardingChannels.indexOf(channel);
    if (idx >= 0) {
      this.onboardingChannels.splice(idx, 1);
    } else {
      this.onboardingChannels.push(channel);
    }
  }

  toggleOnboardingFeature(feature: string) {
    const idx = this.onboardingFeatures.indexOf(feature);
    if (idx >= 0) {
      this.onboardingFeatures.splice(idx, 1);
    } else {
      this.onboardingFeatures.push(feature);
    }
  }

  async onboardingNextStep() {
    const STEP_ORDER: Array<"welcome" | "auth" | "channels" | "features" | "complete"> = ["welcome", "auth", "channels", "features", "complete"];
    const STEP_PROGRESS: Record<string, number> = {
      welcome: 0,
      auth: 25,
      channels: 50,
      features: 75,
      complete: 100,
    };
    
    const currentIdx = STEP_ORDER.indexOf(this.onboardingStep);
    if (currentIdx < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIdx + 1];
      
      if (this.client && this.connected && this.onboardingSessionToken) {
        try {
          this.onboardingLoading = true;
          await this.client.request("onboard.wizard", {
            action: "next",
            token: this.onboardingSessionToken,
            data: {
              provider: this.onboardingAuthProvider,
              apiKey: this.onboardingAuthProvider === "ollama" ? null : this.onboardingApiKey,
              channels: this.onboardingChannels,
              features: this.onboardingFeatures,
            },
          });
        } catch (err) {
          this.onboardingError = String(err);
          this.onboardingLoading = false;
          return;
        } finally {
          this.onboardingLoading = false;
        }
      }
      
      this.onboardingStep = nextStep;
      this.onboardingProgress = STEP_PROGRESS[nextStep];
      this.onboardingError = null;
    }
  }

  onboardingPrevStep() {
    const STEP_ORDER: Array<"welcome" | "auth" | "channels" | "features" | "complete"> = ["welcome", "auth", "channels", "features", "complete"];
    const STEP_PROGRESS: Record<string, number> = {
      welcome: 0,
      auth: 25,
      channels: 50,
      features: 75,
      complete: 100,
    };
    
    const currentIdx = STEP_ORDER.indexOf(this.onboardingStep);
    if (currentIdx > 0) {
      const prevStep = STEP_ORDER[currentIdx - 1];
      this.onboardingStep = prevStep;
      this.onboardingProgress = STEP_PROGRESS[prevStep];
      this.onboardingError = null;
    }
  }

  async completeOnboarding() {
    if (!this.client || !this.connected || !this.onboardingSessionToken) {
      this.onboardingError = "Not connected to gateway";
      return;
    }

    try {
      this.onboardingLoading = true;
      await this.client.request("onboard.wizard", {
        action: "complete",
        token: this.onboardingSessionToken,
        data: {
          provider: this.onboardingAuthProvider,
          apiKey: this.onboardingAuthProvider === "ollama" ? null : this.onboardingApiKey,
          channels: this.onboardingChannels,
          features: this.onboardingFeatures,
        },
      });
      
      this.onboardingStep = "complete";
      this.onboardingProgress = 100;
      this.onboardingError = null;
      this.onboarding = false;
      this.setTab("chat");
    } catch (err) {
      this.onboardingError = String(err);
    } finally {
      this.onboardingLoading = false;
    }
  }

  async startOnboarding() {
    if (!this.client || !this.connected) {
      this.onboardingError = "Not connected to gateway";
      return;
    }

    try {
      this.onboardingLoading = true;
      this.onboardingError = null;
      
      const res = await this.client.request("onboard.wizard", {
        action: "start",
      }) as { token?: string; step?: string; progress?: number };
      
      if (res?.token) {
        this.onboardingSessionToken = res.token;
      }
      
      const STEP_ORDER: Array<"welcome" | "auth" | "channels" | "features" | "complete"> = ["welcome", "auth", "channels", "features", "complete"];
      const step = (res?.step as "welcome" | "auth" | "channels" | "features" | "complete") || "welcome";
      if (STEP_ORDER.includes(step)) {
        this.onboardingStep = step;
      } else {
        this.onboardingStep = "welcome";
      }
      this.onboardingProgress = res?.progress ?? 0;
      this.onboardingAuthProvider = null;
      this.onboardingApiKey = null;
      this.onboardingChannels = [];
      this.onboardingFeatures = ["voice_recorder", "tts", "web_search"];
    } catch (err) {
      this.onboardingError = String(err);
    } finally {
      this.onboardingLoading = false;
    }
  }

  // Config methods
  async handleConfigLoad() {
    this.configLoading = true;
    try {
      // Implementation would go here
      this.configLoading = false;
    } catch (err) {
      this.configLoading = false;
      throw err;
    }
  }

  async handleConfigSave() {
    this.configSaving = true;
    try {
      // Implementation would go here
      this.configSaving = false;
    } catch (err) {
      this.configSaving = false;
      throw err;
    }
  }

  async handleConfigApply() {
    this.configApplying = true;
    try {
      // Implementation would go here
      this.configApplying = false;
    } catch (err) {
      this.configApplying = false;
      throw err;
    }
  }

  handleConfigFormUpdate(path: string, value: unknown) {
    if (this.configForm) {
      this.configForm[path] = value;
    }
  }

  handleConfigFormModeChange(mode: "form" | "raw") {
    this.configFormMode = mode;
  }

  handleConfigRawChange(raw: string) {
    this.configRaw = raw;
  }

  // Wizard methods
  handleWizardClose() {
    this.wizardOpen = false;
    this.wizardProviderId = null;
    this.wizardProviderName = null;
  }

  handleWizardSave(e: CustomEvent) {
    console.log("[Wizard] Save:", e.detail);
    this.handleWizardClose();
  }

  handleOAuthStart(e: CustomEvent) {
    console.log("[Wizard] OAuth start:", e.detail);
  }

  // News methods
  async handleNewsLoad() {
    this.newsLoading = true;
    this.newsError = null;
    try {
      // Implementation would go here
      this.newsLoading = false;
    } catch (err) {
      this.newsError = String(err);
      this.newsLoading = false;
    }
  }

  handleNewsSourceChange(source: string | null) {
    this.newsSelectedSource = source;
  }

  handleNewsCategoryChange(category: string | null) {
    this.newsSelectedCategory = category;
  }

  handleNewsTimeRangeChange(range: string) {
    this.newsTimeRange = range;
  }

  handleNewsSearchChange(query: string) {
    this.newsSearchQuery = query;
  }

  handleNewsSentimentChange(sentiment: string | null) {
    this.newsSelectedSentiment = sentiment;
  }

  handleNewsLimitChange(limit: number) {
    this.newsLimit = limit;
  }

  handleNewsOffsetChange(offset: number) {
    this.newsOffset = offset;
  }

  handleNewsSourceToggle(source: string, checked: boolean) {
    if (checked) {
      this.newsSelectedSources = [...this.newsSelectedSources, source];
    } else {
      this.newsSelectedSources = this.newsSelectedSources.filter((s) => s !== source);
    }
  }

  handleNewsFilterChange(filter: 'all' | 'today' | 'week' | 'month') {
    this.newsFilter = filter;
  }

  handleNewsSelectItem(item: unknown | null) {
    this.newsSelectedItem = item;
    this.newsModalOpen = item !== null;
  }

  async handleNewsRefresh() {
    this.newsRefreshing = true;
    try {
      // Trigger refresh via controller
      await import('./controllers/news.js').then(({ refreshNews }) => refreshNews(this));
    } finally {
      this.newsRefreshing = false;
    }
  }

  // Features methods
  async handleFeaturesLoad() {
    const { loadFeaturesDashboard } = await import("./controllers/features.js");
    await loadFeaturesDashboard(this as any);
  }

  async handleFeaturesSearchChange(query: string) {
    const { searchFeatures } = await import("./controllers/features.js");
    searchFeatures(this as any, query);
  }

  async handleToggleCategory(category: string) {
    const { toggleCategory } = await import("./controllers/features.js");
    toggleCategory(this as any, category);
  }

  async handleFeaturesToggle(featureId: string, enabled: boolean) {
    const { toggleFeature } = await import("./controllers/features.js");
    await toggleFeature(this as any, featureId, enabled);
  }

  async handleFeaturesOpenConfigModal(featureId: string) {
    const { openFeatureConfigModal } = await import("./controllers/features.js");
    openFeatureConfigModal(this as any, featureId);
  }

  async handleFeaturesCloseConfigModal() {
    const { closeFeatureConfigModal } = await import("./controllers/features.js");
    closeFeatureConfigModal(this as any);
  }

  async handleFeaturesConfigure(featureId: string, data: Record<string, unknown>) {
    const { configureFeature } = await import("./controllers/features.js");
    await configureFeature(this as any, featureId, data);
    this.handleFeaturesCloseConfigModal();
  }

  // Container methods
  async handleContainersLoad() {
    const { loadContainers } = await import("./controllers/containers.js");
    await loadContainers(this);
  }

  async handleContainerStart(containerId: string) {
    const { startContainer } = await import("./controllers/containers.js");
    await startContainer(this, containerId);
  }

  async handleContainerStop(containerId: string) {
    const { stopContainer } = await import("./controllers/containers.js");
    await stopContainer(this, containerId);
  }

  async handleContainerRestart(containerId: string) {
    const { restartContainer } = await import("./controllers/containers.js");
    await restartContainer(this, containerId);
  }

  async handleContainerLogs(containerId: string) {
    const { getContainerLogs } = await import("./controllers/containers.js");
    return await getContainerLogs(this, containerId);
  }

  // Opencode methods
  async handleOpencodeLoad() {
    const { loadOpencodeStatus } = await import("./controllers/opencode.js");
    await loadOpencodeStatus(this);
  }

  handleOpencodeTaskInput(value: string) {
    this.opencodeTaskInput = value;
    console.log("[Opencode] Task input:", value);
  }

  async handleOpencodeTaskCreate() {
    const { createOpencodeTask } = await import("./controllers/opencode.js");
    await createOpencodeTask(this, this.opencodeTaskInput);
  }

  // Security handlers
  async handleSecurityLoad() {
    const { loadSecurityStatus } = await import("./controllers/security.js");
    await loadSecurityStatus(this);
  }

  async handleSecurityScan() {
    const { runSecurityScan } = await import("./controllers/security.js");
    await runSecurityScan(this);
  }

  // MCP handlers
  async handleMcpLoad() {
    const { loadMCPServers } = await import("./controllers/mcp.js");
    await loadMCPServers(this);
  }

  async handleMcpSearchChange(query: string) {
    const { searchMCPServers } = await import("./controllers/mcp.js");
    searchMCPServers(this, query);
  }

  handleMcpCategoryChange(category: string | null) {
    this.mcpSelectedCategory = category;
  }

  async handleMcpToggleServer(serverId: string, enabled: boolean) {
    if (!this.client?.connected) return;
    
    try {
      await this.client.request("mcp.enable", { id: serverId, enabled });
      // Reload the server list to reflect changes
      await this.handleMcpLoad();
    } catch (err) {
      console.error(`[MCP] Failed to toggle server ${serverId}:`, err);
      this.mcpError = err instanceof Error ? err.message : "Failed to toggle server";
    }
  }

  async handleMcpRemoveServer(serverId: string) {
    if (!this.client?.connected) return;
    
    try {
      await this.client.request("mcp.remove", { id: serverId });
      // Reload the server list to reflect changes
      await this.handleMcpLoad();
    } catch (err) {
      console.error(`[MCP] Failed to remove server ${serverId}:`, err);
      this.mcpError = err instanceof Error ? err.message : "Failed to remove server";
    }
  }

  handleMcpOpenAddModal() {
    this.mcpShowAddModal = true;
    this.mcpNewServerName = "";
    this.mcpNewServerUrl = "";
    this.mcpNewServerCategory = "other";
  }

  handleMcpCloseAddModal() {
    this.mcpShowAddModal = false;
  }

  handleMcpUpdateNewServerName(name: string) {
    this.mcpNewServerName = name;
  }

  handleMcpUpdateNewServerUrl(url: string) {
    this.mcpNewServerUrl = url;
  }

  handleMcpUpdateNewServerCategory(category: string) {
    this.mcpNewServerCategory = category;
  }

  async handleMcpAddServer(name: string, url: string, category: string) {
    if (!this.client?.connected) return;
    
    try {
      await this.client.request("mcp.add", {
        name,
        url,
        category,
        transport: "stdio",
        enabled: true,
      });
      // Reload the server list to reflect changes
      await this.handleMcpLoad();
      this.mcpShowAddModal = false;
      // Reset form
      this.mcpNewServerName = "";
      this.mcpNewServerUrl = "";
      this.mcpNewServerCategory = "other";
    } catch (err) {
      console.error("[MCP] Failed to add server:", err);
      this.mcpError = err instanceof Error ? err.message : "Failed to add server";
    }
  }

  handleMcpShowMarketplace() {
    this.mcpShowMarketplace = true;
    this.loadMcpMarketplace();
  }

  handleMcpCloseMarketplace() {
    this.mcpShowMarketplace = false;
  }

  async loadMcpMarketplace() {
    if (!this.client?.connected) {
      // Fallback to mock data if not connected
      this.mcpMarketplace = [
        { id: "1", name: "Filesystem", description: "File system operations", category: "development", official: true },
        { id: "2", name: "GitHub", description: "GitHub API integration", category: "version-control", official: true },
        { id: "3", name: "PostgreSQL", description: "PostgreSQL database access", category: "database", official: true },
        { id: "4", name: "Slack", description: "Slack messaging", category: "communication", official: false },
        { id: "5", name: "Puppeteer", description: "Browser automation", category: "browser", official: true },
      ];
      this.mcpMarketplaceCategories = ["development", "version-control", "database", "communication", "browser", "other"];
      this.mcpMarketplaceTags = ["official", "community", "database", "api", "automation"];
      return;
    }

    this.mcpMarketplaceLoading = true;
    
    try {
      const result = await this.client.request("mcp.marketplace", {
        search: this.mcpMarketplaceSearchQuery || undefined,
        category: this.mcpMarketplaceSelectedCategory || undefined,
        tag: this.mcpMarketplaceSelectedTag || undefined,
        officialOnly: this.mcpMarketplaceOfficialOnly,
      }) as { servers: any[]; categories: string[]; tags: string[] };

      this.mcpMarketplace = result.servers || [];
      this.mcpMarketplaceCategories = result.categories || [];
      this.mcpMarketplaceTags = result.tags || [];
    } catch (err) {
      console.error("[MCP] Failed to load marketplace:", err);
      this.mcpError = err instanceof Error ? err.message : "Failed to load marketplace";
      // Fallback to empty arrays on error
      this.mcpMarketplace = [];
      this.mcpMarketplaceCategories = [];
      this.mcpMarketplaceTags = [];
    } finally {
      this.mcpMarketplaceLoading = false;
    }
  }

  handleMcpMarketplaceSearchChange(query: string) {
    this.mcpMarketplaceSearchQuery = query;
  }

  handleMcpMarketplaceCategoryChange(category: string | null) {
    this.mcpMarketplaceSelectedCategory = category;
  }

  handleMcpMarketplaceTagChange(tag: string | null) {
    this.mcpMarketplaceSelectedTag = tag;
  }

  handleMcpMarketplaceOfficialToggle() {
    this.mcpMarketplaceOfficialOnly = !this.mcpMarketplaceOfficialOnly;
  }

  handleMcpResetMarketplaceFilters() {
    this.mcpMarketplaceSearchQuery = "";
    this.mcpMarketplaceSelectedCategory = null;
    this.mcpMarketplaceSelectedTag = null;
    this.mcpMarketplaceOfficialOnly = false;
  }

  async handleMcpInstallFromMarketplace(serverId: string) {
    if (!this.client?.connected) return;
    
    try {
      await this.client.request("mcp.install", { marketplaceId: serverId });
      // Reload both marketplace and server list
      await this.loadMcpMarketplace();
      await this.handleMcpLoad();
    } catch (err) {
      console.error(`[MCP] Failed to install from marketplace: ${serverId}`, err);
      this.mcpError = err instanceof Error ? err.message : "Failed to install server";
    }
  }

  // Model Routing handlers
  async handleModelRoutingLoad() {
    const { loadModelRoutingStatus } = await import("./controllers/model-routing.js");
    await loadModelRoutingStatus(this as any);
  }

  async handleModelRoutingToggle(enabled: boolean) {
    const { toggleModelRouting } = await import("./controllers/model-routing.js");
    await toggleModelRouting(this as any, enabled);
  }

  async handleAddModelToTier(tier: string, model: string) {
    const { addModelToTier } = await import("./controllers/model-routing.js");
    await addModelToTier(this as any, tier as any, model);
  }

  async handleRemoveModelFromTier(tier: string, index: number) {
    const { removeModelFromTier } = await import("./controllers/model-routing.js");
    await removeModelFromTier(this as any, tier as any, index);
  }

  async handleReorderModelsInTier(tier: string, fromIndex: number, toIndex: number) {
    const { reorderModelsInTier } = await import("./controllers/model-routing.js");
    await reorderModelsInTier(this as any, tier as any, fromIndex, toIndex);
  }

  handleRoutingTestChange(prompt: string) {
    this.routingTestPrompt = prompt;
  }

  async handleTestRouting() {
    const { testRouting } = await import("./controllers/model-routing.js");
    const result = await testRouting(this as any, this.routingTestPrompt || "");
    this.routingTestResult = result as Record<string, unknown> | undefined;
  }

  // Llama handlers (replaces Ollama)
  async handleOllamaLoad() {
    const { loadLlamaStatus } = await import("./controllers/llama.js");
    await loadLlamaStatus(this as any);
  }

  async handleOllamaToggleFeature(enabled: boolean) {
    const { toggleLlamaFeature } = await import("./controllers/llama.js");
    await toggleLlamaFeature(this as any, enabled);
  }

  async handleOllamaInstall() {
    const { installLlama } = await import("./controllers/llama.js");
    await installLlama(this as any);
  }

  async handleOllamaStart() {
    const { startLlamaServer } = await import("./controllers/llama.js");
    await startLlamaServer(this as any);
  }

  async handleOllamaStop() {
    const { stopLlamaServer } = await import("./controllers/llama.js");
    await stopLlamaServer(this as any);
  }

  async handleOllamaPullModel(model: string) {
    const { downloadModel } = await import("./controllers/llama.js");
    await downloadModel(this as any, model);
  }

  async handleOllamaRemoveModel(model: string) {
    const { removeModel } = await import("./controllers/llama.js");
    await removeModel(this as any, model);
  }

  async handleOllamaDetectHardware() {
    if (!this.client) return;
    try {
      const result = await this.client.request("llama.hardware.detect") as { ok: boolean; config?: Record<string, unknown> };
      if (result.ok && result.config) {
        this.addToast("Hardware auto-detected successfully", "success");
        // Update status to reflect new hardware config
        await this.handleOllamaLoad();
      }
    } catch (err) {
      this.addToast("Failed to detect hardware: " + String(err), "error");
    }
  }

  async handleOllamaConfigureHardware(config: Record<string, unknown>) {
    if (!this.client) return;
    try {
      await this.client.request("llama.hardware.config", config);
      this.addToast("Hardware configuration updated", "success");
      // Reload status to show updated config
      await this.handleOllamaLoad();
    } catch (err) {
      this.addToast("Failed to configure hardware: " + String(err), "error");
    }
  }

  // Toast notifications
  addToast(message: string, type: 'error' | 'success' | 'info' = 'info', duration = 5000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.toasts = [...this.toasts, { id, message, type, duration }];
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // Rate Limits handlers
  async handleRateLimitsLoad() {
    const { loadRateLimits } = await import("./controllers/rate-limits.js");
    await loadRateLimits(this as any);
  }

  async handleRateLimitsConfigure(config: Record<string, unknown>) {
    const { configureRateLimits } = await import("./controllers/rate-limits.js");
    await configureRateLimits(this as any, config);
  }

  async handleRateLimitsReset() {
    const { resetRateLimits } = await import("./controllers/rate-limits.js");
    await resetRateLimits(this as any);
  }

  async handleRateLimitsToggle(enabled: boolean) {
    const { toggleRateLimits } = await import("./controllers/rate-limits.js");
    await toggleRateLimits(this as any, enabled);
  }

  // Budget handlers
  async handleBudgetLoad() {
    const { loadBudget } = await import("./controllers/budget.js");
    await loadBudget(this as any);
  }

  async handleBudgetConfigure(config: Record<string, unknown>) {
    const { configureBudget } = await import("./controllers/budget.js");
    await configureBudget(this as any, config);
  }

  async handleBudgetReset() {
    const { resetBudget } = await import("./controllers/budget.js");
    await resetBudget(this as any);
  }

  async handleBudgetBreakdown(period: "today" | "month" | "custom", startDate?: string, endDate?: string) {
    const { getBudgetBreakdown } = await import("./controllers/budget.js");
    return await getBudgetBreakdown(this as any, period, startDate, endDate);
  }

  async handleBudgetExport() {
    const { exportBudgetCSV } = await import("./controllers/budget.js");
    return await exportBudgetCSV(this as any);
  }

  // Metrics handlers
  async handleMetricsLoad(period: import("./controllers/metrics").MetricsPeriod = "24h") {
    const { loadMetrics } = await import("./controllers/metrics.js");
    await loadMetrics(this as any, period);
  }

  async handleMetricsCosts(period: import("./controllers/metrics").MetricsPeriod = "24h", groupBy: "provider" | "model" | "day" = "day") {
    const { getCosts } = await import("./controllers/metrics.js");
    return await getCosts(this as any, period, groupBy);
  }

  async handleMetricsModels(period: import("./controllers/metrics").MetricsPeriod = "24h") {
    const { getModels } = await import("./controllers/metrics.js");
    return await getModels(this as any, period);
  }

  async handleMetricsSessions(period: import("./controllers/metrics").MetricsPeriod = "24h") {
    const { getSessions } = await import("./controllers/metrics.js");
    return await getSessions(this as any, period);
  }

  async handleMetricsExport(format: "json" | "csv" = "csv") {
    const { exportMetrics } = await import("./controllers/metrics.js");
    return await exportMetrics(this as any, format);
  }

  async handleMetricsReset() {
    const { resetMetrics } = await import("./controllers/metrics.js");
    await resetMetrics(this as any);
  }

  // Cache handlers
  async handleCacheLoad() {
    const { loadCache } = await import("./controllers/cache.js");
    await loadCache(this as any);
  }

  async handleCacheClear(cacheName?: string) {
    const { clearCache } = await import("./controllers/cache.js");
    await clearCache(this as any, cacheName);
  }

  async handleCacheClearAll() {
    const { clearAllCaches } = await import("./controllers/cache.js");
    await clearAllCaches(this as any);
  }

  async handleCacheGetConfig(cacheName?: string) {
    const { getCacheConfig } = await import("./controllers/cache.js");
    return await getCacheConfig(this as any, cacheName);
  }

  async handleCacheSetConfig(cacheName: string, config: { ttl?: number; maxSize?: number }) {
    const { setCacheConfig } = await import("./controllers/cache.js");
    await setCacheConfig(this as any, cacheName, config);
  }

  async handleCacheWarm(cacheName: string, data: Array<{ key: string; value: unknown }>) {
    const { warmCache } = await import("./controllers/cache.js");
    return await warmCache(this as any, cacheName, data);
  }

  async handleCacheGetStats() {
    const { getCacheStats } = await import("./controllers/cache.js");
    return await getCacheStats(this as any);
  }

  // Memory handlers
  async handleMemoryLoadFiles() {
    const { loadMemoryFiles } = await import("./controllers/memory.js");
    await loadMemoryFiles(this as any);
  }

  async handleMemoryGetFile(name?: string, date?: string) {
    const { getMemoryFile } = await import("./controllers/memory.js");
    return await getMemoryFile(this as any, name, date);
  }

  async handleMemorySaveFile(name: string, content: string) {
    const { saveMemoryFile } = await import("./controllers/memory.js");
    await saveMemoryFile(this as any, name, content);
  }

  async handleMemorySaveSession(date: string, session: Record<string, unknown>) {
    const { saveSessionMemory } = await import("./controllers/memory.js");
    await saveSessionMemory(this as any, date, session);
  }

  async handleMemoryGenerateSummary(content: string) {
    const { generateSummary } = await import("./controllers/memory.js");
    return await generateSummary(this as any, content);
  }

  async handleMemorySaveSummary(date: string, summary: Record<string, unknown>) {
    const { saveSummary } = await import("./controllers/memory.js");
    await saveSummary(this as any, date, summary);
  }

  async handleMemorySearch(query: string) {
    const { searchMemories } = await import("./controllers/memory.js");
    return await searchMemories(this as any, query);
  }

  async handleMemoryGetConfig() {
    const { getMemoryConfig } = await import("./controllers/memory.js");
    return await getMemoryConfig(this as any);
  }

  async handleMemorySetConfig(config: Record<string, unknown>) {
    const { setMemoryConfig } = await import("./controllers/memory.js");
    await setMemoryConfig(this as any, config as any);
  }

  async handleMemoryDeleteSession(date: string) {
    const { deleteSessionMemory } = await import("./controllers/memory.js");
    await deleteSessionMemory(this as any, date);
  }

  async handleMemoryCleanup() {
    const { cleanupOldMemories } = await import("./controllers/memory.js");
    return await cleanupOldMemories(this as any);
  }

  // Voice Recorder methods
  handleToggleVoiceRecorder() {
    this.voiceRecorderOpen = !this.voiceRecorderOpen;
  }

  handleVoiceTranscription(text: string) {
    // Append transcription to current chat message
    const currentMessage = this.chatMessage || "";
    this.chatMessage = currentMessage ? `${currentMessage} ${text}` : text;
  }

  // Models methods
  async handleModelsConfigure(providerId: string) {
    this.wizardProviderId = providerId;
    this.wizardOpen = true;
  }

  async handleModelsManage(providerId: string) {
    // Open the provider configuration wizard
    this.wizardProviderId = providerId;
    this.wizardOpen = true;
  }

  handleModelsSearchChange(query: string) {
    this.modelsSearchQuery = query;
  }

  // Skill methods
  async handleInstallSkill(key: string) {
    const { installSkill } = await import("./controllers/skills.js");
    await installSkill(this, key, key, key);
  }

  async handleUpdateSkill(key: string) {
    const { loadSkills } = await import("./controllers/skills.js");
    await loadSkills(this);
  }

  async handleToggleSkillEnabled(key: string, enabled: boolean) {
    const { updateSkillEnabled } = await import("./controllers/skills.js");
    await updateSkillEnabled(this, key, enabled);
  }

  async handleUpdateSkillEdit(key: string, value: string) {
    const { updateSkillEdit } = await import("./controllers/skills.js");
    updateSkillEdit(this, key, value);
  }

  async handleSaveSkillApiKey(key: string, apiKey: string) {
    const { saveSkillApiKey } = await import("./controllers/skills.js");
    await saveSkillApiKey(this, key);
  }

  handleSkillsActiveFilterChange(filter: "all" | "active" | "needs-setup" | "disabled") {
    this.skillsActiveFilter = filter;
  }

  handleSkillsSelectSkill(skillKey: string | null) {
    this.skillsSelectedSkill = skillKey;
  }

  handleSkillsSelectSkillTab(tab: import("./views/skills").SkillDetailTab) {
    this.skillsSelectedSkillTab = tab;
  }

  async handleAnalyzeSkill(skillKey: string, filePath: string) {
    const { analyzeSkill } = await import("./controllers/skills.js");
    await analyzeSkill(this, skillKey, filePath);
  }

  // Cron methods
  async handleCronToggle(jobId: string, enabled: boolean) {
    const { toggleCronJob } = await import("./controllers/cron.js");
    const job = this.cronJobs.find(j => j.id === jobId);
    if (job) {
      await toggleCronJob(this, job, enabled);
    }
  }

  async handleCronRun(jobId: string) {
    const { runCronJob } = await import("./controllers/cron.js");
    const job = this.cronJobs.find(j => j.id === jobId);
    if (job) {
      await runCronJob(this, job);
    }
  }

  async handleCronRemove(jobId: string) {
    const { removeCronJob } = await import("./controllers/cron.js");
    const job = this.cronJobs.find(j => j.id === jobId);
    if (job) {
      await removeCronJob(this, job);
    }
  }

  async handleCronAdd() {
    const { addCronJob } = await import("./controllers/cron.js");
    await addCronJob(this);
  }

  async handleCronRunsLoad(jobId: string) {
    const { loadCronRuns } = await import("./controllers/cron.js");
    await loadCronRuns(this, jobId);
  }

  handleCronFormUpdate(path: string, value: unknown) {
    // Update the form state directly
    if (path.includes('.')) {
      const parts = path.split('.');
      let current: any = this.cronForm;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      (this.cronForm as any)[path] = value;
    }
  }

  // Sessions methods
  async handleSessionsLoad() {
    const { loadSessions } = await import("./controllers/sessions.js");
    await loadSessions(this as any);
  }

  async handleSessionsPatch(key: string, patch: { label?: string | null; thinkingLevel?: string | null; verboseLevel?: string | null; reasoningLevel?: string | null }) {
    const { patchSession } = await import("./controllers/sessions.js");
    await patchSession(this as any, key, patch);
  }

  // Nodes methods
  async handleLoadNodes() {
    const { loadNodes } = await import("./controllers/nodes.js");
    await loadNodes(this as any);
  }

  // Presence methods
  async handleLoadPresence() {
    const { loadPresence } = await import("./controllers/presence.js");
    await loadPresence(this as any);
  }

  // Skills load
  async handleLoadSkills() {
    const { loadSkills } = await import("./controllers/skills.js");
    await loadSkills(this as any);
  }

  // Debug methods
  async handleLoadDebug() {
    const { loadDebug } = await import("./controllers/debug.js");
    await loadDebug(this as any);
  }

  async handleDebugCall() {
    const { callDebugMethod } = await import("./controllers/debug.js");
    await callDebugMethod(this as any);
  }

  // Logs methods
  async handleLoadLogs() {
    const { loadLogs } = await import("./controllers/logs.js");
    await loadLogs(this as any, { reset: true });
  }

  handleLogsFilterChange(next: string) {
    this.logsFilterText = next;
  }

  handleLogsLevelFilterToggle(level: import("./types").LogLevel) {
    this.logsLevelFilters = { ...this.logsLevelFilters, [level]: !this.logsLevelFilters[level] };
  }

  handleLogsAutoFollowToggle(next: boolean) {
    this.logsAutoFollow = next;
  }

  // Update methods
  async handleRunUpdate() {
    const { runUpdate } = await import("./controllers/config.js");
    await runUpdate(this as any);
  }

  setPassword(next: string) {
    this.password = next;
  }

  setSessionKey(next: string) {
    this.sessionKey = next;
  }

  setChatMessage(next: string) {
    this.chatMessage = next;
  }

  // Chat queue methods
  handleChatSelectQueueItem(id: string) {
    // Navigate to the session associated with this queue item
    const item = this.chatQueue.find(q => q.id === id);
    if (item?.sessionKey) {
      this.sessionKey = item.sessionKey;
      this.setTab("chat");
    }
  }

  handleChatDropQueueItem(id: string) {
    this.chatQueue = this.chatQueue.filter(q => q.id !== id);
  }

  handleChatClearQueue() {
    this.chatQueue = [];
  }

  async handleChatSend() {
    const { sendChatMessage } = await import("./controllers/chat.js");
    await sendChatMessage(this as any, this.chatMessage, this.chatAttachments);
    this.chatMessage = "";
    this.chatAttachments = [];
  }

  async handleChatAbort() {
    const { abortChatRun } = await import("./controllers/chat.js");
    await abortChatRun(this as any);
  }

  async handleCallDebugMethod(method: string, params: string) {
    const { callDebugMethod } = await import("./controllers/debug.js");
    this.debugCallMethod = method;
    this.debugCallParams = params;
    await callDebugMethod(this as any);
  }

  render() {
    return renderApp(this);
  }
}
