/**
 * Provider API Routes Integration Tests
 */

import http from "node:http";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { handleProviderRoutes, initializeProviderRoutes } from "./providers.js";

describe("Provider API Routes", () => {
  const TEST_PORT = 19000;
  const TEST_STORAGE_PATH = "/tmp/openclaw-test-providers-api";
  let server: http.Server;

  beforeAll(async () => {
    await initializeProviderRoutes(TEST_STORAGE_PATH);
    server = http.createServer(async (req, res) => {
      const handled = await handleProviderRoutes(req, res);
      if (!handled) {
        res.statusCode = 404;
        res.end("Not Found");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(TEST_PORT, resolve);
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  async function makeRequest(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; data: unknown }> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "localhost",
        port: TEST_PORT,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 0,
              data: data ? JSON.parse(data) : null,
            });
          } catch {
            resolve({ status: res.statusCode || 0, data });
          }
        });
      });

      req.on("error", reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  describe("Template Routes", () => {
    it("GET /api/v1/providers/templates should list all templates", async () => {
      const { status, data } = await makeRequest("GET", "/api/v1/providers/templates");

      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(Array.isArray((data as any).data)).toBe(true);
      expect((data as any).data.length).toBeGreaterThan(0);
    });

    it("GET /api/v1/providers/templates/:id should get specific template", async () => {
      const { status, data } = await makeRequest("GET", "/api/v1/providers/templates/openai");

      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect((data as any).data.id).toBe("openai");
    });

    it("GET /api/v1/providers/templates/:id should 404 for non-existent", async () => {
      const { status, data } = await makeRequest("GET", "/api/v1/providers/templates/non-existent");

      expect(status).toBe(404);
      expect(data).toHaveProperty("error");
    });
  });

  describe("Provider CRUD", () => {
    let createdProviderId: string;

    it("POST /api/v1/providers should create a provider", async () => {
      const { status, data } = await makeRequest("POST", "/api/v1/providers", {
        templateId: "openai",
        name: "Test OpenAI",
        description: "Test provider",
        config: { apiKey: "test-key" },
      });

      expect(status).toBe(201);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect((data as any).data.templateId).toBe("openai");
      expect((data as any).data.name).toBe("Test OpenAI");
      createdProviderId = (data as any).data.id;
    });

    it("GET /api/v1/providers should list providers", async () => {
      const { status, data } = await makeRequest("GET", "/api/v1/providers");

      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(Array.isArray((data as any).data)).toBe(true);
    });

    it("GET /api/v1/providers/:id should get provider", async () => {
      const { status, data } = await makeRequest("GET", `/api/v1/providers/${createdProviderId}`);

      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect((data as any).data.id).toBe(createdProviderId);
    });

    it("PUT /api/v1/providers/:id should update provider", async () => {
      const { status, data } = await makeRequest("PUT", `/api/v1/providers/${createdProviderId}`, {
        name: "Updated Name",
      });

      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect((data as any).data.name).toBe("Updated Name");
    });

    it("DELETE /api/v1/providers/:id should delete provider", async () => {
      const { status } = await makeRequest("DELETE", `/api/v1/providers/${createdProviderId}`);

      expect(status).toBe(204);
    });

    it("GET /api/v1/providers/:id should 404 after deletion", async () => {
      const { status } = await makeRequest("GET", `/api/v1/providers/${createdProviderId}`);

      expect(status).toBe(404);
    });
  });

  describe("Test Connection", () => {
    it("POST /api/v1/providers/test should test connection", async () => {
      const response = await makeRequest("POST", "/api/v1/providers/test", {
        templateId: "openai",
        config: { apiKey: "invalid-key-for-test" },
      });

      // Should return result even if connection fails
      expect(response.data).toHaveProperty("success");
      expect(response.data).toHaveProperty("data");
    });

    it("POST /api/v1/providers/test should validate required fields", async () => {
      const { status, data } = await makeRequest("POST", "/api/v1/providers/test", {
        templateId: "openai",
        config: {},
      });

      expect(status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("success", false);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent routes", async () => {
      const { status } = await makeRequest("GET", "/api/v1/providers/non-existent/route");
      expect(status).toBe(404);
    });

    it("should handle invalid JSON", async () => {
      const { status } = await new Promise<{ status: number }>((resolve) => {
        const req = http.request(
          {
            hostname: "localhost",
            port: TEST_PORT,
            path: "/api/v1/providers",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
          (res) => {
            resolve({ status: res.statusCode || 0 });
          },
        );

        req.write("invalid json");
        req.end();
      });

      expect(status).toBe(400);
    });

    it("should validate required fields on create", async () => {
      const { status, data } = await makeRequest("POST", "/api/v1/providers", {
        templateId: "openai",
        // Missing name and config
      });

      expect(status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });
});
