import { describe, it, expect, beforeEach } from "vitest";
import type { Channel, ChannelStatus, ChannelMetrics } from "../types.js";
import { UnifiedChannelManager } from "../unified-channel-manager.js";

describe("Unified Channel Manager", () => {
  let manager: UnifiedChannelManager;

  beforeEach(() => {
    manager = new UnifiedChannelManager();
  });

  describe("Channel Registration", () => {
    it("should register a new channel", () => {
      const channel: Channel = {
        id: "telegram-1",
        name: "Telegram Bot",
        type: "telegram",
        enabled: true,
        config: { token: "test-token" },
      };

      manager.registerChannel(channel);
      const channels = manager.getAllChannels();

      expect(channels).toHaveLength(1);
      expect(channels[0].id).toBe("telegram-1");
    });

    it("should not register duplicate channels", () => {
      const channel: Channel = {
        id: "telegram-1",
        name: "Telegram Bot",
        type: "telegram",
        enabled: true,
        config: {},
      };

      manager.registerChannel(channel);
      manager.registerChannel(channel); // Duplicate

      expect(manager.getAllChannels()).toHaveLength(1);
    });

    it("should unregister a channel", () => {
      const channel: Channel = {
        id: "telegram-1",
        name: "Telegram Bot",
        type: "telegram",
        enabled: true,
        config: {},
      };

      manager.registerChannel(channel);
      manager.unregisterChannel("telegram-1");

      expect(manager.getAllChannels()).toHaveLength(0);
    });
  });

  describe("Channel Status", () => {
    it("should update channel status", () => {
      const channel: Channel = {
        id: "telegram-1",
        name: "Telegram Bot",
        type: "telegram",
        enabled: true,
        config: {},
      };

      manager.registerChannel(channel);
      manager.updateChannelStatus("telegram-1", "online");

      const status = manager.getChannelStatus("telegram-1");
      expect(status?.status).toBe("online");
    });

    it("should return offline for non-existent channel", () => {
      const status = manager.getChannelStatus("non-existent");
      expect(status?.status).toBe("offline");
    });
  });

  describe("Channel Metrics", () => {
    it("should track message metrics", () => {
      const channel: Channel = {
        id: "telegram-1",
        name: "Telegram Bot",
        type: "telegram",
        enabled: true,
        config: {},
      };

      manager.registerChannel(channel);
      manager.recordMessageSent("telegram-1");
      manager.recordMessageReceived("telegram-1");

      const metrics = manager.getChannelMetrics("telegram-1");
      expect(metrics?.messagesSent).toBe(1);
      expect(metrics?.messagesReceived).toBe(1);
    });

    it("should calculate success rate", () => {
      const channel: Channel = {
        id: "telegram-1",
        name: "Telegram Bot",
        type: "telegram",
        enabled: true,
        config: {},
      };

      manager.registerChannel(channel);

      // 8 successful, 2 failed
      for (let i = 0; i < 8; i++) {
        manager.recordMessageSent("telegram-1", true);
      }
      for (let i = 0; i < 2; i++) {
        manager.recordMessageSent("telegram-1", false);
      }

      const metrics = manager.getChannelMetrics("telegram-1");
      expect(metrics?.successRate).toBe(0.8);
    });
  });

  describe("Smart Routing", () => {
    it("should route to enabled channel", () => {
      const channel: Channel = {
        id: "telegram-1",
        name: "Telegram Bot",
        type: "telegram",
        enabled: true,
        config: {},
      };

      manager.registerChannel(channel);
      manager.updateChannelStatus("telegram-1", "online");

      const route = manager.selectRoute("telegram");
      expect(route?.channelId).toBe("telegram-1");
    });

    it("should not route to disabled channel", () => {
      const channel: Channel = {
        id: "telegram-1",
        name: "Telegram Bot",
        type: "telegram",
        enabled: false,
        config: {},
      };

      manager.registerChannel(channel);
      manager.updateChannelStatus("telegram-1", "online");

      const route = manager.selectRoute("telegram");
      expect(route).toBeNull();
    });

    it("should select best channel based on health score", () => {
      const channel1: Channel = {
        id: "telegram-1",
        name: "Telegram Bot 1",
        type: "telegram",
        enabled: true,
        config: {},
      };
      const channel2: Channel = {
        id: "telegram-2",
        name: "Telegram Bot 2",
        type: "telegram",
        enabled: true,
        config: {},
      };

      manager.registerChannel(channel1);
      manager.registerChannel(channel2);

      // Channel 1 has lower success rate
      for (let i = 0; i < 5; i++) {
        manager.recordMessageSent("telegram-1", false);
      }

      // Channel 2 has higher success rate
      for (let i = 0; i < 10; i++) {
        manager.recordMessageSent("telegram-2", true);
      }

      const route = manager.selectRoute("telegram");
      expect(route?.channelId).toBe("telegram-2");
    });

    it("should provide fallback channel", () => {
      const telegram: Channel = {
        id: "telegram-1",
        name: "Telegram",
        type: "telegram",
        enabled: true,
        config: {},
      };
      const discord: Channel = {
        id: "discord-1",
        name: "Discord",
        type: "discord",
        enabled: true,
        config: {},
      };

      manager.registerChannel(telegram);
      manager.registerChannel(discord);
      manager.updateChannelStatus("telegram-1", "offline");
      manager.updateChannelStatus("discord-1", "online");

      const route = manager.selectRouteWithFallback("telegram", ["discord"]);
      expect(route?.channelId).toBe("discord-1");
    });
  });

  describe("Unified Status", () => {
    it("should return unified status summary", () => {
      manager.registerChannel({
        id: "telegram-1",
        name: "Telegram",
        type: "telegram",
        enabled: true,
        config: {},
      });
      manager.registerChannel({
        id: "discord-1",
        name: "Discord",
        type: "discord",
        enabled: true,
        config: {},
      });
      manager.registerChannel({
        id: "slack-1",
        name: "Slack",
        type: "slack",
        enabled: false,
        config: {},
      });

      manager.updateChannelStatus("telegram-1", "online");
      manager.updateChannelStatus("discord-1", "online");

      const summary = manager.getUnifiedStatus();
      expect(summary.total).toBe(3);
      expect(summary.online).toBe(2);
      expect(summary.offline).toBe(1);
      expect(summary.enabled).toBe(2);
    });

    it("should return health status", () => {
      manager.registerChannel({
        id: "telegram-1",
        name: "Telegram",
        type: "telegram",
        enabled: true,
        config: {},
      });

      manager.updateChannelStatus("telegram-1", "online");

      const health = manager.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.score).toBeGreaterThan(0);
    });
  });

  describe("Bulk Operations", () => {
    it("should enable multiple channels", () => {
      manager.registerChannel({
        id: "telegram-1",
        name: "Telegram",
        type: "telegram",
        enabled: false,
        config: {},
      });
      manager.registerChannel({
        id: "discord-1",
        name: "Discord",
        type: "discord",
        enabled: false,
        config: {},
      });

      manager.setChannelsEnabled(["telegram-1", "discord-1"], true);

      expect(manager.getChannel("telegram-1")?.enabled).toBe(true);
      expect(manager.getChannel("discord-1")?.enabled).toBe(true);
    });

    it("should test all channels", async () => {
      manager.registerChannel({
        id: "telegram-1",
        name: "Telegram",
        type: "telegram",
        enabled: true,
        config: {},
      });

      const results = await manager.testAllChannels();
      expect(results).toHaveLength(1);
      expect(results[0].channelId).toBe("telegram-1");
    });
  });
});
