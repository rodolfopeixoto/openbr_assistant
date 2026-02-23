import { html, nothing } from "lit";
import type { ChannelConfigField, ChannelConfigSchema, ChannelConfigType } from "./channels.config";
import { CHANNEL_CONFIG_SCHEMAS, getDefaultChannelConfig } from "./channels.config";
import { icons } from "../icons";

export type ChannelSetupModalState = {
  isOpen: boolean;
  channelKey: ChannelConfigType | null;
  formData: Record<string, unknown>;
  isSubmitting: boolean;
  error: string | null;
};

export type ChannelSetupModalProps = {
  state: ChannelSetupModalState;
  onClose: () => void;
  onSubmit: (channelKey: ChannelConfigType, config: Record<string, unknown>) => Promise<void>;
  onFieldChange: (name: string, value: unknown) => void;
};

export function createInitialModalState(): ChannelSetupModalState {
  return {
    isOpen: false,
    channelKey: null,
    formData: {},
    isSubmitting: false,
    error: null,
  };
}

export function openChannelSetupModal(
  state: ChannelSetupModalState,
  channelKey: ChannelConfigType,
  existingConfig?: Record<string, unknown>,
): ChannelSetupModalState {
  const schema = CHANNEL_CONFIG_SCHEMAS[channelKey];
  const defaultConfig = getDefaultChannelConfig(channelKey);
  
  return {
    ...state,
    isOpen: true,
    channelKey,
    formData: { ...defaultConfig, ...existingConfig },
    isSubmitting: false,
    error: null,
  };
}

export function closeChannelSetupModal(state: ChannelSetupModalState): ChannelSetupModalState {
  return {
    ...state,
    isOpen: false,
    channelKey: null,
    formData: {},
    isSubmitting: false,
    error: null,
  };
}

export function updateChannelSetupField(
  state: ChannelSetupModalState,
  name: string,
  value: unknown,
): ChannelSetupModalState {
  return {
    ...state,
    formData: {
      ...state.formData,
      [name]: value,
    },
  };
}

