/**
 * Feature Config Form Component
 * Renderiza formulário dinâmico baseado em configSchema
 */

import { html, nothing } from "lit";

// Tipos de campos suportados
export interface ConfigSchemaField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'password' | 'textarea';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ConfigSchema {
  [key: string]: ConfigSchemaField;
}

export interface FeatureConfigFormData {
  [key: string]: unknown;
}

export interface FeatureConfigFormProps {
  schema: ConfigSchema | null;
  data: FeatureConfigFormData;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

/**
 * Renderiza um formulário de configuração dinâmico
 */
export function renderFeatureConfigForm(props: FeatureConfigFormProps) {
  const { schema, data, onChange, disabled = false } = props;

  if (!schema || Object.keys(schema).length === 0) {
    return html`
      <div class="config-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h4>Configuração Manual Necessária</h4>
        <p>Esta funcionalidade requer configuração manual através do arquivo de configuração.</p>
        <a href="/docs" target="_blank" class="btn-secondary">Ver Documentação</a>
      </div>
    `;
  }

  const fields = Object.entries(schema);

  return html`
    <div class="config-form">
      ${fields.map(([key, field]) => renderField(key, field, data[key], onChange, disabled))}
    </div>
  `;
}

function renderField(
  key: string,
  field: ConfigSchemaField,
  value: unknown,
  onChange: (key: string, value: unknown) => void,
  disabled: boolean
) {
  const currentValue = value !== undefined ? value : field.default;
  const error = validateField(field, currentValue);

  return html`
    <div class="form-group ${error ? 'has-error' : ''}">
      <label for="config-${key}">
        ${field.label}
        ${field.required ? html`<span class="required">*</span>` : nothing}
      </label>
      
      ${field.description ? html`<p class="field-description">${field.description}</p>` : nothing}
      
      ${renderInput(key, field, currentValue, onChange, disabled)}
      
      ${error ? html`<span class="field-error">${error}</span>` : nothing}
    </div>
  `;
}

function renderInput(
  key: string,
  field: ConfigSchemaField,
  value: unknown,
  onChange: (key: string, value: unknown) => void,
  disabled: boolean
) {
  const inputId = `config-${key}`;
  
  switch (field.type) {
    case 'boolean':
      return html`
        <label class="checkbox-label">
          <input
            type="checkbox"
            id="${inputId}"
            .checked="${Boolean(value)}"
            ?disabled="${disabled}"
            @change="${(e: InputEvent) => onChange(key, (e.target as HTMLInputElement).checked)}"
          />
          <span class="checkbox-slider"></span>
          <span class="checkbox-text">${field.label}</span>
        </label>
      `;

    case 'select':
      return html`
        <select
          id="${inputId}"
          .value="${String(value || '')}"
          ?disabled="${disabled}"
          @change="${(e: InputEvent) => onChange(key, (e.target as HTMLSelectElement).value)}"
        >
          ${field.options?.map(option => html`
            <option value="${option.value}" ?selected="${value === option.value}">${option.label}</option>
          `)}
        </select>
      `;

    case 'textarea':
      return html`
        <textarea
          id="${inputId}"
          .value="${String(value || '')}"
          placeholder="${field.placeholder || ''}"
          ?disabled="${disabled}"
          rows="4"
          @input="${(e: InputEvent) => onChange(key, (e.target as HTMLTextAreaElement).value)}"
        ></textarea>
      `;

    case 'password':
      return html`
        <input
          type="password"
          id="${inputId}"
          .value="${String(value || '')}"
          placeholder="${field.placeholder || ''}"
          ?disabled="${disabled}"
          @input="${(e: InputEvent) => onChange(key, (e.target as HTMLInputElement).value)}"
        />
      `;

    case 'number':
      return html`
        <input
          type="number"
          id="${inputId}"
          .value="${value !== undefined ? String(value) : ''}"
          placeholder="${field.placeholder || ''}"
          ?disabled="${disabled}"
          min="${field.validation?.min ?? nothing}"
          max="${field.validation?.max ?? nothing}"
          @input="${(e: InputEvent) => {
            const val = (e.target as HTMLInputElement).value;
            onChange(key, val ? Number(val) : undefined);
          }}"
        />
      `;

    case 'string':
    default:
      return html`
        <input
          type="text"
          id="${inputId}"
          .value="${String(value || '')}"
          placeholder="${field.placeholder || ''}"
          ?disabled="${disabled}"
          @input="${(e: InputEvent) => onChange(key, (e.target as HTMLInputElement).value)}"
        />
      `;
  }
}

function validateField(field: ConfigSchemaField, value: unknown): string | null {
  // Verifica obrigatório
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      return 'Campo obrigatório';
    }
  }

  // Se não tiver valor e não for obrigatório, está válido
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // Validação para números
  if (field.type === 'number' && typeof value === 'number') {
    if (field.validation?.min !== undefined && value < field.validation.min) {
      return `Valor mínimo: ${field.validation.min}`;
    }
    if (field.validation?.max !== undefined && value > field.validation.max) {
      return `Valor máximo: ${field.validation.max}`;
    }
  }

  // Validação de padrão (regex)
  if (field.validation?.pattern && typeof value === 'string') {
    const regex = new RegExp(field.validation.pattern);
    if (!regex.test(value)) {
      return field.validation.message || 'Formato inválido';
    }
  }

  return null;
}

/**
 * Valida todo o formulário
 */
export function validateConfigForm(
  schema: ConfigSchema,
  data: FeatureConfigFormData
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  Object.entries(schema).forEach(([key, field]) => {
    const error = validateField(field, data[key]);
    if (error) {
      errors[key] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Extrai valores padrão do schema
 */
export function getDefaultValues(schema: ConfigSchema): FeatureConfigFormData {
  const defaults: FeatureConfigFormData = {};

  Object.entries(schema).forEach(([key, field]) => {
    if (field.default !== undefined) {
      defaults[key] = field.default;
    } else {
      // Valores padrão por tipo
      switch (field.type) {
        case 'boolean':
          defaults[key] = false;
          break;
        case 'number':
          defaults[key] = 0;
          break;
        case 'select':
          defaults[key] = field.options?.[0]?.value || '';
          break;
        default:
          defaults[key] = '';
      }
    }
  });

  return defaults;
}
