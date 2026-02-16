import { html, LitElement, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

export type EditorLanguage = "json" | "markdown" | "text";

export interface CodeEditorChangeEvent {
  value: string;
  isValid: boolean;
  errors?: string[];
}

@customElement("code-editor")
export class CodeEditor extends LitElement {
  @property({ type: String }) value = "";
  @property({ type: String }) language: EditorLanguage = "text";
  @property({ type: Boolean }) readonly = false;
  @property({ type: String }) placeholder = "";
  @property({ type: Boolean }) autofocus = false;
  @property({ type: Number }) minHeight = 200;
  @property({ type: Number }) maxHeight = 600;
  @property({ type: Boolean }) showLineNumbers = true;

  @state() private _editorView: EditorView | null = null;
  @state() private _isDarkTheme = true;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .editor-container {
      position: relative;
      border: 1px solid var(--border-color, #374151);
      border-radius: 6px;
      overflow: hidden;
      background: var(--editor-bg, #1f2937);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .editor-container.focused {
      border-color: var(--accent-color, #3b82f6);
      box-shadow: 0 0 0 3px var(--focus-ring, rgba(59, 130, 246, 0.15));
    }

    .cm-editor {
      font-family: var(--font-mono, 'Fira Code', 'Monaco', 'Menlo', monospace);
      font-size: 14px;
      line-height: 1.6;
    }

    .cm-editor.cm-focused {
      outline: none;
    }

    .cm-scroller {
      overflow: auto;
    }

    .cm-scroller::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    .cm-scroller::-webkit-scrollbar-track {
      background: var(--scrollbar-bg, #111827);
    }

    .cm-scroller::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb, #4b5563);
      border-radius: 5px;
    }

    .cm-scroller::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover, #6b7280);
    }

    .cm-gutters {
      background: var(--gutter-bg, #1f2937);
      border-right: 1px solid var(--border-color, #374151);
      color: var(--gutter-color, #6b7280);
    }

    .cm-selectionBackground {
      background: var(--selection-bg, rgba(59, 130, 246, 0.3)) !important;
    }

    .cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground {
      background: var(--selection-bg-focused, rgba(59, 130, 246, 0.4)) !important;
    }

    .cm-cursor {
      border-left-color: var(--cursor-color, #3b82f6);
    }
  `;

  firstUpdated() {
    this._detectTheme();
    this._initEditor();
    
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", () => this._detectTheme());
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._editorView) {
      this._editorView.destroy();
    }
  }

  updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has("value") && this._editorView) {
      const currentValue = this._editorView.state.doc.toString();
      if (currentValue !== this.value) {
        this._editorView.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: this.value,
          },
        });
      }
    }

    // Re-init editor on language/theme changes
    if ((changed.has("language") || changed.has("readonly")) && this._editorView) {
      this._editorView.destroy();
      this._initEditor();
    }
  }

  private _detectTheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      this._isDarkTheme = false;
    } else {
      this._isDarkTheme = true;
    }
  }

  private _getLanguageExtension() {
    switch (this.language) {
      case "json":
        return json();
      case "markdown":
        return markdown();
      default:
        return [];
    }
  }

  private _getThemeExtension() {
    if (this._isDarkTheme) {
      return oneDark;
    }
    return EditorView.theme({});
  }

  private _initEditor() {
    const container = this.renderRoot.querySelector(".editor-container");
    if (!container) return;

    const customKeymap = keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      {
        key: "Mod-s",
        run: () => {
          this.dispatchEvent(new CustomEvent("save", { bubbles: true, composed: true }));
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: this.value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        customKeymap,
        this._getLanguageExtension(),
        this._getThemeExtension(),
        EditorView.editable.of(!this.readonly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            this.value = newValue;
            
            const event: CodeEditorChangeEvent = {
              value: newValue,
              isValid: this._validateContent(newValue),
            };
            
            this.dispatchEvent(
              new CustomEvent("change", {
                detail: event,
                bubbles: true,
                composed: true,
              })
            );
          }
          
          if (update.focusChanged) {
            const container = this.renderRoot.querySelector(".editor-container");
            if (container) {
              if (update.view.hasFocus) {
                container.classList.add("focused");
              } else {
                container.classList.remove("focused");
              }
            }
          }
        }),
        EditorView.theme({
          "&": {
            minHeight: `${this.minHeight}px`,
            maxHeight: `${this.maxHeight}px`,
          },
          ".cm-scroller": {
            minHeight: `${this.minHeight}px`,
            maxHeight: `${this.maxHeight}px`,
          },
        }),
      ],
    });

    this._editorView = new EditorView({
      state,
      parent: container,
    });

    if (this.autofocus) {
      setTimeout(() => this._editorView?.focus(), 100);
    }
  }

  private _validateContent(content: string): boolean {
    if (this.language === "json") {
      try {
        JSON.parse(content);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  getValue(): string {
    return this._editorView?.state.doc.toString() || "";
  }

  setValue(value: string) {
    if (this._editorView) {
      this._editorView.dispatch({
        changes: {
          from: 0,
          to: this._editorView.state.doc.length,
          insert: value,
        },
      });
    }
  }

  focus() {
    this._editorView?.focus();
  }

  render() {
    return html`
      <div class="editor-container"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "code-editor": CodeEditor;
  }
}