export function renderChannelSetupModal(props: ChannelSetupModalProps) {
  const { state, onClose, onSubmit, onFieldChange } = props;
  
  if (!state.isOpen || !state.channelKey) {
    return nothing;
  }

  const schema = CHANNEL_CONFIG_SCHEMAS[state.channelKey];
  if (!schema) {
    return nothing;
  }

  const isValid = validateChannelConfig(state.channelKey, state.formData);

  return html`
    <div class="modal-overlay channel-setup-modal" @click="${onClose}">
      <div class="modal-content" @click="${(e: Event) => e.stopPropagation()}">
        <div class="modal-header">
          <div class="modal-title-wrapper">
            <div class="channel-icon-large" style="background: var(--accent-subtle); color: var(--accent);">
              ${icons[schema.icon]}
            </div>
            <div>
              <h2>Set up ${schema.name}</h2>
              <p class="modal-subtitle">${schema.description}</p>
            </div>
          </div>
          <button class="modal-close" @click="${onClose}" title="Close">
            ${icons.x}
          </button>
        </div>

        <div class="modal-body">
          ${state.error ? html`
            <div class="channel-setup-error">
              <span class="error-icon">${icons.alertCircle}</span>
              <span class="error-text">${state.error}</span>
            </div>
          ` : nothing}

          ${schema.setupSteps ? html`
            <div class="setup-steps">
              <h4>Setup Steps:</h4>
              <ol>
                ${schema.setupSteps.map(step => html`
                  <li>${step}</li>
                `)}
              </ol>
            </div>
          ` : nothing}

          <div class="channel-config-form">
            ${schema.fields.map(field => renderConfigField(field, state.formData[field.name], onFieldChange))}
          </div>

          ${schema.docsUrl ? html`
            <a 
              href="${schema.docsUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="docs-link"
            >
              ${icons.externalLink}
              View documentation for ${schema.name}
            </a>
          ` : nothing}
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="${onClose}" ?disabled="${state.isSubmitting}">
            Cancel
          </button>
          <button
            class="btn-primary"
            @click="${() => onSubmit(state.channelKey!, state.formData)}"
            ?disabled="${!isValid || state.isSubmitting}"
          >
            ${state.isSubmitting
              ? html`<span class="btn-spinner"></span>Setting up...`
              : html`${icons.check}Enable ${schema.name}`}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderConfigField(
  field: ChannelConfigField,
  value: unknown,
  onChange: (name: string, value: unknown) => void,
) {
  const fieldId = `field-${field.name}`;
  
  switch (field.type) {
    case "text":
    case "password":
      return html`
        <div class="form-group">
          <label for="${fieldId}">
            ${field.label}
            ${field.required ? html`<span class="required">*</span>` : nothing}
          </label>
          <input
            type="${field.type}"
            id="${fieldId}"
            .value="${(value as string) || ""}"
            placeholder="${field.placeholder || ""}"
            ?required="${field.required}"
            @input="${(e: InputEvent) => onChange(field.name, (e.target as HTMLInputElement).value)}"
          />
          ${field.description ? html`
            <p class="field-description">${field.description}</p>
          ` : nothing}
        </div>
      `;

    case "select":
      return html`
        <div class="form-group">
          <label for="${fieldId}">
            ${field.label}
            ${field.required ? html`<span class="required">*</span>` : nothing}
          </label>
          <select
            id="${fieldId}"
            .value="${(value as string) || field.defaultValue || ""}"
            ?required="${field.required}"
            @change="${(e: InputEvent) => onChange(field.name, (e.target as HTMLSelectElement).value)}"
          >
            ${field.options?.map(option => html`
              <option value="${option.value}">${option.label}</option>
            `)}
          </select>
          ${field.description ? html`
            <p class="field-description">${field.description}</p>
          ` : nothing}
        </div>
      `;

    case "checkbox":
      return html`
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              .checked="${!!value}"
              @change="${(e: InputEvent) => onChange(field.name, (e.target as HTMLInputElement).checked)}"
            />
            <span class="checkbox-text">
              ${field.label}
              ${field.required ? html`<span class="required">*</span>` : nothing}
            </span>
          </label>
          ${field.description ? html`
            <p class="field-description">${field.description}</p>
          ` : nothing}
        </div>
      `;

    case "array":
      return renderArrayField(field, value as string[] || [], onChange);

    default:
      return nothing;
  }
}

function renderArrayField(
  field: ChannelConfigField,
  values: string[],
  onChange: (name: string, value: unknown) => void,
) {
  const items = Array.isArray(values) ? values : [];
  
  return html`
    <div class="form-group">
      <label>
        ${field.label}
        ${field.required ? html`<span class="required">*</span>` : nothing}
      </label>
      
      <div class="array-field">
        ${items.map((item, index) => html`
          <div class="array-item">
            <input
              type="text"
              .value="${item}"
              placeholder="${field.placeholder || ""}"
              @input="${(e: InputEvent) => {
                const newItems = [...items];
                newItems[index] = (e.target as HTMLInputElement).value;
                onChange(field.name, newItems);
              }}"
            />
            <button 
              class="array-remove"
              @click="${() => {
                const newItems = items.filter((_, i) => i !== index);
                onChange(field.name, newItems);
              }}"
              title="Remove"
            >
              ${icons.x}
            </button>
          </div>
        `)}
        
        <button 
          class="array-add"
          @click="${() => onChange(field.name, [...items, ""])}"
        >
          ${icons.plus}
          Add ${field.label}
        </button>
      </div>
      
      ${field.description ? html`
        <p class="field-description">${field.description}</p>
      ` : nothing}
    </div>
  `;
}

function validateChannelConfig(channelKey: ChannelConfigType, formData: Record<string, unknown>): boolean {
  const schema = CHANNEL_CONFIG_SCHEMAS[channelKey];
  if (!schema) return false;

  for (const field of schema.fields) {
    if (field.required) {
      const value = formData[field.name];
      if (value === undefined || value === null || value === "") {
        return false;
      }
      if (field.type === "array" && Array.isArray(value) && value.length === 0) {
        return false;
      }
    }
  }

  return true;
}
