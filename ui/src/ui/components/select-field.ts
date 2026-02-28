import { html, nothing, type TemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

export interface SelectOption {
  value: string | number | boolean;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  label: string;
  value: string | number | boolean | undefined;
  options: SelectOption[];
  placeholder?: string;
  help?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  onChange: (value: string | number | boolean | undefined) => void;
}

// Icons
const icons = {
  chevronDown: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `,
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
};

export function renderSelectField(props: SelectFieldProps): TemplateResult {
  const {
    label,
    value,
    options,
    placeholder = "Select...",
    help,
    disabled = false,
    searchable = false,
    clearable = false,
    onChange,
  } = props;

  // Find current option
  const currentOption = options.find((opt) => opt.value === value);
  const displayValue = currentOption?.label || placeholder;

  return html`
    <div class="cfg-select-field" ?data-disabled=${disabled}>
      <label class="cfg-field__label">${label}</label>
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      
      <div class="cfg-select-wrapper">
        <select
          class="cfg-select"
          ?disabled=${disabled}
          @change=${(e: Event) => {
            const target = e.target as HTMLSelectElement;
            const index = parseInt(target.value);
            if (isNaN(index)) {
              onChange(undefined);
            } else {
              onChange(options[index]?.value);
            }
          }}
        >
          <option value="" ?selected=${value === undefined}>${placeholder}</option>
          ${options.map((opt, idx) => html`
            <option
              value=${String(idx)}
              ?selected=${opt.value === value}
              ?disabled=${opt.disabled}
              title=${ifDefined(opt.description)}
            >
              ${opt.label}
            </option>
          `)}
        </select>
        
        <div class="cfg-select-icon">${icons.chevronDown}</div>
        
        ${clearable && value !== undefined
          ? html`
              <button
                type="button"
                class="cfg-select-clear"
                ?disabled=${disabled}
                @click=${() => onChange(undefined)}
                title="Clear selection"
              >
                ${icons.x}
              </button>
            `
          : nothing}
      </div>
      
      ${currentOption?.description
        ? html`<div class="cfg-select-description">${currentOption.description}</div>`
        : nothing}
    </div>
  `;
}

// Alternative segmented control for small option sets (≤5 options)
export function renderSegmentedField(props: Omit<SelectFieldProps, 'searchable' | 'clearable'>): TemplateResult {
  const { label, value, options, help, disabled = false, onChange } = props;

  return html`
    <div class="cfg-segmented-field" ?data-disabled=${disabled}>
      <label class="cfg-field__label">${label}</label>
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      
      <div class="cfg-segmented">
        ${options.map((opt) => html`
          <button
            type="button"
            class="cfg-segmented__btn ${opt.value === value ? 'active' : ''}"
            ?disabled=${disabled || opt.disabled}
            title=${ifDefined(opt.description)}
            @click=${() => onChange(opt.value)}
          >
            ${opt.label}
          </button>
        `)}
      </div>
    </div>
  `;
}

// Enhanced searchable dropdown (custom implementation)
export function renderSearchableSelect(props: SelectFieldProps): TemplateResult {
  // For now, fallback to native select with search attribute
  // In a full implementation, this would have a custom dropdown with search input
  return renderSelectField({ ...props, searchable: true });
}
