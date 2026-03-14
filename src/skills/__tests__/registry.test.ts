/**
 * Skill Registry Tests
 * Comprehensive test coverage for skills system
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SkillManifest, SkillAction, ActionContext } from "../types.js";
import { SkillRegistryImpl } from "../registry.js";

describe("SkillRegistry", () => {
  let registry: SkillRegistryImpl;

  const mockSkillPack: SkillManifest = {
    id: "react-patterns",
    name: "React Patterns",
    version: "1.0.0",
    description: "Best practices for React development",
    type: "pack",
    author: "OpenClaw",
    license: "MIT",
    tags: ["react", "frontend", "javascript"],
    keywords: ["hooks", "components", "patterns"],
    knowledge: [
      {
        id: "hooks-guide",
        title: "React Hooks Guide",
        content: "Comprehensive guide to React Hooks",
        language: "markdown",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockSkillAction: SkillManifest = {
    id: "setup-project",
    name: "Setup Project",
    version: "1.0.0",
    description: "Automated project setup",
    type: "action",
    author: "OpenClaw",
    license: "MIT",
    tags: ["automation", "setup"],
    keywords: ["project", "init"],
    actions: [
      {
        id: "init-project",
        name: "Initialize Project",
        description: "Create project structure",
        trigger: { type: "command", pattern: "init react" },
        handler: { type: "shell", script: "npx create-react-app" },
        inputs: [],
        outputs: [],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    registry = new SkillRegistryImpl();
  });

  describe("Registration", () => {
    it("should register a skill pack", () => {
      registry.register(mockSkillPack);

      const skill = registry.get("react-patterns");
      expect(skill).toBeDefined();
      expect(skill?.name).toBe("React Patterns");
      expect(skill?.type).toBe("pack");
    });

    it("should register a skill action", () => {
      registry.register(mockSkillAction);

      const skill = registry.get("setup-project");
      expect(skill).toBeDefined();
      expect(skill?.type).toBe("action");
    });

    it("should throw error when registering duplicate skill", () => {
      registry.register(mockSkillPack);

      expect(() => registry.register(mockSkillPack)).toThrow(
        "Skill react-patterns is already registered",
      );
    });

    it("should validate skill manifest on registration", () => {
      const invalidSkill = { ...mockSkillPack, id: "" };

      expect(() => registry.register(invalidSkill as SkillManifest)).toThrow(
        "Skill ID is required",
      );
    });

    it("should unregister a skill", () => {
      registry.register(mockSkillPack);
      registry.unregister("react-patterns");

      expect(registry.get("react-patterns")).toBeUndefined();
    });

    it("should throw error when unregistering non-existent skill", () => {
      expect(() => registry.unregister("non-existent")).toThrow("Skill non-existent not found");
    });
  });

  describe("Querying", () => {
    beforeEach(() => {
      registry.register(mockSkillPack);
      registry.register(mockSkillAction);
    });

    it("should list all registered skills", () => {
      const skills = registry.list();

      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.id)).toContain("react-patterns");
      expect(skills.map((s) => s.id)).toContain("setup-project");
    });

    it("should list skills by type", () => {
      const packs = registry.listByType("pack");
      const actions = registry.listByType("action");

      expect(packs).toHaveLength(1);
      expect(packs[0].id).toBe("react-patterns");

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe("setup-project");
    });

    it("should list skills by tag", () => {
      const skills = registry.listByTag("react");

      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe("react-patterns");
    });

    it("should search skills by name", () => {
      const skills = registry.search("React");

      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe("react-patterns");
    });

    it("should search skills by description", () => {
      const skills = registry.search("automated");

      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe("setup-project");
    });

    it("should search skills by keywords", () => {
      const skills = registry.search("hooks");

      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe("react-patterns");
    });

    it("should return empty array for non-matching search", () => {
      const skills = registry.search("nonexistent");

      expect(skills).toHaveLength(0);
    });
  });

  describe("Installation", () => {
    beforeEach(() => {
      registry.register(mockSkillPack);
    });

    it("should install a skill", async () => {
      const installation = await registry.install("react-patterns", {
        theme: "dark",
      });

      expect(installation.skillId).toBe("react-patterns");
      expect(installation.enabled).toBe(true);
      expect(installation.config).toEqual({ theme: "dark" });
    });

    it("should throw error when installing non-existent skill", async () => {
      await expect(registry.install("non-existent")).rejects.toThrow(
        "Skill non-existent not found",
      );
    });

    it("should uninstall a skill", async () => {
      await registry.install("react-patterns");
      await registry.uninstall("react-patterns");

      expect(registry.getInstallation("react-patterns")).toBeUndefined();
    });

    it("should throw error when uninstalling non-installed skill", async () => {
      await expect(registry.uninstall("react-patterns")).rejects.toThrow(
        "Skill react-patterns is not installed",
      );
    });

    it("should enable a skill", async () => {
      await registry.install("react-patterns");
      registry.disable("react-patterns");
      registry.enable("react-patterns");

      expect(registry.isEnabled("react-patterns")).toBe(true);
    });

    it("should disable a skill", async () => {
      await registry.install("react-patterns");
      registry.disable("react-patterns");

      expect(registry.isEnabled("react-patterns")).toBe(false);
    });

    it("should list all installations", async () => {
      await registry.install("react-patterns");

      const installations = registry.listInstallations();

      expect(installations).toHaveLength(1);
      expect(installations[0].skillId).toBe("react-patterns");
    });
  });

  describe("Action Execution", () => {
    beforeEach(() => {
      registry.register(mockSkillAction);
    });

    it("should execute skill action when enabled", async () => {
      await registry.install("setup-project");

      // Mock action handler
      const mockHandler = vi.fn().mockResolvedValue({ success: true });

      // In real implementation, this would execute the actual action
      const result = await registry.executeAction("setup-project", "init-project", {});

      // Since we haven't mocked the handler, it should return placeholder
      expect(result).toBeDefined();
    });

    it("should throw error when executing disabled skill", async () => {
      await registry.install("setup-project");
      registry.disable("setup-project");

      await expect(registry.executeAction("setup-project", "init-project", {})).rejects.toThrow(
        "Skill setup-project is not enabled",
      );
    });

    it("should throw error for non-existent action", async () => {
      await registry.install("setup-project");

      await expect(registry.executeAction("setup-project", "non-existent", {})).rejects.toThrow(
        "Action non-existent not found in skill setup-project",
      );
    });

    it("should get applicable actions for context", async () => {
      await registry.install("setup-project");

      const context: ActionContext = {
        sessionId: "session-1",
        agentId: "agent-1",
        currentFile: "/project/package.json",
      };

      const actions = registry.getApplicableActions(context);

      expect(actions).toBeDefined();
    });
  });

  describe("Knowledge Query", () => {
    beforeEach(async () => {
      registry.register(mockSkillPack);
      await registry.install("react-patterns");
    });

    it("should query knowledge from installed skills", () => {
      const knowledge = registry.queryKnowledge("hooks");

      expect(knowledge).toHaveLength(1);
      expect(knowledge[0].title).toBe("React Hooks Guide");
    });

    it("should return empty array when no knowledge matches", () => {
      const knowledge = registry.queryKnowledge("nonexistent");

      expect(knowledge).toHaveLength(0);
    });

    it("should not return knowledge from disabled skills", () => {
      registry.disable("react-patterns");

      const knowledge = registry.queryKnowledge("hooks");

      expect(knowledge).toHaveLength(0);
    });
  });

  describe("Validation", () => {
    it("should reject skill without ID", () => {
      const invalidSkill = { ...mockSkillPack, id: "" };

      expect(() => registry.register(invalidSkill as SkillManifest)).toThrow();
    });

    it("should reject skill without name", () => {
      const invalidSkill = { ...mockSkillPack, name: "" };

      expect(() => registry.register(invalidSkill as SkillManifest)).toThrow();
    });

    it("should reject skill without version", () => {
      const invalidSkill = { ...mockSkillPack, version: "" };

      expect(() => registry.register(invalidSkill as SkillManifest)).toThrow();
    });

    it("should reject skill with invalid type", () => {
      const invalidSkill = { ...mockSkillPack, type: "invalid" as any };

      expect(() => registry.register(invalidSkill as SkillManifest)).toThrow("Invalid skill type");
    });
  });
});
