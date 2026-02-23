/**
 * OpenCode Runtime Service
 *
 * Manages OpenCode AI coding assistant execution within secure containers.
 * Handles task queueing, container lifecycle, security enforcement, and audit logging.
 */

import os from "node:os";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { OpenCodeConfig } from "../config/types.openclaw.js";
import { loadConfig } from "../config/config.js";
import {
  containerOrchestrator,
  type ContainerConfig,
  type ContainerExecutionResult,
} from "../containers/index.js";

// Task execution types
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "needs-approval";

export interface OpenCodeTask {
  id: string;
  description: string;
  project: string;
  status: TaskStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  containerId?: string;
  result?: TaskResult;
  requiresApproval?: boolean;
  approvalReason?: string;
}

export interface TaskResult {
  success: boolean;
  output: string;
  filesModified: string[];
  commandsExecuted: string[];
  executionTime: number; // milliseconds
  error?: string;
}

export interface ExecutionContext {
  taskId: string;
  project: string;
  workingDir: string;
  sessionId: string;
  agentId: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  taskId: string;
  action:
    | "task-created"
    | "task-started"
    | "task-completed"
    | "task-failed"
    | "command-executed"
    | "file-read"
    | "file-written"
    | "approval-requested"
    | "approval-granted"
    | "approval-denied";
  details: Record<string, unknown>;
  user?: string;
}

// Security types
export interface SecurityPolicy {
  allowlist: string[];
  blocklist: string[];
  whitelistPaths: string[];
  blacklistPaths: string[];
  networkAccess: boolean;
  readOnlyFilesystem: boolean;
  requireApproval: boolean;
}

/**
 * OpenCode Runtime Service
 */
export class OpenCodeRuntimeService {
  private config: OpenCodeConfig | null = null;
  private tasks: Map<string, OpenCodeTask> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private initialized = false;

  /**
   * Initialize the service with configuration
   */
  async initialize(): Promise<void> {
    const cfg = loadConfig();
    this.config = cfg.opencode || null;

    if (!this.config?.enabled) {
      console.log("[OpenCode] Service disabled in configuration");
      return;
    }

    // Initialize container orchestrator
    try {
      await containerOrchestrator.initialize();
      console.log(`[OpenCode] Initialized with runtime: ${containerOrchestrator.getRuntimeType()}`);
      this.initialized = true;
    } catch (error) {
      console.error("[OpenCode] Failed to initialize container runtime:", error);
      throw error;
    }
  }

  /**
   * Check if service is initialized and enabled
   */
  isReady(): boolean {
    return this.initialized && this.config?.enabled === true;
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    initialized: boolean;
    runtime: string | null;
    activeTasks: number;
    totalTasks: number;
  } {
    return {
      enabled: this.config?.enabled ?? false,
      initialized: this.initialized,
      runtime: containerOrchestrator.getRuntimeType(),
      activeTasks: this.getActiveTasks().length,
      totalTasks: this.tasks.size,
    };
  }

  /**
   * Create a new development task
   */
  async createTask(description: string, project: string): Promise<OpenCodeTask> {
    if (!this.isReady()) {
      throw new Error(
        "OpenCode service not ready. Check if enabled and container runtime is available.",
      );
    }

    // Validate project
    if (!(await this.isProjectAllowed(project))) {
      throw new Error(`Project "${project}" is not in the allowed projects list`);
    }

    const task: OpenCodeTask = {
      id: uuidv4(),
      description,
      project,
      status: "pending",
      createdAt: new Date(),
    };

    this.tasks.set(task.id, task);
    this.logAudit({
      id: uuidv4(),
      timestamp: new Date(),
      taskId: task.id,
      action: "task-created",
      details: { description, project },
    });

    // Auto-start task if no approval needed
    if (this.config!.security.approvalMode === "auto") {
      await this.startTask(task.id);
    } else {
      task.status = "needs-approval";
      task.requiresApproval = true;
      task.approvalReason = "Task requires user approval based on security policy";

      this.logAudit({
        id: uuidv4(),
        timestamp: new Date(),
        taskId: task.id,
        action: "approval-requested",
        details: { reason: task.approvalReason },
      });
    }

    return task;
  }

