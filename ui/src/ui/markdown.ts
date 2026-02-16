import DOMPurify from "dompurify";
import { marked, type Tokens } from "marked";
import { truncateText } from "./format";

// Configure marked with custom tokenizer for code blocks
marked.use({
  renderer: {
    code({ text, lang }: Tokens.Code): string {
      const language = lang || "text";
      const highlighted = highlightCode(text, language);
      
      return `
        <div class="chat-code-block">
          <div class="chat-code-block__header">
            <span class="chat-code-block__lang">${escapeHtml(language)}</span>
            <div class="chat-code-block__actions">
              <button class="chat-code-block__copy" onclick="copyCodeBlock(this)" title="Copy code">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
            </div>
          </div>
          <pre><code class="language-${escapeHtml(language)}">${highlighted}</code></pre>
        </div>
      `;
    },
    
    codespan({ text }: Tokens.Codespan): string {
      return `<code>${escapeHtml(text)}</code>`;
    },

    br(): string {
      return '<br>';
    },

    text(token: Tokens.Text | Tokens.Escape): string | false {
      // Handle text tokens - escape HTML to prevent XSS
      if (token.type === 'text') {
        return escapeHtml(token.text || '');
      }
      // Handle escape tokens
      return escapeHtml(token.text || '');
    },

    paragraph({ tokens }: Tokens.Paragraph): string {
      try {
        if (!tokens || tokens.length === 0) {
          return '<p></p>';
        }
        const text = marked.parser(tokens);
        return `<p>${text}</p>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing paragraph token:', err);
        return '<p></p>';
      }
    },
    
    link({ href, title, tokens }: Tokens.Link): string {
      try {
        if (!tokens || tokens.length === 0) {
          const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
          return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noreferrer noopener">${escapeHtml(href)}</a>`;
        }
        const text = marked.parser(tokens);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noreferrer noopener">${text}</a>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing link token:', err);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noreferrer noopener">${escapeHtml(href)}</a>`;
      }
    },
    
    heading({ tokens, depth }: Tokens.Heading): string {
      try {
        if (!tokens || tokens.length === 0) {
          return `<h${depth}></h${depth}>`;
        }
        const text = marked.parser(tokens);
        return `<h${depth}>${text}</h${depth}>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing heading token:', err);
        return `<h${depth}></h${depth}>`;
      }
    },
    
    list(token: Tokens.List): string {
      try {
        const items = token.items.map((item) => {
          try {
            if (!item.tokens || item.tokens.length === 0) {
              return '<li></li>';
            }
            const text = marked.parser(item.tokens);
            return `<li>${text}</li>`;
          } catch (err) {
            console.warn('[Markdown] Error parsing list item:', err);
            return '<li></li>';
          }
        }).join("");
        const type = token.ordered ? "ol" : "ul";
        const start = token.start !== 1 ? ` start="${token.start}"` : "";
        return `<${type}${start}>${items}</${type}>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing list:', err);
        return '<ul></ul>';
      }
    },
    
    blockquote({ tokens }: Tokens.Blockquote): string {
      try {
        if (!tokens || tokens.length === 0) {
          return '<blockquote></blockquote>';
        }
        const text = marked.parser(tokens);
        return `<blockquote>${text}</blockquote>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing blockquote token:', err);
        return '<blockquote></blockquote>';
      }
    },
    
    table(token: Tokens.Table): string {
      try {
        const header = token.header.map((cell) => {
          try {
            if (!cell.tokens || cell.tokens.length === 0) {
              return '<th></th>';
            }
            const text = marked.parser(cell.tokens);
            return `<th>${text}</th>`;
          } catch (err) {
            console.warn('[Markdown] Error parsing table header cell:', err);
            return '<th></th>';
          }
        }).join("");

        const body = token.rows.map((row) => {
          const cells = row.map((cell) => {
            try {
              if (!cell.tokens || cell.tokens.length === 0) {
                return '<td></td>';
              }
              const text = marked.parser(cell.tokens);
              return `<td>${text}</td>`;
            } catch (err) {
              console.warn('[Markdown] Error parsing table cell:', err);
              return '<td></td>';
            }
          }).join("");
          return `<tr>${cells}</tr>`;
        }).join("");

        return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing table:', err);
        return '<table></table>';
      }
    },
    
    hr(): string {
      return `<hr>`;
    },
    
    strong({ tokens }: Tokens.Strong): string {
      try {
        if (!tokens || tokens.length === 0) {
          return '<strong></strong>';
        }
        const text = marked.parser(tokens);
        return `<strong>${text}</strong>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing strong token:', err);
        return '<strong></strong>';
      }
    },
    
    em({ tokens }: Tokens.Em): string {
      try {
        // Safely handle empty or undefined tokens
        if (!tokens || tokens.length === 0) {
          return '<em></em>';
        }
        const text = marked.parser(tokens);
        return `<em>${text}</em>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing em token:', err);
        return '<em></em>';
      }
    },
    
    del({ tokens }: Tokens.Del): string {
      try {
        if (!tokens || tokens.length === 0) {
          return '<del></del>';
        }
        const text = marked.parser(tokens);
        return `<del>${text}</del>`;
      } catch (err) {
        console.warn('[Markdown] Error parsing del token:', err);
        return '<del></del>';
      }
    },
  },
});

