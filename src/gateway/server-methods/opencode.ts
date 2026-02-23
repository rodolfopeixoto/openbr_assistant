/**
 * OpenCode Gateway Handlers
 *
 * Exposes OpenCode runtime functionality through the gateway API
 */

import type { GatewayRequestHandlers } from "./types.js";
import { loadConfig } from "../../config/config.js";
import { openCodeRuntime, type OpenCodeTask } from "../../opencode/index.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const opencodeHandlers: GatewayRequestHandlers = {
  "opencode.status": async ({ respond }) => {
    try {
      const status = openCodeRuntime.getStatus();
      respond(true, { status });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to get OpenCode status: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.config.get": async ({ respond }) => {
    try {
      const cfg = loadConfig();
      respond(true, { config: cfg.opencode || null });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to get OpenCode config: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.task.create": async ({ params, respond }) => {
    try {
      const { prompt, description, project } = params as {
        prompt?: string;
        description?: string;
        project?: string;
      };

      // Support both 'prompt' (from tool) and 'description' (legacy)
      const taskDescription = prompt || description;
      // Use provided project or generate from prompt
      const taskProject = project || (prompt ? `opencode-${Date.now()}` : undefined);

      if (!taskDescription) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "prompt or description is required"),
        );
        return;
      }

      if (!taskProject) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "project is required"));
        return;
      }

      // Initialize if not already
      if (!openCodeRuntime.isReady()) {
        await openCodeRuntime.initialize();
      }

      const task = await openCodeRuntime.createTask(taskDescription, taskProject);
      respond(true, { task: serializeTask(task) });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to create task: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.task.approve": async ({ params, respond }) => {
    try {
      const { taskId, userId } = params as { taskId: string; userId?: string };

      if (!taskId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "taskId is required"));
        return;
      }

      const task = await openCodeRuntime.approveAndStartTask(taskId, userId);
      respond(true, { task: serializeTask(task) });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to approve task: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.task.cancel": async ({ params, respond }) => {
    try {
      const { taskId } = params as { taskId: string };

      if (!taskId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "taskId is required"));
        return;
      }

      const task = await openCodeRuntime.cancelTask(taskId);
      respond(true, { task: serializeTask(task) });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to cancel task: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.task.get": async ({ params, respond }) => {
    try {
      const { taskId } = params as { taskId: string };

      if (!taskId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "taskId is required"));
        return;
      }

      const task = openCodeRuntime.getTask(taskId);
      if (!task) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `task ${taskId} not found`),
        );
        return;
      }

      respond(true, { task: serializeTask(task) });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to get task: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.task.list": async ({ params, respond }) => {
    try {
      const { includeCompleted } = params as { includeCompleted?: boolean };
      let tasks = openCodeRuntime.getAllTasks();

      if (!includeCompleted) {
        tasks = tasks.filter((t) => t.status !== "completed");
      }

      respond(true, { tasks: tasks.map(serializeTask) });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to list tasks: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.task.logs": async ({ params, respond }) => {
    try {
      const { taskId, tail } = params as { taskId: string; tail?: number };

      if (!taskId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "taskId is required"));
        return;
      }

      const logs = await openCodeRuntime.getTaskLogs(taskId, tail ?? 100);
      respond(true, { logs });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to get task logs: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.audit.list": async ({ params, respond }) => {
    try {
      const { limit, offset } = params as { limit?: number; offset?: number };
      const entries = openCodeRuntime.getAuditLog(limit ?? 100, offset ?? 0);
      respond(true, {
        entries: entries.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        })),
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to get audit log: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "opencode.initialize": async ({ respond }) => {
    try {
      await openCodeRuntime.initialize();
      respond(true, { initialized: true });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          `failed to initialize OpenCode: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};

/**
 * Serialize task for JSON response
 */
function serializeTask(task: OpenCodeTask): Record<string, unknown> {
  return {
    id: task.id,
    description: task.description,
    project: task.project,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    startedAt: task.startedAt?.toISOString(),
    completedAt: task.completedAt?.toISOString(),
    containerId: task.containerId,
    requiresApproval: task.requiresApproval,
    approvalReason: task.approvalReason,
    result: task.result
      ? {
          success: task.result.success,
          output: task.result.output,
          filesModified: task.result.filesModified,
          commandsExecuted: task.result.commandsExecuted,
          executionTime: task.result.executionTime,
          error: task.result.error,
        }
      : undefined,
  };
}
