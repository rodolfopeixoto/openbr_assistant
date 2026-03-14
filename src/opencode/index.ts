/**
 * OpenCode Integration Module
 *
 * Provides secure AI-powered code development through OpenCode assistant
 * running in isolated containers.
 */

export {
  OpenCodeRuntimeService,
  openCodeRuntime,
  type OpenCodeTask,
  type TaskResult,
  type TaskStatus,
  type ExecutionContext,
  type AuditLogEntry,
  type SecurityPolicy,
} from "./runtime.js";
