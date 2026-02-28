import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";
import type { FeatureCategory, DashboardFeature } from "../controllers/features.js";

// Safe icon getter
function getIcon(name: string) {
  return (icons as Record<string, ReturnType<typeof icons.settings>>)[name] || icons.settings;
}

export function renderFeaturesView(state: AppViewState) {
  const features = state.featuresList || [];
  
  // Auto-load on first render
  if (features.length === 0 && !state.featuresLoading && !state.featuresError && state.connected) {
    state.handleFeaturesLoad();
  }

  if (state.featuresLoading && features.length === 0) {
    return html`
      <div class="features-loading">
        <div class="loading-spinner"></div>
        <p>Loading features...</p>
      </div>
    `;
  }

  if (state.featuresError && features.length === 0) {
    return html`
      <div class="features-error">
        <div class="error-icon">${icons.alertTriangle}</div>
        <h3>Failed to load features</h3>
        <p>${state.featuresError}</p>
        <button @click=${() => state.handleFeaturesLoad()} class="btn-primary">
          ${icons.refreshCw} Retry
        </button>
      </div>
    `;
  }

  return html`
    <div class="features-page">
      ${renderHeader(state)}
      ${renderSummary(state)}
      ${renderContent(state)}
      ${renderConfigModal(state)}
    </div>
  `;
}

function renderHeader(state: AppViewState) {
  return html`
    <header class="features-header">
      <div class="header-content">
        <div class="header-title">
          <div class="title-icon">${icons.settings}</div>
          <div>
            <h1>Features</h1>
            <p class="subtitle">Manage features, integrations, and services</p>
          </div>
        </div>
        
        <div class="header-search">
          <div class="search-box">
            ${icons.search}
            <input 
              type="text" 
              .value="${state.featuresSearchQuery || ''}"
              @input="${(e: InputEvent) => state.handleFeaturesSearchChange((e.target as HTMLInputElement).value)}"
              placeholder="Search features..."
              class="search-input"
            />
            ${state.featuresSearchQuery ? html`
              <button 
                class="clear-search" 
                @click="${() => state.handleFeaturesSearchChange('')}"
              >
                ${icons.x}
              </button>
            ` : nothing}
          </div>
        </div>
      </div>
    </header>
  `;
}

