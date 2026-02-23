/**
 * Skill Registry
 *
 * Manages skill registration, installation, and execution.
 */

import type {
  SkillManifest,
  SkillInstallation,
  SkillAction,
  ActionContext,
  SkillKnowledge,
  ApplyOptions,
  ApplyResult,
  ValidationResult,
} from "./types.js";

export class SkillRegistryImpl {
  private skills: Map<string, SkillManifest> = new Map();
  private installations: Map<string, SkillInstallation> = new Map();
  private actionHandlers: Map<string, Function> = new Map();

  /**
   * Register a skill in the registry
   */
  register(skill: SkillManifest): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill ${skill.id} is already registered`);
    }

    // Validate skill manifest
    this.validateManifest(skill);

    this.skills.set(skill.id, skill);
  }

  /**
   * Unregister a skill
   */
  unregister(skillId: string): void {
    if (!this.skills.has(skillId)) {
      throw new Error(`Skill ${skillId} not found`);
    }

    this.skills.delete(skillId);
    this.installations.delete(skillId);
  }

  /**
   * Get a skill by ID
   */
  get(skillId: string): SkillManifest | undefined {
    return this.skills.get(skillId);
  }

  /**
   * List all registered skills
   */
  list(): SkillManifest[] {
    return Array.from(this.skills.values());
  }

  /**
   * List skills by type (pack or action)
   */
  listByType(type: "pack" | "action"): SkillManifest[] {
    return this.list().filter((skill) => skill.type === type);
  }

  /**
   * List skills by tag
   */
  listByTag(tag: string): SkillManifest[] {
    return this.list().filter((skill) => skill.tags.includes(tag));
  }

  /**
   * Search skills by query (matches name, description, keywords)
   */
  search(query: string): SkillManifest[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter((skill) => {
      return (
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.keywords.some((k) => k.toLowerCase().includes(lowerQuery)) ||
        skill.tags.some((t) => t.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Install a skill
   */
  async install(skillId: string, config: Record<string, unknown> = {}): Promise<SkillInstallation> {
    const skill = this.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const installation: SkillInstallation = {
      skillId,
      version: skill.version,
      installedAt: new Date().toISOString(),
      enabled: true,
      config,
    };

    this.installations.set(skillId, installation);

    // Register action handlers if skill has actions
    if (skill.actions) {
      for (const action of skill.actions) {
        this.registerActionHandler(skillId, action.id, action);
      }
    }

    return installation;
  }

  /**
   * Uninstall a skill
   */
  async uninstall(skillId: string): Promise<void> {
    if (!this.installations.has(skillId)) {
      throw new Error(`Skill ${skillId} is not installed`);
    }

    // Unregister action handlers
    const skill = this.get(skillId);
    if (skill?.actions) {
      for (const action of skill.actions) {
        this.unregisterActionHandler(skillId, action.id);
      }
    }

    this.installations.delete(skillId);
  }

  /**
   * Enable a skill
   */
  enable(skillId: string): void {
    const installation = this.installations.get(skillId);
    if (!installation) {
      throw new Error(`Skill ${skillId} is not installed`);
    }
    installation.enabled = true;
  }

  /**
   * Disable a skill
   */
  disable(skillId: string): void {
    const installation = this.installations.get(skillId);
    if (!installation) {
      throw new Error(`Skill ${skillId} is not installed`);
    }
    installation.enabled = false;
  }

  /**
   * Check if a skill is enabled
   */
  isEnabled(skillId: string): boolean {
    const installation = this.installations.get(skillId);
    return installation?.enabled ?? false;
  }

  /**
   * Execute a skill action
   */
  async executeAction(
    skillId: string,
    actionId: string,
    inputs: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!this.isEnabled(skillId)) {
      throw new Error(`Skill ${skillId} is not enabled`);
    }

    const handler = this.actionHandlers.get(`${skillId}:${actionId}`);
    if (!handler) {
      throw new Error(`Action ${actionId} not found in skill ${skillId}`);
    }

    return handler(inputs);
  }

  /**
   * Get applicable actions for a context
   */
  getApplicableActions(context: ActionContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const installation of this.installations.values()) {
      if (!installation.enabled) continue;

      const skill = this.get(installation.skillId);
      if (!skill?.actions) continue;

      for (const action of skill.actions) {
        if (this.isActionApplicable(action, context)) {
          actions.push(action);
        }
      }
    }

    return actions;
  }

  /**
   * Query knowledge from skills
   */
  queryKnowledge(query: string, skillId?: string): SkillKnowledge[] {
    const results: SkillKnowledge[] = [];

    for (const installation of this.installations.values()) {
      if (!installation.enabled) continue;

      // If skillId specified, only search that skill
      if (skillId && installation.skillId !== skillId) continue;

      const skill = this.get(installation.skillId);
      if (!skill?.knowledge) continue;

      for (const knowledge of skill.knowledge) {
        if (this.knowledgeMatches(knowledge, query)) {
          results.push(knowledge);
        }
      }
    }

    return results;
  }

  /**
   * Get installation info
   */
  getInstallation(skillId: string): SkillInstallation | undefined {
    return this.installations.get(skillId);
  }

  /**
   * List all installations
   */
  listInstallations(): SkillInstallation[] {
    return Array.from(this.installations.values());
  }

  // Private methods

  private validateManifest(skill: SkillManifest): void {
    if (!skill.id) throw new Error("Skill ID is required");
    if (!skill.name) throw new Error("Skill name is required");
    if (!skill.version) throw new Error("Skill version is required");
    if (!skill.type) throw new Error("Skill type is required");
    if (!["pack", "action"].includes(skill.type)) {
      throw new Error('Invalid skill type. Must be "pack" or "action"');
    }
  }

  private registerActionHandler(skillId: string, actionId: string, action: SkillAction): void {
    const key = `${skillId}:${actionId}`;

    // Create handler based on action.handler.type
    const handler = this.createActionHandler(action);
    this.actionHandlers.set(key, handler);
  }

  private unregisterActionHandler(skillId: string, actionId: string): void {
    const key = `${skillId}:${actionId}`;
    this.actionHandlers.delete(key);
  }

  private createActionHandler(action: SkillAction): Function {
    return async (inputs: Record<string, unknown>) => {
      // This is a placeholder - in real implementation, this would:
      // 1. Validate inputs against action.inputs schema
      // 2. Execute the handler script
      // 3. Return outputs
      console.log(`Executing action: ${action.name}`, inputs);
      return { success: true };
    };
  }

  private isActionApplicable(action: SkillAction, context: ActionContext): boolean {
    const { trigger } = action;

    switch (trigger.type) {
      case "command":
        return trigger.pattern !== undefined;
      case "event":
        return trigger.event === context.eventType;
      case "file-change":
        return (
          context.currentFile !== undefined &&
          (!trigger.filePattern || new RegExp(trigger.filePattern).test(context.currentFile))
        );
      case "manual":
        return true;
      default:
        return false;
    }
  }

  private knowledgeMatches(knowledge: SkillKnowledge, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return (
      knowledge.title.toLowerCase().includes(lowerQuery) ||
      knowledge.content.toLowerCase().includes(lowerQuery)
    );
  }
}

// Singleton instance
export const skillRegistry = new SkillRegistryImpl();
