import type { GatewayRequestHandlers } from "./types.js";
import { getContainerManager } from "../../services/containers.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const containersHandlers: GatewayRequestHandlers = {
  "system.containers.list": async ({ respond }) => {
    try {
      const manager = getContainerManager();
      const containers = await manager.list();

      respond(true, {
        containers: containers.map((c) => ({
          id: c.id,
          name: c.name,
          image: c.image,
          status: c.status,
          ports: c.ports.map((p) => ({
            host: p.external,
            container: p.internal,
          })),
          createdAt: c.created,
          cpu: c.cpuPercent,
          memory: c.memoryUsage,
        })),
      });
    } catch (err) {
      console.error("[Containers] List error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to list containers",
        ),
      );
    }
  },

  "system.container.start": async ({ params, respond }) => {
    const { containerId } = params as { containerId: string };
    try {
      const manager = getContainerManager();
      await manager.start(containerId);
      respond(true, { ok: true, containerId });
    } catch (err) {
      console.error(`[Containers] Start error for ${containerId}:`, err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to start container",
        ),
      );
    }
  },

  "system.container.stop": async ({ params, respond }) => {
    const { containerId } = params as { containerId: string };
    try {
      const manager = getContainerManager();
      await manager.stop(containerId);
      respond(true, { ok: true, containerId });
    } catch (err) {
      console.error(`[Containers] Stop error for ${containerId}:`, err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to stop container",
        ),
      );
    }
  },

  "system.container.restart": async ({ params, respond }) => {
    const { containerId } = params as { containerId: string };
    try {
      const manager = getContainerManager();
      await manager.restart(containerId);
      respond(true, { ok: true, containerId });
    } catch (err) {
      console.error(`[Containers] Restart error for ${containerId}:`, err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to restart container",
        ),
      );
    }
  },

  "system.container.logs": async ({ params, respond }) => {
    const { containerId } = params as { containerId: string };
    try {
      const manager = getContainerManager();
      const logs = await manager.logs(containerId, { tail: 100 });
      respond(true, { ok: true, containerId, logs });
    } catch (err) {
      console.error(`[Containers] Logs error for ${containerId}:`, err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get container logs",
        ),
      );
    }
  },
};
