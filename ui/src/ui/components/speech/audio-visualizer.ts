import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("audio-visualizer")
export class AudioVisualizer extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 40px;
    }

    .visualizer {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }

    .bar {
      width: 3px;
      background: var(--accent, #6366f1);
      border-radius: 2px;
      transition: height 0.05s ease;
    }

    .bar:nth-child(odd) {
      background: linear-gradient(to top, var(--accent, #6366f1), #8b5cf6);
    }

    .bar:nth-child(even) {
      background: linear-gradient(to top, #4f46e5, var(--accent, #6366f1));
    }

    .inactive {
      opacity: 0.3;
    }

    canvas {
      width: 100%;
      height: 100%;
      border-radius: 4px;
    }
  `;

  @property({ type: Boolean }) active = false;
  @property({ type: Object }) stream?: MediaStream;
  @property({ type: String }) mode: "bars" | "waveform" = "bars";
  @property({ type: Number }) barCount = 30;

  @state() private audioData: number[] = [];

  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaStreamAudioSourceNode;
  private animationFrame?: number;
  private canvas?: HTMLCanvasElement;
  private canvasContext?: CanvasRenderingContext2D;

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  private cleanup() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = undefined;
    }
    if (this.audioContext?.state !== "closed") {
      this.audioContext?.close();
    }
    this.audioContext = undefined;
    this.analyser = undefined;
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("active") || changedProperties.has("stream")) {
      if (this.active && this.stream) {
        this.startVisualization();
      } else {
        this.cleanup();
        this.audioData = new Array(this.barCount).fill(5);
      }
    }
  }

  private async startVisualization() {
    if (!this.stream) return;

    try {
      this.cleanup();

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      if (this.mode === "waveform") {
        this.startWaveformVisualization();
      } else {
        this.startBarVisualization();
      }
    } catch (err) {
      console.error("Failed to start audio visualization:", err);
      this.fallbackVisualization();
    }
  }

  private startBarVisualization() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateBars = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Sample the frequency data to match bar count
      const bars: number[] = [];
      const step = Math.floor(bufferLength / this.barCount);

      for (let i = 0; i < this.barCount; i++) {
        const value = dataArray[i * step];
        // Normalize to 0-100 range
        const normalized = (value / 255) * 100;
        // Add minimum height so bars are always visible
        bars.push(Math.max(5, normalized));
      }

      this.audioData = bars;

      if (this.active) {
        this.animationFrame = requestAnimationFrame(updateBars);
      }
    };

    updateBars();
  }

  private startWaveformVisualization() {
    if (!this.analyser || !this.canvas) return;

    this.canvasContext = this.canvas.getContext("2d") || undefined;
    if (!this.canvasContext) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.analyser || !this.canvas || !this.canvasContext) return;

      this.animationFrame = requestAnimationFrame(draw);
      this.analyser.getByteTimeDomainData(dataArray);

      const width = this.canvas.width;
      const height = this.canvas.height;

      this.canvasContext.fillStyle = "rgba(26, 26, 46, 0.2)";
      this.canvasContext.fillRect(0, 0, width, height);

      this.canvasContext.lineWidth = 2;
      this.canvasContext.strokeStyle = getComputedStyle(this).getPropertyValue("--accent") || "#6366f1";
      this.canvasContext.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          this.canvasContext.moveTo(x, y);
        } else {
          this.canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.canvasContext.lineTo(width, height / 2);
      this.canvasContext.stroke();
    };

    draw();
  }

  private fallbackVisualization() {
    // Create a simple animated fallback when audio API fails
    const animate = () => {
      const bars = this.audioData.map((_, index) => {
        const base = 20;
        const random = Math.random() * 30;
        const wave = Math.sin(Date.now() / 200 + index * 0.5) * 20;
        return Math.max(5, base + random + wave);
      });
      
      this.audioData = bars;
      
      if (this.active) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  render() {
    if (this.mode === "waveform") {
      return html`
        <canvas 
          class="visualizer"
          width="300" 
          height="40"
          @canvas-ready="${(e: Event) => { this.canvas = e.target as HTMLCanvasElement; }}"
        ></canvas>
      `;
    }

    return html`
      <div class="visualizer ${!this.active ? "inactive" : ""}">
        ${this.audioData.map((height) => html`
          <div 
            class="bar" 
            style="height: ${height}%;"
          ></div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "audio-visualizer": AudioVisualizer;
  }
}
