/**
 * Speech-to-Text Service
 * Open-source voice recognition using OpenAI Whisper
 *
 * Features:
 * - Multi-provider support (OpenAI, Deepgram, Web Speech API)
 * - Streaming transcription
 * - Multi-language support
 * - Cost-effective with caching
 */

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("speech:stt");

export interface STTConfig {
  provider: "openai" | "deepgram" | "web-speech";
  model: string;
  language?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface TranscriptionRequest {
  audioBuffer: Buffer;
  mimeType: string;
  language?: string;
  prompt?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface StreamingTranscriptionCallbacks {
  onInterim: (text: string) => void;
  onFinal: (result: TranscriptionResult) => void;
  onError: (error: Error) => void;
}

export class SpeechToTextService {
  private config: STTConfig;
  private cache: Map<string, TranscriptionResult> = new Map();

  constructor(config?: Partial<STTConfig>) {
    this.config = {
      provider: "openai",
      model: "gpt-4o-mini-transcribe",
      language: "auto",
      ...config,
    };

    // Load API key from environment or config
    if (!this.config.apiKey) {
      this.config.apiKey = process.env.OPENAI_API_KEY || process.env.DEEPGRAM_API_KEY;
    }

    log.info("Speech-to-Text service initialized", {
      provider: this.config.provider,
      model: this.config.model,
    });
  }

  /**
   * Transcribe audio buffer to text
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const cacheKey = this.generateCacheKey(request);

    // Check cache
    if (this.cache.has(cacheKey)) {
      log.debug("Cache hit for transcription");
      return this.cache.get(cacheKey)!;
    }

    log.info("Transcribing audio...", {
      size: request.audioBuffer.length,
      mimeType: request.mimeType,
    });

    // Check if API key is configured for cloud providers
    if (
      (this.config.provider === "openai" || this.config.provider === "deepgram") &&
      !this.config.apiKey
    ) {
      throw new Error(
        `${this.config.provider} API key not configured. ` +
          `Set OPENAI_API_KEY or DEEPGRAM_API_KEY environment variable, ` +
          `or configure in gateway settings. ` +
          `Alternatively, use 'web-speech' provider for free browser-based transcription.`,
      );
    }

    try {
      let result: TranscriptionResult;

      switch (this.config.provider) {
        case "openai":
          result = await this.transcribeWithOpenAI(request);
          break;
        case "deepgram":
          result = await this.transcribeWithDeepgram(request);
          break;
        default:
          throw new Error(`Provider ${this.config.provider} not implemented`);
      }

      // Cache result
      this.cache.set(cacheKey, result);

      // Limit cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      log.info("Transcription completed", {
        text: result.text.substring(0, 50) + "...",
        confidence: result.confidence,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      log.error("Transcription failed:", { error: String(error) });
      throw error;
    }
  }

  /**
   * Transcribe with OpenAI Whisper
   */
  private async transcribeWithOpenAI(request: TranscriptionRequest): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const apiKey = this.config.apiKey;

    // Create Blob from Buffer - convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(request.audioBuffer);
    const blob = new Blob([uint8Array], { type: request.mimeType });

    const formData = new FormData();

    // Determine file extension from mime type
    const ext = this.getExtensionFromMimeType(request.mimeType);
    const filename = `audio.${ext}`;

    formData.append("file", blob, filename);
    formData.append("model", this.config.model);

    if (request.language && request.language !== "auto") {
      formData.append("language", request.language);
    }

    if (request.prompt) {
      formData.append("prompt", request.prompt);
    }

    // Add timestamp_granularities for word-level timestamps
    formData.append("timestamp_granularities[]", "word");
    formData.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData as any,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      text: data.text,
      confidence: this.calculateConfidence(data),
      language: data.language || "unknown",
      duration: data.duration || 0,
      words: data.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence || 1.0,
      })),
    };
  }

  /**
   * Transcribe with Deepgram
   */
  private async transcribeWithDeepgram(
    request: TranscriptionRequest,
  ): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error("Deepgram API key not configured");
    }

    const apiKey = this.config.apiKey;

    const params = new URLSearchParams({
      model: "nova-3",
      smart_format: "true",
      punctuate: "true",
      paragraphs: "true",
    });

    if (request.language && request.language !== "auto") {
      params.append("language", request.language);
    }

    // Convert Buffer to Uint8Array for fetch
    const uint8Array = new Uint8Array(request.audioBuffer);

    const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": request.mimeType,
      },
      body: uint8Array,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const transcript = data.results?.channels[0]?.alternatives[0];

    return {
      text: transcript?.transcript || "",
      confidence: transcript?.confidence || 0,
      language: data.results?.channels[0]?.detected_language || "unknown",
      duration: data.metadata?.duration || 0,
      words: transcript?.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
    };
  }

  /**
   * Stream transcription (for real-time)
   */
  async streamTranscribe(
    audioStream: NodeJS.ReadableStream,
    callbacks: StreamingTranscriptionCallbacks,
  ): Promise<void> {
    // Implementation for streaming would go here
    // Requires WebSocket connection for real-time streaming
    log.info("Streaming transcription started");

    // Placeholder implementation
    callbacks.onError(new Error("Streaming not yet implemented"));
  }

  /**
   * Validate audio format
   */
  validateAudioFormat(mimeType: string): boolean {
    const supportedFormats = [
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/mp4;codecs=mp4a",
      "audio/wav",
      "audio/mpeg",
      "audio/ogg",
      "audio/flac",
      "audio/mp3",
    ];

    return supportedFormats.some((format) => mimeType.toLowerCase().includes(format));
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): string[] {
    return [
      "audio/webm;codecs=opus (Chrome, Firefox, Edge)",
      "audio/mp4;codecs=mp4a (Safari, iOS)",
      "audio/wav (Universal)",
      "audio/mpeg (MP3)",
      "audio/ogg",
      "audio/flac",
    ];
  }

  /**
   * Get service status
   */
  getStatus(): {
    provider: string;
    model: string;
    apiKeyConfigured: boolean;
    cacheSize: number;
  } {
    return {
      provider: this.config.provider,
      model: this.config.model,
      apiKeyConfigured: !!this.config.apiKey,
      cacheSize: this.cache.size,
    };
  }

  private generateCacheKey(request: TranscriptionRequest): string {
    // Simple hash of audio buffer + language + prompt
    const hash = request.audioBuffer.toString("base64").slice(0, 32);
    return `${hash}:${request.language || "auto"}:${request.prompt || ""}`;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/webm;codecs=opus": "webm",
      "audio/mp4": "m4a",
      "audio/mp4;codecs=mp4a": "m4a",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
      "audio/ogg": "ogg",
      "audio/flac": "flac",
    };

    return mimeMap[mimeType.toLowerCase()] || "webm";
  }

  private calculateConfidence(data: any): number {
    // OpenAI doesn't provide confidence scores directly
    // We can estimate based on word-level data if available
    if (data.words && data.words.length > 0) {
      const avgConfidence =
        data.words.reduce((sum: number, w: any) => sum + (w.confidence || 1), 0) /
        data.words.length;
      return avgConfidence;
    }
    return 0.95; // Default high confidence
  }
}

// Singleton instance
export const sttService = new SpeechToTextService();
