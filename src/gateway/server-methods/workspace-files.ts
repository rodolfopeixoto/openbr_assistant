import fs from "node:fs/promises";
import path from "node:path";
import type { GatewayRequestHandler, GatewayRequestHandlers } from "./types.js";
import { resolveWorkspaceTemplateDir } from "../../agents/workspace-templates.js";
import { getFileTip, validateFileContent } from "../../agents/workspace-tips.js";
import {
  resolveDefaultAgentWorkspaceDir,
  DEFAULT_AGENTS_FILENAME,
  DEFAULT_SOUL_FILENAME,
  DEFAULT_TOOLS_FILENAME,
  DEFAULT_IDENTITY_FILENAME,
  DEFAULT_USER_FILENAME,
  DEFAULT_HEARTBEAT_FILENAME,
  DEFAULT_BOOTSTRAP_FILENAME,
  DEFAULT_MEMORY_FILENAME,
  type WorkspaceBootstrapFileName,
} from "../../agents/workspace.js";

const WORKSPACE_FILES: WorkspaceBootstrapFileName[] = [
  DEFAULT_AGENTS_FILENAME,
  DEFAULT_SOUL_FILENAME,
  DEFAULT_TOOLS_FILENAME,
  DEFAULT_IDENTITY_FILENAME,
  DEFAULT_USER_FILENAME,
  DEFAULT_HEARTBEAT_FILENAME,
  DEFAULT_BOOTSTRAP_FILENAME,
  DEFAULT_MEMORY_FILENAME,
];

function getDraftPath(workspaceDir: string, filename: string): string {
  return path.join(workspaceDir, ".drafts", `${filename}.draft`);
}

function getBackupPath(workspaceDir: string, filename: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(workspaceDir, ".backups", `${filename}.${timestamp}.bak`);
}

async function ensureDraftsDir(workspaceDir: string): Promise<void> {
  const draftsDir = path.join(workspaceDir, ".drafts");
  await fs.mkdir(draftsDir, { recursive: true });
}

async function ensureBackupsDir(workspaceDir: string): Promise<void> {
  const backupsDir = path.join(workspaceDir, ".backups");
  await fs.mkdir(backupsDir, { recursive: true });
}

async function loadTemplateContent(filename: string): Promise<string | null> {
  try {
    const templateDir = await resolveWorkspaceTemplateDir();
    const templatePath = path.join(templateDir, filename);
    return await fs.readFile(templatePath, "utf-8");
  } catch {
    return null;
  }
}

export const workspaceListFiles: GatewayRequestHandler = async ({ params, respond, context }) => {
  try {
    const workspaceDir = (params.workspaceDir as string) || resolveDefaultAgentWorkspaceDir();
    const files: Array<{
      filename: string;
      displayName: string;
      description: string;
      lastModified: number;
      hasDraft: boolean;
    }> = [];

    for (const filename of WORKSPACE_FILES) {
      const filePath = path.join(workspaceDir, filename);
      const draftPath = getDraftPath(workspaceDir, filename);
      const tip = getFileTip(filename);

      let lastModified = 0;
      try {
        const stats = await fs.stat(filePath);
        lastModified = stats.mtimeMs;
      } catch {
        // File doesn't exist
      }

      let hasDraft = false;
      try {
        await fs.access(draftPath);
        hasDraft = true;
      } catch {
        // No draft
      }

      files.push({
        filename,
        displayName: tip?.title || filename,
        description: tip?.description || "",
        lastModified,
        hasDraft,
      });
    }

    respond(true, { files });
  } catch (err) {
    context.logGateway.error(`Failed to list workspace files: ${String(err)}`);
    respond(false, undefined, { code: "WORKSPACE_LIST_ERROR", message: String(err) });
  }
};

