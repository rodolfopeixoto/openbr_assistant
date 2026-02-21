/**
 * OpenClaw Container Security Module
 *
 * Provides secure containerized execution for agent tools:
 * - Runtime detection (Docker, Apple Container, Podman)
 * - Container orchestration and lifecycle management
 * - Secure execution with command validation
 * - Blocked commands for security
 * - Audit logging
 */

// Runtime detection
export {
  RuntimeDetector,
  runtimeDetector,
  type ContainerRuntime,
  type RuntimeInfo,
} from "./runtime-detector.js";

// Container orchestration
export { ContainerOrchestrator, containerOrchestrator } from "./orchestrator.js";

// Docker runtime
export { DockerRuntime } from "./docker-runtime.js";

// Secure executor
export {
  SecureExecutor,
  secureExecutor,
  type ExecutionRequest,
  type ExecutionPermissions,
  type ExecutionResult,
} from "./secure-executor.js";

// Types
export type {
  ContainerMount,
  ContainerSecurityConfig,
  ContainerResources,
  ContainerConfig,
  ContainerState,
  ContainerStatus,
  ContainerExecutionResult,
  RuntimeType,
} from "./types.js";
