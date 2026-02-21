/**
 * Skills Types
 *
 * Defines the types for OpenClaw Skills System.
 * Supports both "Skill Pack" (knowledge sharing) and "Skill Action" (automation).
 */

export type SkillType = "pack" | "action";

export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  type: SkillType;
  author: string;
  license: string;
  tags: string[];
  keywords: string[];

  // For Skill Pack
  knowledge?: SkillKnowledge[];

  // For Skill Action
  actions?: SkillAction[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  minOpenClawVersion?: string;
  maxOpenClawVersion?: string;
}

export interface SkillKnowledge {
  id: string;
  title: string;
  content: string;
  language: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
}

export interface SkillAction {
  id: string;
  name: string;
  description: string;
  trigger: ActionTrigger;
  handler: ActionHandler;
  inputs: ActionInput[];
  outputs: ActionOutput[];
}

export type ActionTriggerType = "command" | "event" | "file-change" | "schedule" | "manual";

export interface ActionTrigger {
  type: ActionTriggerType;
  pattern?: string; // For command triggers
  event?: string; // For event triggers
  cron?: string; // For schedule triggers
  filePattern?: string; // For file-change triggers
}

export interface ActionHandler {
  type: "typescript" | "javascript" | "shell" | "python";
  script: string;
  entryPoint?: string;
  workingDir?: string;
}

export interface ActionInput {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ActionOutput {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
}

export interface SkillInstallation {
  skillId: string;
  version: string;
  installedAt: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface SkillRegistry {
  skills: Map<string, SkillManifest>;
  installations: Map<string, SkillInstallation>;

  // Methods
  register(skill: SkillManifest): void;
  unregister(skillId: string): void;
  get(skillId: string): SkillManifest | undefined;
  list(): SkillManifest[];
  listByType(type: SkillType): SkillManifest[];
  listByTag(tag: string): SkillManifest[];
  search(query: string): SkillManifest[];

  // Installation
  install(skillId: string, config?: Record<string, unknown>): Promise<SkillInstallation>;
  uninstall(skillId: string): Promise<void>;
  enable(skillId: string): void;
  disable(skillId: string): void;
  isEnabled(skillId: string): boolean;

  // Actions
  executeAction(
    skillId: string,
    actionId: string,
    inputs: Record<string, unknown>,
  ): Promise<unknown>;
  getApplicableActions(context: ActionContext): SkillAction[];

  // Knowledge
  queryKnowledge(query: string, skillId?: string): SkillKnowledge[];
}

export interface ActionContext {
  sessionId: string;
  agentId: string;
  currentFile?: string;
  currentDir?: string;
  eventType?: string;
  eventData?: Record<string, unknown>;
}

export interface SkillApplier {
  apply(skillId: string, targetPath: string, options?: ApplyOptions): Promise<ApplyResult>;
  preview(skillId: string, targetPath: string): Promise<ApplyResult>;
  validate(skillId: string, targetPath: string): ValidationResult;
}

export interface ApplyOptions {
  dryRun?: boolean;
  force?: boolean;
  backup?: boolean;
  config?: Record<string, unknown>;
}

export interface ApplyResult {
  success: boolean;
  changes: FileChange[];
  errors: ApplyError[];
  warnings: string[];
}

export interface FileChange {
  path: string;
  operation: "create" | "modify" | "delete";
  originalContent?: string;
  newContent?: string;
}

export interface ApplyError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