export const workspaceReadFile: GatewayRequestHandler = async ({ params, respond, context }) => {
  try {
    const filename = params.filename as string;
    const preferDraft = (params.preferDraft as boolean) || false;
    const workspaceDir = (params.workspaceDir as string) || resolveDefaultAgentWorkspaceDir();

    if (!WORKSPACE_FILES.includes(filename as WorkspaceBootstrapFileName)) {
      respond(false, undefined, {
        code: "INVALID_FILENAME",
        message: `Invalid filename: ${filename}`,
      });
      return;
    }

    const filePath = path.join(workspaceDir, filename);
    const draftPath = getDraftPath(workspaceDir, filename);

    // Try to read draft first if requested
    if (preferDraft) {
      try {
        const draftContent = await fs.readFile(draftPath, "utf-8");
        respond(true, { content: draftContent, isDraft: true });
        return;
      } catch {
        // Draft doesn't exist, fall through to main file
      }
    }

    // Read main file
    let content: string;
    let isDraft = false;
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch {
      // File doesn't exist, return empty
      content = "";
    }

    // Check if draft exists
    try {
      await fs.access(draftPath);
      isDraft = true;
    } catch {
      // No draft
    }

    // Load template
    const template = await loadTemplateContent(filename);

    respond(true, { content, isDraft, template });
  } catch (err) {
    context.logGateway.error(`Failed to read workspace file: ${String(err)}`);
    respond(false, undefined, { code: "WORKSPACE_READ_ERROR", message: String(err) });
  }
};

export const workspaceWriteFile: GatewayRequestHandler = async ({ params, respond, context }) => {
  try {
    const filename = params.filename as string;
    const content = params.content as string;
    const skipBackup = (params.skipBackup as boolean) || false;
    const validate = (params.validate as boolean) !== false;
    const workspaceDir = (params.workspaceDir as string) || resolveDefaultAgentWorkspaceDir();

    if (!WORKSPACE_FILES.includes(filename as WorkspaceBootstrapFileName)) {
      respond(false, undefined, {
        code: "INVALID_FILENAME",
        message: `Invalid filename: ${filename}`,
      });
      return;
    }

    // Validate content
    if (validate) {
      const validation = validateFileContent(filename, content);
      if (!validation.valid) {
        respond(false, undefined, {
          code: "VALIDATION_ERROR",
          message: `Validation failed: ${validation.errors.join(", ")}`,
          details: { errors: validation.errors },
        });
        return;
      }
    }

    const filePath = path.join(workspaceDir, filename);
    const draftPath = getDraftPath(workspaceDir, filename);

    // Create backup if file exists and backup not skipped
    let backupPath: string | undefined;
    if (!skipBackup) {
      try {
        await fs.access(filePath);
        await ensureBackupsDir(workspaceDir);
        backupPath = getBackupPath(workspaceDir, filename);
        await fs.copyFile(filePath, backupPath);
      } catch {
        // File doesn't exist or backup failed
      }
    }

    // Write file
    await fs.writeFile(filePath, content, "utf-8");

    // Remove draft if exists
    try {
      await fs.unlink(draftPath);
    } catch {
      // Draft doesn't exist
    }

    respond(true, { success: true, backupPath });
  } catch (err) {
    context.logGateway.error(`Failed to write workspace file: ${String(err)}`);
    respond(false, undefined, { code: "WORKSPACE_WRITE_ERROR", message: String(err) });
  }
};

export const workspaceSaveDraft: GatewayRequestHandler = async ({ params, respond, context }) => {
  try {
    const filename = params.filename as string;
    const content = params.content as string;
    const workspaceDir = (params.workspaceDir as string) || resolveDefaultAgentWorkspaceDir();

    if (!WORKSPACE_FILES.includes(filename as WorkspaceBootstrapFileName)) {
      respond(false, undefined, {
        code: "INVALID_FILENAME",
        message: `Invalid filename: ${filename}`,
      });
      return;
    }

    await ensureDraftsDir(workspaceDir);
    const draftPath = getDraftPath(workspaceDir, filename);
    await fs.writeFile(draftPath, content, "utf-8");

    respond(true, { success: true });
  } catch (err) {
    context.logGateway.error(`Failed to save draft: ${String(err)}`);
    respond(false, undefined, { code: "WORKSPACE_DRAFT_ERROR", message: String(err) });
  }
};

