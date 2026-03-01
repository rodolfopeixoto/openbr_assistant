import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

export interface OpenCodeConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "toggle" | "textarea" | "list";
  description?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
}

export const OPCODE_CONFIG_SECTIONS: Array<{
  id: string;
  label: string;
  icon: keyof typeof icons;
  fields: OpenCodeConfigField[];
}> = [
  {
    id: "general",
    label: "General",
    icon: "settings",
    fields: [
      {
        key: "enabled",
        label: "Enable OpenCode",
        type: "toggle",
        description: "Enable AI coding assistant integration"
      },
      {
        key: "autoInitialize",
        label: "Auto-initialize",
        type: "toggle",
        description: "Automatically initialize OpenCode on startup"
      }
    ]
  },
  {
    id: "container",
    label: "Container",
    icon: "box",
    fields: [
      {
        key: "runtimeType",
        label: "Container Runtime",
        type: "select",
        description: "Docker, Podman, or Apple Container",
        options: [
          { value: "docker", label: "Docker" },
          { value: "podman", label: "Podman" },
          { value: "apple", label: "Apple Container" },
          { value: "auto", label: "Auto-detect" }
        ]
      },
      {
        key: "container.memoryLimit",
        label: "Memory Limit (MB)",
        type: "number",
        description: "Maximum memory per container (default: 2048)",
        placeholder: "2048",
        min: 512,
        max: 16384
      },
      {
        key: "container.cpuLimit",
        label: "CPU Limit (cores)",
        type: "number",
        description: "Maximum CPU cores per container (default: 2)",
        placeholder: "2",
        min: 0.5,
        max: 8
      },
      {
        key: "container.timeoutMinutes",
        label: "Timeout (minutes)",
        type: "number",
        description: "Maximum task execution time (default: 30)",
        placeholder: "30",
        min: 5,
        max: 120
      },
      {
        key: "container.networkMode",
        label: "Network Mode",
        type: "select",
        description: "Container network isolation",
        options: [
          { value: "bridge", label: "Bridge (isolated)" },
          { value: "host", label: "Host (less secure)" }
        ]
      },
      {
        key: "container.autoCleanup",
        label: "Auto-cleanup Containers",
        type: "toggle",
        description: "Remove containers after task completion"
      }
    ]
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: "folder",
    fields: [
      {
        key: "workspace.basePath",
        label: "Base Path",
        type: "text",
        description: "Directory for task workspaces",
        placeholder: "~/.openclaw/opencode/workspaces"
      },
      {
        key: "workspace.preserveOnCompletion",
        label: "Preserve on Completion",
        type: "toggle",
        description: "Keep workspaces after task completion"
      },
      {
        key: "workspace.maxConcurrentTasks",
        label: "Max Concurrent Tasks",
        type: "number",
        description: "Maximum parallel tasks (default: 3)",
        placeholder: "3",
        min: 1,
        max: 10
      }
    ]
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "bell",
    fields: [
      {
        key: "notifications.onTaskComplete",
        label: "On Task Complete",
        type: "toggle",
        description: "Notify when a task finishes"
      },
      {
        key: "notifications.onTaskFail",
        label: "On Task Fail",
        type: "toggle",
        description: "Notify when a task fails"
      },
      {
        key: "notifications.onApprovalRequired",
        label: "On Approval Required",
        type: "toggle",
        description: "Notify when user approval is needed"
      }
    ]
  },
  {
    id: "audit",
    label: "Audit & Logging",
    icon: "fileText",
    fields: [
      {
        key: "audit.enabled",
        label: "Enable Audit Logging",
        type: "toggle",
        description: "Log all OpenCode activities"
      },
      {
        key: "audit.logAllCommands",
        label: "Log All Commands",
        type: "toggle",
        description: "Record every command executed"
      },
      {
        key: "audit.retentionDays",
        label: "Retention (days)",
        type: "number",
        description: "Days to keep audit logs (default: 30)",
        placeholder: "30",
        min: 7,
        max: 365
      }
    ]
  }
];

export function renderOpencodeSettingsView(state: AppViewState) {
  const activeSection = state.opencodeSettingsSection || "general";
  const config = state.opencodeConfig || {};

  // Auto-load config on first render if not loaded and not already loading
  if (!state.opencodeConfig && !state.opencodeConfigLoading && !state.opencodeConfigError && state.connected) {
    console.log("[OpencodeSettings] Auto-loading config...");
    state.handleOpencodeConfigLoad();
  }

  return html`
    <div class="opencode-settings-view">
      ${renderSettingsHeader(state)}
      
      <div class="settings-layout">
        ${renderSettingsSidebar(activeSection, state)}
        
        <div class="settings-content">
          ${state.opencodeConfigLoading 
            ? renderLoading() 
            : state.opencodeConfigError 
              ? renderError(state.opencodeConfigError, () => state.handleOpencodeConfigLoad())
              : renderSettingsForm(activeSection, config, state)
          }
        </div>
      </div>
    </div>
  `;
}

function renderSettingsHeader(state: AppViewState) {
  return html`
    <div class="opencode-settings-header">
      <div class="header-back">
        <button @click="${() => window.location.hash = 'opencode'}" class="btn-back">
          ${icons.arrowLeft}
        </button>
      </div>
      <div class="header-title">
        <h1>OpenCode Settings</h1>
        <p class="subtitle">Configure AI coding assistant integration</p>
      </div>
      <div class="header-actions">
        ${state.opencodeConfigDirty ? html`
          <button @click="${() => state.handleOpencodeConfigReset()}" class="btn-secondary">
            ${icons.rotateCcw} Reset
          </button>
        ` : nothing}
        <button 
          @click="${() => state.handleOpencodeConfigSave()}"
          ?disabled="${!state.opencodeConfigDirty || state.opencodeConfigSaving}"
          class="btn-primary"
        >
          ${state.opencodeConfigSaving 
            ? html`<span class="spinner"></span>Saving...` 
            : html`${icons.save} Save Changes`}
        </button>
      </div>
    </div>
  `;
}

