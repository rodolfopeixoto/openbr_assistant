import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state";

export function renderBudgetView(state: AppViewState) {
  return html`
    <div class="budget-view">
      <section class="content-header">
        <div>
          <div class="page-title">Budget</div>
          <div class="page-sub">Manage costs and spending limits</div>
        </div>
      </section>

      <div class="budget-content">
        ${state.budgetLoading
          ? html`<div class="loading">Loading...</div>`
          : state.budgetError
            ? html`<div class="error">${state.budgetError}</div>`
            : html`
              <div class="budget-overview">
                <div class="budget-card">
                  <div class="budget-header">
                    <span class="budget-label">Monthly Budget</span>
                    <span class="budget-value">$${state.budgetStatus?.limit || 100}</span>
                  </div>
                  <div class="budget-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${state.budgetStatus?.percentageUsed || 0}%"></div>
                    </div>
                    <div class="progress-labels">
                      <span>Spent: $${state.budgetStatus?.spent || 0}</span>
                      <span>${state.budgetStatus?.percentageUsed?.toFixed(1) || 0}% used</span>
                      <span>Remaining: $${state.budgetStatus?.remaining || 100}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="budget-history">
                <h3>History</h3>
                <div class="history-list">
                  ${state.budgetStatus?.history?.map((month: any) => html`
                    <div class="history-item ${month.overBudget ? 'over-budget' : ''}">
                      <span class="history-month">${month.month}</span>
                      <span class="history-spent">$${month.spent.toFixed(2)}</span>
                      <span class="history-limit">of $${month.limit}</span>
                      ${month.overBudget ? html`<span class="over-badge">OVER BUDGET</span>` : nothing}
                    </div>
                  `)}
                </div>
              </div>

              <div class="budget-actions">
                <button @click=${() => state.handleBudgetLoad()}>Refresh</button>
              </div>
            `}
      </div>
    </div>
  `;
}
