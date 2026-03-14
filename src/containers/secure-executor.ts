/**
 * SecureExecutor - Securely executes tools in isolated containers
 *
 * Combines:
 * - Command validation (blocked commands)
 * - Container isolation
 * - Permission system
 * - Audit logging
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ContainerConfig,
  ContainerMount,
  ExecutionRequest,
  ExecutionPermissions,
  ExecutionResult,
} from "../containers/types.js";
import type { AuditEventBase, AuditOutcome } from "../security/audit-events.js";
import type { RuntimeType } from "./types.js";
import { ContainerOrchestrator } from "../containers/orchestrator.js";
import {
  isCommandBlocked,
  validateCommands,
  type BlockedCommand,
} from "../security/blocked-commands.js";

// Re-export types
export type { ExecutionRequest, ExecutionPermissions, ExecutionResult };

export interface SecureExecutionContext {
  sessionId: string;
  agentId: string;
  requestId: string;
  timestamp: Date;
}

export interface SecureExecutionAuditEvent extends AuditEventBase {
  type: "secure-execution";
  context: SecureExecutionContext;
  tool: string;
  command: string;
  blockedCommand?: BlockedCommand;
  containerId?: string;
  result: ExecutionResult;
}

export type SecureExecutionCallback = (event: SecureExecutionAuditEvent) => void | Promise<void>;

export class SecureExecutor {
  private orchestrator: ContainerOrchestrator;
  private auditCallback?: SecureExecutionCallback;
  private initialized = false;

  constructor(orchestrator?: ContainerOrchestrator, auditCallback?: SecureExecutionCallback) {
    this.orchestrator = orchestrator || new ContainerOrchestrator();
    this.auditCallback = auditCallback;
  }

  /**
   * Initialize the secure executor
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.orchestrator.initialize();
    this.initialized = true;
  }

  /**
   * Check if executor is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Execute a tool securely
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!this.initialized) {
      throw new Error("SecureExecutor not initialized. Call initialize() first.");
    }

    const requestId = uuidv4();
    const context: SecureExecutionContext = {
      sessionId: request.sessionId,
      agentId: request.agentId,
      requestId,
      timestamp: new Date(),
    };

    // Step 1: Validate permissions
    if (!this.isToolAllowed(request.tool, request.permissions)) {
      const result: ExecutionResult = {
        success: false,
        error: `Tool '${request.tool}' is not allowed for this session`,
        executionTime: 0,
      };

      await this.audit(context, request, "", result);
      return result;
    }

    // Step 2: Build command and validate
    const command = this.buildToolCommand(request);

    const blockedCommand = isCommandBlocked(command);
    if (blockedCommand) {
      const result: ExecutionResult = {
        success: false,
        error: `Command blocked: ${blockedCommand.description}. Reason: ${blockedCommand.reason}`,
        executionTime: 0,
      };

      await this.audit(context, request, command, result, blockedCommand);
      return result;
    }

    // Step 3: Create container and execute
    const containerId = this.orchestrator.generateContainerId();
    let result: ExecutionResult;

    try {
      const config = this.buildContainerConfig(request, containerId);
      await this.orchestrator.createContainer(config);

      const execResult = await this.orchestrator.execInContainer(
        containerId,
        ["sh", "-c", command],
        { timeout: request.permissions.maxExecutionTime },
      );

      result = {
        success: execResult.exitCode === 0,
        output: execResult.stdout || undefined,
        error: execResult.stderr || undefined,
        executionTime: execResult.executionTime,
      };
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
      };
    } finally {
      // Cleanup container
      try {
        await this.orchestrator.destroyContainer(containerId, true);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Step 4: Audit
    await this.audit(context, request, command, result, undefined, containerId);

    return result;
  }

  /**
   * Validate commands without executing
   */
  validate(request: ExecutionRequest): {
    valid: boolean;
    toolAllowed: boolean;
    blockedCommands: Array<{ command: string; blocked: BlockedCommand }>;
  } {
    const toolAllowed = this.isToolAllowed(request.tool, request.permissions);
    const command = this.buildToolCommand(request);
    const validation = validateCommands([command]);

    return {
      valid: toolAllowed && validation.valid,
      toolAllowed,
      blockedCommands: validation.blocked,
    };
  }

  /**
   * Check if a tool is allowed
   */
  private isToolAllowed(tool: string, permissions: ExecutionPermissions): boolean {
    // Check deny list first
    if (permissions.denyTools.includes(tool)) {
      return false;
    }

    // Check allow list
    if (permissions.allowTools.includes("*")) {
      return true;
    }

    return permissions.allowTools.includes(tool);
  }

  /**
   * Build the command to execute
   */
  private buildToolCommand(request: ExecutionRequest): string {
    // Map tool names to commands
    const toolCommands: Record<string, (args: Record<string, unknown>) => string> = {
      "file-read": (args) => `cat "${args.path}"`,
      "file-write": (args) => `echo "${args.content}" > "${args.path}"`,
      "file-delete": (args) => `rm "${args.path}"`,
      "directory-list": (args) => `ls -la "${args.path}"`,
      "directory-create": (args) => `mkdir -p "${args.path}"`,
      "directory-delete": (args) => `rm -rf "${args.path}"`,
      shell: (args) => String(args.command),
      exec: (args) => String(args.command),
    };

    const builder = toolCommands[request.tool];
    if (builder) {
      return builder(request.args);
    }

    // Default: treat args.command as the command
    if (request.args.command) {
      return String(request.args.command);
    }

    throw new Error(`Unknown tool: ${request.tool}`);
  }

  /**
   * Build container configuration
   */
  private buildContainerConfig(request: ExecutionRequest, containerId: string): ContainerConfig {
    const mounts: ContainerMount[] = [];

    // Add allowed paths as mounts
    for (const path of request.permissions.allowedPaths) {
      mounts.push({
        type: "bind",
        source: path,
        target: `/workspace${path}`,
        readOnly: false,
      });
    }

    // Add blocked paths as read-only dummy mounts (defense in depth)
    for (const path of request.permissions.blockedPaths) {
      mounts.push({
        type: "tmpfs",
        source: "",
        target: path,
        readOnly: true,
      });
    }

    return {
      containerId,
      sessionId: request.sessionId,
      agentId: request.agentId,
      runtime: (this.orchestrator.getRuntimeType() || "docker") as RuntimeType,
      image: "openclaw/agent-runtime:latest",
      resources: {
        memory: request.permissions.maxMemory,
        cpus: 0.5,
        timeout: request.permissions.maxExecutionTime,
      },
      mounts,
      env: {
        SESSION_ID: request.sessionId,
        AGENT_ID: request.agentId,
        TOOL_NAME: request.tool,
        REQUEST_ID: containerId,
      },
      network: request.permissions.networkAccess ? "bridge" : "none",
      security: {
        readOnlyRootFilesystem: true,
        noNewPrivileges: true,
        dropCapabilities: ["ALL"],
      },
    };
  }

  /**
   * Send audit event
   */
  private async audit(
    context: SecureExecutionContext,
    request: ExecutionRequest,
    command: string,
    result: ExecutionResult,
    blockedCommand?: BlockedCommand,
    containerId?: string,
  ): Promise<void> {
    if (!this.auditCallback) {
      return;
    }

    const outcome: AuditOutcome = result.success
      ? "success"
      : blockedCommand
        ? "blocked"
        : "failure";

    const event: SecureExecutionAuditEvent = {
      type: "secure-execution",
      timestamp: context.timestamp.toISOString(),
      outcome,
      context,
      tool: request.tool,
      command,
      blockedCommand,
      containerId,
      result,
    };

    try {
      await this.auditCallback(event);
    } catch (error) {
      console.error("Failed to send audit event:", error);
    }
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    await this.orchestrator.cleanup();
    this.initialized = false;
  }
}

// Singleton instance
export const secureExecutor = new SecureExecutor();
