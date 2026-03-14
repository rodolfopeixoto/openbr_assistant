import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";
import type { RoutingTier, TestRoutingResult, TierConfig } from "../controllers/model-routing.js";

// Icons (using emoji/simple text for now - could use proper icon library)
const icons: Record<string, string> = {
  zap: "⚡",
  activity: "📊",
  brain: "🧠",
  check: "✓",
  x: "✕",
  settings: "⚙️",
  externalLink: "↗",
  power: "⏻",
  chevronUp: "▲",
  chevronDown: "▼",
  dollar: "$",
  clock: "🕐",
  routing: "🔄",
  search: "🔍",
  drag: "⋮⋮",
};

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
                <div class="stat-icon">${icons.dollar}</div>
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
          <span class="tier-icon">${icons[tier.icon]}</span>
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
      <span class="drag-handle">${icons.drag}</span>
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
