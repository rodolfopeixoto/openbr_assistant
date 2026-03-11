import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";
import { icons } from "../icons";
import type { FeatureCategory, DashboardFeature, QuickAction } from "../../../config/feature-registry";

// Spec B1: Centralized Features Dashboard

export function renderFeaturesView(state: AppViewState) {
  const features = state.featuresList || [];
  
  // Auto-load features on first render
  if (features.length === 0 && !state.featuresLoading && !state.featuresError && state.connected) {
    state.handleFeaturesLoad();
  }

  if (state.featuresLoading) {
    return html`
      <div class="view-loading">
        <div class="spinner"></div>
        <p>Loading features...</p>
      </div>
    `;
  }

  return html`
    <div class="features-dashboard">
      ${renderHeader(state)}
      ${renderSummaryCards(state)}
      ${renderCategories(state)}
      ${renderConfigModal(state)}
    </div>
  `;
}

function renderHeader(state: AppViewState) {
  return html`
    <div class="view-header">
      <div class="header-title">
        <h1>Features</h1>
        <p class="subtitle">Manage all features and integrations</p>
      </div>
      <div class="header-actions">
        <input 
          type="search" 
          .value="${state.featuresSearchQuery}"
          @input="${(e: InputEvent) => state.handleFeaturesSearchChange((e.target as HTMLInputElement).value)}"
          placeholder="Search features..."
          class="search-input"
        />
      </div>
    </div>
  `;
}

function renderSummaryCards(state: AppViewState) {
  const summary = state.featuresSummary || { total: 0, enabled: 0, disabled: 0, needsConfig: 0 };
  
  return html`
    <div class="summary-cards">
      <div class="summary-card">
        <div class="value">${summary.total}</div>
        <div class="label">Total Features</div>
      </div>
      
      <div class="summary-card enabled">
        <div class="value">${summary.enabled}</div>
        <div class="label">Enabled</div>
      </div>
      
      <div class="summary-card needs-config">
        <div class="value">${summary.needsConfig}</div>
        <div class="label">Needs Config</div>
      </div>
      
      <div class="summary-card disabled">
        <div class="value">${summary.disabled}</div>
        <div class="label">Disabled</div>
      </div>
    </div>
  `;
}

function renderCategories(state: AppViewState) {
  const categories = state.featureCategories || [];
  
  if (categories.length === 0) {
    return html`
      <div class="features-empty">
        <div class="features-empty-icon">${icons.box}</div>
        <h3>No features found</h3>
        <p>No features match your search criteria</p>
      </div>
    `;
  }
  
  return html`
    <div class="categories-grid">
      ${categories.map(cat => renderCategorySection(cat, state))}
    </div>
  `;
}

function renderCategorySection(category: FeatureCategory, state: AppViewState) {
  const isExpanded = state.expandedCategories?.includes(category.id) ?? true;
  const enabledCount = category.features.filter(f => f.status === 'enabled').length;
  
  return html`
    <div class="category-section ${isExpanded ? 'expanded' : 'collapsed'}">
      <div 
        class="category-header" 
        @click="${() => state.handleToggleCategory(category.id)}"
      >
        <div class="category-icon">${icons[category.icon] || icons.settings}</div>
        <div class="category-info">
          <h3>${category.name}</h3>
          <p>${category.description}</p>
        </div>
        <div class="category-count">
          ${enabledCount}/${category.features.length}
        </div>
        <div class="expand-icon">
          ${isExpanded ? icons.chevronUp : icons.chevronDown}
        </div>
      </div>
      
      ${isExpanded ? html`
        <div class="features-grid">
          ${category.features.map(f => renderFeatureCard(f, state))}
        </div>
      ` : nothing}
    </div>
  `;
}

function renderFeatureCard(feature: DashboardFeature, state: AppViewState) {
  const statusClass = {
    'enabled': 'success',
    'disabled': 'neutral',
    'needs_config': 'warning',
    'unavailable': 'error'
  }[feature.status];
  
  const statusLabel = {
    'enabled': 'Enabled',
    'disabled': 'Disabled',
    'needs_config': 'Needs Config',
    'unavailable': 'Unavailable'
  }[feature.status];
  
  return html`
    <div 
      class="feature-card ${feature.status}"
      @click="${() => handleFeatureClick(feature, state)}"
    >
      ${feature.isNew ? html`<span class="badge-new">NEW</span>` : nothing}
      
      <div class="card-header">
        <div class="feature-icon">${icons[feature.icon] || icons.settings}</div>
        <div class="status-badge ${statusClass}">${statusLabel}</div>
      </div>
      
      <h4>${feature.name}</h4>
      <p class="description">${feature.description}</p>
      
      ${feature.tags?.length ? html`
        <div class="feature-tags">
          ${feature.tags.map(tag => html`<span class="tag">${tag}</span>`)}
        </div>
      ` : nothing}
      
      <div class="quick-actions">
        ${feature.quickActions?.map(action => renderQuickAction(action, feature, state))}
      </div>
    </div>
  `;
}

function renderQuickAction(action: QuickAction, feature: DashboardFeature, state: AppViewState) {
  const iconMap: Record<string, string> = {
    'toggle': 'power',
    'config': 'settings',
    'view': 'externalLink'
  };
  
  return html`
    <button 
      @click="${(e: Event) => {
        e.stopPropagation();
        handleQuickAction(action, feature, state);
      }}"
      class="btn-quick ${action.id}"
      title="${action.label}"
    >
      ${icons[iconMap[action.id]] || icons.settings}
    </button>
  `;
}

function handleFeatureClick(feature: DashboardFeature, state: AppViewState) {
  if (feature.configRoute) {
    window.location.hash = feature.configRoute;
  } else if (feature.configurable) {
    state.handleFeaturesOpenConfigModal(feature.id);
  }
}

function handleQuickAction(action: QuickAction, feature: DashboardFeature, state: AppViewState) {
  switch (action.id) {
    case 'toggle':
      const newStatus = feature.status === 'enabled' ? false : true;
      state.handleFeaturesToggle(feature.id, newStatus);
      break;
    case 'config':
      if (feature.configRoute) {
        window.location.hash = feature.configRoute;
      } else {
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
  
  const feature = state.featuresList.find(f => f.id === state.featuresConfigModalFeature);
  if (!feature) return nothing;
  
  return html`
    <div class="modal-overlay" @click="${() => state.handleFeaturesCloseConfigModal()}">
      <div class="modal" @click="${(e: Event) => e.stopPropagation()}">
        <div class="modal-header">
          <h3>Configure ${feature.name}</h3>
          <button class="btn-close" @click="${() => state.handleFeaturesCloseConfigModal()}">
            ${icons.x}
          </button>
        </div>
        <div class="modal-body">
          <p>${feature.description}</p>
          <!-- Config fields would go here -->
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="${() => state.handleFeaturesCloseConfigModal()}">
            Cancel
          </button>
          <button 
            class="btn-primary" 
            @click="${() => state.handleFeaturesConfigure(feature.id, state.featuresConfigFormData)}"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  `;
}
