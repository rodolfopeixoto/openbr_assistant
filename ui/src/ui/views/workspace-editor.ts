import { html, css, LitElement } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import type { GatewayBrowserClient } from "../gateway.js";
import { WORKSPACE_TIPS, getFileTip, validateFileContent } from "../data/workspace-tips.js";
import { toSanitizedMarkdownHtml } from "../markdown.js";
import { icons } from "../icons.js";
import "../components/code-editor.js";
import type { CodeEditorChangeEvent } from "../components/code-editor.js";

interface WorkspaceFile {
  filename: string;
  displayName: string;
  description: string;
  lastModified: number;
  hasDraft: boolean;
}

interface FileContent {
  content: string;
  isDraft: boolean;
  template?: string;
}

@customElement("workspace-editor")
export class WorkspaceEditor extends LitElement {
  @property({ type: Object }) client: GatewayBrowserClient | null = null;
  @property({ type: Boolean }) connected = false;

  @state() private files: WorkspaceFile[] = [];
  @state() private selectedFile: string | null = null;
  @state() private fileContent: string = "";
  @state() private isDraft: boolean = false;
  @state() private template: string | null = null;
  @state() private loading: boolean = false;
  @state() private saving: boolean = false;
  @state() private error: string | null = null;
  @state() private previewHtml: string = "";
  @state() private showPreview: boolean = false;
  @state() private showTips: boolean = false;
  @state() private validationErrors: string[] = [];
  @state() private lastSaved: Date | null = null;
  @state() private draftSaved: Date | null = null;
  @state() private improving: boolean = false;
  @state() private mobileView: "editor" | "preview" | "tips" = "editor";

  private draftDebounceTimer: number | null = null;

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .workspace-container {
      display: flex;
      height: 100%;
      min-height: 600px;
      background: var(--bg);
      color: var(--text);
    }

    /* Sidebar */
    .sidebar {
      width: 280px;
      min-width: 280px;
      border-right: 1px solid var(--border);
      background: var(--bg-accent);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }

    .sidebar-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: var(--text-strong);
    }

    .sidebar-subtitle {
      font-size: 12px;
      color: var(--muted);
    }

    .file-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .file-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-bottom: 2px;
      gap: 10px;
    }

    .file-item:hover {
      background: var(--bg-hover);
    }

    .file-item.active {
      background: var(--accent-subtle);
      border-left: 3px solid var(--accent);
    }

    .file-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      flex-shrink: 0;
    }

    .file-icon svg {
      width: 100%;
      height: 100%;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
    }

    .file-info {
      flex: 1;
      min-width: 0;
    }

    .file-name {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text);
    }

    .file-desc {
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    .file-filename {
      color: var(--muted);
      font-weight: 400;
      font-size: 11px;
      margin-left: 4px;
      opacity: 0.8;
    }

    .file-status {
      margin-left: 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--warn);
      flex-shrink: 0;
    }

    /* Main content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-accent);
      gap: 12px;
      flex-wrap: wrap;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-strong);
    }

    .status-badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      background: var(--bg-muted);
      color: var(--muted);
    }

    .status-badge.draft {
      background: var(--warn-subtle);
      color: var(--warn);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-elevated);
      color: var(--text);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn:hover:not(:disabled) {
      background: var(--bg-hover);
      border-color: var(--border-strong);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-foreground);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }

    .btn-success {
      background: var(--ok);
      border-color: var(--ok);
      color: var(--primary-foreground);
    }

    .btn-success:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-danger {
      background: var(--danger);
      border-color: var(--danger);
      color: var(--primary-foreground);
    }

    .btn-danger:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-icon svg {
      width: 100%;
      height: 100%;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
    }

    .editor-container {
      flex: 1;
      display: flex;
      overflow: hidden;
      min-height: 0;
    }

    .editor-pane {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .editor-wrapper {
      flex: 1;
      overflow: auto;
      padding: 16px;
    }

    .preview-pane {
      width: 50%;
      min-width: 300px;
      max-width: 600px;
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg-accent);
    }

    .preview-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-strong);
    }

    .preview-content {
      flex: 1;
      overflow: auto;
      padding: 16px;
      background: var(--bg);
    }

    .tips-pane {
      width: 320px;
      min-width: 280px;
      max-width: 400px;
      border-left: 1px solid var(--border);
      background: var(--bg-accent);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .tips-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-strong);
    }

    .tips-content {
      flex: 1;
      overflow: auto;
      padding: 16px;
    }

    .tip-section {
      margin-bottom: 20px;
    }

    .tip-section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .tip-description {
      font-size: 13px;
      line-height: 1.5;
      color: var(--muted-strong);
      margin-bottom: 12px;
    }

    .tip-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tip-item {
      font-size: 12px;
      padding: 6px 0;
      padding-left: 16px;
      position: relative;
      color: var(--muted);
      line-height: 1.5;
    }

    .tip-item::before {
      content: "";
      position: absolute;
      left: 4px;
      top: 12px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--accent);
    }

    .example-block {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 12px;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      white-space: pre-wrap;
      overflow-x: auto;
      max-height: 200px;
      overflow-y: auto;
      color: var(--text);
    }

    .error-banner {
      background: var(--danger-subtle);
      border: 1px solid var(--danger-muted);
      color: var(--danger);
      padding: 12px 16px;
      margin: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .validation-errors {
      margin-top: 8px;
    }

    .validation-error {
      font-size: 12px;
      padding: 4px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      text-align: center;
      color: var(--muted);
    }

    .empty-state-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-state-icon svg {
      width: 100%;
      height: 100%;
      stroke: currentColor;
      stroke-width: 1.5;
      fill: none;
      opacity: 0.5;
    }

    .empty-state-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-strong);
    }

    .empty-state-text {
      font-size: 14px;
      max-width: 300px;
      line-height: 1.5;
      color: var(--muted-strong);
    }

    .empty-sidebar {
      padding: 20px;
      text-align: center;
      color: var(--muted);
    }

    .empty-sidebar p {
      margin-bottom: 12px;
      font-size: 13px;
    }

    /* Mobile tabs */
    .mobile-tabs {
      display: none;
      padding: 8px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-accent);
    }

    .mobile-tab {
      flex: 1;
      padding: 8px;
      text-align: center;
      font-size: 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.15s ease;
      color: var(--muted);
    }

    .mobile-tab:hover {
      background: var(--bg-hover);
    }

    .mobile-tab.active {
      background: var(--accent-subtle);
      color: var(--accent);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .sidebar {
        width: 240px;
        min-width: 240px;
      }

      .tips-pane {
        width: 280px;
        min-width: 240px;
      }
    }

    @media (max-width: 768px) {
      .workspace-container {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        min-width: 100%;
        max-height: 200px;
        border-right: none;
        border-bottom: 1px solid var(--border);
      }

      .mobile-tabs {
        display: flex;
      }

      .editor-container {
        flex-direction: column;
      }

      .editor-pane,
      .preview-pane,
      .tips-pane {
        width: 100%;
        min-width: 100%;
        max-width: 100%;
        border-left: none;
        border-top: 1px solid var(--border);
        display: none;
      }

      .editor-pane.active,
      .preview-pane.active,
      .tips-pane.active {
        display: flex;
      }

      .editor-pane {
        display: flex;
      }

      .preview-pane:not(.active),
      .tips-pane:not(.active) {
        display: none;
      }
    }

    /* Loading overlay */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(10, 10, 15, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Markdown preview styles */
    .markdown-preview {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text);
    }

    .markdown-preview h1,
    .markdown-preview h2,
    .markdown-preview h3,
    .markdown-preview h4,
    .markdown-preview h5,
    .markdown-preview h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: var(--text-strong);
    }

    .markdown-preview h1 {
      font-size: 2em;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3em;
    }

    .markdown-preview h2 {
      font-size: 1.5em;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3em;
    }

    .markdown-preview h3 {
      font-size: 1.25em;
    }

    .markdown-preview p {
      margin-bottom: 16px;
    }

    .markdown-preview code {
      background: var(--bg-elevated);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.9em;
    }

    .markdown-preview pre {
      background: var(--bg-elevated);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 16px;
    }

    .markdown-preview pre code {
      background: none;
      padding: 0;
    }

    .markdown-preview ul,
    .markdown-preview ol {
      margin-bottom: 16px;
      padding-left: 2em;
    }

    .markdown-preview li {
      margin-bottom: 4px;
    }

    .markdown-preview blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 16px;
      margin-left: 0;
      margin-bottom: 16px;
      color: var(--muted);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (this.connected && this.client) {
      this.loadFiles();
    }
  }

  updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('connected') && this.connected && this.client) {
      if (this.files.length === 0 && !this.loading) {
        this.loadFiles();
      }
    }
    if (changed.has('client') && this.connected && this.client) {
      if (this.files.length === 0 && !this.loading) {
        this.loadFiles();
      }
    }
  }

  async loadFiles() {
    if (!this.client) {
      this.error = "Client not available";
      return;
    }
    
    if (!this.connected) {
      this.error = "Waiting for gateway connection...";
      return;
    }

    this.loading = true;
    this.error = null;
    try {
      const result = (await this.client.request("workspace.listFiles", {})) as {
        files: WorkspaceFile[];
      };
      this.files = result.files;
      
      if (this.files.length === 0) {
        console.log("Workspace empty - waiting for file creation");
      }
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes("not connected") || errorMsg.includes("unauthorized")) {
        this.error = "Gateway not connected. Check if the server is running.";
      } else {
        this.error = `Error loading files: ${errorMsg}`;
      }
    } finally {
      this.loading = false;
    }
  }

  async selectFile(filename: string) {
    if (!this.client) return;

    if (this.selectedFile && this.fileContent) {
      await this.saveDraft(this.selectedFile, this.fileContent);
    }

    this.selectedFile = filename;
    this.loading = true;
    this.error = null;

    try {
      const result = (await this.client.request("workspace.readFile", {
        filename,
        preferDraft: true,
      })) as FileContent;

      this.fileContent = result.content;
      this.isDraft = result.isDraft;
      this.template = result.template || null;
      this.validationErrors = [];

      if (result.isDraft) {
        this.draftSaved = new Date();
      }

      this.updatePreview();
    } catch (err) {
      this.error = `Error loading file: ${String(err)}`;
    } finally {
      this.loading = false;
    }
  }

  async saveDraft(filename: string, content: string) {
    if (!this.client) return;

    try {
      await this.client.request("workspace.saveDraft", {
        filename,
        content,
      });
      this.draftSaved = new Date();
    } catch (err) {
      console.error("Error saving draft:", err);
    }
  }

  handleEditorChange(event: CustomEvent<CodeEditorChangeEvent>) {
    const { value } = event.detail;
    this.fileContent = value;

    if (this.selectedFile) {
      const validation = validateFileContent(this.selectedFile, value);
      this.validationErrors = validation.errors;
    }

    this.updatePreview();

    if (this.draftDebounceTimer) {
      clearTimeout(this.draftDebounceTimer);
    }
    this.draftDebounceTimer = window.setTimeout(() => {
      if (this.selectedFile) {
        this.saveDraft(this.selectedFile, value);
      }
    }, 2000);
  }

  async updatePreview() {
    if (this.selectedFile?.endsWith(".md")) {
      this.previewHtml = await toSanitizedMarkdownHtml(this.fileContent);
    } else {
      this.previewHtml = `<pre><code>${this.escapeHtml(this.fileContent)}</code></pre>`;
    }
  }

  escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async handleSave() {
    if (!this.client || !this.selectedFile) return;

    this.saving = true;
    try {
      await this.client.request("workspace.writeFile", {
        filename: this.selectedFile,
        content: this.fileContent,
      });
      this.lastSaved = new Date();
      this.isDraft = false;
      this.draftSaved = null;
      await this.loadFiles();
    } catch (err) {
      this.error = `Error saving: ${String(err)}`;
    } finally {
      this.saving = false;
    }
  }

  async handleDiscard() {
    if (!this.client || !this.selectedFile) return;

    if (!confirm("Discard unsaved changes?")) {
      return;
    }

    try {
      await this.client.request("workspace.discardDraft", {
        filename: this.selectedFile,
      });
      await this.selectFile(this.selectedFile);
    } catch (err) {
      this.error = `Error discarding draft: ${String(err)}`;
    }
  }

  async handleReset() {
    if (!this.client || !this.selectedFile) return;

    if (!confirm("Reset to default template? All changes will be lost.")) {
      return;
    }

    try {
      const result = (await this.client.request("workspace.resetToTemplate", {
        filename: this.selectedFile,
      })) as { template: string };

      this.fileContent = result.template;
      this.updatePreview();
    } catch (err) {
      this.error = `Error resetting: ${String(err)}`;
    }
  }

  async handleImprove() {
    if (!this.client || !this.selectedFile) return;

    this.improving = true;
    try {
      const result = (await this.client.request("workspace.improveContent", {
        filename: this.selectedFile,
        content: this.fileContent,
      })) as { improved: string; changes: string[] };

      this.fileContent = result.improved;
      this.updatePreview();
    } catch (err) {
      this.error = `Error improving: ${String(err)}`;
    } finally {
      this.improving = false;
    }
  }

  async createFileFromTemplate(filename: string) {
    if (!this.client) return;

    try {
      const result = (await this.client.request("workspace.readFile", {
        filename,
        preferDraft: false,
      })) as FileContent;

      if (result.template) {
        await this.client.request("workspace.writeFile", {
          filename,
          content: result.template,
          skipBackup: true,
        });
        
        await this.loadFiles();
        await this.selectFile(filename);
      }
    } catch (err) {
      this.error = `Error creating file: ${String(err)}`;
    }
  }

  async createAllFiles() {
    if (!this.client) return;
    
    const defaultFiles = [
      "SOUL.md",
      "AGENTS.md", 
      "USER.md",
      "TOOLS.md",
      "IDENTITY.md",
      "HEARTBEAT.md"
    ];
    
    this.loading = true;
    try {
      for (const filename of defaultFiles) {
        await this.createFileFromTemplate(filename);
      }
      this.error = null;
    } catch (err) {
      this.error = `Error creating files: ${String(err)}`;
    } finally {
      this.loading = false;
    }
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
    this.mobileView = this.showPreview ? "preview" : "editor";
  }

  toggleTips() {
    this.showTips = !this.showTips;
  }

  setMobileView(view: "editor" | "preview" | "tips") {
    this.mobileView = view;
  }

  render() {
    const selectedFileData = this.selectedFile
      ? this.files.find((f) => f.filename === this.selectedFile)
      : null;
    const tip = this.selectedFile ? getFileTip(this.selectedFile) : null;

    return html`
      <div class="workspace-container">
        ${this.loading
          ? html`
              <div class="loading-overlay">
                <div class="spinner"></div>
              </div>
            `
          : null}

        <aside class="sidebar">
          <div class="sidebar-header">
            <h3 class="sidebar-title">Workspace Files</h3>
            <p class="sidebar-subtitle">
              ${!this.connected 
                ? "Connecting..." 
                : `${this.files.length} file${this.files.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div class="file-list">
            ${!this.connected
              ? html`
                  <div class="empty-sidebar">
                    <p>Connecting to gateway...</p>
                    <button class="btn" @click=${() => this.loadFiles()}>
                      <span class="btn-icon">${icons.refreshCw}</span>
                      Try to connect
                    </button>
                  </div>
                `
              : this.files.length === 0
                ? html`
                    <div class="empty-sidebar">
                      <p>Nenhum arquivo encontrado</p>
                      <button class="btn btn-primary" @click=${() => this.createAllFiles()}>
                        <span class="btn-icon">${icons.folder}</span>
                        Create default files
                      </button>
                    </div>
                  `
                : this.files.map(
                    (file) => html`
                      <div
                        class="file-item ${this.selectedFile === file.filename ? "active" : ""}"
                        @click=${() => this.selectFile(file.filename)}
                      >
                        <span class="file-icon">${icons.fileText}</span>
                        <div class="file-info">
                           <div class="file-name">${file.displayName} <span class="file-filename">(${file.filename})</span></div>
                          <div class="file-desc">${file.description.slice(0, 60)}...</div>
                        </div>
                        ${file.hasDraft ? html`<span class="file-status"></span>` : null}
                      </div>
                    `
                  )}
          </div>
        </aside>

        <main class="main-content">
          ${this.error
            ? html`
                <div class="error-banner">
                  ${this.error}
                  <button class="btn" @click=${() => (this.error = null)}>
                    <span class="btn-icon">${icons.x}</span>
                  </button>
                </div>
              `
            : null}

          ${!this.selectedFile
            ? html`
                <div class="empty-state">
                  ${!this.connected
                    ? html`
                        <div class="empty-state-icon">${icons.plug}</div>
                        <div class="empty-state-title">No connection</div>
                        <div class="empty-state-text">
                          Waiting for gateway connection...<br>
                          Check if the server is running.
                        </div>
                          <button class="btn btn-primary" @click=${() => this.loadFiles()} style="margin-top: 16px;">
                          <span class="btn-icon">${icons.refreshCw}</span>
                          Try again
                        </button>
                      `
                    : this.error
                      ? html`
                          <div class="empty-state-icon">${icons.alertCircle}</div>
                          <div class="empty-state-title">Error loading</div>
                          <div class="empty-state-text">${this.error}</div>
                          <button class="btn btn-primary" @click=${() => this.loadFiles()} style="margin-top: 16px;">
                            <span class="btn-icon">${icons.refreshCw}</span>
                            Try again
                          </button>
                        `
                      : this.files.length === 0
                        ? html`
                            <div class="empty-state-icon">${icons.folder}</div>
                            <div class="empty-state-title">Workspace empty</div>
                            <div class="empty-state-text">
                              No files found in the workspace. Click the button in the sidebar to create default files.
                            </div>
                          `
                         : html`
                            <div class="empty-state-icon">${icons.fileText}</div>
                            <div class="empty-state-title">Select a file</div>
                            <div class="empty-state-text">
                              Choose a file from the sidebar to start editing your workspace.
                            </div>
                          `}
                </div>
              `
            : html`
                <div class="toolbar">
                  <div class="toolbar-left">
                    <span class="toolbar-title">${selectedFileData?.displayName}</span>
                    ${this.isDraft
                      ? html`<span class="status-badge draft">Draft</span>`
                      : html`<span class="status-badge">Saved</span>`}
                    ${this.draftSaved
                      ? html`<span class="status-badge">
                            Draft: ${this.draftSaved.toLocaleTimeString()}
                          </span>`
                      : null}
                  </div>
                  <div class="toolbar-right">
                    <button class="btn" @click=${this.togglePreview} title="Toggle preview">
                      <span class="btn-icon">${this.showPreview ? icons.eyeOff : icons.eye}</span>
                      Preview
                    </button>
                    <button class="btn" @click=${this.toggleTips} title="Toggle tips">
                      <span class="btn-icon">${icons.helpCircle}</span>
Tips
                    </button>
                    <button
                      class="btn btn-success"
                      @click=${this.handleImprove}
                      ?disabled=${this.improving}
                      title="Improve with AI"
                    >
                      <span class="btn-icon">${this.improving ? icons.loader : icons.sparkles}</span>
                      Improve
                    </button>
                    <button class="btn btn-danger" @click=${this.handleDiscard} title="Discard draft">
                      <span class="btn-icon">${icons.rotateCcw}</span>
                      Undo
                    </button>
                    <button
                      class="btn btn-primary"
                      @click=${this.handleSave}
                      ?disabled=${this.saving || this.validationErrors.length > 0}
                      title="Save file"
                    >
                      <span class="btn-icon">${this.saving ? icons.loader : icons.save}</span>
                      Save
                    </button>
                    <button class="btn" @click=${this.handleReset} title="Reset to template">
                      <span class="btn-icon">${icons.rotateCcw}</span>
                      Reset
                    </button>
                  </div>
                </div>

                ${this.validationErrors.length > 0
                  ? html`
                      <div class="error-banner">
                        <span class="btn-icon">${icons.alertTriangle}</span>
                        Validation issues:
                        <div class="validation-errors">
                          ${this.validationErrors.map(
                            (err) => html`<div class="validation-error">${err}</div>`
                          )}
                        </div>
                      </div>
                    `
                  : null}

                <div class="mobile-tabs">
                  <div
                    class="mobile-tab ${this.mobileView === "editor" ? "active" : ""}"
                    @click=${() => this.setMobileView("editor")}
                  >
                    Editor
                  </div>
                  <div
                    class="mobile-tab ${this.mobileView === "preview" ? "active" : ""}"
                    @click=${() => this.setMobileView("preview")}
                  >
                    Preview
                  </div>
                  <div
                    class="mobile-tab ${this.mobileView === "tips" ? "active" : ""}"
                    @click=${() => this.setMobileView("tips")}
                  >
                    Dicas
                  </div>
                </div>

                <div class="editor-container">
                  <div class="editor-pane ${this.mobileView === "editor" ? "active" : ""}">
                    <div class="editor-wrapper">
                      <code-editor
                        .value=${this.fileContent}
                        language="markdown"
                        .minHeight=${400}
                        .maxHeight=${800}
                        @change=${this.handleEditorChange}
                        @save=${this.handleSave}
                      ></code-editor>
                    </div>
                  </div>

                  ${this.showPreview
                    ? html`
                        <div
                          class="preview-pane ${this.mobileView === "preview" ? "active" : ""}"
                        >
                          <div class="preview-header">
                            <span>Preview</span>
                            <span style="font-size: 11px; color: var(--muted);">Markdown renderizado</span>
                          </div>
                          <div class="preview-content">
                            <div
                              class="markdown-preview"
                              .innerHTML=${this.previewHtml}
                            ></div>
                          </div>
                        </div>
                      `
                    : null}

                  ${this.showTips
                    ? html`
                        <div class="tips-pane ${this.mobileView === "tips" ? "active" : ""}">
                          <div class="tips-header">
                            <span>Dicas</span>
                          </div>
                          <div class="tips-content">
                            ${tip
                              ? html`
                                  <div class="tip-section">
                                    <div class="tip-section-title">About</div>
                                    <div class="tip-description">${tip.description}</div>
                                  </div>

                                  <div class="tip-section">
                                    <div class="tip-section-title">Guidelines</div>
                                    <ul class="tip-list">
                                      ${tip.guidelines.map(
                                        (g) => html`<li class="tip-item">${g}</li>`
                                      )}
                                    </ul>
                                  </div>

                                  <div class="tip-section">
                                    <div class="tip-section-title">Examples</div>
                                    ${tip.examples.map(
                                      (ex) => html`<div class="example-block">${ex}</div>`
                                    )}
                                  </div>
                                `
                              : html`
                                  <div class="tip-description">
                                    Select a file to see specific tips on how to
                                    write it.
                                  </div>
                                `}
                          </div>
                        </div>
                      `
                    : null}
                </div>
              `}
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "workspace-editor": WorkspaceEditor;
  }
}