export const workspaceDiscardDraft: GatewayRequestHandler = async ({
  params,
  respond,
  context,
}) => {
  try {
    const filename = params.filename as string;
    const workspaceDir = (params.workspaceDir as string) || resolveDefaultAgentWorkspaceDir();

    if (!WORKSPACE_FILES.includes(filename as WorkspaceBootstrapFileName)) {
      respond(false, undefined, {
        code: "INVALID_FILENAME",
        message: `Invalid filename: ${filename}`,
      });
      return;
    }

    const draftPath = getDraftPath(workspaceDir, filename);
    try {
      await fs.unlink(draftPath);
    } catch {
      // Draft doesn't exist
    }

    respond(true, { success: true });
  } catch (err) {
    context.logGateway.error(`Failed to discard draft: ${String(err)}`);
    respond(false, undefined, { code: "WORKSPACE_DRAFT_ERROR", message: String(err) });
  }
};

export const workspaceGetTips: GatewayRequestHandler = async ({ params, respond }) => {
  try {
    const filename = params.filename as string;
    const tip = getFileTip(filename);

    if (!tip) {
      respond(false, undefined, {
        code: "TIPS_NOT_FOUND",
        message: `No tips available for: ${filename}`,
      });
      return;
    }

    respond(true, {
      title: tip.title,
      description: tip.description,
      guidelines: tip.guidelines,
      examples: tip.examples,
    });
  } catch (err) {
    respond(false, undefined, { code: "TIPS_ERROR", message: String(err) });
  }
};

export const workspaceImproveContent: GatewayRequestHandler = async ({
  params,
  respond,
  context,
}) => {
  try {
    const filename = params.filename as string;
    const content = params.content as string;
    const instruction = (params.instruction as string) || "";

    // TODO: Integrate with LLM provider
    // For now, return a placeholder response
    context.logGateway.info(`Improve content requested for ${filename}`);

    const tip = getFileTip(filename);
    const fileType = tip?.title || filename;

    // Placeholder - in production this would call the LLM
    respond(true, {
      improved: content,
      changes: [
        "Funcionalidade LLM será integrada em breve",
        `Arquivo: ${fileType}`,
        instruction ? `Instrução: ${instruction}` : "Melhorias gerais aplicadas",
      ],
    });
  } catch (err) {
    context.logGateway.error(`Failed to improve content: ${String(err)}`);
    respond(false, undefined, { code: "IMPROVE_ERROR", message: String(err) });
  }
};

export const workspaceResetToTemplate: GatewayRequestHandler = async ({
  params,
  respond,
  context,
}) => {
  try {
    const filename = params.filename as string;
    const workspaceDir = (params.workspaceDir as string) || resolveDefaultAgentWorkspaceDir();

    if (!WORKSPACE_FILES.includes(filename as WorkspaceBootstrapFileName)) {
      respond(false, undefined, {
        code: "INVALID_FILENAME",
        message: `Invalid filename: ${filename}`,
      });
      return;
    }

    const template = await loadTemplateContent(filename);
    if (!template) {
      respond(false, undefined, {
        code: "TEMPLATE_NOT_FOUND",
        message: `Template not found for: ${filename}`,
      });
      return;
    }

    // Create backup of current content
    const filePath = path.join(workspaceDir, filename);
    try {
      await fs.access(filePath);
      await ensureBackupsDir(workspaceDir);
      const backupPath = getBackupPath(workspaceDir, filename);
      await fs.copyFile(filePath, backupPath);
    } catch {
      // File doesn't exist
    }

    respond(true, { template });
  } catch (err) {
    context.logGateway.error(`Failed to reset to template: ${String(err)}`);
    respond(false, undefined, { code: "RESET_ERROR", message: String(err) });
  }
};

export const workspaceHandlers: GatewayRequestHandlers = {
  "workspace.listFiles": workspaceListFiles,
  "workspace.readFile": workspaceReadFile,
  "workspace.writeFile": workspaceWriteFile,
  "workspace.saveDraft": workspaceSaveDraft,
  "workspace.discardDraft": workspaceDiscardDraft,
  "workspace.getTips": workspaceGetTips,
  "workspace.improveContent": workspaceImproveContent,
  "workspace.resetToTemplate": workspaceResetToTemplate,
};
