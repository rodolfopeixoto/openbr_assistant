import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface VoiceRecorderState {
  status: "idle" | "recording" | "processing" | "preview";
  transcription?: string;
  duration: number;
  error?: string;
}

@customElement("voice-recorder")
export class VoiceRecorder extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .recorder-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary, #1a1a2e);
      border: 1px solid var(--border, #2d2d44);
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .recorder-container.recording {
      border-color: var(--accent, #6366f1);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    .recorder-container.processing {
      opacity: 0.7;
    }

    .mic-button {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: var(--bg-elevated, #252540);
      color: var(--text-primary, #e2e8f0);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .mic-button:hover {
      background: var(--bg-hover, #2d2d44);
    }

    .mic-button.recording {
      background: #ef4444;
      color: white;
      animation: pulse 1.5s infinite;
    }

    .mic-button.recording:hover {
      background: #dc2626;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .visualizer-container {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .duration {
      font-size: 14px;
      color: var(--text-secondary, #94a3b8);
      font-variant-numeric: tabular-nums;
      min-width: 48px;
    }

    /* Audio Wave Visualizer */
    .wave-container {
      flex: 1;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 0 12px;
    }

    .wave-bar {
      width: 4px;
      background: var(--accent, #6366f1);
      border-radius: 2px;
      transition: height 0.1s ease;
      opacity: 0.6;
    }

    .wave-bar.active {
      opacity: 1;
      background: linear-gradient(to top, #6366f1, #8b5cf6);
    }

    .wave-bar:nth-child(1) { animation: wave 1s ease-in-out infinite; animation-delay: 0s; height: 12px; }
    .wave-bar:nth-child(2) { animation: wave 1.1s ease-in-out infinite; animation-delay: 0.1s; height: 16px; }
    .wave-bar:nth-child(3) { animation: wave 0.9s ease-in-out infinite; animation-delay: 0.2s; height: 20px; }
    .wave-bar:nth-child(4) { animation: wave 1.2s ease-in-out infinite; animation-delay: 0.05s; height: 14px; }
    .wave-bar:nth-child(5) { animation: wave 0.8s ease-in-out infinite; animation-delay: 0.15s; height: 22px; }
    .wave-bar:nth-child(6) { animation: wave 1s ease-in-out infinite; animation-delay: 0.25s; height: 18px; }
    .wave-bar:nth-child(7) { animation: wave 1.1s ease-in-out infinite; animation-delay: 0.1s; height: 24px; }
    .wave-bar:nth-child(8) { animation: wave 0.95s ease-in-out infinite; animation-delay: 0.3s; height: 16px; }
    .wave-bar:nth-child(9) { animation: wave 1.05s ease-in-out infinite; animation-delay: 0.2s; height: 20px; }
    .wave-bar:nth-child(10) { animation: wave 0.85s ease-in-out infinite; animation-delay: 0.35s; height: 14px; }
    .wave-bar:nth-child(11) { animation: wave 1.15s ease-in-out infinite; animation-delay: 0.05s; height: 18px; }
    .wave-bar:nth-child(12) { animation: wave 0.9s ease-in-out infinite; animation-delay: 0.25s; height: 22px; }

    @keyframes wave {
      0%, 100% { transform: scaleY(0.5); }
      50% { transform: scaleY(1.2); }
    }

    .volume-meter {
      width: 80px;
      height: 4px;
      background: var(--bg-hover, #2d2d44);
      border-radius: 2px;
      overflow: hidden;
    }

    .volume-fill {
      height: 100%;
      background: linear-gradient(to right, #22c55e, #eab308, #ef4444);
      border-radius: 2px;
      transition: width 0.1s ease;
    }

    .transcription-preview {
      flex: 1;
      font-size: 14px;
      color: var(--text-primary, #e2e8f0);
      padding: 8px 12px;
      background: var(--bg-primary, #0f0f1a);
      border-radius: 8px;
      border: 1px solid var(--border, #2d2d44);
      max-height: 100px;
      overflow-y: auto;
      line-height: 1.5;
    }

    .transcription-preview:empty::before {
      content: attr(data-placeholder);
      color: var(--text-secondary, #94a3b8);
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .action-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn.send {
      background: var(--accent, #6366f1);
      color: white;
    }

    .action-btn.send:hover {
      background: #4f46e5;
    }

    .action-btn.cancel {
      background: transparent;
      color: var(--text-secondary, #94a3b8);
      border: 1px solid var(--border, #2d2d44);
    }

    .action-btn.cancel:hover {
      background: var(--bg-hover, #2d2d44);
      color: var(--text-primary, #e2e8f0);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .processing-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary, #94a3b8);
      font-size: 14px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border, #2d2d44);
      border-top-color: var(--accent, #6366f1);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      color: #ef4444;
      font-size: 13px;
      margin-top: 8px;
    }

    .wake-word-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: rgba(99, 102, 241, 0.2);
      color: var(--accent, #6366f1);
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-left: 8px;
    }

    .command-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-left: 8px;
    }

    @media (max-width: 480px) {
      .recorder-container {
        flex-wrap: wrap;
        padding: 10px;
      }

      .mic-button {
        width: 40px;
        height: 40px;
      }

      .visualizer-container {
        width: 100%;
        order: 2;
        margin-top: 8px;
      }

      .actions {
        order: 3;
        width: 100%;
        justify-content: flex-end;
        margin-top: 8px;
      }
    }
  `;

  @property({ type: String }) apiEndpoint = "/api/v1/speech/transcribe";
  @property({ type: String }) language = "auto";
  @property({ type: Number }) maxDuration = 300;
  @property({ type: String }) token = "";
  @property({ type: Boolean }) autoStart = false;

  @state() private status: VoiceRecorderState["status"] = "idle";
  @state() private transcription = "";
  @state() private duration = 0;
  @state() private error?: string;
  @state() private detectedWakeWord = false;
  @state() private detectedCommand?: string;

  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];
  private recordingTimer?: number;
  private stream?: MediaStream;

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    // Auto-start recording when component becomes visible
    if (changedProperties.has("autoStart") && this.autoStart && this.status === "idle") {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        if (this.isSupported()) {
          this.startRecording();
        }
      }, 100);
    }
  }

  private cleanup() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = undefined;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
    this.mediaRecorder = undefined;
    this.audioChunks = [];
  }

  private async startRecording() {
    try {
      this.error = undefined;
      this.transcription = "";
      this.detectedWakeWord = false;
      this.detectedCommand = undefined;
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });

      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType || undefined
      });

      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = () => {
        this.error = "Recording error occurred";
        this.resetState();
      };

      this.mediaRecorder.start(100);
      this.status = "recording";
      this.duration = 0;

      this.recordingTimer = window.setInterval(() => {
        this.duration++;
        if (this.duration >= this.maxDuration) {
          this.stopRecording();
        }
      }, 1000);

      this.dispatchEvent(new CustomEvent("recording-started", {
        bubbles: true,
        composed: true
      }));

    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to access microphone";
      console.error("Failed to start recording:", err);
    }
  }

  private getSupportedMimeType(): string | null {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/wav",
      "audio/ogg"
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return null;
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = undefined;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
    this.status = "processing";
  }

  private async handleRecordingStop() {
    if (this.audioChunks.length === 0) {
      this.error = "No audio recorded";
      this.resetState();
      return;
    }

    const mimeType = this.getSupportedMimeType() || "audio/webm";
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
    
    if (audioBlob.size > 25 * 1024 * 1024) {
      this.error = "Audio file too large (max 25MB)";
      this.resetState();
      return;
    }

    await this.transcribeAudio(audioBlob);
  }

  private async transcribeAudio(audioBlob: Blob) {
    try {
      this.dispatchEvent(new CustomEvent("transcription-start", {
        bubbles: true,
        composed: true
      }));

      // Try Web Speech API first (free, browser-native)
      if (this.isWebSpeechSupported()) {
        try {
          await this.transcribeWithWebSpeech(audioBlob);
          return;
        } catch (webSpeechErr) {
          console.warn("Web Speech API failed, trying backend:", webSpeechErr);
        }
      }

      // Fallback to backend API
      await this.transcribeWithBackend(audioBlob);

    } catch (err) {
      this.error = err instanceof Error ? err.message : "Transcription failed";
      console.error("Transcription error:", err);
      this.resetState();
    }
  }

  private isWebSpeechSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  private async transcribeWithWebSpeech(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert audio blob to data URL and play it to trigger recognition
      // Note: Web Speech API works best with live microphone input
      // For recorded audio, we'll use a workaround
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Create speech recognition
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = this.language === 'auto' ? 'en-US' : this.language;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.transcription = transcript;
        this.status = "preview";
        
        // Check for wake words
        const lowerText = transcript.toLowerCase();
        this.detectedWakeWord = ['clawd', 'openclaw', 'claw', 'hey claw'].some(w => lowerText.includes(w));
        
        this.dispatchEvent(new CustomEvent("transcription-complete", {
          detail: {
            text: this.transcription,
            wakeWordDetected: this.detectedWakeWord,
            command: this.detectedCommand,
            duration: this.duration
          },
          bubbles: true,
          composed: true
        }));
        
        if (this.detectedWakeWord && this.detectedCommand) {
          setTimeout(() => this.sendTranscription(), 500);
        }
        
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      recognition.onerror = (event: any) => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      recognition.onnomatch = () => {
        URL.revokeObjectURL(audioUrl);
        this.transcription = "";
        this.status = "preview";
        this.dispatchEvent(new CustomEvent("transcription-complete", {
          detail: {
            text: "",
            wakeWordDetected: false,
            command: undefined,
            duration: this.duration
          },
          bubbles: true,
          composed: true
        }));
        resolve();
      };

      recognition.onend = () => {
        // If we haven't resolved yet (no result), treat as no match
        URL.revokeObjectURL(audioUrl);
        if (this.status === "processing") {
          this.transcription = "";
          this.status = "preview";
          this.dispatchEvent(new CustomEvent("transcription-complete", {
            detail: {
              text: "",
              wakeWordDetected: false,
              command: undefined,
              duration: this.duration
            },
            bubbles: true,
            composed: true
          }));
        }
        resolve();
      };
      
      // Start recognition
      recognition.start();
      
      // Play the audio to trigger recognition
      audio.play().catch(err => {
        console.warn("Could not play audio for recognition:", err);
      });
    });
  }

  private async transcribeWithBackend(audioBlob: Blob): Promise<void> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("language", this.language);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    // Add timeout to prevent infinite "Transcribing..." state
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      this.transcription = result.text || "";
      this.detectedWakeWord = result.wakeWordDetected || false;
      this.detectedCommand = result.command || undefined;
      this.status = "preview";

      this.dispatchEvent(new CustomEvent("transcription-complete", {
        detail: {
          text: this.transcription,
          wakeWordDetected: this.detectedWakeWord,
          command: this.detectedCommand,
          duration: this.duration
        },
        bubbles: true,
        composed: true
      }));

      if (this.detectedWakeWord && this.detectedCommand) {
        setTimeout(() => this.sendTranscription(), 500);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Transcription timed out after 30 seconds");
      }
      throw err;
    }
  }

  private sendTranscription() {
    if (!this.transcription.trim()) return;

    this.dispatchEvent(new CustomEvent("send", {
      detail: {
        text: this.transcription,
        wakeWordDetected: this.detectedWakeWord,
        command: this.detectedCommand
      },
      bubbles: true,
      composed: true
    }));

    this.resetState();
  }

  private cancelRecording() {
    this.cleanup();
    this.resetState();
    
    this.dispatchEvent(new CustomEvent("cancelled", {
      bubbles: true,
      composed: true
    }));
  }

  private resetState() {
    this.status = "idle";
    this.transcription = "";
    this.duration = 0;
    this.detectedWakeWord = false;
    this.detectedCommand = undefined;
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  private isSupported(): boolean {
    return typeof window !== 'undefined' &&
      !!(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined';
  }

  render() {
    if (!this.isSupported()) {
      return html`
        <div class="recorder-container">
          <div class="error-message">
            Voice recording is not supported in this browser.
            Please use a modern browser with microphone support (Chrome, Edge, Safari).
          </div>
        </div>
      `;
    }

    return html`
      <div class="recorder-container ${this.status}">
        ${this.renderMicButton()}
        ${this.renderVisualizerArea()}
        ${this.renderActions()}
      </div>
      ${this.error ? html`<div class="error-message">${this.error}</div>` : ""}
    `;
  }

  private renderMicButton() {
    const isRecording = this.status === "recording";

    return html`
      <button
        class="mic-button ${isRecording ? "recording" : ""}"
        @click="${isRecording ? this.stopRecording : this.startRecording}"
        title="${isRecording ? "Stop recording" : "Start voice recording"}"
        ?disabled="${this.status === "processing"}"
      >
        ${isRecording
          ? html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>`
          : html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 19v3" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <rect width="8" height="13" x="8" y="3" rx="4" />
            </svg>`}
      </button>
    `;
  }

  private renderVisualizerArea() {
    if (this.status === "idle") {
      return html``;
    }

    if (this.status === "recording") {
      return html`
        <div class="visualizer-container">
          <span class="duration">${this.formatDuration(this.duration)}</span>
          <div class="wave-container">
            ${Array.from({ length: 12 }, () =>
              html`<div class="wave-bar active"></div>`
            )}
          </div>
          <div class="volume-meter">
            <div class="volume-fill" style="width: ${Math.min(100, (this.duration % 10) * 10)}%"></div>
          </div>
        </div>
      `;
    }

    if (this.status === "processing") {
      return html`
        <div class="visualizer-container">
          <div class="processing-indicator">
            <div class="spinner"></div>
            <span>Transcribing...</span>
          </div>
        </div>
      `;
    }

    // Preview state
    return html`
      <div class="visualizer-container">
        <div
          class="transcription-preview"
          data-placeholder="Transcription will appear here..."
        >${this.transcription}</div>
        ${this.detectedWakeWord
          ? html`<span class="wake-word-indicator">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect width="8" height="13" x="8" y="3" rx="4"/>
              </svg>
              Wake word detected
            </span>`
          : ""}
        ${this.detectedCommand
          ? html`<span class="command-indicator">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Command: ${this.detectedCommand}
            </span>`
          : ""}
      </div>
    `;
  }

  private renderActions() {
    if (this.status !== "preview") {
      return html``;
    }

    return html`
      <div class="actions">
        <button 
          class="action-btn cancel"
          @click="${this.cancelRecording}"
        >
          Cancel
        </button>
        <button 
          class="action-btn send"
          @click="${this.sendTranscription}"
          ?disabled="${!this.transcription.trim()}"
        >
          Send
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "voice-recorder": VoiceRecorder;
  }
}
