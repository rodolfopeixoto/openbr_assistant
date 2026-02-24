import type { EventLogEntry } from "./app-events";
import type { DevicePairingList } from "./controllers/devices";
import type { ExecApprovalRequest } from "./controllers/exec-approval";
import type { ExecApprovalsFile, ExecApprovalsSnapshot } from "./controllers/exec-approvals";
import type { SkillMessage } from "./controllers/skills";
import type { GatewayBrowserClient, GatewayHelloOk } from "./gateway";
import type { Tab } from "./navigation";
import type { UiSettings } from "./storage";
import type { ThemeMode } from "./theme";
import type { ThemeTransitionContext } from "./theme-transition";
import type {
  AgentsListResult,
  ChannelsStatusSnapshot,
  ConfigSnapshot,
  CronJob,
  CronRunLogEntry,
  CronStatus,
  HealthSnapshot,
  LogEntry,
  LogLevel,
  NostrProfile,
  PresenceEntry,
  SessionsListResult,
  SkillStatusReport,
  StatusSummary,
} from "./types";
import type { ChatAttachment, ChatQueueItem, CronFormState } from "./ui-types";
import type { NostrProfileFormState } from "./views/channels.nostr-profile-form";
import type { SkillDetailTab } from "./views/skills";

export type AppViewState = {
  settings: UiSettings;
  password: string;
  tab: Tab;
  onboarding: boolean;
  basePath: string;
  connected: boolean;
  theme: ThemeMode;
  themeResolved: "light" | "dark";
  hello: GatewayHelloOk | null;
  lastError: string | null;
  eventLog: EventLogEntry[];
  assistantName: string;
  assistantAvatar: string | null;
  assistantAgentId: string | null;
  sessionKey: string;
  chatLoading: boolean;
  chatSending: boolean;
  chatMessage: string;
  chatAttachments: ChatAttachment[];
  chatMessages: unknown[];
  chatToolMessages: unknown[];
  chatStream: string | null;
  chatRunId: string | null;
  chatStreamStartedAt: number | null;
  chatAvatarUrl: string | null;
  chatThinkingLevel: string | null;
  chatQueue: ChatQueueItem[];
  nodesLoading: boolean;
  nodes: Array<Record<string, unknown>>;
  devicesLoading: boolean;
  devicesError: string | null;
  devicesList: DevicePairingList | null;
  execApprovalsLoading: boolean;
  execApprovalsSaving: boolean;
  execApprovalsDirty: boolean;
  execApprovalsSnapshot: ExecApprovalsSnapshot | null;
  execApprovalsForm: ExecApprovalsFile | null;
  execApprovalsSelectedAgent: string | null;
  execApprovalsTarget: "gateway" | "node";
  execApprovalsTargetNodeId: string | null;
  execApprovalQueue: ExecApprovalRequest[];
  execApprovalBusy: boolean;
  execApprovalError: string | null;
  pendingGatewayUrl: string | null;
  configLoading: boolean;
  configRaw: string;
  configRawOriginal: string;
  configValid: boolean | null;
  configIssues: unknown[];
  configSaving: boolean;
  configApplying: boolean;
  updateRunning: boolean;
  configSnapshot: ConfigSnapshot | null;
  configSchema: unknown | null;
  configSchemaLoading: boolean;
  configUiHints: Record<string, unknown>;
  configForm: Record<string, unknown> | null;
  configFormOriginal: Record<string, unknown> | null;
  configFormMode: "form" | "raw";
  channelsLoading: boolean;
  channelsSnapshot: ChannelsStatusSnapshot | null;
  channelsError: string | null;
  channelsLastSuccess: number | null;
  whatsappLoginMessage: string | null;
  whatsappLoginQrDataUrl: string | null;
  whatsappLoginConnected: boolean | null;
  whatsappBusy: boolean;
  nostrProfileFormState: NostrProfileFormState | null;
  nostrProfileAccountId: string | null;
  configFormDirty: boolean;
  presenceLoading: boolean;
  presenceEntries: PresenceEntry[];
  presenceError: string | null;
  presenceStatus: string | null;
  agentsLoading: boolean;
  agentsList: AgentsListResult | null;
  agentsError: string | null;
  sessionsLoading: boolean;
  sessionsResult: SessionsListResult | null;
  sessionsError: string | null;
  sessionsFilterActive: string;
  sessionsFilterLimit: string;
  sessionsIncludeGlobal: boolean;
  sessionsIncludeUnknown: boolean;
  cronLoading: boolean;
  cronJobs: CronJob[];
  cronStatus: CronStatus | null;
  cronError: string | null;
  cronForm: CronFormState;
  cronRunsJobId: string | null;
  cronRuns: CronRunLogEntry[];
  cronBusy: boolean;
  skillsLoading: boolean;
  skillsReport: SkillStatusReport | null;
  skillsError: string | null;
  skillsFilter: string;
  skillEdits: Record<string, string>;
  skillMessages: Record<string, SkillMessage>;
  skillsBusyKey: string | null;
  skillsActiveFilter: "all" | "active" | "needs-setup" | "disabled";
  skillsSelectedSkill: string | null;
  skillsSelectedSkillTab: SkillDetailTab;
  debugLoading: boolean;
  debugStatus: StatusSummary | null;
  debugHealth: HealthSnapshot | null;
  debugModels: unknown[];
  debugHeartbeat: unknown | null;
  debugCallMethod: string;
  debugCallParams: string;
  debugCallResult: string | null;
  debugCallError: string | null;
  logsLoading: boolean;
  logsError: string | null;
  logsFile: string | null;
  logsEntries: LogEntry[];
  logsFilterText: string;
  logsLevelFilters: Record<LogLevel, boolean>;
  logsAutoFollow: boolean;
  logsTruncated: boolean;
  client: GatewayBrowserClient | null;
  connect: () => void;
  setTab: (tab: Tab) => void;
  // Onboarding wizard state
  onboardingStep: "welcome" | "auth" | "channels" | "features" | "complete";
  onboardingProgress: number;
  onboardingAuthProvider: string | null;
  onboardingApiKey: string | null;
  onboardingChannels: string[];
  onboardingFeatures: string[];
  onboardingSessionToken: string | null;
  onboardingLoading: boolean;
  onboardingError: string | null;
  setOnboardingAuthProvider: (provider: string) => void;
  setOnboardingApiKey: (key: string) => void;
  toggleOnboardingChannel: (channel: string) => void;
  toggleOnboardingFeature: (feature: string) => void;
  onboardingNextStep: () => Promise<void>;
  onboardingPrevStep: () => void;
  completeOnboarding: () => Promise<void>;
  startOnboarding: () => Promise<void>;
  setTheme: (theme: ThemeMode, context?: ThemeTransitionContext) => void;
  applySettings: (next: UiSettings) => void;
  loadOverview: () => Promise<void>;
  loadAssistantIdentity: () => Promise<void>;
  loadCron: () => Promise<void>;
  handleWhatsAppStart: (force: boolean) => Promise<void>;
  handleWhatsAppWait: () => Promise<void>;
  handleWhatsAppLogout: () => Promise<void>;
  handleChannelConfigSave: () => Promise<void>;
  handleChannelConfigReload: () => Promise<void>;
  handleNostrProfileEdit: (accountId: string, profile: NostrProfile | null) => void;
  handleNostrProfileCancel: () => void;
  handleNostrProfileFieldChange: (field: keyof NostrProfile, value: string) => void;
  handleNostrProfileSave: () => Promise<void>;
  handleNostrProfileImport: () => Promise<void>;
  handleNostrProfileToggleAdvanced: () => void;
  handleExecApprovalDecision: (decision: "allow-once" | "allow-always" | "deny") => Promise<void>;
  handleGatewayUrlConfirm: () => void;
  handleGatewayUrlCancel: () => void;
  handleConfigLoad: () => Promise<void>;
  handleConfigSave: () => Promise<void>;
  handleConfigApply: () => Promise<void>;
  handleConfigFormUpdate: (path: string, value: unknown) => void;
  handleConfigFormModeChange: (mode: "form" | "raw") => void;
  handleConfigRawChange: (raw: string) => void;
  handleInstallSkill: (key: string) => Promise<void>;
  handleUpdateSkill: (key: string) => Promise<void>;
  handleToggleSkillEnabled: (key: string, enabled: boolean) => Promise<void>;
  handleUpdateSkillEdit: (key: string, value: string) => void;
  handleSaveSkillApiKey: (key: string, apiKey: string) => Promise<void>;
  handleCronToggle: (jobId: string, enabled: boolean) => Promise<void>;
  handleCronRun: (jobId: string) => Promise<void>;
  handleCronRemove: (jobId: string) => Promise<void>;
  handleCronAdd: () => Promise<void>;
  handleCronRunsLoad: (jobId: string) => Promise<void>;
  handleCronFormUpdate: (path: string, value: unknown) => void;
  handleSessionsLoad: () => Promise<void>;
  handleSessionsPatch: (key: string, patch: unknown) => Promise<void>;
  handleLoadNodes: () => Promise<void>;
  handleLoadPresence: () => Promise<void>;
  handleLoadSkills: () => Promise<void>;
  handleLoadDebug: () => Promise<void>;
  handleLoadLogs: () => Promise<void>;
  handleDebugCall: () => Promise<void>;
  handleRunUpdate: () => Promise<void>;
  setPassword: (next: string) => void;
  setSessionKey: (next: string) => void;
  setChatMessage: (next: string) => void;
  handleChatSend: () => Promise<void>;
  handleChatAbort: () => Promise<void>;
  handleChatSelectQueueItem: (id: string) => void;
  handleChatDropQueueItem: (id: string) => void;
  handleChatClearQueue: () => void;
  handleLogsFilterChange: (next: string) => void;
  handleLogsLevelFilterToggle: (level: LogLevel) => void;
  handleLogsAutoFollowToggle: (next: boolean) => void;
  handleCallDebugMethod: (method: string, params: string) => Promise<void>;
  // Commands menu state
  commandsMenuOpen: boolean;
  handleToggleCommandsMenu: () => void;
  // Config documentation panel state
  configDocPanelOpen: boolean;
  configDocSearchQuery: string;
  handleToggleConfigDocPanel: () => void;
  handleConfigDocSearchChange: (query: string) => void;
  handleInsertConfigTemplate: (template: string) => void;
  handleInsertConfigField: (field: string) => void;
  // Compliance state
  complianceLoading: boolean;
  complianceError: string | null;
  complianceStatus: import("./types").ComplianceStatus | null;
  complianceReports: import("./types").ComplianceReport[];
  complianceSelectedFramework: import("./types").ComplianceFramework | "all";
  complianceActiveTab: "overview" | "reports" | "violations" | "settings";
  handleComplianceTabChange: (tab: "overview" | "reports" | "violations" | "settings") => void;
  handleComplianceFrameworkChange: (framework: import("./types").ComplianceFramework | "all") => void;
  handleComplianceRefresh: () => Promise<void>;
  handleComplianceGenerateReport: (framework: import("./types").ComplianceFramework) => Promise<void>;
  handleComplianceExportData: () => Promise<void>;
  handleComplianceViolationAcknowledge: (id: string) => Promise<void>;
  handleComplianceViolationResolve: (id: string) => Promise<void>;
  handleSkillsActiveFilterChange: (filter: "all" | "active" | "needs-setup" | "disabled") => void;
  handleSkillsSelectSkill: (skillKey: string | null) => void;
  handleSkillsSelectSkillTab: (tab: import("./views/skills").SkillDetailTab) => void;
  analyzingSkill: string | null;
  skillAnalysis: Record<string, { securityScan?: import("./types").SkillSecurityScan; richDescription?: import("./types").RichSkillDescription }>;
  handleAnalyzeSkill: (skillKey: string, filePath: string) => Promise<void>;
  handleSendChat: (messageOverride?: string, opts?: { restoreDraft?: boolean }) => Promise<void>;
  handleAbortChat: () => Promise<void>;
  removeQueuedMessage: (id: string) => void;
  handleChatScroll: (event: Event) => void;
  resetToolStream: () => void;
  resetChatScroll: () => void;
  exportLogs: (lines: string[], label: string) => void;
  handleLogsScroll: (event: Event) => void;
  handleOpenSidebar: (content: string) => void;
  handleCloseSidebar: () => void;
  handleSplitRatioChange: (ratio: number) => void;
  // ModelSelector state
  selectedProvider: string | null;
  selectedModel: string | null;
  modelLoading: boolean;
  configuredProviders: import("./components/model-selector.js").ModelProvider[] | null;
  providersLoading: boolean;
  loadCurrentModel: () => Promise<void>;
  loadConfiguredProviders: () => Promise<void>;
  // Models page state
  modelsLoading: boolean;
  modelsError: string | null;
  modelsProviders: import("./components/provider-card.js").ProviderCardData[] | null;
  modelsSearchQuery: string;
  configuredProfileIds: string[];
  modelsShowAddForm: string | null;
  handleModelsRefresh: () => Promise<void>;
  handleModelsTest: (profileId: string, credential: unknown) => Promise<void>;
  handleModelsSave: (profileId: string, credential: unknown, email?: string) => Promise<void>;
  handleModelsRemove: (profileId: string) => Promise<void>;
  // Environment variables state
  envVars: Array<{
    key: string;
    encrypted: boolean;
    createdAt: number;
    updatedAt: number;
    hasValue: boolean;
    isSensitive: boolean;
  }>;
  envLoading: boolean;
  envSaving: boolean;
  envError: string;
  envModalOpen: boolean;
  envEditingVar: { key: string } | null;
  envKeyInput: string;
  envValueInput: string;
  envEncryptInput: boolean;
  envValidationError: string;
  handleEnvLoad: () => Promise<void>;
  handleEnvModalOpen: (editVar?: { key: string }) => void;
  handleEnvModalClose: () => void;
  handleEnvKeyInput: (value: string) => void;
  handleEnvValueInput: (value: string) => void;
  handleEnvEncryptInput: (value: boolean) => void;
  handleEnvValidationError: (error: string) => void;
  handleEnvSave: () => Promise<void>;
  handleEnvDelete: (key: string) => Promise<void>;
  // Gateway restart
  restarting: boolean;
  handleRestart: () => Promise<void>;
  // Provider config wizard
  wizardOpen: boolean;
  wizardProviderId: string | null;
  wizardProviderName: string | null;
  handleWizardClose: () => void;
  handleWizardSave: (e: CustomEvent) => void;
  handleOAuthStart: (e: CustomEvent) => void;
  // Chat sidebar
  sidebarOpen: boolean;
  sidebarContent: string | null;
  sidebarError: string | null;
  splitRatio: number;
  // Chat compaction
  compactionStatus: import("./app-tool-stream").CompactionStatus | null;
  // Config
  configSearchQuery: string;
  configActiveSection: string | null;
  configActiveSubsection: string | null;
  // Models
  handleModelsConfigure: (providerId: string) => void;
  handleModelsManage: (providerId: string) => void;
  handleModelsSearchChange: (query: string) => void;
  // News
  newsLoading: boolean;
  newsError: string | null;
  newsItems: unknown[];
  newsTotalCount: number;
  newsHasMore: boolean;
  newsSelectedSource: string | null;
  newsSelectedCategory: string | null;
  newsTimeRange: string;
  newsSearchQuery: string;
  newsSelectedSentiment: string | null;
  newsLimit: number;
  newsOffset: number;
  handleNewsLoad: () => Promise<void>;
  handleNewsSourceChange: (source: string | null) => void;
  handleNewsCategoryChange: (category: string | null) => void;
  handleNewsTimeRangeChange: (range: string) => void;
  handleNewsSearchChange: (query: string) => void;
  handleNewsSentimentChange: (sentiment: string | null) => void;
  handleNewsLimitChange: (limit: number) => void;
  handleNewsOffsetChange: (offset: number) => void;
  // Features Dashboard
  featuresLoading: boolean;
  featuresError: string | null;
  featuresList: unknown[];
  featuresSearchQuery: string;
  featuresSummary: Record<string, unknown>;
  featureCategories: string[];
  expandedCategories: string[];
  handleFeaturesLoad: () => Promise<void>;
  handleFeaturesSearchChange: (query: string) => void;
  handleToggleCategory: (category: string) => void;
  // Containers
  containersLoading: boolean;
  containersError: string | null;
  containers: unknown[];
  handleContainersLoad: () => Promise<void>;
  handleContainerStart: (containerId: string) => Promise<void>;
  handleContainerStop: (containerId: string) => Promise<void>;
  handleContainerRestart: (containerId: string) => Promise<void>;
  handleContainerLogs: (containerId: string) => Promise<void>;
  // Security
  securityLoading: boolean;
  securityError: string | null;
  securityStatus: Record<string, unknown> | null;
  handleSecurityLoad: () => Promise<void>;
  handleSecurityScan: () => Promise<void>;
  // OpenCode
  opencodeLoading: boolean;
  opencodeError: string | null;
  opencodeStatus: string | null;
  opencodeTasks: unknown[];
  handleOpencodeLoad: () => Promise<void>;
  // MCP
  mcpLoading: boolean;
  mcpError: string | null;
  mcpServers: unknown[];
  mcpSearchQuery: string;
  handleMcpLoad: () => Promise<void>;
  handleMcpSearchChange: (query: string) => void;
  // Model Routing
  modelRoutingLoading: boolean;
  modelRoutingError: string | null;
  modelRoutingStatus: Record<string, unknown> | null;
  handleModelRoutingLoad: () => Promise<void>;
  handleModelRoutingConfigure: (config: Record<string, unknown>) => Promise<void>;
  // Ollama
  ollamaLoading: boolean;
  ollamaError: string | null;
  ollamaStatus: Record<string, unknown> | null;
  handleOllamaLoad: () => Promise<void>;
  // Rate Limits
  rateLimitsLoading: boolean;
  rateLimitsError: string | null;
  rateLimitsStatus: Record<string, unknown> | null;
  handleRateLimitsLoad: () => Promise<void>;
  handleRateLimitsConfigure: (config: Record<string, unknown>) => Promise<void>;
  // Budget
  budgetLoading: boolean;
  budgetError: string | null;
  budgetStatus: Record<string, unknown> | null;
  handleBudgetLoad: () => Promise<void>;
  handleBudgetConfigure: (config: Record<string, unknown>) => Promise<void>;
  // Metrics
  metricsLoading: boolean;
  metricsError: string | null;
  metricsStatus: Record<string, unknown> | null;
  handleMetricsLoad: () => Promise<void>;
  // Cache
  cacheLoading: boolean;
  cacheError: string | null;
  cacheStatus: Record<string, unknown> | null;
  handleCacheLoad: () => Promise<void>;
  handleCacheClear: () => Promise<void>;
};
