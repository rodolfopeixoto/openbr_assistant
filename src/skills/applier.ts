/**
 * Skill Applier
 *
 * Applies Skill Actions to target projects/directories.
 * Supports preview mode, dry run, and validation.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  SkillManifest,
  ApplyOptions,
  ApplyResult,
  FileChange,
  ApplyError,
  ValidationResult,
  ValidationError,
  SkillAction,
} from "./types.js";
import { skillRegistry } from "./registry.js";

export class SkillApplier {
  /**
   * Apply a skill to a target path
   */
  async apply(
    skillId: string,
    targetPath: string,
    options: ApplyOptions = {},
  ): Promise<ApplyResult> {
    const { dryRun = false, backup = true, config = {} } = options;

    const skill = skillRegistry.get(skillId);
    if (!skill) {
      return {
        success: false,
        changes: [],
        errors: [
          { path: targetPath, message: `Skill ${skillId} not found`, code: "SKILL_NOT_FOUND" },
        ],
        warnings: [],
      };
    }

    // Validate before applying
    const validation = await this.validate(skillId, targetPath);
    if (!validation.valid) {
      return {
        success: false,
        changes: [],
        errors: validation.errors.map((e) => ({
          path: targetPath,
          message: e.message,
          code: e.code,
        })),
        warnings: validation.warnings,
      };
    }

    const result: ApplyResult = {
      success: true,
      changes: [],
      errors: [],
      warnings: [],
    };

    // Create backup if requested
    if (backup && !dryRun) {
      await this.createBackup(targetPath);
    }

    // Apply each action
    if (skill.actions) {
      for (const action of skill.actions) {
        try {
          const actionResult = await this.applyAction(action, targetPath, dryRun, config);
          result.changes.push(...actionResult.changes);
          result.errors.push(...actionResult.errors);
          result.warnings.push(...actionResult.warnings);
        } catch (error) {
          result.errors.push({
            path: targetPath,
            message: error instanceof Error ? error.message : String(error),
            code: "ACTION_FAILED",
          });
        }
      }
    }

    // Apply knowledge files for Skill Pack
    if (skill.type === "pack" && skill.knowledge) {
      for (const knowledge of skill.knowledge) {
        if (knowledge.filePath) {
          const change = await this.applyKnowledgeFile(knowledge, targetPath, dryRun);
          if (change) {
            result.changes.push(change);
          }
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Preview what changes would be made (dry run)
   */
  async preview(skillId: string, targetPath: string): Promise<ApplyResult> {
    return this.apply(skillId, targetPath, { dryRun: true });
  }

  /**
   * Validate if a skill can be applied to a target
   */
  async validate(skillId: string, targetPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if skill exists
    const skill = skillRegistry.get(skillId);
    if (!skill) {
      errors.push({
        field: "skillId",
        message: `Skill ${skillId} not found`,
        code: "SKILL_NOT_FOUND",
      });
      return { valid: false, errors, warnings };
    }

    // Check if target path exists
    try {
      const stats = await fs.stat(targetPath);
      if (!stats.isDirectory()) {
        errors.push({
          field: "targetPath",
          message: "Target must be a directory",
          code: "NOT_A_DIRECTORY",
        });
      }
    } catch {
      errors.push({
        field: "targetPath",
        message: `Target path does not exist: ${targetPath}`,
        code: "PATH_NOT_FOUND",
      });
    }

    // Check version compatibility
    if (skill.minOpenClawVersion) {
      const currentVersion = this.getCurrentVersion();
      if (this.compareVersions(currentVersion, skill.minOpenClawVersion) < 0) {
        warnings.push(
          `OpenClaw version ${currentVersion} is below minimum required ${skill.minOpenClawVersion}`,
        );
      }
    }

    // Validate actions
    if (skill.actions) {
      for (const action of skill.actions) {
        const actionValidation = await this.validateAction(action, targetPath);
        errors.push(...actionValidation.errors);
        warnings.push(...actionValidation.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Private methods

  private async applyAction(
    action: SkillAction,
    targetPath: string,
    dryRun: boolean,
    config: Record<string, unknown>,
  ): Promise<ApplyResult> {
    const result: ApplyResult = {
      success: true,
      changes: [],
      errors: [],
      warnings: [],
    };

    const { handler } = action;

    switch (handler.type) {
      case "typescript":
      case "javascript":
        // Execute TypeScript/JavaScript handler
        await this.executeScriptHandler(handler, targetPath, dryRun, config, result);
        break;

      case "shell":
        // Execute shell script
        await this.executeShellHandler(handler, targetPath, dryRun, config, result);
        break;

      case "python":
        // Execute Python script
        await this.executePythonHandler(handler, targetPath, dryRun, config, result);
        break;

      default:
        result.warnings.push(`Unknown handler type: ${handler.type}`);
    }

    return result;
  }

  private async executeScriptHandler(
    handler: { type: string; script: string; entryPoint?: string; workingDir?: string },
    targetPath: string,
    dryRun: boolean,
    config: Record<string, unknown>,
    result: ApplyResult,
  ): Promise<void> {
    // This is a placeholder - in real implementation:
    // 1. Load the script module
    // 2. Call the entry point function with context
    // 3. Collect file changes

    if (dryRun) {
      result.warnings.push(`[DRY RUN] Would execute ${handler.type} script`);
    } else {
      try {
        // Dynamic import and execution
        // const module = await import(handler.script);
        // const fn = module[handler.entryPoint || 'default'];
        // await fn({ targetPath, config });
        result.warnings.push(`Script execution not yet implemented for ${handler.type}`);
      } catch (error) {
        result.errors.push({
          path: targetPath,
          message: error instanceof Error ? error.message : String(error),
          code: "SCRIPT_EXECUTION_FAILED",
        });
      }
    }
  }

  private async executeShellHandler(
    handler: { script: string; workingDir?: string },
    targetPath: string,
    dryRun: boolean,
    config: Record<string, unknown>,
    result: ApplyResult,
  ): Promise<void> {
    if (dryRun) {
      result.warnings.push(`[DRY RUN] Would execute shell script`);
      return;
    }

    try {
      // Execute shell script
      const { execa } = await import("execa");
      await execa("sh", ["-c", handler.script], {
        cwd: handler.workingDir || targetPath,
      });
    } catch (error) {
      result.errors.push({
        path: targetPath,
        message: error instanceof Error ? error.message : String(error),
        code: "SHELL_EXECUTION_FAILED",
      });
    }
  }

  private async executePythonHandler(
    handler: { script: string; workingDir?: string },
    targetPath: string,
    dryRun: boolean,
    config: Record<string, unknown>,
    result: ApplyResult,
  ): Promise<void> {
    if (dryRun) {
      result.warnings.push(`[DRY RUN] Would execute Python script`);
      return;
    }

    try {
      // Execute Python script
      const { execa } = await import("execa");
      await execa("python3", [handler.script], {
        cwd: handler.workingDir || targetPath,
      });
    } catch (error) {
      result.errors.push({
        path: targetPath,
        message: error instanceof Error ? error.message : String(error),
        code: "PYTHON_EXECUTION_FAILED",
      });
    }
  }

  private async applyKnowledgeFile(
    knowledge: { filePath?: string; content: string },
    targetPath: string,
    dryRun: boolean,
  ): Promise<FileChange | null> {
    if (!knowledge.filePath) return null;

    const targetFile = path.join(targetPath, knowledge.filePath);
    const exists = await this.fileExists(targetFile);

    if (dryRun) {
      return {
        path: targetFile,
        operation: exists ? "modify" : "create",
        newContent: knowledge.content,
      };
    }

    // Write file
    const dir = path.dirname(targetFile);
    await fs.mkdir(dir, { recursive: true });

    let originalContent: string | undefined;
    if (exists) {
      originalContent = await fs.readFile(targetFile, "utf-8");
    }

    await fs.writeFile(targetFile, knowledge.content, "utf-8");

    return {
      path: targetFile,
      operation: exists ? "modify" : "create",
      originalContent,
      newContent: knowledge.content,
    };
  }

  private async validateAction(
    action: SkillAction,
    targetPath: string,
  ): Promise<{ errors: ValidationError[]; warnings: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate handler type
    const validTypes = ["typescript", "javascript", "shell", "python"];
    if (!validTypes.includes(action.handler.type)) {
      errors.push({
        field: `action.${action.id}.handler.type`,
        message: `Invalid handler type: ${action.handler.type}`,
        code: "INVALID_HANDLER_TYPE",
      });
    }

    // Validate trigger
    const validTriggers = ["command", "event", "file-change", "schedule", "manual"];
    if (!validTriggers.includes(action.trigger.type)) {
      errors.push({
        field: `action.${action.id}.trigger.type`,
        message: `Invalid trigger type: ${action.trigger.type}`,
        code: "INVALID_TRIGGER_TYPE",
      });
    }

    return { errors, warnings };
  }

  private async createBackup(targetPath: string): Promise<string> {
    const backupDir = `${targetPath}.backup-${Date.now()}`;
    // In real implementation, use a proper backup mechanism
    // For now, just log it
    console.log(`[BACKUP] Would create backup at: ${backupDir}`);
    return backupDir;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getCurrentVersion(): string {
    // In real implementation, get from package.json or config
    return "2.0.0";
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }
}

// Singleton instance
export const skillApplier = new SkillApplier();
