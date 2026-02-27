import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("config:manager");

// Configuration schema with validation
export const ConfigSchema = z.object({
  gateway: z
    .object({
      port: z.number().int().min(1).max(65535).default(18789),
      host: z.string().default("127.0.0.1"),
      tls: z
        .object({
          enabled: z.boolean().default(false),
          cert: z.string().optional(),
          key: z.string().optional(),
        })
        .optional(),
    })
    .optional(),

  ai: z
    .object({
      defaultProvider: z.enum(["openai", "anthropic", "ollama", "local"]).default("openai"),
      defaultModel: z.string().default("gpt-4"),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().positive().default(2048),
    })
    .optional(),

  channels: z
    .object({
      enabled: z.array(z.string()).default([]),
      whatsapp: z
        .object({
          enabled: z.boolean().default(false),
          sessionName: z.string().optional(),
        })
        .optional(),
      telegram: z
        .object({
          enabled: z.boolean().default(false),
          botToken: z.string().optional(),
        })
        .optional(),
    })
    .optional(),

  security: z
    .object({
      authEnabled: z.boolean().default(true),
      tokenExpiry: z.number().int().positive().default(86400),
      maxLoginAttempts: z.number().int().positive().default(5),
    })
    .optional(),

  logging: z
    .object({
      level: z.enum(["debug", "info", "warn", "error"]).default("info"),
      file: z.string().optional(),
      maxSize: z.string().default("100m"),
      maxFiles: z.number().int().positive().default(5),
    })
    .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ConfigHistoryEntry {
  timestamp: number;
  config: Config;
  user?: string;
  comment?: string;
}

/**
 * Configuration Manager
 * Handles configuration validation, persistence, and history
 */
export class ConfigManager {
  private configPath: string;
  private historyPath: string;
  private currentConfig: Config;
  private history: ConfigHistoryEntry[] = [];

  constructor(workspaceDir: string) {
    this.configPath = join(workspaceDir, "config.json");
    this.historyPath = join(workspaceDir, "config.history.json");
    this.currentConfig = this.loadDefaultConfig();
    this.loadConfig();
    this.loadHistory();
  }

  /**
   * Load default configuration
   */
  private loadDefaultConfig(): Config {
    return ConfigSchema.parse({});
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): void {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, "utf8");
        const parsed = JSON.parse(content);
        const result = this.validate(parsed);

        if (result.valid) {
          this.currentConfig = ConfigSchema.parse(parsed);
          log.info("Configuration loaded successfully");
        } else {
          log.warn("Invalid configuration, using defaults: " + (result.errors?.join(", ") || ""));
          this.currentConfig = this.loadDefaultConfig();
        }
      } else {
        log.info("No configuration file found, using defaults");
        this.saveConfig();
      }
    } catch (error) {
      log.error(
        "Failed to load configuration: " + (error instanceof Error ? error.message : String(error)),
      );
      this.currentConfig = this.loadDefaultConfig();
    }
  }

  /**
   * Load configuration history
   */
  private loadHistory(): void {
    try {
      if (existsSync(this.historyPath)) {
        const content = readFileSync(this.historyPath, "utf8");
        this.history = JSON.parse(content);
        log.info(`Loaded ${this.history.length} configuration history entries`);
      }
    } catch (error) {
      log.error(
        "Failed to load configuration history: " +
          (error instanceof Error ? error.message : String(error)),
      );
      this.history = [];
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.currentConfig, null, 2), "utf8");
      log.info("Configuration saved");
    } catch (error) {
      log.error(
        "Failed to save configuration: " + (error instanceof Error ? error.message : String(error)),
      );
      throw error;
    }
  }

  /**
   * Save configuration history
   */
  private saveHistory(): void {
    try {
      // Keep only last 50 entries
      if (this.history.length > 50) {
        this.history = this.history.slice(-50);
      }

      writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), "utf8");
    } catch (error) {
      log.error(
        "Failed to save configuration history: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * Validate configuration
   */
  validate(config: unknown): ConfigValidationResult {
    const result: ConfigValidationResult = { valid: true };

    try {
      ConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.valid = false;
        result.errors = (error as z.ZodError<Config>).issues.map((issue: z.ZodIssue) => {
          const path = issue.path.join(".");
          return `${path}: ${issue.message}`;
        });
      } else {
        result.valid = false;
        result.errors = ["Unknown validation error"];
      }
    }

    // Additional custom validations
    const warnings: string[] = [];
    const cfg = config as Config;

    if (cfg.gateway?.tls?.enabled && (!cfg.gateway.tls.cert || !cfg.gateway.tls.key)) {
      warnings.push("TLS is enabled but certificate or key is missing");
    }

    if (cfg.channels?.whatsapp?.enabled && !cfg.channels.whatsapp.sessionName) {
      warnings.push("WhatsApp is enabled but session name is not configured");
    }

    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return result;
  }

  /**
   * Get current configuration
   */
  getConfig(): Config {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(
    config: Partial<Config>,
    options?: { user?: string; comment?: string },
  ): ConfigValidationResult {
    log.info("Updating configuration" + (options?.user ? " by " + options.user : ""));

    // Merge with current config
    const newConfig = { ...this.currentConfig, ...config };

    // Validate
    const validation = this.validate(newConfig);
    if (!validation.valid) {
      log.warn("Configuration update failed validation: " + (validation.errors?.join(", ") || ""));
      return validation;
    }

    // Add to history before updating
    this.history.push({
      timestamp: Date.now(),
      config: this.currentConfig,
      user: options?.user,
      comment: options?.comment || "Configuration update",
    });

    // Update and save
    this.currentConfig = ConfigSchema.parse(newConfig);
    this.saveConfig();
    this.saveHistory();

    log.info("Configuration updated successfully");
    return validation;
  }

  /**
   * Get configuration history
   */
  getHistory(limit = 10): ConfigHistoryEntry[] {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Rollback to previous configuration
   */
  rollback(index: number, options?: { user?: string; comment?: string }): ConfigValidationResult {
    log.info("Rolling back configuration to index " + index);

    if (index < 0 || index >= this.history.length) {
      return {
        valid: false,
        errors: ["Invalid history index"],
      };
    }

    const entry = this.history[this.history.length - 1 - index];

    // Add current to history before rollback
    this.history.push({
      timestamp: Date.now(),
      config: this.currentConfig,
      user: options?.user,
      comment: options?.comment || `Rollback to ${new Date(entry.timestamp).toISOString()}`,
    });

    // Rollback
    this.currentConfig = entry.config;
    this.saveConfig();
    this.saveHistory();

    log.info("Configuration rolled back successfully");
    return { valid: true };
  }

  /**
   * Export configuration to JSON string
   */
  export(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  import(json: string, options?: { user?: string; comment?: string }): ConfigValidationResult {
    log.info("Importing configuration");

    try {
      const parsed = JSON.parse(json);
      return this.updateConfig(parsed, {
        user: options?.user,
        comment: options?.comment || "Configuration import",
      });
    } catch (error) {
      log.error(
        "Failed to import configuration: " +
          (error instanceof Error ? error.message : String(error)),
      );
      return {
        valid: false,
        errors: ["Invalid JSON format"],
      };
    }
  }

  /**
   * Reset to default configuration
   */
  reset(options?: { user?: string }): void {
    log.info("Resetting configuration to defaults" + (options?.user ? " by " + options.user : ""));

    // Add current to history
    this.history.push({
      timestamp: Date.now(),
      config: this.currentConfig,
      user: options?.user,
      comment: "Reset to defaults",
    });

    // Reset
    this.currentConfig = this.loadDefaultConfig();
    this.saveConfig();
    this.saveHistory();

    log.info("Configuration reset to defaults");
  }
}

// Singleton instance
let configManager: ConfigManager | null = null;

export function getConfigManager(workspaceDir?: string): ConfigManager {
  if (!configManager) {
    if (!workspaceDir) {
      throw new Error("ConfigManager not initialized. Workspace directory required.");
    }
    configManager = new ConfigManager(workspaceDir);
  }
  return configManager;
}

export function initializeConfigManager(workspaceDir: string): ConfigManager {
  configManager = new ConfigManager(workspaceDir);
  return configManager;
}