function renderSettingsSidebar(activeSection: string, state: AppViewState) {
  return html`
    <div class="settings-sidebar">
      ${OPCODE_CONFIG_SECTIONS.map(section => html`
        <button 
          class="sidebar-item ${activeSection === section.id ? 'active' : ''}"
          @click="${() => state.handleOpencodeSettingsSectionChange(section.id)}"
        >
          <span class="sidebar-icon">${icons[section.icon]}</span>
          <span class="sidebar-label">${section.label}</span>
        </button>
      `)}
    </div>
  `;
}

function renderSettingsForm(sectionId: string, config: Record<string, unknown>, state: AppViewState) {
  const section = OPCODE_CONFIG_SECTIONS.find(s => s.id === sectionId);
  if (!section) return nothing;

  return html`
    <div class="settings-form">
      <h2>${section.label}</h2>
      <p class="section-description">Configure ${section.label.toLowerCase()} settings for OpenCode</p>
      
      <div class="form-fields">
        ${section.fields.map(field => renderConfigField(field, config, state))}
      </div>
    </div>
  `;
}

function renderConfigField(field: OpenCodeConfigField, config: Record<string, unknown>, state: AppViewState) {
  const value = getNestedValue(config, field.key);
  
  switch (field.type) {
    case "toggle":
      return html`
        <div class="form-group form-group--toggle">
          <label class="toggle-label">
            <input 
              type="checkbox" 
              .checked="${!!value}"
              @change="${(e: InputEvent) => state.handleOpencodeConfigChange(field.key, (e.target as HTMLInputElement).checked)}"
            />
            <span class="toggle-slider"></span>
            <div class="toggle-info">
              <span class="toggle-title">${field.label}</span>
              ${field.description ? html`<span class="toggle-description">${field.description}</span>` : nothing}
            </div>
          </label>
        </div>
      `;
    
    case "select":
      return html`
        <div class="form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          ${field.description ? html`<p class="field-description">${field.description}</p>` : nothing}
          <select 
            .value="${value || ''}"
            @change="${(e: InputEvent) => state.handleOpencodeConfigChange(field.key, (e.target as HTMLSelectElement).value)}"
          >
            <option value="">Select...</option>
            ${field.options?.map(opt => html`
              <option value="${opt.value}" ?selected="${value === opt.value}">${opt.label}</option>
            `)}
          </select>
        </div>
      `;
    
    case "number":
      return html`
        <div class="form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          ${field.description ? html`<p class="field-description">${field.description}</p>` : nothing}
          <input 
            type="number"
            min="${field.min ?? ''}"
            max="${field.max ?? ''}"
            placeholder="${field.placeholder || ''}"
            .value="${value !== undefined ? String(value) : ''}"
            @input="${(e: InputEvent) => {
              const val = (e.target as HTMLInputElement).value;
              state.handleOpencodeConfigChange(field.key, val ? Number(val) : undefined);
            }}"
          />
        </div>
      `;
    
    case "textarea":
      return html`
        <div class="form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          ${field.description ? html`<p class="field-description">${field.description}</p>` : nothing}
          <textarea
            placeholder="${field.placeholder || ''}"
            .value="${value || ''}"
            @input="${(e: InputEvent) => state.handleOpencodeConfigChange(field.key, (e.target as HTMLTextAreaElement).value)}"
            rows="4"
          ></textarea>
        </div>
      `;
    
    case "list":
      return html`
        <div class="form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          ${field.description ? html`<p class="field-description">${field.description}</p>` : nothing}
          <div class="list-input">
            ${(Array.isArray(value) ? value : []).map((item: string, index: number) => html`
              <div class="list-item">
                <input 
                  type="text"
                  .value="${item}"
                  @input="${(e: InputEvent) => {
                    const newList = [...(Array.isArray(value) ? value : [])];
                    newList[index] = (e.target as HTMLInputElement).value;
                    state.handleOpencodeConfigChange(field.key, newList);
                  }}"
                />
                <button 
                  @click="${() => {
                    const newList = [...(Array.isArray(value) ? value : [])];
                    newList.splice(index, 1);
                    state.handleOpencodeConfigChange(field.key, newList);
                  }}"
                  class="btn-icon"
                >
                  ${icons.trash}
                </button>
              </div>
            `)}
            <button 
              @click="${() => state.handleOpencodeConfigChange(field.key, [...(Array.isArray(value) ? value : []), ''])}"
              class="btn-add"
            >
              ${icons.plus} Add Item
            </button>
          </div>
        </div>
      `;
    
    case "text":
    default:
      return html`
        <div class="form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          ${field.description ? html`<p class="field-description">${field.description}</p>` : nothing}
          <input 
            type="text"
            placeholder="${field.placeholder || ''}"
            .value="${value || ''}"
            @input="${(e: InputEvent) => state.handleOpencodeConfigChange(field.key, (e.target as HTMLInputElement).value)}"
          />
        </div>
      `;
  }
}

function renderLoading() {
  return html`
    <div class="settings-loading">
      <div class="spinner"></div>
      <p>Loading configuration...</p>
    </div>
  `;
}

function renderError(error: string, onRetry: () => void) {
  return html`
    <div class="settings-error">
      <div class="error-icon">${icons.alertCircle}</div>
      <h3>Failed to load configuration</h3>
      <p>${error}</p>
      <button @click="${onRetry}" class="btn-primary">Retry</button>
    </div>
  `;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}