  /**
   * Approve and start a pending task
   */
  async approveAndStartTask(taskId: string, userId?: string): Promise<OpenCodeTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== "needs-approval" && task.status !== "pending") {
      throw new Error(`Task cannot be approved. Current status: ${task.status}`);
    }

    this.logAudit({
      id: uuidv4(),
      timestamp: new Date(),
      taskId: task.id,
      action: "approval-granted",
      details: { userId },
      user: userId,
    });

    return this.startTask(taskId);
  }

  /**
   * Start executing a task
   */
  private async startTask(taskId: string): Promise<OpenCodeTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = "running";
    task.startedAt = new Date();

    try {
      // Create container for this task
      const containerId = await this.createTaskContainer(task);
      task.containerId = containerId;

      this.logAudit({
        id: uuidv4(),
        timestamp: new Date(),
        taskId: task.id,
        action: "task-started",
        details: { containerId },
      });

      // Execute OpenCode in container
      const result = await this.executeOpenCode(task);

      task.result = result;
      task.status = result.success ? "completed" : "failed";
      task.completedAt = new Date();

      // Cleanup container
      await this.destroyTaskContainer(task);

      this.logAudit({
        id: uuidv4(),
        timestamp: new Date(),
        taskId: task.id,
        action: result.success ? "task-completed" : "task-failed",
        details: {
          success: result.success,
          executionTime: result.executionTime,
          filesModified: result.filesModified.length,
        },
      });
    } catch (error) {
      task.status = "failed";
      task.completedAt = new Date();
      task.result = {
        success: false,
        output: "",
        filesModified: [],
        commandsExecuted: [],
        executionTime: 0,
        error: error instanceof Error ? error.message : String(error),
      };

      // Cleanup on failure
      if (task.containerId) {
        await this.destroyTaskContainer(task).catch(console.error);
      }

      this.logAudit({
        id: uuidv4(),
        timestamp: new Date(),
        taskId: task.id,
        action: "task-failed",
        details: { error: task.result.error },
      });
    }

    return task;
  }

  /**
   * Create a container for task execution
   */
  private async createTaskContainer(task: OpenCodeTask): Promise<string> {
    const workspacePath = this.resolveProjectPath(task.project);
    const containerId = containerOrchestrator.generateContainerId();

    const containerConfig: ContainerConfig = {
      containerId,
      sessionId: task.id,
      agentId: "opencode",
      runtime: containerOrchestrator.getRuntimeType()!,
      image: this.config!.container.image,
      resources: {
        memory: `${this.config!.container.resources.memory}m`,
        cpus: this.config!.container.resources.cpus,
        timeout: this.config!.container.resources.timeout * 60, // convert to seconds
      },
      mounts: [
        {
          type: "bind",
          source: workspacePath,
          target: "/workspace",
          readOnly: this.config!.container.security.readOnly,
        },
      ],
      env: {
        OPENCODE_PROJECT: task.project,
        OPENCODE_TASK_ID: task.id,
        OPENCODE_WORKSPACE: "/workspace",
      },
      network: this.config!.container.network.enabled ? "bridge" : "none",
      security: {
        readOnlyRootFilesystem: this.config!.container.security.readOnly,
        noNewPrivileges: true,
        dropCapabilities: this.config!.container.security.dropCapabilities ? ["ALL"] : [],
        seccompProfile:
          this.config!.container.security.seccompProfile === "strict" ? "default" : undefined,
      },
    };

    const status = await containerOrchestrator.createContainer(containerConfig);
    return status.containerId;
  }

  /**
   * Destroy task container
   */
  private async destroyTaskContainer(task: OpenCodeTask): Promise<void> {
    if (task.containerId) {
      await containerOrchestrator.destroyContainer(task.containerId, true);
    }
  }

  /**
   * Execute OpenCode in container
   */
  private async executeOpenCode(task: OpenCodeTask): Promise<TaskResult> {
    if (!task.containerId) {
      throw new Error("No container assigned to task");
    }

    const startTime = Date.now();
    const commandsExecuted: string[] = [];
    const filesModified: string[] = [];
    let output = "";

    try {
      // Install OpenCode if not present
      const installResult = await this.executeCommand(task.containerId, [
        "sh",
        "-c",
        "which opencode || (curl -fsSL https://opencode.ai/install | bash)",
      ]);

      if (installResult.exitCode !== 0) {
        throw new Error(`Failed to install OpenCode: ${installResult.stderr}`);
      }

      commandsExecuted.push("Install OpenCode");

      // Execute the task
      const taskResult = await this.executeCommand(
        task.containerId,
        ["opencode", "agent", "--task", task.description, "--workspace", "/workspace"],
        {
          timeout: this.config!.container.resources.timeout * 60,
          workingDir: "/workspace",
        },
      );

      commandsExecuted.push(`opencode agent --task "${task.description}"`);
      output = taskResult.stdout + taskResult.stderr;

      // List modified files
      const gitStatus = await this.executeCommand(task.containerId, [
        "git",
        "status",
        "--porcelain",
      ]);

      if (gitStatus.exitCode === 0 && gitStatus.stdout) {
        const modified = gitStatus.stdout
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => line.substring(3).trim());
        filesModified.push(...modified);
      }

      return {
        success: taskResult.exitCode === 0,
        output,
        filesModified,
        commandsExecuted,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output,
        filesModified,
        commandsExecuted,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute command in container with security checks
   */
  private async executeCommand(
    containerId: string,
    command: string[],
    options?: { timeout?: number; workingDir?: string },
  ): Promise<ContainerExecutionResult> {
    // Security validation
    if (!this.isCommandAllowed(command)) {
      throw new Error(`Command not allowed by security policy: ${command.join(" ")}`);
    }

    return containerOrchestrator.execInContainer(containerId, command, options);
  }

  /**
   * Check if command is allowed
   */
  private isCommandAllowed(command: string[]): boolean {
    if (!this.config) {
      return false;
    }

    const cmdString = command.join(" ");
    const baseCmd = command[0];

    // Check blocklist
    if (this.config.security.commands.blocklist.enabled) {
      for (const blocked of this.config.security.commands.blocklist.commands) {
        if (cmdString.includes(blocked) || baseCmd === blocked) {
          return false;
        }
      }
    }

    // Check allowlist
    if (this.config.security.commands.allowlist.enabled) {
      const allowed = this.config.security.commands.allowlist.commands;
      if (!allowed.includes(baseCmd)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if project is allowed
   */
  private async isProjectAllowed(project: string): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    if (this.config.workspace.allowedProjects.mode === "all") {
      return true;
    }

    return this.config.workspace.allowedProjects.whitelist.includes(project);
  }

  /**
   * Resolve project path
   */
  private resolveProjectPath(project: string): string {
    const basePath = this.config!.workspace.basePath.replace("~", os.homedir());
    return path.resolve(basePath, project);
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): OpenCodeTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): OpenCodeTask[] {
    return Array.from(this.tasks.values()).toSorted(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Get active (running) tasks
   */
  getActiveTasks(): OpenCodeTask[] {
    return this.getAllTasks().filter((t) => t.status === "running");
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<OpenCodeTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === "running" && task.containerId) {
      await this.destroyTaskContainer(task);
    }

    task.status = "cancelled";
    task.completedAt = new Date();

    return task;
  }

  /**
   * Get container logs for a task
   */
  async getTaskLogs(taskId: string, tail: number = 100): Promise<string> {
    const task = this.tasks.get(taskId);
    if (!task?.containerId) {
      return "No container found for this task";
    }

    return containerOrchestrator.getContainerLogs(task.containerId, tail);
  }

  /**
   * Log audit entry
   */
  private logAudit(entry: AuditLogEntry): void {
    if (!this.config?.audit.enabled) {
      return;
    }

    this.auditLog.push(entry);

    // Trim old logs based on retention
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.audit.retentionDays);

    this.auditLog = this.auditLog.filter((e) => e.timestamp > cutoff);
  }

  /**
   * Get audit log
   */
  getAuditLog(limit: number = 100, offset: number = 0): AuditLogEntry[] {
    return this.auditLog
      .toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OpenCodeConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    // Cancel all running tasks
    for (const task of this.getActiveTasks()) {
      await this.cancelTask(task.id).catch(console.error);
    }

    // Cleanup container orchestrator
    await containerOrchestrator.cleanup();

    this.initialized = false;
  }
}

// Singleton instance
export const openCodeRuntime = new OpenCodeRuntimeService();
