import { html, nothing, type TemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

export interface AutocompleteResult {
  value: string;
  label: string;
  description?: string;
  category?: string;
}

export interface AutocompleteFieldProps {
  label: string;
  value: string | undefined;
  source: 'agents' | 'models' | 'channels' | 'skills' | 'tools' | 'profiles' | 'custom';
  searchEndpoint?: string;
  placeholder?: string;
  help?: string;
  disabled?: boolean;
  minChars?: number;
  maxResults?: number;
  allowCreate?: boolean;
  debounceMs?: number;
  onSearch: (query: string) => Promise<AutocompleteResult[]>;
  onChange: (value: string | undefined) => void;
}

// Icons
const icons = {
  search: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  `,
  x: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `,
  check: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `,
  loader: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
  `,
};

// Debounce utility
function debounce(fn: (query: string) => void, ms: number): (query: string) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (query: string) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(query), ms);
  };
}

export class AutocompleteFieldController {
  private props: AutocompleteFieldProps;
  private state: {
    isOpen: boolean;
    isLoading: boolean;
    query: string;
    results: AutocompleteResult[];
    selectedIndex: number;
    error: string | null;
  } = {
    isOpen: false,
    isLoading: false,
    query: '',
    results: [],
    selectedIndex: -1,
    error: null,
  };
  private debouncedSearch: (query: string) => void;
  private onStateChange: () => void;

  constructor(props: AutocompleteFieldProps, onStateChange: () => void) {
    this.props = props;
    this.onStateChange = onStateChange;
    this.debouncedSearch = debounce(this.performSearch.bind(this), props.debounceMs || 150);
    
    // Initialize query from value if exists
    if (props.value) {
      this.state.query = props.value;
    }
  }

  getState() {
    return { ...this.state };
  }

  private async performSearch(query: string) {
    if (query.length < (this.props.minChars || 2)) {
      this.state.results = [];
      this.state.isLoading = false;
      this.onStateChange();
      return;
    }

    this.state.isLoading = true;
    this.state.error = null;
    this.onStateChange();

    try {
      const results = await this.props.onSearch(query);
      this.state.results = results.slice(0, this.props.maxResults || 10);
      this.state.isLoading = false;
      this.onStateChange();
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Search failed';
      this.state.isLoading = false;
      this.onStateChange();
    }
  }

  handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.state.query = value;
    this.state.isOpen = true;
    this.state.selectedIndex = -1;
    this.onStateChange();
    this.debouncedSearch(value);
  }

  handleFocus() {
    if (this.state.query.length >= (this.props.minChars || 2)) {
      this.state.isOpen = true;
      this.performSearch(this.state.query);
    }
  }

  handleBlur() {
    // Delay closing to allow click on results
    setTimeout(() => {
      this.state.isOpen = false;
      this.onStateChange();
    }, 200);
  }

  handleKeydown(e: KeyboardEvent) {
    if (!this.state.isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.state.selectedIndex = Math.min(
          this.state.selectedIndex + 1,
          this.state.results.length - 1
        );
        this.onStateChange();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, -1);
        this.onStateChange();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.state.selectedIndex >= 0) {
          this.selectResult(this.state.results[this.state.selectedIndex]);
        }
        break;
      case 'Escape':
        this.state.isOpen = false;
        this.onStateChange();
        break;
    }
  }

  selectResult(result: AutocompleteResult) {
    this.state.query = result.label;
    this.state.isOpen = false;
    this.state.selectedIndex = -1;
    this.onStateChange();
    this.props.onChange(result.value);
  }

  clear() {
    this.state.query = '';
    this.state.results = [];
    this.state.isOpen = false;
    this.onStateChange();
    this.props.onChange(undefined);
  }

  createNew() {
    if (this.props.allowCreate && this.state.query) {
      this.props.onChange(this.state.query);
      this.state.isOpen = false;
      this.onStateChange();
    }
  }
}

export function renderAutocompleteField(
  props: AutocompleteFieldProps,
  controller: AutocompleteFieldController
): TemplateResult {
  const state = controller.getState();
  const { label, help, disabled = false, placeholder = "Search...", allowCreate = false } = props;

  // Group results by category
  const groupedResults = state.results.reduce((acc, result) => {
    const category = result.category || 'Results';
    if (!acc[category]) acc[category] = [];
    acc[category].push(result);
    return acc;
  }, {} as Record<string, AutocompleteResult[]>);

  return html`
    <div class="cfg-autocomplete-field" ?data-disabled=${disabled}>
      <label class="cfg-field__label">${label}</label>
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      
      <div class="cfg-autocomplete-wrapper">
        <div class="cfg-autocomplete-input-wrap">
          ${icons.search}
          <input
            type="text"
            class="cfg-autocomplete-input"
            placeholder=${placeholder}
            .value=${state.query}
            ?disabled=${disabled}
            @input=${(e: Event) => controller.handleInput(e)}
            @focus=${() => controller.handleFocus()}
            @blur=${() => controller.handleBlur()}
            @keydown=${(e: KeyboardEvent) => controller.handleKeydown(e)}
            autocomplete="off"
            role="combobox"
            aria-expanded=${state.isOpen}
            aria-autocomplete="list"
          />
          ${state.isLoading
            ? html`<div class="cfg-autocomplete-loader">${icons.loader}</div>`
            : state.query
              ? html`
                  <button
                    type="button"
                    class="cfg-autocomplete-clear"
                    @click=${() => controller.clear()}
                    title="Clear"
                  >
                    ${icons.x}
                  </button>
                `
              : nothing}
        </div>
        
        ${state.isOpen
          ? html`
              <div class="cfg-autocomplete-dropdown" role="listbox">
                ${state.error
                  ? html`<div class="cfg-autocomplete-error">${state.error}</div>`
                  : state.results.length === 0 && state.query.length >= (props.minChars || 2) && !state.isLoading
                    ? html`
                        <div class="cfg-autocomplete-empty">
                          No results found
                          ${allowCreate
                            ? html`
                                <button
                                  type="button"
                                  class="cfg-autocomplete-create"
                                  @click=${() => controller.createNew()}
                                >
                                  Create "${state.query}"
                                </button>
                              `
                            : nothing}
                        </div>
                      `
                    : Object.entries(groupedResults).map(([category, results], catIdx) => html`
                        <div class="cfg-autocomplete-category">
                          <div class="cfg-autocomplete-category-header">${category}</div>
                          ${results.map((result, idx) => {
                            const globalIdx = state.results.findIndex((r) => r === result);
                            const isSelected = globalIdx === state.selectedIndex;
                            return html`
                              <button
                                type="button"
                                class="cfg-autocomplete-option ${isSelected ? 'selected' : ''}"
                                role="option"
                                ?aria-selected=${isSelected}
                                @click=${() => controller.selectResult(result)}
                                @mouseenter=${() => {
                                  state.selectedIndex = globalIdx;
                                  // Trigger re-render
                                }}
                              >
                                <div class="cfg-autocomplete-option-label">${result.label}</div>
                                ${result.description
                                  ? html`<div class="cfg-autocomplete-option-desc">${result.description}</div>`
                                  : nothing}
                              </button>
                            `;
                          })}
                        </div>
                      `)}
              </div>
            `
          : nothing}
      </div>
    </div>
  `;
}
