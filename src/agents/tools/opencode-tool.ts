import { Type } from "@sinclair/typebox";
import { jsonResult, readStringParam, type AnyAgentTool } from "./common.js";
import { callGatewayTool, type GatewayCallOptions } from "./gateway.js";

const OPCODE_ACTIONS = [
  "status",
  "list",
  "create",
  "approve",
  "cancel",
  "logs",
  "config",
  "audit",
] as const;

const OpencodeToolSchema = Type.Object({
  action: Type.String(),
  prompt: Type.Optional(
    Type.String({ description: "Coding task description (for create action)" }),
  ),
  taskId: Type.Optional(Type.String({ description: "Task ID (for approve/cancel/logs actions)" })),
  timeoutMs: Type.Optional(Type.Number({ description: "Request timeout in milliseconds" })),
  includeCompleted: Type.Optional(Type.Boolean({ description: "Include completed tasks in list" })),
  limit: Type.Optional(
    Type.Number({
      description: "Maximum number of audit entries to return",
      minimum: 1,
      maximum: 1000,
    }),
  ),
});

type OpencodeToolOptions = {
  agentSessionKey?: string;
};

/**
 * Create the opencode tool for AI-powered coding tasks in secure containers.
 *
 * This tool allows the AI assistant to:
 * - Check OpenCode status and configuration
 * - List existing coding tasks
 * - Create new coding tasks with prompts
 * - Approve pending tasks (when approval mode requires it)
 * - Cancel running tasks
 * - View task logs
 * - Access audit logs
 */
export function createOpencodeTool(_opts?: OpencodeToolOptions): AnyAgentTool {
  return {
    label: "OpenCode",
    name: "opencode",
    description: `Execute coding tasks in secure, sandboxed containers using OpenCode AI.

OpenCode allows you to write, modify, and analyze code in isolated Docker/Podman containers.
All code execution happens in a secure sandbox with configurable security policies.

ACTIONS:
- status: Check OpenCode status, runtime availability, and configuration
- list: List all coding tasks with their status (pending, running, completed, failed)
- create: Create a new coding task (requires prompt)
- approve: Approve a pending task (requires taskId)
- cancel: Cancel a running or pending task (requires taskId)
- logs: Get logs for a specific task (requires taskId)
- config: Get current OpenCode configuration
- audit: Get audit log entries for security monitoring

SECURITY NOTES:
- Tasks run in isolated containers with configurable resource limits
- Commands can be allowlisted/blocklisted by administrators
- User approval may be required before task execution
- All activities are logged for audit purposes

EXAMPLES:
- Check status: { "action": "status" }
- List tasks: { "action": "list" }
- Create task: { "action": "create", "prompt": "Create a React component for a todo list" }
- Approve task: { "action": "approve", "taskId": "task-123" }
- Cancel task: { "action": "cancel", "taskId": "task-123" }
- Get logs: { "action": "logs", "taskId": "task-123" }
- Get config: { "action": "config" }
- Get audit log: { "action": "audit", "limit": 100 }`,
    parameters: OpencodeToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });

      const gatewayOpts: GatewayCallOptions = {
        timeoutMs: typeof params.timeoutMs === "number" ? params.timeoutMs : 30000,
      };

      switch (action) {
        case "status": {
          const result = await callGatewayTool("opencode.status", gatewayOpts, {});
          return jsonResult(result);
        }

        case "list": {
          const result = await callGatewayTool("opencode.task.list", gatewayOpts, {
            includeCompleted: Boolean(params.includeCompleted),
          });
          return jsonResult(result);
        }

        case "create": {
          const prompt = readStringParam(params, "prompt", { required: true });
          const result = await callGatewayTool("opencode.task.create", gatewayOpts, { prompt });
          return jsonResult(result);
        }

        case "approve": {
          const taskId = readStringParam(params, "taskId", { required: true });
          const result = await callGatewayTool("opencode.task.approve", gatewayOpts, { taskId });
          return jsonResult(result);
        }

        case "cancel": {
          const taskId = readStringParam(params, "taskId", { required: true });
          const result = await callGatewayTool("opencode.task.cancel", gatewayOpts, { taskId });
          return jsonResult(result);
        }

        case "logs": {
          const taskId = readStringParam(params, "taskId", { required: true });
          const result = await callGatewayTool("opencode.task.logs", gatewayOpts, { taskId });
          return jsonResult(result);
        }

        case "config": {
          const result = await callGatewayTool("opencode.config.get", gatewayOpts, {});
          return jsonResult(result);
        }

        case "audit": {
          const limit =
            typeof params.limit === "number" && params.limit > 0 && params.limit <= 1000
              ? params.limit
              : 100;
          const result = await callGatewayTool("opencode.audit.list", gatewayOpts, { limit });
          return jsonResult(result);
        }

        default:
          throw new Error(
            `Unknown OpenCode action: ${action}. Valid actions are: ${OPCODE_ACTIONS.join(", ")}`,
          );
      }
    },
  };
}
