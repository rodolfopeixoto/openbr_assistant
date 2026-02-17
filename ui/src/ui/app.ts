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

  // Provider Config Wizard state
  @state() wizardOpen = false;
  @state() wizardProviderId = "";
  @state() wizardProviderName = "";
  @state() wizardIsSaving = false;

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

  // ==================== MODELS HANDLERS ====================

  async handleModelsRefresh() {
    this.modelsLoading = true;
    this.modelsError = null;

    try {
      // Load auth profiles from auth.list endpoint
      const authProfiles = (await this.client?.request("auth.list", {})) as {
        profiles: Array<{ id: string; provider: string; type: string }>;
      };

      // Get default providers from models.providers endpoint
      const modelProviders = (await this.client?.request("models.providers", {})) as {
        providers: Array<{
          id: string;
          name: string;
          status: string;
          models: Array<{ id: string; name: string }>;
        }>;
      };

      // Build provider cards with configuration status
      const configuredProviderIds = new Set(
        (authProfiles?.profiles || []).map((p) => p.provider)
      );
      const providerProfiles: Record<string, Array<{ id: string; type: string }>> = {};
      (authProfiles?.profiles || []).forEach((p) => {
        if (!providerProfiles[p.provider]) {
          providerProfiles[p.provider] = [];
        }
        providerProfiles[p.provider].push({ id: p.id, type: p.type });
      });

      this.modelsProviders = (modelProviders?.providers || []).map((provider) => {
        const isConfigured = configuredProviderIds.has(provider.id);
        const profiles = providerProfiles[provider.id] || [];
        const hasError = false; // TODO: Check for errors

        return {
          id: provider.id,
          name: provider.name,
          status: hasError ? "error" : isConfigured ? "configured" : "unconfigured",
          credentialType: profiles[0]?.type as "api_key" | "oauth" | "token" | undefined,
          credentialCount: profiles.length,
          modelsCount: provider.models?.length || 0,
          lastError: undefined,
        };
      });
    } catch (err) {
      this.modelsError = String(err);
    } finally {
      this.modelsLoading = false;
    }
  }

  handleModelsConfigure(providerId: string) {
    // Open wizard for provider configuration
    const provider = this.modelsProviders.find((p) => p.id === providerId);
    if (provider) {
      this.wizardProviderId = providerId;
      this.wizardProviderName = provider.name;
      this.wizardOpen = true;
      this.wizardIsSaving = false;
    }
  }

  handleModelsManage(providerId: string) {
    // For now, also open the wizard to edit/reconfigure
    // In the future, this could open a management panel
    this.handleModelsConfigure(providerId);
  }

  handleWizardClose() {
    this.wizardOpen = false;
    this.wizardProviderId = "";
    this.wizardProviderName = "";
    this.wizardIsSaving = false;
  }

  async handleWizardSave(event: CustomEvent) {
    const { providerId, profileName, credential, testConnection } = event.detail;
    this.wizardIsSaving = true;

    try {
      // Call auth.add endpoint to save the credential
      const result = (await this.client?.request("auth.add", {
        profileId: `${providerId}:${profileName}`,
        credential,
        testConnection,
      })) as { success: boolean; error?: string };

      if (!result?.success) {
        // Notify wizard of error
        const wizard = this.querySelector("provider-config-wizard") as import("./components/provider-config-wizard").ProviderConfigWizard;
        if (wizard) {
          wizard.handleSaveError(result?.error || "Failed to save credential");
        }
        return;
      }

      // Notify wizard of success
      const wizard = this.querySelector("provider-config-wizard") as import("./components/provider-config-wizard").ProviderConfigWizard;
      if (wizard) {
        wizard.handleSaveSuccess();
      }

      // Refresh the providers list
      await this.handleModelsRefresh();
    } catch (err) {
      const error = String(err);
      const wizard = this.querySelector("provider-config-wizard") as import("./components/provider-config-wizard").ProviderConfigWizard;
      if (wizard) {
        wizard.handleSaveError(error);
      }
    } finally {
      this.wizardIsSaving = false;
    }
  }

  handleModelsSearchChange(query: string) {
    this.modelsSearchQuery = query;
  }

  async handleOAuthStart(event: CustomEvent) {
    const { providerId } = event.detail;
    
    try {
      // Start OAuth flow via backend
      const result = (await this.client?.request("auth.oauth.start", {
        providerId,
      })) as { authUrl: string; state: string; verifier: string };

      if (result?.authUrl) {
        // Notify wizard of OAuth URL
        const wizard = this.querySelector("provider-config-wizard") as import("./components/provider-config-wizard").ProviderConfigWizard;
        if (wizard) {
          wizard.handleOAuthUrl(result.authUrl, result.state, result.verifier);
        }

        // Store OAuth state for callback handling
        (window as unknown as Record<string, unknown>).oauthCallback = async (code: string, state: string) => {
          await this.handleOAuthCallback(providerId, code, state, result.verifier);
        };
      }
    } catch (err) {
      const wizard = this.querySelector("provider-config-wizard") as import("./components/provider-config-wizard").ProviderConfigWizard;
      if (wizard) {
        wizard.handleSaveError(String(err));
      }
    }
  }

  async handleOAuthCallback(providerId: string, code: string, state: string, verifier: string) {
    try {
      // Exchange code for tokens
      const result = (await this.client?.request("auth.oauth.callback", {
        providerId,
        code,
        state,
        verifier,
      })) as { success: boolean; profileId: string; email?: string };

      if (result?.success) {
        // Notify wizard of success
        const wizard = this.querySelector("provider-config-wizard") as import("./components/provider-config-wizard").ProviderConfigWizard;
        if (wizard) {
          wizard.handleSaveSuccess();
        }

        // Refresh providers list
        await this.handleModelsRefresh();
      } else {
        throw new Error("OAuth callback failed");
      }
    } catch (err) {
      const wizard = this.querySelector("provider-config-wizard") as import("./components/provider-config-wizard").ProviderConfigWizard;
      if (wizard) {
        wizard.handleSaveError(String(err));
      }
    }
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
    await analyzeSkillInternal(
      this as unknown as Parameters<typeof analyzeSkillInternal>[0],
      skillKey,
      filePath
    );
  }

  render() {
    return renderApp(this);
  }
}
