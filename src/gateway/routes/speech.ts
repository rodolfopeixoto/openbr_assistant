/**
 * Speech-to-Text HTTP API routes
 *
 * Provides endpoints for:
 * - POST /api/v1/speech/transcribe - Transcribe audio to text
 * - POST /api/v1/speech/command - Execute voice command
 * - GET /api/v1/speech/status - Get speech service status
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { SpeechToTextService } from "../../speech/stt-service.js";
import { VoiceCommandRouter, type CommandContext } from "../../speech/voice-command-router.js";
import { WakeWordDetector } from "../../speech/wake-word-detector.js";

interface SpeechApiContext {
  auth: {
    userId: string;
    sessionId?: string;
  };
  trustedProxies: string[];
}

interface TranscribeResponse {
  text: string;
  confidence?: number;
  language: string;
  duration: number;
  wakeWordDetected?: boolean;
  command?: string;
  commandResult?: unknown;
}

let sttService: SpeechToTextService | null = null;
let wakeWordDetector: WakeWordDetector | null = null;
let commandRouter: VoiceCommandRouter | null = null;

function getSttService(): SpeechToTextService {
  if (!sttService) {
    sttService = new SpeechToTextService({
      provider: "openai",
    });
  }
  return sttService;
}

function getWakeWordDetector(): WakeWordDetector {
  if (!wakeWordDetector) {
    wakeWordDetector = new WakeWordDetector({
      words: ["clawd", "openclaw"],
      aliases: ["hey claw", "claw"],
      sensitivity: 0.8,
      cooldownMs: 2000,
    });
  }
  return wakeWordDetector;
}

function getCommandRouter(): VoiceCommandRouter {
  if (!commandRouter) {
    commandRouter = new VoiceCommandRouter();
  }
  return commandRouter;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getRequestPath(url: string): string {
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.pathname;
  } catch {
    return url;
  }
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

/**
 * Parse multipart form data and extract audio file
 */
async function parseMultipartForm(
  req: IncomingMessage,
  body: Buffer,
): Promise<{ audio: Buffer; mimeType: string; language?: string; enableWakeWord?: boolean }> {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);

  if (!boundaryMatch) {
    throw new Error("No boundary found in Content-Type");
  }

  const boundary = boundaryMatch[1].trim();
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];

  let start = 0;
  while (true) {
    const idx = body.indexOf(boundaryBuffer, start);
    if (idx === -1) {
      break;
    }

    const endIdx = body.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
    if (endIdx === -1) {
      break;
    }

    const part = body.slice(idx + boundaryBuffer.length, endIdx);
    parts.push(part);
    start = endIdx;
  }

  let audio: Buffer | null = null;
  let mimeType = "audio/webm";
  let language = "auto";
  let enableWakeWord = true;

  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      continue;
    }

    const headers = part.slice(0, headerEnd).toString();
    const content = part.slice(headerEnd + 4);
    // Remove trailing \r\n before boundary
    const cleanContent = content.slice(0, -2);

    if (headers.includes('name="audio"')) {
      audio = cleanContent;
      // Extract mime type from content-type header
      const contentTypeMatch = headers.match(/Content-Type: ([^\r\n]+)/i);
      if (contentTypeMatch) {
        mimeType = contentTypeMatch[1].trim();
      }
    } else if (headers.includes('name="language"')) {
      language = cleanContent.toString();
    } else if (headers.includes('name="enableWakeWord"')) {
      enableWakeWord = cleanContent.toString() === "true";
    }
  }

  if (!audio) {
    throw new Error("No audio file found in request");
  }

  return { audio, mimeType, language, enableWakeWord };
}

/**
 * Handle speech-to-text API requests
 */