marked.setOptions({
  gfm: true,
  breaks: true,
});

// Simple syntax highlighter using regex patterns (lightweight alternative to Prism.js)
const syntaxPatterns: Record<string, Array<{ pattern: RegExp; token: string }>> = {
  javascript: [
    { pattern: /\/\/.*$/gm, token: "comment" },
    { pattern: /\/\*[\s\S]*?\*\//g, token: "comment" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, token: "string" },
    { pattern: /\b(?:const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g, token: "keyword" },
    { pattern: /\b(?:true|false|null|undefined)\b/g, token: "boolean" },
    { pattern: /\b\d+(?:\.\d+)?\b/g, token: "number" },
    { pattern: /\b[A-Z][a-zA-Z0-9]*\b/g, token: "class-name" },
    { pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/g, token: "function" },
  ],
  typescript: [
    { pattern: /\/\/.*$/gm, token: "comment" },
    { pattern: /\/\*[\s\S]*?\*\//g, token: "comment" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, token: "string" },
    { pattern: /\b(?:const|let|var|function|return|if|else|for|while|class|interface|type|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof|extends|implements|readonly|private|protected|public)\b/g, token: "keyword" },
    { pattern: /\b(?:true|false|null|undefined)\b/g, token: "boolean" },
    { pattern: /\b\d+(?:\.\d+)?\b/g, token: "number" },
    { pattern: /\b[A-Z][a-zA-Z0-9]*\b/g, token: "class-name" },
    { pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/g, token: "function" },
  ],
  python: [
    { pattern: /#.*/g, token: "comment" },
    { pattern: /"""[\s\S]*?"""|'''[\s\S]*?'''/g, token: "string" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, token: "string" },
    { pattern: /\b(?:def|class|return|if|elif|else|for|while|try|except|import|from|as|with|pass|break|continue|lambda|yield|async|await)\b/g, token: "keyword" },
    { pattern: /\b(?:True|False|None)\b/g, token: "boolean" },
    { pattern: /\b\d+(?:\.\d+)?\b/g, token: "number" },
    { pattern: /[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/g, token: "function" },
  ],
  bash: [
    { pattern: /#.*/g, token: "comment" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, token: "string" },
    { pattern: /\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|source)\b/g, token: "keyword" },
    { pattern: /\$\w+|\$\{[^}]*\}/g, token: "variable" },
    { pattern: /\b\d+\b/g, token: "number" },
  ],
  json: [
    { pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/g, token: "property" },
    { pattern: /"(?:[^"\\]|\\.)*"/g, token: "string" },
    { pattern: /\b(?:true|false|null)\b/g, token: "boolean" },
    { pattern: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, token: "number" },
    { pattern: /[{}[\],]/g, token: "punctuation" },
  ],
  css: [
    { pattern: /\/\*[\s\S]*?\*\//g, token: "comment" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, token: "string" },
    { pattern: /[a-z-]+(?=\s*:)/gi, token: "property" },
    { pattern: /\.[a-zA-Z_-][a-zA-Z0-9_-]*/g, token: "selector" },
    { pattern: /#[a-fA-F0-9]{3,8}/g, token: "number" },
    { pattern: /\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms)\b/gi, token: "number" },
    { pattern: /[@{}[\];]/g, token: "punctuation" },
  ],
  html: [
    { pattern: /\u003c!--[\s\S]*?--\u003e/g, token: "comment" },
    { pattern: /\u003c\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^\u003e]*?)?\/?\u003e/g, token: "tag" },
    { pattern: /[a-zA-Z-]+(?==)/g, token: "attr-name" },
    { pattern: /"(?:[^"\\]|\\.)*"/g, token: "string" },
  ],
  sql: [
    { pattern: /--.*$/gm, token: "comment" },
    { pattern: /\/\*[\s\S]*?\*\//g, token: "comment" },
    { pattern: /'(?:[^'\\]|\\.)*'/g, token: "string" },
    { pattern: /\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|AND|OR|NOT|NULL|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|UNION|ALL|AS|CREATE|TABLE|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|UNIQUE|CHECK|CONSTRAINT|ALTER|DROP|ADD|COLUMN|VALUES)\b/gi, token: "keyword" },
    { pattern: /\b\d+\b/g, token: "number" },
  ],
  yaml: [
    { pattern: /#.*/g, token: "comment" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, token: "string" },
    { pattern: /\b(?:true|false|null|yes|no|on|off)\b/gi, token: "boolean" },
    { pattern: /\b\d+\b/g, token: "number" },
    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*(?=:)/gm, token: "property" },
  ],
};

