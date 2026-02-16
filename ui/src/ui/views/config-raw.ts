import { html, nothing } from "lit";
import "../components/code-editor.js";
import type { CodeEditorChangeEvent } from "../components/code-editor.js";

export type RawEditorProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onFormat?: () => void;
  onValidate?: () => void;
  docPanelOpen?: boolean;
  onDocPanelToggle?: () => void;
};

export function renderRawEditor(props: RawEditorProps) {
  const lineCount = props.value.split("\n").length;

  return html`
    <div class="raw-editor">
      <div class="raw-editor__header">
        <span class="raw-editor__title">JSON Configuration</span>
        <div class="raw-editor__actions">
          <button 
            class="raw-editor__action" 
            title="Format JSON" 
            ?disabled=${props.disabled}
            @click=${() => props.onFormat?.()}
          >
            Format
          </button>
          <button 
            class="raw-editor__action" 
            title="Validate" 
            ?disabled=${props.disabled}
            @click=${() => props.onValidate?.()}
          >
            Validate
          </button>
          <button 
            class="raw-editor__action raw-editor__action--docs ${props.docPanelOpen ? 'active' : ''}"
            title="${props.docPanelOpen ? 'Hide documentation' : 'Show documentation'}"
            @click=${() => props.onDocPanelToggle?.()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            ${props.docPanelOpen ? 'Hide Docs' : 'Show Docs'}
          </button>
        </div>
      </div>
      
      <div class="raw-editor__container">
        <code-editor
          .value=${props.value}
          language="json"
          .minHeight=${400}
          .maxHeight=${600}
          ?readonly=${props.disabled}
          @change=${(e: CustomEvent<CodeEditorChangeEvent>) => props.onChange(e.detail.value)}
          @save=${() => {}}
        ></code-editor>
      </div>
      
      <div class="raw-editor__footer">
        <div class="raw-editor__footer-left">
          <span class="raw-editor__hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Editing config.json in raw mode
          </span>
        </div>
        <div class="raw-editor__footer-right">
          <span class="raw-editor__stats">${lineCount} lines • ${props.value.length} chars</span>
        </div>
      </div>
    </div>
  `;
}