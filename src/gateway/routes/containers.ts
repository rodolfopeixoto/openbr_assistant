/**
 * Container management HTTP API routes
 *
 * Provides endpoints for:
 * - GET /api/containers - List all containers
 * - GET /api/containers/runtime - Get runtime info
 * - GET /api/containers/:id/logs - Get container logs
 * - POST /api/containers/:id/stop - Stop a container
 * - DELETE /api/containers/:id - Remove a container
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { ResolvedGatewayAuth } from "../auth.js";
import { containerOrchestrator } from "../../containers/orchestrator.js";
import { runtimeDetector } from "../../containers/runtime-detector.js";

interface ContainerApiContext {
  auth: ResolvedGatewayAuth;
  trustedProxies: string[];
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

/**
 * Handle container management API requests
 */
export async function handleContainersHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: ContainerApiContext,
): Promise<boolean> {
  const path = getRequestPath(req.url ?? "/");

  // Only handle /api/containers routes
  if (!path.startsWith("/api/containers")) {
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
    // Initialize orchestrator if needed
    if (!containerOrchestrator.isInitialized()) {
      await containerOrchestrator.initialize();
    }

    // Route handlers
    if (path === "/api/containers" && req.method === "GET") {
      return await listContainers(req, res);
    }

    if (path === "/api/containers/runtime" && req.method === "GET") {
      return await getRuntimeInfo(req, res);
    }

    // Container-specific routes
    const containerMatch = path.match(new RegExp("^/api/containers/([^/]+)(?:/(\\w+))?$"));
    if (containerMatch) {
      const containerId = containerMatch[1];
      const action = containerMatch[2];

      if (action === "logs" && req.method === "GET") {
        return await getContainerLogs(req, res, containerId);
      }

      if (action === "stop" && req.method === "POST") {
        return await stopContainer(req, res, containerId);
      }

      if (!action && req.method === "DELETE") {
        return await removeContainer(req, res, containerId);
      }

      if (!action && req.method === "GET") {
        return await getContainerStatus(req, res, containerId);
      }
    }

    // Unknown route
    sendJson(res, 404, { error: "Not found", code: "ROUTE_NOT_FOUND" });
    return true;
  } catch (error) {
    console.error("Container API error:", error);
    sendJson(res, 500, {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

async function listContainers(_req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const containers = await containerOrchestrator.listContainers();

  const response = containers.map(
    (container: {
      containerId: string;
      state: string;
      startedAt?: Date;
      finishedAt?: Date;
      exitCode?: number;
      error?: string;
    }) => ({
      containerId: container.containerId,
      state: container.state,
      startedAt: container.startedAt?.toISOString(),
      finishedAt: container.finishedAt?.toISOString(),
      exitCode: container.exitCode,
      error: container.error,
    }),
  );

  sendJson(res, 200, { containers: response });
  return true;
}

async function getRuntimeInfo(_req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const runtimeType = runtimeDetector.detect();

  if (!runtimeType) {
    sendJson(res, 200, {
      runtime: null,
      available: false,
      message: "No container runtime detected",
    });
    return true;
  }

  const info = await runtimeDetector.getRuntimeInfo(await runtimeType);

  sendJson(res, 200, {
    runtime: info,
    available: true,
    activeContainers: containerOrchestrator.getActiveContainerCount(),
  });
  return true;
}

async function getContainerLogs(
  req: IncomingMessage,
  res: ServerResponse,
  containerId: string,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const tail = parseInt(url.searchParams.get("tail") ?? "100", 10);

  try {
    const logs = await containerOrchestrator.getContainerLogs(containerId, tail);
    sendJson(res, 200, {
      containerId,
      logs,
      tail,
    });
  } catch (error) {
    sendJson(res, 404, {
      error: "Container not found",
      code: "CONTAINER_NOT_FOUND",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return true;
}

async function stopContainer(
  _req: IncomingMessage,
  res: ServerResponse,
  containerId: string,
): Promise<boolean> {
  try {
    await containerOrchestrator.destroyContainer(containerId);
    sendJson(res, 200, {
      success: true,
      message: "Container stopped and removed",
      containerId,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: "Failed to stop container",
      code: "STOP_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return true;
}

async function removeContainer(
  _req: IncomingMessage,
  res: ServerResponse,
  containerId: string,
): Promise<boolean> {
  try {
    await containerOrchestrator.destroyContainer(containerId, true);
    sendJson(res, 200, {
      success: true,
      message: "Container removed",
      containerId,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: "Failed to remove container",
      code: "REMOVE_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return true;
}

async function getContainerStatus(
  _req: IncomingMessage,
  res: ServerResponse,
  containerId: string,
): Promise<boolean> {
  try {
    const status = await containerOrchestrator.getContainerStatus(containerId);
    sendJson(res, 200, {
      containerId: status.containerId,
      state: status.state,
      startedAt: status.startedAt?.toISOString(),
      finishedAt: status.finishedAt?.toISOString(),
      exitCode: status.exitCode,
      error: status.error,
    });
  } catch (error) {
    sendJson(res, 404, {
      error: "Container not found",
      code: "CONTAINER_NOT_FOUND",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return true;
}

/**
 * Verify Bearer token
 */
async function verifyToken(token: string, _ctx: ContainerApiContext): Promise<boolean> {
  // Use the gateway auth to verify tokens
  // This is a simplified version - in production, use proper token validation

  // Check if it's a valid session token or API key
  // For now, accept any non-empty token (implement proper validation)
  return token.length > 0;
}