function renderSummary(state: AppViewState) {
  const summary = state.featuresSummary || { 
    total: 0, 
    enabled: 0, 
    disabled: 0, 
    needsConfig: 0,
    unavailable: 0
  };
  
  const enabledPercent = summary.total > 0 ? Math.round((summary.enabled / summary.total) * 100) : 0;
  
  return html`
    <section class="features-summary">
      <div class="summary-grid">
        <div class="summary-card total">
          <div class="card-visual">
            <div class="card-icon">${icons.settings}</div>
            <div class="card-progress">
              <svg viewBox="0 0 36 36" class="circular-chart">
                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path class="circle" stroke-dasharray="${enabledPercent}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span class="progress-text">${enabledPercent}%</span>
            </div>
          </div>
          <div class="card-info">
            <span class="card-value">${summary.total}</span>
            <span class="card-label">Total Features</span>
          </div>
        </div>
        
        <div class="summary-card enabled">
          <div class="card-visual">
            <div class="status-indicator active"></div>
            <div class="card-icon">${icons.checkCircle}</div>
          </div>
          <div class="card-info">
            <span class="card-value">${summary.enabled}</span>
            <span class="card-label">Active</span>
          </div>
        </div>
        
        <div class="summary-card needs-config">
          <div class="card-visual">
            <div class="status-indicator warning"></div>
            <div class="card-icon">${icons.alertTriangle}</div>
          </div>
          <div class="card-info">
            <span class="card-value">${summary.needsConfig}</span>
            <span class="card-label">Needs Setup</span>
          </div>
        </div>
        
        <div class="summary-card disabled">
          <div class="card-visual">
            <div class="status-indicator inactive"></div>
            <div class="card-icon">${icons.x}</div>
          </div>
          <div class="card-info">
            <span class="card-value">${summary.disabled}</span>
            <span class="card-label">Inactive</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderContent(state: AppViewState) {
  const categories = (state.featuresList || []) as FeatureCategory[];
  
  if (categories.length === 0) {
    return html`
      <div class="features-empty">
        <div class="empty-illustration">
          ${icons.settings}
        </div>
        <h3>No features found</h3>
        <p>Try adjusting your search or filters</p>
        ${state.featuresSearchQuery ? html`
          <button @click="${() => state.handleFeaturesSearchChange('')}" class="btn-secondary">
            Clear search
          </button>
        ` : nothing}
      </div>
    `;
  }

  return html`
    <section class="features-content">
      ${categories.map(category => renderCategory(category, state))}
    </section>
  `;
}

function renderCategory(category: FeatureCategory, state: AppViewState) {
  const isExpanded = state.expandedCategories?.includes(category.id) ?? true;
  const enabledCount = category.features.filter(f => f.status === 'enabled').length;
  const totalCount = category.features.length;
  const completionPercent = totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0;
  
  return html`
    <div class="feature-category ${isExpanded ? 'expanded' : 'collapsed'}">
      <div class="category-header" @click="${() => state.handleToggleCategory(category.id)}">
        <div class="category-main">
          <div class="category-icon-wrapper">
            ${getIcon(category.icon)}
          </div>
          <div class="category-meta">
            <h3>${category.name}</h3>
            <p>${category.description}</p>
          </div>
        </div>
        
        <div class="category-stats">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${completionPercent}%"></div>
          </div>
          <span class="stats-text">${enabledCount}/${totalCount}</span>
        </div>
        
        <div class="category-toggle">
          ${isExpanded ? icons.chevronUp : icons.chevronDown}
        </div>
      </div>
      
      ${isExpanded ? html`
        <div class="category-features">
          ${category.features.map(feature => renderFeatureCard(feature, state))}
        </div>
      ` : nothing}
    </div>
  `;
}

function renderFeatureCard(feature: DashboardFeature, state: AppViewState) {
  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    enabled: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', dot: '#10b981' },
    disabled: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', dot: '#6b7280' },
    needs_config: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', dot: '#f59e0b' },
    unavailable: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', dot: '#ef4444' }
  };
  
  const statusLabels: Record<string, string> = {
    enabled: 'Active',
    disabled: 'Inactive',
    needs_config: 'Needs Setup',
    unavailable: 'Unavailable'
  };
  
  const status = statusColors[feature.status] || statusColors.disabled;
  const statusLabel = statusLabels[feature.status] || feature.status;
  
  return html`
    <div class="feature-item ${feature.status}" data-feature-id="${feature.id}">
      ${feature.isNew ? html`<span class="badge-new">NEW</span>` : nothing}
      
      <div class="feature-main">
        <div class="feature-icon-wrapper">
          ${getIcon(feature.icon)}
        </div>
        
        <div class="feature-content">
          <div class="feature-header">
            <h4>${feature.name}</h4>
            <div class="status-badge" 
                 style="background: ${status.bg}; color: ${status.text};">
              <span class="status-dot" style="background: ${status.dot}"></span>
              ${statusLabel}
            </div>
          </div>
          
          <p class="feature-description">${feature.description}</p>
          
          ${feature.tags?.length ? html`
            <div class="feature-tags">
              ${feature.tags.map(tag => html`<span class="tag">${tag}</span>`)}
            </div>
          ` : nothing}
          
          ${feature.requires?.length ? html`
            <div class="feature-requires">
              <span class="requires-label">Requires:</span>
              ${feature.requires.map(req => html`<span class="requirement">${req}</span>`)}
            </div>
          ` : nothing}
        </div>
      </div>
      
      <div class="feature-actions">
        ${feature.quickActions?.map(action => html`
          <button 
            class="action-btn ${action.id}"
            @click="${(e: Event) => {
              e.stopPropagation();
              handleQuickAction(action.id, feature, state);
            }}"
            title="${action.label}"
          >
            ${action.id === 'toggle' 
              ? (feature.status === 'enabled' ? icons.x : icons.check)
              : action.id === 'config' ? icons.settings 
              : icons.externalLink
            }
            <span>${action.label}</span>
          </button>
        `)}
      </div>
    </div>
  `;
}

function handleQuickAction(actionId: string, feature: DashboardFeature, state: AppViewState) {
  switch (actionId) {
    case 'toggle':
      const newEnabled = feature.status !== 'enabled';
      state.handleFeaturesToggle(feature.id, newEnabled);
      break;
    case 'config':
      if (feature.configRoute) {
        window.location.hash = feature.configRoute;
      } else if (feature.configurable) {
        state.handleFeaturesOpenConfigModal(feature.id);
      }
      break;
    case 'view':
      if (feature.configRoute) {
        window.location.hash = feature.configRoute;
      }
      break;
  }
}

function renderConfigModal(state: AppViewState) {
  if (!state.featuresConfigModalOpen || !state.featuresConfigModalFeature) return nothing;
  
  const feature = (state.featuresList as FeatureCategory[])
    .flatMap(c => c.features)
    .find((f: DashboardFeature) => f.id === state.featuresConfigModalFeature);
    
  if (!feature) return nothing;

  return html`
    <div class="modal-overlay" @click="${() => state.handleFeaturesCloseConfigModal()}">
      <div class="modal config-modal" @click="${(e: Event) => e.stopPropagation()}">
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-icon">${getIcon(feature.icon)}</div>
            <div>
              <h3>Configure ${feature.name}</h3>
              <p>${feature.description}</p>
            </div>
          </div>
          <button class="btn-close" @click="${() => state.handleFeaturesCloseConfigModal()}">
            ${icons.x}
          </button>
        </div>
        
        <div class="modal-body">
          <div class="config-placeholder">
            ${icons.settings}
            <p>Configuration options for ${feature.name} will appear here.</p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="${() => state.handleFeaturesCloseConfigModal()}">
            Cancel
          </button>
          <button
            class="btn-primary"
            @click="${() => state.handleFeaturesConfigure(feature.id, state.featuresConfigFormData || {})}"
          >
            ${icons.check} Save Changes
          </button>
        </div>
      </div>
    </div>
  `;
}
