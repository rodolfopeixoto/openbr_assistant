import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";
import type { RoutingTier, TestRoutingResult, TierConfig } from "../controllers/model-routing.js";
import { icons } from "../icons.js";

// Helper to map icon names from tier config to actual icon components
function getTierIcon(iconName: string): ReturnType<typeof html> {
  const iconMap: Record<string, ReturnType<typeof html>> = {
    zap: icons.zap,
    activity: icons.barChart,
    brain: icons.brain,
  };
  return iconMap[iconName] || icons.circle;
}

export function renderModelRoutingView(state: AppViewState) {
  const status = state.modelRoutingStatus as
    | {
        enabled: boolean;
        currentTier: RoutingTier | null;
        tiers: Record<RoutingTier, TierConfig>;
        stats: {
          totalRouted: number;
          costSavings: number;
          avgLatency: number;
          savingsPercentage?: number;
        };
      }
    | undefined;

  return html`
    <style>
      .model-routing-view {
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: var(--space-6);
        position: relative;
        z-index: 1;
        background: transparent;
      }

      /* Remover quaisquer overlays decorativos */
      .model-routing-view::before,
      .model-routing-view::after,
      .tier-card::before,
      .tier-card::after,
      .tier-header::before,
      .tier-header::after {
        display: none !important;
        content: none !important;
        background: none !important;
        border: none !important;
      }

      .view-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-6);
        margin-bottom: var(--space-8);
        flex-wrap: wrap;
        position: relative;
        z-index: 2;
      }

      .header-stats {
        display: flex;
        gap: var(--space-4);
        flex-wrap: wrap;
      }

      .tiers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--space-6);
        margin-top: var(--space-6);
        position: relative;
        z-index: 2;
      }

      /* Estilos dos cards de tier - sem decorações */
      .tier-card {
        background: var(--card, #1a1a2e);
        border: 1px solid var(--border, #374151);
        border-radius: var(--radius-lg, 12px);
        padding: var(--space-5);
        position: relative;
        z-index: 3;
        overflow: hidden;
      }

      .tier-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-4);
        padding-bottom: var(--space-3);
        border-bottom: 1px solid var(--border, #374151);
        position: relative;
        z-index: 4;
      }

      .tier-header.success { border-bottom-color: #10b981; }
      .tier-header.info { border-bottom-color: #6366f1; }
      .tier-header.warning { border-bottom-color: #f59e0b; }

      .tier-icon-wrapper {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md, 8px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary, #111118);
        color: var(--text-primary, #f9fafb);
        flex-shrink: 0;
      }

      .tier-title {
        flex: 1;
        min-width: 0;
      }

      .tier-title h3 {
        margin: 0 0 4px 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #f9fafb);
      }

      .tier-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        background: rgba(99, 102, 241, 0.15);
        color: #6366f1;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 500;
      }

      .tier-criteria {
        display: grid;
        gap: var(--space-2);
        margin-bottom: var(--space-4);
      }

      .criteria-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: var(--font-size-sm, 0.875rem);
      }

      .criteria-label {
        color: var(--text-secondary, #9ca3af);
      }

      .criteria-value {
        color: var(--text-primary, #f9fafb);
        font-weight: 500;
      }

      .criteria-value.cost {
        color: #10b981;
      }

      .tier-models {
        margin-top: var(--space-4);
      }

      .tier-models label {
        display: block;
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-muted, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--space-2);
      }

      .models-list {
        display: grid;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
      }

      .model-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        background: var(--bg-tertiary, #111118);
        border: 1px solid var(--border, #374151);
        border-radius: var(--radius-md, 8px);
        cursor: grab;
        transition: all 0.2s ease;
      }

      .model-item:hover {
        border-color: var(--border-strong, #4b5563);
      }

      .model-item.dragging {
        opacity: 0.5;
        cursor: grabbing;
      }

      .drag-handle {
        cursor: grab;
        color: var(--text-muted, #6b7280);
      }

      .model-rank {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-muted, #6b7280);
        font-weight: 600;
        min-width: 24px;
      }

      .model-name {
        flex: 1;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-primary, #f9fafb);
        font-family: monospace;
      }

      .model-badge.local {
        padding: 2px 6px;
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .add-model-row select {
        width: 100%;
        padding: var(--space-2) var(--space-3);
        background: var(--bg-tertiary, #111118);
        border: 1px solid var(--border, #374151);
        border-radius: var(--radius-md, 8px);
        color: var(--text-primary, #f9fafb);
        font-size: var(--font-size-sm, 0.875rem);
        cursor: pointer;
      }

      .add-model-row select:focus {
        outline: none;
        border-color: #6366f1;
      }

      /* Seção de teste */
      .test-section {
        margin-top: var(--space-8);
        padding-top: var(--space-6);
        border-top: 1px solid var(--border, #374151);
      }

      .section-header {
        margin-bottom: var(--space-4);
      }

      .section-header h2 {
        margin: 0 0 4px 0;
        font-size: var(--font-size-xl, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #f9fafb);
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .section-description {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #9ca3af);
      }

      .test-form {
        display: grid;
        gap: var(--space-3);
        margin-bottom: var(--space-4);
      }

      .test-input {
        width: 100%;
        padding: var(--space-3);
        background: var(--bg-tertiary, #111118);
        border: 1px solid var(--border, #374151);
        border-radius: var(--radius-md, 8px);
        color: var(--text-primary, #f9fafb);
        font-size: var(--font-size-sm, 0.875rem);
        resize: vertical;
        font-family: inherit;
      }

      .test-input:focus {
        outline: none;
        border-color: #6366f1;
      }

      .test-result {
        background: var(--bg-secondary, #1a1a2e);
        border: 1px solid var(--border, #374151);
        border-radius: var(--radius-lg, 12px);
        padding: var(--space-4);
      }

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-4);
        padding-bottom: var(--space-3);
        border-bottom: 1px solid var(--border, #374151);
      }

      .result-header h4 {
        margin: 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
      }

      .result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-3);
        margin-bottom: var(--space-4);
      }

      .result-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .result-item .label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-muted, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .result-item .value {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-primary, #f9fafb);
        font-weight: 500;
      }

      .result-item .value.model-name {
        font-family: monospace;
        color: #6366f1;
      }

      .result-item .value.cost {
        color: #10b981;
        font-weight: 600;
      }

      .result-reason {
        margin-bottom: var(--space-3);
      }

      .result-reason .label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-muted, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: block;
        margin-bottom: 4px;
      }

      .result-reason p {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #9ca3af);
        line-height: 1.5;
      }

      .fallback-chain {
        margin-top: var(--space-3);
      }

      .fallback-chain .label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-muted, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: block;
        margin-bottom: 8px;
      }

      .chain {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .chain-item {
        padding: 4px 10px;
        background: rgba(99, 102, 241, 0.1);
        color: #6366f1;
        border-radius: 4px;
        font-size: var(--font-size-xs, 0.75rem);
        font-family: monospace;
      }

      /* Estado desabilitado */
      .disabled-state {
        text-align: center;
        padding: var(--space-12) var(--space-6);
        background: var(--bg-secondary, #1a1a2e);
        border: 2px dashed var(--border, #374151);
        border-radius: var(--radius-xl, 16px);
        position: relative;
        z-index: 2;
      }

      .disabled-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto var(--space-4);
        color: var(--text-muted, #6b7280);
        opacity: 0.5;
      }

      .disabled-state h3 {
        margin: 0 0 var(--space-2) 0;
        font-size: var(--font-size-xl, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #f9fafb);
      }

      .disabled-state p {
        margin: 0 0 var(--space-4) 0;
        font-size: var(--font-size-base, 1rem);
        color: var(--text-secondary, #9ca3af);
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }

      .benefits-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: inline-flex;
        flex-direction: column;
        gap: var(--space-2);
        text-align: left;
      }

      .benefits-list li {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #9ca3af);
      }

      /* Stats cards no header */
      .stat-card {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        background: var(--card, #1a1a2e);
        border: 1px solid var(--border, #374151);
        border-radius: var(--radius-md, 8px);
        min-width: 140px;
      }

      .stat-card.savings {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.05);
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary, #111118);
        border-radius: var(--radius-md, 8px);
        color: var(--text-secondary, #9ca3af);
        flex-shrink: 0;
      }

      .stat-card.savings .stat-icon {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }

      .stat-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .stat-value {
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 700;
        color: var(--text-primary, #f9fafb);
      }

      .stat-card.savings .stat-value {
        color: #10b981;
      }

      .stat-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-muted, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* Toggle switch */
      .toggle-switch {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
      }

      .toggle-switch input {
        display: none;
      }

      .toggle-switch .slider {
        width: 44px;
        height: 24px;
        background: var(--bg-tertiary, #111118);
        border: 1px solid var(--border, #374151);
        border-radius: 12px;
        position: relative;
        transition: all 0.2s ease;
      }

      .toggle-switch .slider::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        background: var(--text-secondary, #9ca3af);
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .toggle-switch input:checked + .slider {
        background: #6366f1;
        border-color: #6366f1;
      }

      .toggle-switch input:checked + .slider::after {
        transform: translateX(20px);
        background: white;
      }

      .toggle-label {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #9ca3af);
        font-weight: 500;
      }

      /* Header title */
      .header-title {
        flex: 1;
        min-width: 0;
      }

      .title-row {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: 4px;
        flex-wrap: wrap;
      }

      .title-row h1 {
        margin: 0;
        font-size: var(--font-size-2xl, 1.5rem);
        font-weight: 700;
        color: var(--text-primary, #f9fafb);
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .subtitle {
        margin: 0;
        font-size: var(--font-size-base, 1rem);
        color: var(--text-secondary, #9ca3af);
      }

      /* Botão primário */
      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        padding: 10px 20px;
        background: #6366f1;
        color: white;
        border: none;
        border-radius: var(--radius-md, 8px);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-primary:hover {
        background: #4f46e5;
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Botão ícone */
      .btn-icon {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid var(--border, #374151);
        border-radius: var(--radius-sm, 6px);
        color: var(--text-secondary, #9ca3af);
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;
      }

      .btn-icon:hover {
        background: var(--bg-tertiary, #111118);
        border-color: var(--border-strong, #4b5563);
        color: var(--text-primary, #f9fafb);
      }

      .btn-icon.remove:hover {
        border-color: #ef4444;
        color: #ef4444;
      }

      @media (max-width: 768px) {
        .model-routing-view {
          padding: var(--space-4);
        }

        .view-header {
          flex-direction: column;
        }

        .header-stats {
          width: 100%;
          justify-content: stretch;
        }

        .tiers-grid {
          grid-template-columns: 1fr;
        }

        .result-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>

    <div class="model-routing-view">
      ${renderHeader(status, state)} ${status?.enabled ? renderContent(status, state) : renderDisabledState()}
    </div>
  `;
}

