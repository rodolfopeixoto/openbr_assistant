import type { GatewayRequestHandlers } from "./types.js";
import { getMemoryManager } from "../../services/memory.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const memoryHandlers: GatewayRequestHandlers = {
  "memory.session.files": async ({ respond }) => {
    try {
      const manager = getMemoryManager();
      const coreFiles = manager.listCoreFiles();
      const sessions = manager.listSessionMemories();

      respond(true, {
        coreFiles: coreFiles.map((f) => ({
          name: f.name,
          size: f.size,
          modifiedAt: f.modifiedAt,
        })),
        sessions: sessions.map((s) => ({
          date: s.date,
          fileName: s.fileName,
          summary: s.summary,
        })),
      });
    } catch (err) {
      console.error("[Memory] Files error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to list memory files",
        ),
      );
    }
  },

  "memory.session.file.get": async ({ params, respond }) => {
    try {
      const manager = getMemoryManager();
      const { name, date } = params as { name?: string; date?: string };

      if (name) {
        const file = manager.getCoreFile(name);
        if (file) {
          respond(true, file);
        } else {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, `File '${name}' not found`),
          );
        }
      } else if (date) {
        const session = manager.getSessionMemory(date);
        if (session) {
          respond(true, session);
        } else {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, `Session '${date}' not found`),
          );
        }
      } else {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "Must specify 'name' or 'date'"),
        );
      }
    } catch (err) {
      console.error("[Memory] File get error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get memory file",
        ),
      );
    }
  },

  "memory.session.file.save": async ({ params, respond }) => {
    try {
      const manager = getMemoryManager();
      const { name, content, date, session } = params as {
        name?: string;
        content?: string;
        date?: string;
        session?: Record<string, unknown>;
      };

      if (name && content !== undefined) {
        const success = manager.saveCoreFile(name, content);
        if (success) {
          respond(true, { ok: true, name });
        } else {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, `Failed to save '${name}'`),
          );
        }
      } else if (date && session) {
        const success = manager.saveSessionMemory(date, session);
        if (success) {
          respond(true, { ok: true, date });
        } else {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, `Failed to save session '${date}'`),
          );
        }
      } else {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            "Must specify 'name' + 'content' or 'date' + 'session'",
          ),
        );
      }
    } catch (err) {
      console.error("[Memory] File save error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to save memory file",
        ),
      );
    }
  },

  "memory.session.summary.generate": async ({ params, respond }) => {
    try {
      const manager = getMemoryManager();
      const { content } = params as { content: string };

      const summary = manager.generateSummary(content);
      respond(true, summary);
    } catch (err) {
      console.error("[Memory] Summary generate error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to generate summary",
        ),
      );
    }
  },

  "memory.session.summary.save": async ({ params, respond }) => {
    try {
      const manager = getMemoryManager();
      const { date, summary } = params as { date: string; summary: Record<string, unknown> };

      const success = manager.saveSessionMemory(date, summary);
      if (success) {
        respond(true, { ok: true, date });
      } else {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Failed to save summary for '${date}'`),
        );
      }
    } catch (err) {
      console.error("[Memory] Summary save error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to save summary",
        ),
      );
    }
  },

  "memory.session.search": async ({ params, respond }) => {
    try {
      const manager = getMemoryManager();
      const { query } = params as { query: string };

      const results = manager.searchMemories(query);
      respond(true, { results });
    } catch (err) {
      console.error("[Memory] Search error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to search memories",
        ),
      );
    }
  },

  "memory.session.config.get": async ({ respond }) => {
    try {
      const manager = getMemoryManager();
      const config = manager.getConfig();
      respond(true, config);
    } catch (err) {
      console.error("[Memory] Config get error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to get memory config",
        ),
      );
    }
  },

  "memory.session.config.set": async ({ params, respond }) => {
    try {
      const manager = getMemoryManager();
      const { autoLoad, autoSummarize, summaryTemplate, retentionDays } = params as {
        autoLoad?: { soul?: boolean; user?: boolean; identity?: boolean; recentDays?: number };
        autoSummarize?: boolean;
        summaryTemplate?: string[];
        retentionDays?: number;
      };

      const config: Partial<import("../../services/memory.js").MemoryConfig> = {};
      if (autoLoad) {
        config.autoLoad = autoLoad as {
          soul: boolean;
          user: boolean;
          identity: boolean;
          recentDays: number;
        };
      }
      if (autoSummarize !== undefined) {
        config.autoSummarize = autoSummarize;
      }
      if (summaryTemplate) {
        config.summaryTemplate = summaryTemplate;
      }
      if (retentionDays !== undefined) {
        config.retentionDays = retentionDays;
      }
      manager.setConfig(config);

      respond(true, { ok: true, config: manager.getConfig() });
    } catch (err) {
      console.error("[Memory] Config set error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to set memory config",
        ),
      );
    }
  },

  "memory.session.delete": async ({ params, respond }) => {
    try {
      const manager = getMemoryManager();
      const { date } = params as { date: string };

      const success = manager.deleteSessionMemory(date);
      if (success) {
        respond(true, { ok: true, date });
      } else {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Session '${date}' not found`),
        );
      }
    } catch (err) {
      console.error("[Memory] Delete error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to delete session memory",
        ),
      );
    }
  },

  "memory.session.cleanup": async ({ respond }) => {
    try {
      const manager = getMemoryManager();
      const deleted = manager.cleanupOldMemories();
      respond(true, { ok: true, deleted });
    } catch (err) {
      console.error("[Memory] Cleanup error:", err);
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          err instanceof Error ? err.message : "Failed to cleanup old memories",
        ),
      );
    }
  },
};
