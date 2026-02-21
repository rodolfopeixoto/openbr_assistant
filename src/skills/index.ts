/**
 * OpenClaw Skills System
 *
 * Supports both "Skill Pack" (knowledge sharing) and "Skill Action" (automation).
 */

// Types
export type {
  SkillManifest,
  SkillType,
  SkillKnowledge,
  SkillAction,
  ActionTrigger,
  ActionTriggerType,
  ActionHandler,
  ActionInput,
  ActionOutput,
  SkillInstallation,
  ActionContext,
  ApplyOptions,
  ApplyResult,
  FileChange,
  ApplyError,
  ValidationResult,
  ValidationError,
} from "./types.js";

// Registry
export { SkillRegistryImpl, skillRegistry } from "./registry.js";

// Applier
export { SkillApplier, skillApplier } from "./applier.js";
