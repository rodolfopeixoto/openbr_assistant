import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

// JSON5 grammar for Prism
const JSON5_GRAMMAR = {
  property: {
    pattern: /"(?:[^\\"\r\n]|\\.)*"(?=\s*:)/,
    greedy: true,
    inside: {
      string: {
        pattern: /^"/
      }
    }
  },
  string: {
    pattern: /"(?:[^\\"\r\n]|\\.)*"|'(?:[^\\'\r\n]|\\.)*'/,
    greedy: true,
    inside: {
      interpolation: {
        pattern: /\$(?:\{[\s\S]*\}|\w+)/,
        inside: {
          "interpolation-punctuation": {
            pattern: /^\$\{|\}$/,
            alias: "punctuation",
          },
          rest: {
            // Self-reference to handle nested interpolations
          },
        },
      },
    },
  },
  comment: {
    pattern: /\/\/.*|\/\*[\s\S]*?\*\//,
    greedy: true,
  },
  number: {
    pattern: /-?(?:(?:0|[1-9]\d*)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/,
    alias: "number",
  },
  punctuation: /[{}[\],:]/,
  keyword: /\b(?:true|false|null)\b/,
};

export type RawEditorProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

// Simple syntax highlighter (lighter than full Prism.js)
export function highlightJSON5(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Highlight strings (including property keys)
  html = html.replace(
    /("(?:[^\\"\r\n]|\\.)*")(\s*:)?/g,
    (match, str, colon) => {
      if (colon) {
        return `<span class="token property">${str}</span><span class="token punctuation">:</span>`;
      }
      return `<span class="token string">${str}</span>`;
    }
  );

  // Highlight numbers
  html = html.replace(
    /\b-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g,
    '<span class="token number">$&</span>'
  );

  // Highlight keywords
  html = html.replace(
    /\b(true|false|null)\b/g,
    '<span class="token keyword">$&</span>'
  );

  // Highlight comments
  html = html.replace(
    /(\/\/.*$)/gm,
    '<span class="token comment">$&</span>'
  );

  // Highlight punctuation
  html = html.replace(
    /([{}[\],:])/g,
    '<span class="token punctuation">$&</span>'
  );

  return html;
}

export function renderRawEditor(props: RawEditorProps) {
  const lineCount = props.value.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1).join("\n");

  return html`
    <div class="raw-editor">
      <div class="raw-editor__header">
        <span class="raw-editor__title">JSON Configuration</span>
        <div class="raw-editor__actions">
          <button class="raw-editor__action" title="Format JSON" ?disabled=${props.disabled}>
            Format
          </button>
          <button class="raw-editor__action" title="Validate" ?disabled=${props.disabled}>
            Validate
          </button>
        </div>
      </div>
      
      <div class="raw-editor__container">
        <div class="raw-editor__line-numbers" aria-hidden="true">
          ${lineNumbers}
        </div>
        
        <div class="raw-editor__editor-wrapper">
          <textarea
            class="raw-editor__textarea"
            .value=${props.value}
            ?disabled=${props.disabled}
            @input=${(e: Event) => props.onChange((e.target as HTMLTextAreaElement).value)}
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
          ></textarea>
          
          <pre class="raw-editor__highlight" aria-hidden="true"><code class="language-json5">${unsafeHTML(highlightJSON5(props.value))}</code></pre>
        </div>
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
          <span class="raw-editor__stats">${props.value.split('\n').length} lines • ${props.value.length} chars</span>
        </div>
      </div>
    </div>
  `;
}
