import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "select" | "toggle";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "enabled" | "disabled" | "needs_config" | "unavailable";
  configurable: boolean;
  category: "speech" | "channels" | "ai" | "integrations" | "tools";
  configFields?: ConfigField[];
  config?: Record<string, unknown>;
}

const CATEGORIES: Array<{ id: Feature["category"]; label: string; icon: keyof typeof icons }> = [
  { id: "speech", label: "Speech & Voice", icon: "mic" },
  { id: "channels", label: "Channels", icon: "messageSquare" },
  { id: "integrations", label: "Integrations", icon: "link" },
  { id: "tools", label: "Tools", icon: "tool" }
];

const ICON_MAP: Record<string, keyof typeof icons> = {
  voice_recorder: "mic",
  tts: "volume",
  wake_word: "zap",
  whatsapp: "messageSquare",
  telegram: "send",
  discord: "hash",
  slack: "messageSquare",
  news: "newspaper",
  browser: "globe",
  web_search: "search"
};

export function renderFeaturesView(state: AppViewState) {
  const features = state.featuresList || [];
  const filteredFeatures = filterFeatures(features, state.featuresSearchQuery, state.featuresSelectedCategory);
  
  // Auto-load features on first render
  if (features.length === 0 && !state.featuresLoading && !state.featuresError && state.connected) {
    state.handleFeaturesLoad();
  }

  return html`
    <div class="features-view">
      ${renderHeader()}
      ${renderToolbar(state)}
      ${state.featuresLoading 
        ? renderLoading() 
        : state.featuresError 
          ? renderError(state.featuresError, () => state.handleFeaturesLoad())
          : renderCategories(state, filteredFeatures)
      }
      ${renderConfigModal(state)}
    </div>
  `;
}

function renderHeader() {
  return html`
    <div class="features-header">
      <h1>Features & Integrations</h1>
      <p class="subtitle">Manage all available features and integrations</p>
    </div>
  `;
}

function renderToolbar(state: AppViewState) {
  return html`
    <div class="features-toolbar">
      <div class="features-search">
        <div class="features-search-icon">${icons.search}</div>
        <input
          type="text"
          placeholder="Search features..."
          .value="${state.featuresSearchQuery}"
          @input="${(e: InputEvent) => state.handleFeaturesSearchChange((e.target as HTMLInputElement).value)}"
        />
      </div>
      
      <div class="features-filter">
        <button 
          class="features-filter-btn ${!state.featuresSelectedCategory ? 'active' : ''}"
          @click="${() => state.handleFeaturesCategoryChange(null)}"
        >
          All
        </button>
        ${CATEGORIES.map(cat => html`
          <button 
            class="features-filter-btn ${state.featuresSelectedCategory === cat.id ? 'active' : ''}"
            @click="${() => state.handleFeaturesCategoryChange(cat.id)}"
          >
            ${cat.label}
          </button>
        `)}
      </div>
    </div>
  `;
}

function renderLoading() {
  return html`
    <div class="features-loading">
      <div class="spinner"></div>
      <p>Loading features...</p>
    </div>
  `;
}

function renderError(error: string, onRetry: () => void) {
  return html`
    <div class="features-error">
      <div class="features-error-icon">${icons.alertCircle}</div>
      <h3>Failed to load features</h3>
      <p>${error}</p>
      <button class="btn btn--primary" @click="${onRetry}">Retry</button>
    </div>
  `;
}

function renderCategories(state: AppViewState, features: Feature[]) {
  if (features.length === 0) {
    return html`
      <div class="features-empty">
        <div class="features-empty-icon">${icons.box}</div>
        <h3>No features found</h3>
        <p>No features match your search criteria</p>
      </div>
    `;
  }

  return html`
    <div class="features-categories">
      ${CATEGORIES.map(category => {
        const categoryFeatures = features.filter(f => f.category === category.id);
        if (categoryFeatures.length === 0) return nothing;
        
        const enabledCount = categoryFeatures.filter(f => f.status === "enabled").length;
        
        return html`
          <div class="feature-category">
            <div class="category-header">
              <div class="category-icon">${icons[category.icon]}</div>
              <div class="category-info">
                <h3>${category.label}</h3>
                <span class="category-count">${enabledCount}/${categoryFeatures.length} enabled</span>
              </div>
            </div>
            
            <div class="feature-list">
              ${categoryFeatures.map(feature => renderFeatureCard(feature, state))}
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

function renderFeatureCard(feature: Feature, state: AppViewState) {
  const iconKey = ICON_MAP[feature.id] || "settings";
  
  return html`
    <div class="feature-card ${feature.status}">
      <div class="feature-icon">${icons[iconKey] || icons.settings}</div>
      
      <div class="feature-info">
        <div class="feature-header">
          <h4>${feature.name}</h4>
          ${renderStatusBadge(feature.status)}
        </div>
        
        <p class="feature-description">${feature.description}</p>
        
        <div class="feature-actions">
          ${feature.configurable
            ? html`<button class="btn-config" @click="${() => state.handleFeaturesOpenConfigModal(feature.id)}">
                ${icons.settings}
                Configure
              </button>`
            : nothing}
          
          ${feature.status === "disabled"
            ? html`<button class="btn-enable" @click="${() => state.handleFeaturesToggle(feature.id, true)}">
                ${icons.check}
                Enable
              </button>`
            : feature.status === "enabled"
              ? html`<button class="btn-disable" @click="${() => state.handleFeaturesToggle(feature.id, false)}">
                  ${icons.x}
                  Disable
                </button>`
              : html`<button class="btn-setup" @click="${() => state.handleFeaturesOpenConfigModal(feature.id)}">
                  ${icons.play}
                  Setup
                </button>`}
        </div>
      </div>
    </div>
  `;
}

function renderStatusBadge(status: Feature["status"]) {
  const labels: Record<Feature["status"], string> = {
    enabled: "Enabled",
    disabled: "Disabled", 
    needs_config: "Needs Setup",
    unavailable: "Unavailable"
  };
  
  return html`<span class="status-badge ${status}">${labels[status]}</span>`;
}

function filterFeatures(
  features: Feature[], 
  searchQuery: string, 
  selectedCategory: string | null
): Feature[] {
  let filtered = features;
  
  if (selectedCategory) {
    filtered = filtered.filter(f => f.category === selectedCategory);
  }
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(f => 
      f.name.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query)
    );
  }
  
  return filtered;
}

