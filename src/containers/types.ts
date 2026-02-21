/**
 * Container types and interfaces
 */

import type { ContainerRuntime as RuntimeType } from "./runtime-detector.js";

export type { RuntimeType };

export interface ContainerMount {
  type: "bind" | "volume" | "tmpfs";
  source: string;
  target: string;
  readOnly: boolean;
}

export interface ContainerSecurityConfig {
  readOnlyRootFilesystem: boolean;
  noNewPrivileges: boolean;
  dropCapabilities: string[];
  seccompProfile?: string;
  appArmorProfile?: string;
}

export interface ContainerResources {
  memory: string; // '512m', '1g'
  cpus: number; // 0.5, 1.0, 2.0
  timeout: number; // seconds
}

export interface ContainerConfig {
  containerId: string;
  sessionId: string;
  agentId: string;

  runtime: RuntimeType;
  image: string;

  resources: ContainerResources;

  mounts: ContainerMount[];
  env: Record<string, string>;
  network: "none" | "bridge" | "host";

  security: ContainerSecurityConfig;

  // Optional: Command to run instead of image default
  command?: string[];
}

export type ContainerState = "pending" | "running" | "stopped" | "error";

export interface ContainerStatus {
  containerId: string;
  state: ContainerState;
  startedAt?: Date;
  finishedAt?: Date;
  exitCode?: number;
  error?: string;
}

export interface ContainerExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number; // milliseconds
}

export interface ContainerRuntime {
  readonly type: RuntimeType;

  createContainer(config: ContainerConfig): Promise<ContainerStatus>;
  startContainer(containerId: string): Promise<void>;
  stopContainer(containerId: string, timeout?: number): Promise<void>;
  removeContainer(containerId: string, force?: boolean): Promise<void>;

  execInContainer(
    containerId: string,
    command: string[],
    options?: { timeout?: number; workingDir?: string },
  ): Promise<ContainerExecutionResult>;

  getContainerStatus(containerId: string): Promise<ContainerStatus>;
  getContainerLogs(containerId: string, tail?: number): Promise<string>;

  listContainers(labels?: Record<string, string>): Promise<ContainerStatus[]>;
}

export interface ExecutionRequest {
  tool: string;
  args: Record<string, unknown>;
  sessionId: string;
  agentId: string;
  permissions: ExecutionPermissions;
}

export interface ExecutionPermissions {
  allowTools: string[];
  denyTools: string[];
  allowedPaths: string[];
  blockedPaths: string[];
  networkAccess: boolean;
  maxExecutionTime: number;
  maxMemory: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number; // milliseconds
}