function renderHeader(
  status:
    | {
        enabled: boolean;
        currentTier: RoutingTier | null;
        tiers: Record<RoutingTier, TierConfig>;
        stats: { totalRouted: number; costSavings: number; avgLatency: number; savingsPercentage?: number };
      }
    | undefined,
  state: AppViewState
) {
  const savings = status?.stats?.costSavings || 0;
  const total = status?.stats?.totalRouted || 0;
  const latency = status?.stats?.avgLatency || 0;

  return html`
    <div class="view-header">
      <div class="header-title">
        <div class="title-row">
          <h1>${icons.routing} Model Routing</h1>
          <label class="toggle-switch large">
            <input
              type="checkbox"
              .checked="${status?.enabled || false}"
              @change="${(e: InputEvent) => {
                const target = e.target as HTMLInputElement;
                state.handleModelRoutingToggle(target.checked);
              }}"
            />
            <span class="slider"></span>
            <span class="toggle-label">${status?.enabled ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
        <p class="subtitle">Intelligent model selection based on task complexity</p>
      </div>

      ${status?.enabled
        ? html`
            <div class="header-stats">
              <div class="stat-card savings">
                <div class="stat-icon">${icons.dollarSign}</div>
                <div class="stat-content">
                  <div class="stat-value">$${savings.toFixed(4)}</div>
                  <div class="stat-label">Saved</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">${icons.routing}</div>
                <div class="stat-content">
                  <div class="stat-value">${total.toLocaleString()}</div>
                  <div class="stat-label">Routed</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">${icons.clock}</div>
                <div class="stat-content">
                  <div class="stat-value">${Math.round(latency)}ms</div>
                  <div class="stat-label">Avg Latency</div>
                </div>
              </div>
            </div>
          `
        : nothing}
    </div>
  `;
}