function renderConfigModal(state: AppViewState) {
  if (!state.featuresConfigModalOpen || !state.featuresConfigModalFeature) return nothing;
  
  const feature = state.featuresList.find(f => f.id === state.featuresConfigModalFeature);
  if (!feature) return nothing;
  
  const iconKey = ICON_MAP[feature.id] || "settings";
  
  return html`
    <div class="feature-modal-overlay" @click="${() => state.handleFeaturesCloseConfigModal()}">
      <div class="feature-modal" @click="${(e: Event) => e.stopPropagation()}">
        <div class="feature-modal-header">
          <div class="feature-modal-title">
            <div class="feature-modal-icon">${icons[iconKey] || icons.settings}</div>
            <h3>Configure ${feature.name}</h3>
          </div>
          <button class="feature-modal-close" @click="${() => state.handleFeaturesCloseConfigModal()}">
            ${icons.x}
          </button>
        </div>
        
        <div class="feature-modal-body">
          <p class="feature-modal-description">${feature.description}</p>
          
          ${state.featuresError ? html`
            <div class="feature-modal-error">
              ${icons.alertCircle}
              <span>${state.featuresError}</span>
            </div>
          ` : nothing}
          
          ${feature.configFields?.map(field => renderConfigField(field, state))}
        </div>
        
        <div class="feature-modal-footer">
          <button class="btn-secondary" @click="${() => state.handleFeaturesCloseConfigModal()}">
            Cancel
          </button>
          <button 
            class="btn-primary" 
            ?disabled="${state.featuresConfigSubmitting}"
            @click="${() => state.handleFeaturesConfigure(feature.id, state.featuresConfigFormData)}"
          >
            ${state.featuresConfigSubmitting 
              ? html`<span class="spinner"></span>Saving...` 
              : html`${icons.check} Save`}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderConfigField(field: ConfigField, state: AppViewState) {
  const value = state.featuresConfigFormData[field.key];
  
  switch (field.type) {
    case "toggle":
      return html`
        <div class="feature-form-group">
          <label class="feature-toggle">
            <input 
              type="checkbox" 
              .checked="${!!value}"
              @change="${(e: InputEvent) => state.handleFeaturesConfigFormChange(field.key, (e.target as HTMLInputElement).checked)}"
            />
            <span class="feature-toggle-label">${field.label}</span>
          </label>
        </div>
      `;
    
    case "select":
      return html`
        <div class="feature-form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          <select 
            .value="${value || ''}"
            @change="${(e: InputEvent) => state.handleFeaturesConfigFormChange(field.key, (e.target as HTMLSelectElement).value)}"
          >
            <option value="">Select...</option>
            ${field.options?.map(opt => html`
              <option value="${opt.value}" ?selected="${value === opt.value}">${opt.label}</option>
            `)}
          </select>
        </div>
      `;
    
    case "password":
      return html`
        <div class="feature-form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          <input 
            type="password"
            placeholder="${field.placeholder || ''}"
            .value="${value || ''}"
            @input="${(e: InputEvent) => state.handleFeaturesConfigFormChange(field.key, (e.target as HTMLInputElement).value)}"
          />
        </div>
      `;
    
    case "text":
    default:
      return html`
        <div class="feature-form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          <input 
            type="text"
            placeholder="${field.placeholder || ''}"
            .value="${value || ''}"
            @input="${(e: InputEvent) => state.handleFeaturesConfigFormChange(field.key, (e.target as HTMLInputElement).value)}"
          />
        </div>
      `;
  }
}