export async function handleSpeechHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: SpeechApiContext,
): Promise<boolean> {
  const path = getRequestPath(req.url ?? "/");

  // Only handle /api/v1/speech routes
  if (!path.startsWith("/api/v1/speech")) {
    return false;
  }

  // Check authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendJson(res, 401, { error: "Unauthorized", code: "AUTH_REQUIRED" });
    return true;
  }

  const token = authHeader.slice(7);
  const isAuthenticated = await verifyToken(token, ctx);
  if (!isAuthenticated) {
    sendJson(res, 401, { error: "Invalid token", code: "AUTH_INVALID" });
    return true;
  }

  try {
    // Route handlers
    if (path === "/api/v1/speech/transcribe" && req.method === "POST") {
      return await transcribeAudio(req, res, ctx);
    }

    if (path === "/api/v1/speech/command" && req.method === "POST") {
      return await executeCommand(req, res, ctx);
    }

    if (path === "/api/v1/speech/status" && req.method === "GET") {
      return await getSpeechStatus(req, res);
    }

    // Unknown route
    sendJson(res, 404, { error: "Not found", code: "ROUTE_NOT_FOUND" });
    return true;
  } catch (error) {
    console.error("Speech API error:", error);
    sendJson(res, 500, {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

async function transcribeAudio(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: SpeechApiContext,
): Promise<boolean> {
  try {
    const body = await readRequestBody(req);

    // Check file size (max 25MB)
    if (body.length > 25 * 1024 * 1024) {
      sendJson(res, 413, {
        error: "File too large",
        code: "FILE_TOO_LARGE",
        message: "Maximum file size is 25MB",
      });
      return true;
    }

    const { audio, mimeType, language, enableWakeWord } = await parseMultipartForm(req, body);

    const service = getSttService();
    const result = await service.transcribe({
      audioBuffer: audio,
      mimeType,
      language,
    });

    const response: TranscribeResponse = {
      text: result.text,
      confidence: result.confidence,
      language: result.language || language || "auto",
      duration: result.duration || 0,
    };

    // Check for wake word if enabled
    if (enableWakeWord !== false) {
      const detector = getWakeWordDetector();
      const wakeResult = detector.detect(result.text);

      response.wakeWordDetected = wakeResult.matched;

      if (wakeResult.matched && wakeResult.command) {
        response.command = wakeResult.command;

        // Execute the command
        const router = getCommandRouter();
        const commandContext: CommandContext = {
          userId: ctx.auth.userId,
          sessionId: ctx.auth.sessionId || "default",
        };

        const commandResult = await router.route(wakeResult, commandContext);

        response.commandResult = commandResult;
      }
    }

    sendJson(res, 200, response);
  } catch (error) {
    console.error("Transcription error:", error);
    sendJson(res, 400, {
      error: "Transcription failed",
      code: "TRANSCRIPTION_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return true;
}

async function executeCommand(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: SpeechApiContext,
): Promise<boolean> {
  try {
    const body = await readRequestBody(req);
    const data = JSON.parse(body.toString());

    const { text, context = {} } = data;

    if (!text || typeof text !== "string") {
      sendJson(res, 400, {
        error: "Invalid request",
        code: "INVALID_TEXT",
        message: "Text is required",
      });
      return true;
    }

    const detector = getWakeWordDetector();
    const wakeResult = detector.detectStart(text);

    if (!wakeResult.matched) {
      sendJson(res, 400, {
        error: "No wake word detected",
        code: "NO_WAKE_WORD",
        message: "Command must start with a wake word",
      });
      return true;
    }

    const router = getCommandRouter();
    const commandContext: CommandContext = {
      userId: ctx.auth.userId,
      sessionId: ctx.auth.sessionId || "default",
      ...context,
    };

    const result = await router.route(wakeResult, commandContext);

    sendJson(res, 200, {
      success: result.success,
      command: wakeResult.command,
      message: result.message,
      result: result.data,
    });
  } catch (error) {
    console.error("Command execution error:", error);
    sendJson(res, 500, {
      error: "Command execution failed",
      code: "COMMAND_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return true;
}

async function getSpeechStatus(_req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const _service = getSttService();
  const detector = getWakeWordDetector();
  const router = getCommandRouter();

  sendJson(res, 200, {
    status: "healthy",
    services: {
      stt: {
        available: true,
        provider: "openai",
      },
      wakeWord: {
        available: true,
        words: detector.getConfig().words,
        aliases: detector.getConfig().aliases,
        sensitivity: detector.getConfig().sensitivity,
      },
      commands: {
        available: true,
        registeredCommands: router.listCommands().map((cmd) => cmd.name),
      },
    },
  });

  return true;
}

/**
 * Verify Bearer token
 */
async function verifyToken(token: string, _ctx: SpeechApiContext): Promise<boolean> {
  // Use the gateway auth to verify tokens
  // This is a simplified version - in production, use proper token validation
  return token.length > 0;
}