function renderDisabledState() {
  return html`
    <div class="disabled-state">
      <div class="disabled-icon">${icons.power}</div>
      <h3>Model Routing is Disabled</h3>
      <p>Enable model routing to automatically select the most cost-effective model for each task.</p>
      <ul class="benefits-list">
        <li>${icons.check} Save up to 80% on API costs</li>
        <li>${icons.check} Automatic tier selection based on complexity</li>
        <li>${icons.check} Fallback chain for high availability</li>
      </ul>
    </div>
  `;
}

function renderContent(
  status: {
    enabled: boolean;
    currentTier: RoutingTier | null;
    tiers: Record<RoutingTier, TierConfig>;
    stats: { totalRouted: number; costSavings: number; avgLatency: number; savingsPercentage?: number };
  },
  state: AppViewState
) {
  return html`
    <div class="routing-content"> ${renderTiersSection(status, state)} ${renderTestSection(state)} </div>
  `;
}

function renderTiersSection(
  status: {
    enabled: boolean;
    currentTier: RoutingTier | null;
    tiers: Record<RoutingTier, TierConfig>;
    stats: { totalRouted: number; costSavings: number; avgLatency: number; savingsPercentage?: number };
  },
  state: AppViewState
) {
  const tiers: { id: RoutingTier; name: string; color: string; icon: string; gradient: string }[] = [
    { id: "simple", name: "Simple", color: "success", icon: "zap", gradient: "from-green-500 to-emerald-600" },
    { id: "medium", name: "Medium", color: "info", icon: "activity", gradient: "from-blue-500 to-indigo-600" },
    { id: "complex", name: "Complex", color: "warning", icon: "brain", gradient: "from-orange-500 to-red-600" },
  ];

  return html`
    <section class="tiers-section">
      <div class="section-header">
        <h2>Routing Tiers</h2>
        <p class="section-description">Drag models to reorder preference within each tier</p>
      </div>

      <div class="tiers-grid">
        ${tiers.map((tier) => {
          const tierConfig = status.tiers[tier.id];
          return renderTierCard(tier, tierConfig, state);
        })}
      </div>
    </section>
  `;
}

