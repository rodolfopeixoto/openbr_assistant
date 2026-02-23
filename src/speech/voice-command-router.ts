/**
 * Voice Command Router
 * Maps voice commands to actions
 *
 * Features:
 * - Natural language command parsing
 * - Extensible command registry
 * - Context-aware execution
 * - Multi-language support
 */

import type { WakeWordMatch } from "./wake-word-detector.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("speech:voice-commands");

export interface VoiceCommand {
  name: string;
  description: string;
  patterns: string[];
  action: (args: string[], context: CommandContext) => Promise<CommandResult>;
  aliases?: string[];
}

export interface CommandContext {
  userId: string;
  sessionId: string;
  currentFile?: string;
  currentDirectory?: string;
  gitBranch?: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ParsedCommand {
  command: string;
  args: string[];
  confidence: number;
}

export class VoiceCommandRouter {
  private commands: Map<string, VoiceCommand> = new Map();
  private patternMap: Map<RegExp, string> = new Map();

  constructor() {
    this.registerDefaultCommands();
    log.info("Voice command router initialized");
  }

  /**
   * Parse and route voice command
   */
  async route(wakeWordMatch: WakeWordMatch, context: CommandContext): Promise<CommandResult> {
    if (!wakeWordMatch.matched || !wakeWordMatch.command) {
      return {
        success: false,
        message: "No command detected after wake word",
      };
    }

    const parsed = this.parseCommand(wakeWordMatch.command);

    if (!parsed) {
      return {
        success: false,
        message: `Unknown command: "${wakeWordMatch.command}"`,
      };
    }

    const command = this.commands.get(parsed.command);
    if (!command) {
      return {
        success: false,
        message: `Command "${parsed.command}" not found`,
      };
    }

    log.info("Executing voice command", {
      command: parsed.command,
      args: parsed.args,
      userId: context.userId,
    });

    try {
      const result = await command.action(parsed.args, context);

      log.info("Voice command executed", {
        command: parsed.command,
        success: result.success,
      });

      return result;
    } catch (error) {
      log.error("Voice command failed", { error: String(error) });
      return {
        success: false,
        message: `Command failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Register a new command
   */
  register(command: VoiceCommand): void {
    this.commands.set(command.name, command);

    // Build patterns
    for (const pattern of command.patterns) {
      const regex = new RegExp(pattern, "i");
      this.patternMap.set(regex, command.name);
    }

    log.info("Command registered", { name: command.name });
  }

  /**
   * Unregister a command
   */
  unregister(name: string): void {
    this.commands.delete(name);

    // Remove patterns
    for (const [regex, cmdName] of this.patternMap) {
      if (cmdName === name) {
        this.patternMap.delete(regex);
      }
    }
  }

  /**
   * List all registered commands
   */
  listCommands(): Array<{ name: string; description: string; patterns: string[] }> {
    return Array.from(this.commands.values()).map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      patterns: cmd.patterns,
    }));
  }

  /**
   * Parse natural language command
   */
  private parseCommand(input: string): ParsedCommand | null {
    const normalized = input.toLowerCase().trim();

    // Try exact matches first
    for (const [regex, commandName] of this.patternMap) {
      const match = normalized.match(regex);
      if (match) {
        // Extract arguments from capture groups or remaining text
        const args = match.slice(1).filter(Boolean) as string[];

        return {
          command: commandName,
          args,
          confidence: 1.0,
        };
      }
    }

    // Try fuzzy matching
    let bestMatch: { command: string; confidence: number } | null = null;

    for (const [regex, commandName] of this.patternMap) {
      const similarity = this.calculateSimilarity(normalized, regex.source);
      if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.confidence)) {
        bestMatch = { command: commandName, confidence: similarity };
      }
    }

    if (bestMatch) {
      return {
        command: bestMatch.command,
        args: [],
        confidence: bestMatch.confidence,
      };
    }

    return null;
  }

  /**
   * Register default voice commands
   */
  private registerDefaultCommands(): void {
    // Test command
    this.register({
      name: "test",
      description: "Run test suite",
      patterns: ["^run tests?$", "^execute tests?$", "^test (\\w+)"],
      action: async (args, _context) => {
        return {
          success: true,
          message: `Running tests${args[0] ? ` for ${args[0]}` : ""}...`,
          data: { command: "npm test" },
        };
      },
    });

    // Build command
    this.register({
      name: "build",
      description: "Build project",
      patterns: ["^build (project|app)?$", "^compile$"],
      action: async (args, _context) => {
        return {
          success: true,
          message: "Building project...",
          data: { command: "npm run build" },
        };
      },
    });

    // Commit command
    this.register({
      name: "commit",
      description: "Commit changes",
      patterns: ["^commit changes?$", "^commit with message (.+)"],
      action: async (args, _context) => {
        const message = args[0] || "Update via voice command";
        return {
          success: true,
          message: `Committing with message: "${message}"`,
          data: { command: `git commit -m "${message}"` },
        };
      },
    });

    // Status command
    this.register({
      name: "status",
      description: "Show project status",
      patterns: ["^show status$", "^what is the status$", "^status$"],
      action: async (args, context) => {
        return {
          success: true,
          message: `Current directory: ${context.currentDirectory || "unknown"}`,
          data: {
            directory: context.currentDirectory,
            branch: context.gitBranch,
          },
        };
      },
    });

    // Search command
    this.register({
      name: "search",
      description: "Search in codebase",
      patterns: ["^search for (.+)", "^find (.+)", "^look for (.+)"],
      action: async (args, _context) => {
        const query = args[0];
        return {
          success: true,
          message: `Searching for "${query}"...`,
          data: { query, command: `grep -r "${query}" .` },
        };
      },
    });

    // Deploy command
    this.register({
      name: "deploy",
      description: "Deploy to environment",
      patterns: ["^deploy to (\\w+)", "^deploy (\\w+)", "^ship to (\\w+)"],
      action: async (args, _context) => {
        const environment = args[0] || "production";
        return {
          success: true,
          message: `Deploying to ${environment}...`,
          data: { environment, command: `npm run deploy:${environment}` },
        };
      },
    });

    // Clear command
    this.register({
      name: "clear",
      description: "Clear cache or logs",
      patterns: ["^clear cache$", "^clear logs$", "^clean up$"],
      action: async (args, _context) => {
        return {
          success: true,
          message: "Clearing cache...",
          data: { command: "npm run clean" },
        };
      },
    });
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(a: string, b: string): number {
    // Simple implementation - could use more sophisticated algorithm
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

// Singleton instance
export const voiceCommandRouter = new VoiceCommandRouter();
