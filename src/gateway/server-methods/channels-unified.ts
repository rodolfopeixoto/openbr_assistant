import type { Channel, ChannelType } from "../../channels/unified/types.js";
import type { GatewayRequestHandlers } from "./types.js";
import { UnifiedChannelManager } from "../../channels/unified/unified-channel-manager.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

// Global manager instance
let manager: UnifiedChannelManager | null = null;

function getManager(): UnifiedChannelManager {
  if (!manager) {
    manager = new UnifiedChannelManager();
  }
  return manager;
}

export const unifiedChannelsHandlers: GatewayRequestHandlers = {
  // Get unified status of all channels
  "channels.unified.status": ({ respond }) => {
    try {
      const mgr = getManager();
      const status = mgr.getUnifiedStatus();
      const health = mgr.getHealthStatus();

      respond(true, {
        status,
        health,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get status: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // List all channels with details
  "channels.unified.list": ({ respond }) => {
    try {
      const mgr = getManager();
      const channels = mgr.getAllChannels();
      const statuses = mgr.getAllStatuses();
      const metrics = mgr.getAllMetrics();

      const enriched = channels.map((channel) => ({
        ...channel,
        status: statuses.find((s) => s.channelId === channel.id),
        metrics: metrics.find((m) => m.channelId === channel.id),
      }));

      respond(true, {
        channels: enriched,
        total: channels.length,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to list channels: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Register a new channel
  "channels.unified.register": ({ params, respond }) => {
    try {
      const {
        id,
        name,
        type,
        config,
        description,
        enabled = true,
      } = params as {
        id: string;
        name: string;
        type: ChannelType;
        config: Record<string, unknown>;
        description?: string;
        enabled?: boolean;
      };

      if (!id || !name || !type) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "id, name, and type are required"),
        );
        return;
      }

      const mgr = getManager();
      mgr.registerChannel({
        id,
        name,
        type,
        config: config || {},
        description,
        enabled,
      });

      respond(true, {
        ok: true,
        channel: mgr.getChannel(id),
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to register channel: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Update channel configuration
  "channels.unified.update": ({ params, respond }) => {
    try {
      const { id, updates } = params as {
        id: string;
        updates: Partial<Channel>;
      };

      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }

      const mgr = getManager();
      const success = mgr.updateChannel(id, updates);

      if (!success) {
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "Channel not found"));
        return;
      }

      respond(true, {
        ok: true,
        channel: mgr.getChannel(id),
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to update channel: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Unregister a channel
  "channels.unified.unregister": ({ params, respond }) => {
    try {
      const { id } = params as { id: string };

      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }

      const mgr = getManager();
      const success = mgr.unregisterChannel(id);

      if (!success) {
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "Channel not found"));
        return;
      }

      respond(true, { ok: true, removed: id });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to unregister channel: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Enable/disable channels
  "channels.unified.toggle": ({ params, respond }) => {
    try {
      const { ids, enabled } = params as { ids: string[]; enabled: boolean };

      if (!ids || !Array.isArray(ids) || typeof enabled !== "boolean") {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "ids (array) and enabled (boolean) are required"),
        );
        return;
      }

      const mgr = getManager();
      mgr.setChannelsEnabled(ids, enabled);

      respond(true, {
        ok: true,
        ids,
        enabled,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to toggle channels: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Select routing for a channel type
  "channels.unified.route": ({ params, respond }) => {
    try {
      const { type, fallbackTypes = [] } = params as {
        type: ChannelType;
        fallbackTypes?: ChannelType[];
      };

      if (!type) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "type is required"));
        return;
      }

      const mgr = getManager();
      let route;

      if (fallbackTypes.length > 0) {
        route = mgr.selectRouteWithFallback(type, fallbackTypes);
      } else {
        route = mgr.selectRoute(type);
      }

      if (!route) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, `No available route for type: ${type}`),
        );
        return;
      }

      respond(true, { route });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to select route: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Get metrics for a specific channel
  "channels.unified.metrics": ({ params, respond }) => {
    try {
      const { id } = params as { id: string };

      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }

      const mgr = getManager();
      const metrics = mgr.getChannelMetrics(id);
      const status = mgr.getChannelStatus(id);

      if (!metrics) {
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "Channel not found"));
        return;
      }

      respond(true, { metrics, status });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get metrics: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Test a specific channel
  "channels.unified.test": async ({ params, respond }) => {
    try {
      const { id } = params as { id: string };

      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }

      const mgr = getManager();
      const result = await mgr.testChannel(id);

      respond(true, { result });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to test channel: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Test all enabled channels
  "channels.unified.testAll": async ({ respond }) => {
    try {
      const mgr = getManager();
      const results = await mgr.testAllChannels();

      const passed = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      respond(true, {
        results,
        summary: {
          total: results.length,
          passed,
          failed,
        },
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to test channels: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Get health status
  "channels.unified.health": ({ respond }) => {
    try {
      const mgr = getManager();
      const health = mgr.getHealthStatus();

      respond(true, { health });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get health: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Export configuration
  "channels.unified.export": ({ respond }) => {
    try {
      const mgr = getManager();
      const config = mgr.exportConfig();

      respond(true, { config });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to export config: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  // Import configuration
  "channels.unified.import": ({ params, respond }) => {
    try {
      const { config } = params as { config: { channels: Channel[] } };

      if (!config || !config.channels) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "config.channels is required"),
        );
        return;
      }

      const mgr = getManager();
      mgr.importConfig(config);

      respond(true, {
        ok: true,
        imported: config.channels.length,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to import config: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};

export default unifiedChannelsHandlers;