function renderTierCard(
  tier: { id: RoutingTier; name: string; color: string; icon: string; gradient: string },
  config: TierConfig,
  state: AppViewState
) {
  const maxTokens = config.criteria.maxTokens || "∞";
  const minTokens = config.criteria.minTokens || 0;

  return html`
    <div class="tier-card ${tier.id}" data-tier="${tier.id}">
      <div class="tier-header ${tier.color}">
        <div class="tier-icon-wrapper">
          <span class="tier-icon">${getTierIcon(tier.icon)}</span>
        </div>
        <div class="tier-title">
          <h3>${tier.name}</h3>
          <span class="tier-badge">${config.models.length} models</span>
        </div>
      </div>

      <div class="tier-criteria">
        <div class="criteria-row">
          <span class="criteria-label">Token Range:</span>
          <span class="criteria-value">${minTokens} - ${maxTokens}</span>
        </div>
        <div class="criteria-row">
          <span class="criteria-label">Complexity:</span>
          <span class="criteria-value">${config.criteria.complexity}</span>
        </div>
        <div class="criteria-row">
          <span class="criteria-label">Cost:</span>
          <span class="criteria-value cost">$${config.costPer1kTokens.input}/1K in</span>
        </div>
      </div>

      <div class="tier-models">
        <label>Models (preference order)</label>
        <div class="models-list" data-tier="${tier.id}">
          ${config.models.map((model, index) => renderModelItem(model, index, tier.id, state))}
        </div>

        <div class="add-model-row">
          <select
            @change="${(e: InputEvent) => {
              const target = e.target as HTMLSelectElement;
              if (target.value) {
                state.handleAddModelToTier(tier.id, target.value);
                target.value = "";
              }
            }}"
          >
            <option value="">+ Add model...</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4.5">GPT-4.5</option>
            <option value="claude-sonnet-3.5">Claude Sonnet 3.5</option>
            <option value="claude-opus-3">Claude Opus 3</option>
            <option value="local/llama-3.2-3b">Llama 3.2:3b (Local)</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderModelItem(model: string, index: number, tierId: RoutingTier, state: AppViewState) {
  const isLocal = model.includes("ollama") || model.startsWith("local/");

  return html`
    <div class="model-item" draggable="true" data-index="${index}" data-tier="${tierId}"
      @dragstart="${(e: DragEvent) => handleDragStart(e, tierId, index)}"
      @dragover="${(e: DragEvent) => handleDragOver(e)}"
      @drop="${(e: DragEvent) => handleDrop(e, tierId, index, state)}"
      @dragend="${handleDragEnd}"
    >
      <span class="drag-handle">${icons.gripVertical}</span>
      <span class="model-rank">#${index + 1}</span>
      <span class="model-name">${model}</span>
      ${isLocal ? html`<span class="model-badge local">Local</span>` : nothing}
      <button
        class="btn-icon remove"
        @click="${() => state.handleRemoveModelFromTier(tierId, index)}"
        title="Remove model"
      >
        ${icons.x}
      </button>
    </div>
  `;
}

// Drag and drop handlers
let dragSourceTier: string | null = null;
let dragSourceIndex: number | null = null;

function handleDragStart(e: DragEvent, tierId: string, index: number) {
  dragSourceTier = tierId;
  dragSourceIndex = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${tierId}:${index}`);
  }
  (e.target as HTMLElement).classList.add("dragging");
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
}

