import { AudioValidator, AudioValidationRateLimiter, AudioMetadata } from "./audio-validator.js";
import { getFileExtension } from "./mime.js";

const VOICE_AUDIO_EXTENSIONS = new Set([".oga", ".ogg", ".opus"]);

// Global rate limiter for audio validation
const audioRateLimiter = new AudioValidationRateLimiter({
  maxRequests: 20,
  windowMs: 60000, // 1 minute
});

export function isVoiceCompatibleAudio(opts: {
  contentType?: string | null;
  fileName?: string | null;
}): boolean {
  const mime = opts.contentType?.toLowerCase();
  if (mime && (mime.includes("ogg") || mime.includes("opus"))) {
    return true;
  }
  const fileName = opts.fileName?.trim();
  if (!fileName) {
    return false;
  }
  const ext = getFileExtension(fileName);
  if (!ext) {
    return false;
  }
  return VOICE_AUDIO_EXTENSIONS.has(ext);
}

/**
 * Validates an audio file with security checks including:
 * - File size limits
 * - Magic byte validation (prevents polyglot attacks)
 * - Format verification via ffprobe
 * - Rate limiting
 */
export async function validateAudioFile(filePath: string, userId?: string): Promise<AudioMetadata> {
  const rateLimitKey = userId ?? "anonymous";

  // Check rate limit
  if (!audioRateLimiter.canProcess(rateLimitKey)) {
    return {
      format: "unknown",
      duration: 0,
      bitrate: 0,
      channels: 0,
      sampleRate: 0,
      isValid: false,
      errors: ["Rate limit exceeded - too many audio validation requests"],
    };
  }

  // Record the request
  audioRateLimiter.recordRequest(rateLimitKey);

  // Perform validation
  const validator = new AudioValidator();
  return await validator.validate(filePath);
}

/**
 * Get remaining validation quota for a user
 */
export function getAudioValidationQuota(userId?: string): number {
  return audioRateLimiter.getRemainingRequests(userId ?? "anonymous");
}

// Re-export types for consumers
export type { AudioMetadata } from "./audio-validator.js";
