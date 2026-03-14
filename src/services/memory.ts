/**
 * Memory Manager Service
 * Manages session memory files: SOUL.md, USER.md, IDENTITY.md, and memory/*.md
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("memory");

export interface MemoryFile {
  name: string;
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
}

export interface MemorySession {
  date: string;
  fileName: string;
  summary: string;
  workedOn?: string;
  decisions?: string;
  leads?: string;
  blockers?: string;
  nextSteps?: string;
}

export interface MemoryConfig {
  autoLoad: {
    soul: boolean;
    user: boolean;
    identity: boolean;
    recentDays: number;
  };
  autoSummarize: boolean;
  summaryTemplate: string[];
  retentionDays: number;
}

export interface MemorySearchResult {
  file: string;
  snippet: string;
  relevance: number;
}

const DEFAULT_CONFIG: MemoryConfig = {
  autoLoad: {
    soul: true,
    user: true,
    identity: true,
    recentDays: 7,
  },
  autoSummarize: true,
  summaryTemplate: ["workedOn", "decisions", "leads", "blockers", "nextSteps"],
  retentionDays: 90,
};

const CORE_FILES = ["SOUL.md", "USER.md", "IDENTITY.md", "MEMORY.md"];

export class MemoryManager {
  private basePath: string;
  private config: MemoryConfig = { ...DEFAULT_CONFIG };

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const stored = process.env.MEMORY_CONFIG;
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      log.warn("Failed to load memory config, using defaults");
    }
  }

  private saveConfig(): void {
    try {
      process.env.MEMORY_CONFIG = JSON.stringify(this.config);
    } catch {
      log.warn("Failed to save memory config");
    }
  }

  /**
   * List all core memory files
   */
  listCoreFiles(): MemoryFile[] {
    const files: MemoryFile[] = [];

    for (const fileName of CORE_FILES) {
      const filePath = path.join(this.basePath, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, "utf-8");
          files.push({
            name: fileName,
            path: filePath,
            content,
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
          });
        } catch (err) {
          log.warn("Failed to read ${fileName}:", { error: String(err) });
        }
      }
    }

    return files;
  }

  /**
   * Get a specific core file
   */
  getCoreFile(fileName: string): MemoryFile | null {
    if (!CORE_FILES.includes(fileName)) {
      return null;
    }

    const filePath = path.join(this.basePath, fileName);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      return {
        name: fileName,
        path: filePath,
        content,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };
    } catch (err) {
      log.error("Failed to read ${fileName}:", { error: String(err) });
      return null;
    }
  }

  /**
   * Save a core file
   */
  saveCoreFile(fileName: string, content: string): boolean {
    if (!CORE_FILES.includes(fileName)) {
      return false;
    }

    const filePath = path.join(this.basePath, fileName);

    try {
      fs.writeFileSync(filePath, content, "utf-8");
      log.info(`Saved ${fileName}`);
      return true;
    } catch (err) {
      log.error("Failed to save ${fileName}:", { error: String(err) });
      return false;
    }
  }

  /**
   * List all session memory files (memory/*.md)
   */
  listSessionMemories(): MemorySession[] {
    const memoryDir = path.join(this.basePath, "memory");
    const sessions: MemorySession[] = [];

    if (!fs.existsSync(memoryDir)) {
      return sessions;
    }

    try {
      const files = fs.readdirSync(memoryDir);
      for (const file of files) {
        if (file.endsWith(".md")) {
          const filePath = path.join(memoryDir, file);
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            const date = file.replace(".md", "");
            sessions.push(this.parseSessionMemory(date, content));
          } catch (err) {
            log.warn("Failed to read session memory ${file}:", { error: String(err) });
          }
        }
      }
    } catch (err) {
      log.warn("Failed to list session memories:", { error: String(err) });
    }

    return sessions.toSorted((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get a specific session memory
   */
  getSessionMemory(date: string): MemorySession | null {
    const memoryDir = path.join(this.basePath, "memory");
    const filePath = path.join(memoryDir, `${date}.md`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return this.parseSessionMemory(date, content);
    } catch (err) {
      log.error("Failed to read session memory for ${date}:", { error: String(err) });
      return null;
    }
  }

  /**
   * Save a session memory
   */
  saveSessionMemory(date: string, session: Partial<MemorySession>): boolean {
    const memoryDir = path.join(this.basePath, "memory");

    // Ensure directory exists
    if (!fs.existsSync(memoryDir)) {
      try {
        fs.mkdirSync(memoryDir, { recursive: true });
      } catch (err) {
        log.error("Failed to create memory directory:", { error: String(err) });
        return false;
      }
    }

    const filePath = path.join(memoryDir, `${date}.md`);
    const content = this.formatSessionMemory(session);

    try {
      fs.writeFileSync(filePath, content, "utf-8");
      log.info(`Saved session memory for ${date}`);
      return true;
    } catch (err) {
      log.error("Failed to save session memory for ${date}:", { error: String(err) });
      return false;
    }
  }

  /**
   * Delete a session memory
   */
  deleteSessionMemory(date: string): boolean {
    const memoryDir = path.join(this.basePath, "memory");
    const filePath = path.join(memoryDir, `${date}.md`);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      log.info(`Deleted session memory for ${date}`);
      return true;
    } catch (err) {
      log.error("Failed to delete session memory for ${date}:", { error: String(err) });
      return false;
    }
  }

  /**
   * Generate a summary from session content
   */
  generateSummary(sessionContent: string): Partial<MemorySession> {
    // Simple extraction - in real implementation, this would use LLM
    const lines = sessionContent.split("\n");
    const summary: Partial<MemorySession> = {};

    let currentSection: keyof MemorySession | null = null;
    const sectionContent: Partial<Record<keyof MemorySession, string[]>> = {};

    for (const line of lines) {
      if (line.startsWith("## ")) {
        const section = line.replace("## ", "").toLowerCase().replace(/\s+/g, "");
        if (section === "whatyouworkedon" || section === "workedon") {
          currentSection = "workedOn";
        } else if (section === "decisionsmade" || section === "decisions") {
          currentSection = "decisions";
        } else if (section === "leadsgenerated" || section === "leads") {
          currentSection = "leads";
        } else if (section === "blockers") {
          currentSection = "blockers";
        } else if (section === "nextsteps") {
          currentSection = "nextSteps";
        } else {
          currentSection = null;
        }
      } else if (currentSection && line.trim()) {
        if (!sectionContent[currentSection]) {
          sectionContent[currentSection] = [];
        }
        sectionContent[currentSection]!.push(line.trim());
      }
    }

    // Build summary
    if (sectionContent.workedOn) {
      summary.workedOn = sectionContent.workedOn.join("\n");
    }
    if (sectionContent.decisions) {
      summary.decisions = sectionContent.decisions.join("\n");
    }
    if (sectionContent.leads) {
      summary.leads = sectionContent.leads.join("\n");
    }
    if (sectionContent.blockers) {
      summary.blockers = sectionContent.blockers.join("\n");
    }
    if (sectionContent.nextSteps) {
      summary.nextSteps = sectionContent.nextSteps.join("\n");
    }

    // Create a brief summary
    const parts: string[] = [];
    if (summary.workedOn) {
      parts.push(`Worked on: ${summary.workedOn.split("\n")[0]}`);
    }
    summary.summary = parts.join(" | ") || "Session completed";

    return summary;
  }

  /**
   * Search in all memories (simple text search - semantic search would need embeddings)
   */
  searchMemories(query: string): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search core files
    const coreFiles = this.listCoreFiles();
    for (const file of coreFiles) {
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
          const start = Math.max(0, i - 1);
          const end = Math.min(lines.length, i + 2);
          const snippet = lines.slice(start, end).join("\n");
          results.push({
            file: file.name,
            snippet,
            relevance: 1,
          });
          break; // Only first match per file
        }
      }
    }

    // Search session memories
    const sessions = this.listSessionMemories();
    for (const session of sessions) {
      const content = this.formatSessionMemory(session);
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
          const start = Math.max(0, i - 1);
          const end = Math.min(lines.length, i + 2);
          const snippet = lines.slice(start, end).join("\n");
          results.push({
            file: `memory/${session.date}.md`,
            snippet,
            relevance: 0.8,
          });
          break;
        }
      }
    }

    return results.toSorted((a, b) => b.relevance - a.relevance);
  }

  /**
   * Get files to auto-load for a session
   */
  getAutoLoadFiles(): MemoryFile[] {
    const files: MemoryFile[] = [];

    // Core files
    if (this.config.autoLoad.soul) {
      const soul = this.getCoreFile("SOUL.md");
      if (soul) {
        files.push(soul);
      }
    }
    if (this.config.autoLoad.user) {
      const user = this.getCoreFile("USER.md");
      if (user) {
        files.push(user);
      }
    }
    if (this.config.autoLoad.identity) {
      const identity = this.getCoreFile("IDENTITY.md");
      if (identity) {
        files.push(identity);
      }
    }

    // Recent session memories
    if (this.config.autoLoad.recentDays > 0) {
      const sessions = this.listSessionMemories();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - this.config.autoLoad.recentDays);

      for (const session of sessions) {
        const sessionDate = new Date(session.date);
        if (sessionDate >= cutoff) {
          const memoryDir = path.join(this.basePath, "memory");
          const filePath = path.join(memoryDir, `${session.date}.md`);
          if (fs.existsSync(filePath)) {
            try {
              const stats = fs.statSync(filePath);
              const content = fs.readFileSync(filePath, "utf-8");
              files.push({
                name: `memory/${session.date}.md`,
                path: filePath,
                content,
                size: stats.size,
                modifiedAt: stats.mtime.toISOString(),
              });
            } catch (err) {
              log.warn("Failed to load session memory ${session.date}:", { error: String(err) });
            }
          }
        }
      }
    }

    return files;
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MemoryConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      autoLoad: { ...this.config.autoLoad, ...config.autoLoad },
    };
    this.saveConfig();
  }

  /**
   * Clean old memories based on retention policy
   */
  cleanupOldMemories(): number {
    const sessions = this.listSessionMemories();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.retentionDays);

    let deleted = 0;
    for (const session of sessions) {
      const sessionDate = new Date(session.date);
      if (sessionDate < cutoff) {
        if (this.deleteSessionMemory(session.date)) {
          deleted++;
        }
      }
    }

    if (deleted > 0) {
      log.info(`Cleaned up ${deleted} old memory files`);
    }

    return deleted;
  }

  private parseSessionMemory(date: string, content: string): MemorySession {
    const session: MemorySession = {
      date,
      fileName: `${date}.md`,
      summary: "",
    };

    let currentSection: keyof MemorySession | null = null;
    const sectionContent: Partial<Record<keyof MemorySession, string[]>> = {};

    const lines = content.split("\n");
    for (const line of lines) {
      if (line.startsWith("## ")) {
        const section = line.replace("## ", "").toLowerCase().replace(/\s+/g, "");
        if (section === "whatyouworkedon" || section === "workedon") {
          currentSection = "workedOn";
        } else if (section === "decisionsmade" || section === "decisions") {
          currentSection = "decisions";
        } else if (section === "leadsgenerated" || section === "leads") {
          currentSection = "leads";
        } else if (section === "blockers") {
          currentSection = "blockers";
        } else if (section === "nextsteps") {
          currentSection = "nextSteps";
        } else {
          currentSection = null;
        }
      } else if (currentSection && line.trim()) {
        if (!sectionContent[currentSection]) {
          sectionContent[currentSection] = [];
        }
        sectionContent[currentSection]!.push(line.trim());
      }
    }

    // Build session object
    if (sectionContent.workedOn) {
      session.workedOn = sectionContent.workedOn.join("\n");
    }
    if (sectionContent.decisions) {
      session.decisions = sectionContent.decisions.join("\n");
    }
    if (sectionContent.leads) {
      session.leads = sectionContent.leads.join("\n");
    }
    if (sectionContent.blockers) {
      session.blockers = sectionContent.blockers.join("\n");
    }
    if (sectionContent.nextSteps) {
      session.nextSteps = sectionContent.nextSteps.join("\n");
    }

    // Create summary
    const parts: string[] = [];
    if (session.workedOn) {
      parts.push(session.workedOn.split("\n")[0]);
    }
    session.summary = parts.join(" | ") || "Session memory";

    return session;
  }

  private formatSessionMemory(session: Partial<MemorySession>): string {
    const lines: string[] = [
      `# Session Memory - ${session.date || new Date().toISOString().split("T")[0]}`,
      "",
    ];

    if (session.workedOn) {
      lines.push("## What You Worked On");
      lines.push(session.workedOn);
      lines.push("");
    }

    if (session.decisions) {
      lines.push("## Decisions Made");
      lines.push(session.decisions);
      lines.push("");
    }

    if (session.leads) {
      lines.push("## Leads Generated");
      lines.push(session.leads);
      lines.push("");
    }

    if (session.blockers) {
      lines.push("## Blockers");
      lines.push(session.blockers);
      lines.push("");
    }

    if (session.nextSteps) {
      lines.push("## Next Steps");
      lines.push(session.nextSteps);
      lines.push("");
    }

    return lines.join("\n");
  }
}

// Singleton instance
let memoryManager: MemoryManager | null = null;

export function getMemoryManager(basePath?: string): MemoryManager {
  if (!memoryManager) {
    memoryManager = new MemoryManager(basePath);
  }
  return memoryManager;
}