function handleDrop(e: DragEvent, tierId: string, toIndex: number, state: AppViewState) {
  e.preventDefault();
  const data = e.dataTransfer?.getData("text/plain");
  if (data && dragSourceTier === tierId && dragSourceIndex !== null) {
    state.handleReorderModelsInTier(tierId as RoutingTier, dragSourceIndex, toIndex);
  }
}

function handleDragEnd(e: DragEvent) {
  (e.target as HTMLElement).classList.remove("dragging");
  dragSourceTier = null;
  dragSourceIndex = null;
}

function renderTestSection(state: AppViewState) {
  const testResult = state.routingTestResult as TestRoutingResult | undefined;
  const testPrompt = state.routingTestPrompt || "";

  return html`
    <section class="test-section">
      <div class="section-header">
        <h2>${icons.search} Test Routing</h2>
        <p class="section-description">Enter a prompt to see which model would be selected</p>
      </div>

      <div class="test-form">
        <textarea
          class="test-input"
          placeholder="Enter a prompt to test routing...&#10;Example: 'Explain quantum computing step by step'"
          .value="${testPrompt}"
          @input="${(e: InputEvent) => {
            state.handleRoutingTestChange((e.target as HTMLTextAreaElement).value);
          }}"
          rows="3"
        ></textarea>

        <button
          class="btn-primary"
          @click="${() => state.handleTestRouting()}"
          ?disabled="${!testPrompt.trim()}"
        >
          ${icons.search} Test Routing
        </button>
      </div>

      ${testResult
        ? html`
            <div class="test-result">
              <div class="result-header">
                <h4>Selected Model</h4>
                <span class="tier-badge ${testResult.tier}">${testResult.tier} tier</span>
              </div>

              <div class="result-grid">
                <div class="result-item">
                  <span class="label">Model:</span>
                  <span class="value model-name">${testResult.model}</span>
                </div>

                <div class="result-item">
                  <span class="label">Complexity:</span>
                  <span class="value">${testResult.complexity}</span>
                </div>

                <div class="result-item">
                  <span class="label">Est. Tokens:</span>
                  <span class="value">${testResult.estimatedTokens.toLocaleString()}</span>
                </div>

                <div class="result-item">
                  <span class="label">Est. Cost:</span>
                  <span class="value cost">$${testResult.estimatedCost.toFixed(6)}</span>
                </div>
              </div>

              <div class="result-reason">
                <span class="label">Reason:</span>
                <p>${testResult.reason}</p>
              </div>

              ${testResult.fallbackChain.length > 0
                ? html`
                    <div class="fallback-chain">
                      <span class="label">Fallback Chain:</span>
                      <div class="chain">
                        ${testResult.fallbackChain.map((model) => html`<span class="chain-item">${model}</span>`)}
                      </div>
                    </div>
                  `
                : nothing}
            </div>
          `
        : nothing}
    </section>
  `;
}
