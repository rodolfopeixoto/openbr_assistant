import type { GatewayRequestHandlers, RespondFn, GatewayRequestContext } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { getConfigManager } from "../../services/config/manager.js";

const log = createSubsystemLogger("gateway:config");

export const configManagerHandlers: GatewayRequestHandlers = {
  // Get current configuration
  "config.get": async ({ respond }) => {
    try {
      const manager = getConfigManager();
      const config = manager.getConfig();
      respond(true, { config });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get config";
      log.error("config.get failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Validate configuration
  "config.validate": async ({ params, respond }) => {
    try {
      const { config } = params as { config: unknown };
      const manager = getConfigManager();
      const result = manager.validate(config);
      respond(result.valid, result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Validation failed";
      log.error("config.validate failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Update configuration
  "config.update": async ({ params, respond, context }) => {
    try {
      const { config, comment } = params as {
        config: Record<string, unknown>;
        comment?: string;
      };
      const manager = getConfigManager();

      const result = manager.updateConfig(config, {
        comment,
      });

      if (result.valid) {
        respond(true, {
          success: true,
          config: manager.getConfig(),
          warnings: result.warnings,
        });
      } else {
        respond(false, {
          success: false,
          errors: result.errors,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Update failed";
      log.error("config.update failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Get configuration history
  "config.history": async ({ params, respond }) => {
    try {
      const { limit = 10 } = params as { limit?: number };
      const manager = getConfigManager();
      const history = manager.getHistory(limit);
      respond(true, { history });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get history";
      log.error("config.history failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Rollback configuration
  "config.rollback": async ({ params, respond, context }) => {
    try {
      const { index, comment } = params as {
        index: number;
        comment?: string;
      };
      const manager = getConfigManager();

      const result = manager.rollback(index, {
        comment,
      });

      if (result.valid) {
        respond(true, {
          success: true,
          config: manager.getConfig(),
        });
      } else {
        respond(false, {
          success: false,
          errors: result.errors,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Rollback failed";
      log.error("config.rollback failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Export configuration
  "config.export": async ({ respond }) => {
    try {
      const manager = getConfigManager();
      const json = manager.export();
      respond(true, { json });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Export failed";
      log.error("config.export failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Import configuration
  "config.import": async ({ params, respond, context }) => {
    try {
      const { json, comment } = params as {
        json: string;
        comment?: string;
      };
      const manager = getConfigManager();

      const result = manager.import(json, {
        comment: comment || "Configuration import",
      });

      if (result.valid) {
        respond(true, {
          success: true,
          config: manager.getConfig(),
          warnings: result.warnings,
        });
      } else {
        respond(false, {
          success: false,
          errors: result.errors,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Import failed";
      log.error("config.import failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Reset configuration to defaults
  "config.reset": async ({ respond, context }) => {
    try {
      const manager = getConfigManager();
      manager.reset({});
      respond(true, {
        success: true,
        config: manager.getConfig(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Reset failed";
      log.error("config.reset failed: " + msg);
      respond(false, { error: msg });
    }
  },
};