// Generic patterns for unknown languages
const genericPatterns = [
  { pattern: /\/\/.*$/gm, token: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//g, token: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, token: "string" },
  { pattern: /\b(?:true|false|null)\b/gi, token: "boolean" },
  { pattern: /\b\d+(?:\.\d+)?\b/g, token: "number" },
  { pattern: /\b(?:function|def|class|if|else|for|while|return|import|export|const|let|var)\b/g, token: "keyword" },
];

function highlightCode(code: string, language: string): string {
  // If no language specified or not supported, return as-is with generic highlighting
  const patterns = syntaxPatterns[language.toLowerCase()] || genericPatterns;
  
  // Simple tokenization - replace patterns with spans
  const tokens: Array<{ start: number; end: number; token: string; text: string }> = [];
  
  // Find all matches
  for (const { pattern, token } of patterns) {
    let match;
    // Reset regex
    pattern.lastIndex = 0;
    while ((match = pattern.exec(code)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        token,
        text: match[0],
      });
    }
  }
  
  // Sort by position and remove overlapping
  tokens.sort((a, b) => a.start - b.start);
  const nonOverlapping: typeof tokens = [];
  let lastEnd = -1;
  for (const t of tokens) {
    if (t.start >= lastEnd) {
      nonOverlapping.push(t);
      lastEnd = t.end;
    }
  }
  
  // Build highlighted string from end to start to preserve indices
  let result = code;
  for (let i = nonOverlapping.length - 1; i >= 0; i--) {
    const t = nonOverlapping[i];
    const before = result.slice(0, t.start);
    const after = result.slice(t.end);
    result = before + `<span class="token ${t.token}">${t.text}</span>` + after;
  }
  
  return result;
}

const allowedTags = [
  "a",
  "b",
  "blockquote",
  "br",
  "button",
  "code",
  "del",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "svg",
  "path",
  "rect",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

const allowedAttrs = ["class", "href", "rel", "target", "title", "start", "onclick", "viewBox", "fill", "stroke", "stroke-width", "d"];

let hooksInstalled = false;
const MARKDOWN_CHAR_LIMIT = 140_000;
const MARKDOWN_PARSE_LIMIT = 40_000;
const MARKDOWN_CACHE_LIMIT = 200;
const MARKDOWN_CACHE_MAX_CHARS = 50_000;
const markdownCache = new Map<string, string>();

function getCachedMarkdown(key: string): string | null {
  const cached = markdownCache.get(key);
  if (cached === undefined) return null;
  markdownCache.delete(key);
  markdownCache.set(key, cached);
  return cached;
}

function setCachedMarkdown(key: string, value: string) {
  markdownCache.set(key, value);
  if (markdownCache.size <= MARKDOWN_CACHE_LIMIT) return;
  const oldest = markdownCache.keys().next().value;
  if (oldest) markdownCache.delete(oldest);
}

function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof HTMLAnchorElement)) return;
    const href = node.getAttribute("href");
    if (!href) return;
    node.setAttribute("rel", "noreferrer noopener");
    node.setAttribute("target", "_blank");
  });
}

// Global function for copy button
if (typeof window !== "undefined") {
  (window as Window & { copyCodeBlock?: (btn: HTMLElement) => void }).copyCodeBlock = function(btn: HTMLElement) {
    const codeBlock = btn.closest(".chat-code-block")?.querySelector("code");
    if (!codeBlock) return;
    
    const text = codeBlock.textContent || "";
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
      `;
      setTimeout(() => {
        btn.innerHTML = original;
      }, 2000);
    }).catch(() => {
      btn.textContent = "Failed";
    });
  };
}

export function toSanitizedMarkdownHtml(markdown: string): string {
  const input = markdown.trim();
  if (!input) return "";
  installHooks();
  if (input.length <= MARKDOWN_CACHE_MAX_CHARS) {
    const cached = getCachedMarkdown(input);
    if (cached !== null) return cached;
  }
  const truncated = truncateText(input, MARKDOWN_CHAR_LIMIT);
  const suffix = truncated.truncated
    ? `\n\n… truncated (${truncated.total} chars, showing first ${truncated.text.length}).`
    : "";
  if (truncated.text.length > MARKDOWN_PARSE_LIMIT) {
    const escaped = escapeHtml(`${truncated.text}${suffix}`);
    const html = `<div class="chat-code-block"><pre><code>${escaped}</code></pre></div>`;
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttrs,
    });
    if (input.length <= MARKDOWN_CACHE_MAX_CHARS) {
      setCachedMarkdown(input, sanitized);
    }
    return sanitized;
  }
  const rendered = marked.parse(`${truncated.text}${suffix}`) as string;
  const sanitized = DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttrs,
  });
  if (input.length <= MARKDOWN_CACHE_MAX_CHARS) {
    setCachedMarkdown(input, sanitized);
  }
  return sanitized;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Helper to extract code blocks from markdown for pre-processing
export function extractCodeBlocks(markdown: string): Array<{ language: string; code: string }> {
  const blocks: Array<{ language: string; code: string }> = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1] || "text",
      code: match[2].trim(),
    });
  }
  return blocks;
}
