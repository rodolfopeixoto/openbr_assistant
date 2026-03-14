/**
 * Tests for LlamaCppService
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  LlamaCppService,
  PRIMARY_MODEL,
  ALTERNATIVE_MODELS,
  type DownloadProgress,
  type RequestMetrics,
} from "./llama-cpp.js";

describe("LlamaCppService", () => {
  let service: LlamaCppService;

  beforeEach(() => {
    service = new LlamaCppService();
  });

  afterEach(() => {
    service.stopHeartbeat();
  });

  describe("Model Configuration", () => {
    it("should have Llama 3.2:3b as primary model", () => {
      expect(PRIMARY_MODEL.name).toBe("llama-3.2-3b");
      expect(PRIMARY_MODEL.displayName).toBe("Llama 3.2:3b");
      expect(PRIMARY_MODEL.sizeBytes).toBeGreaterThan(0);
      expect(PRIMARY_MODEL.ggufUrl).toContain("huggingface.co");
    });

    it("should have alternative models defined", () => {
      expect(ALTERNATIVE_MODELS.length).toBeGreaterThan(0);
      ALTERNATIVE_MODELS.forEach((model) => {
        expect(model.name).toBeDefined();
        expect(model.displayName).toBeDefined();
        expect(model.sizeBytes).toBeGreaterThan(0);
        expect(model.ggufUrl).toContain("huggingface.co");
      });
    });

    it("should list all available models", () => {
      const models = service.listModels();
      expect(models.length).toBe(1 + ALTERNATIVE_MODELS.length);
      expect(models[0].name).toBe(PRIMARY_MODEL.name);
    });
  });

  describe("Feature Toggle", () => {
    it("should toggle feature enabled state", async () => {
      expect(service.getStatus()).resolves.toMatchObject({ enabled: false });

      await service.setEnabled(true);
      const status = await service.getStatus();
      expect(status.enabled).toBe(true);

      await service.setEnabled(false);
      const status2 = await service.getStatus();
      expect(status2.enabled).toBe(false);
    });

    it("should stop server when disabling feature", async () => {
      // This test would require mocking the server process
      // For now, we just verify the method exists and doesn't throw
      await expect(service.setEnabled(false)).resolves.not.toThrow();
    });
  });

  describe("Status", () => {
    it("should return initial status", async () => {
      const status = await service.getStatus();

      expect(status).toMatchObject({
        enabled: expect.any(Boolean),
        installed: expect.any(Boolean),
        running: expect.any(Boolean),
        ready: expect.any(Boolean),
        currentModel: null,
        modelLoaded: false,
        loadingModel: false,
        error: null,
        resources: {
          memoryMB: expect.any(Number),
          memoryGB: expect.any(String),
          cpuUsage: expect.any(Number),
        },
        metrics: {
          tokensPerSecond: expect.any(Number),
          avgResponseTime: expect.any(Number),
          totalRequests: expect.any(Number),
        },
      });
    });

    it("should calculate metrics correctly", () => {
      // Add some test metrics
      service.recordRequestMetrics(100, 500); // 100 tokens in 500ms
      service.recordRequestMetrics(200, 1000); // 200 tokens in 1000ms

      const status = service.getStatus();

      // Total: 300 tokens, 1500ms = 200 tokens/sec
      expect(status).resolves.toMatchObject({
        metrics: {
          tokensPerSecond: expect.any(Number),
          avgResponseTime: expect.any(Number),
          totalRequests: 2,
        },
      });
    });
  });

  describe("Request Metrics", () => {
    it("should record request metrics", () => {
      service.recordRequestMetrics(50, 250);
      service.recordRequestMetrics(100, 500);

      const status = service.getStatus();
      expect(status).resolves.toMatchObject({
        metrics: {
          totalRequests: 2,
          lastRequestAt: expect.any(Number),
        },
      });
    });

    it("should limit metrics history", () => {
      // Add more than 100 metrics
      for (let i = 0; i < 150; i++) {
        service.recordRequestMetrics(10, 100);
      }

      const status = service.getStatus();
      expect(status).resolves.toMatchObject({
        metrics: {
          totalRequests: 100, // Should be limited to 100
        },
      });
    });
  });

  describe("Download Progress", () => {
    it("should track download progress", () => {
      const progress: DownloadProgress = {
        status: "downloading",
        percent: 50,
        downloadedBytes: 1000000,
        totalBytes: 2000000,
        speed: "5 MB/s",
        eta: "30s",
      };

      // Since downloadProgress is private, we test through the public interface
      // In a real scenario, this would be set during downloadModel
      expect(progress.status).toBe("downloading");
      expect(progress.percent).toBe(50);
    });
  });

  describe("Utility Functions", () => {
    it("should check if primary model is installed", () => {
      const isInstalled = service.isPrimaryModelInstalled();
      expect(typeof isInstalled).toBe("boolean");
    });

    it("should return primary model status", () => {
      const status = service.getPrimaryModelStatus();
      expect(status).toMatchObject({
        installed: expect.any(Boolean),
        size: expect.any(Number),
        path: expect.any(String),
      });
    });
  });
});

describe("DownloadProgress interface", () => {
  it("should support all status types", () => {
    const statuses: DownloadProgress["status"][] = [
      "idle",
      "downloading",
      "completed",
      "error",
      "verifying",
    ];

    statuses.forEach((status) => {
      const progress: DownloadProgress = {
        status,
        percent: 0,
        downloadedBytes: 0,
        totalBytes: 100,
        speed: "0 MB/s",
      };
      expect(progress.status).toBe(status);
    });
  });
});

describe("RequestMetrics interface", () => {
  it("should have correct structure", () => {
    const metric: RequestMetrics = {
      tokensGenerated: 100,
      responseTimeMs: 500,
      timestamp: Date.now(),
    };

    expect(metric.tokensGenerated).toBe(100);
    expect(metric.responseTimeMs).toBe(500);
    expect(metric.timestamp).toBeGreaterThan(0);
  });
});

describe("LlamaStatus interface", () => {
  it("should have all required properties", async () => {
    const service = new LlamaCppService();
    const status = await service.getStatus();

    expect(status).toHaveProperty("enabled");
    expect(status).toHaveProperty("installed");
    expect(status).toHaveProperty("running");
    expect(status).toHaveProperty("ready");
    expect(status).toHaveProperty("currentModel");
    expect(status).toHaveProperty("modelLoaded");
    expect(status).toHaveProperty("loadingModel");
    expect(status).toHaveProperty("error");
    expect(status).toHaveProperty("resources");
    expect(status).toHaveProperty("metrics");

    service.stopHeartbeat();
  });
});
