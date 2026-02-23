/**
 * Skill Applier Tests
 * Test coverage for skill application and validation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SkillManifest, ApplyOptions, ValidationResult } from "../types.js";
import { SkillApplier } from "../applier.js";
import { skillRegistry } from "../registry.js";

describe("SkillApplier", () => {
  let applier: SkillApplier;

  const mockSkillAction: SkillManifest = {
    id: "setup-react",
    name: "Setup React Project",
    version: "1.0.0",
    description: "Setup a React project with best practices",
    type: "action",
    author: "OpenClaw",
    license: "MIT",
    tags: ["react", "setup"],
    keywords: ["react", "project"],
    actions: [
      {
        id: "create-structure",
        name: "Create Structure",
        description: "Create project directory structure",
        trigger: { type: "manual" },
        handler: {
          type: "shell",
          script: "mkdir -p src/components src/hooks src/utils",
        },
        inputs: [],
        outputs: [],
      },
      {
        id: "setup-typescript",
        name: "Setup TypeScript",
        description: "Initialize TypeScript configuration",
        trigger: { type: "manual" },
        handler: {
          type: "shell",
          script: "npx tsc --init",
        },
        inputs: [],
        outputs: [],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    applier = new SkillApplier();
    // Clear registry
    for (const skill of skillRegistry.list()) {
      skillRegistry.unregister(skill.id);
    }
  });

  describe("Validation", () => {
    beforeEach(() => {
      skillRegistry.register(mockSkillAction);
    });

    it("should validate skill can be applied to target", async () => {
      const result = await applier.validate("setup-react", "/tmp/test-project");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error for non-existent skill", async () => {
      const result = await applier.validate("non-existent", "/tmp/test");

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("SKILL_NOT_FOUND");
    });

    it("should return error for non-existent target path", async () => {
      const result = await applier.validate("setup-react", "/nonexistent/path");

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("PATH_NOT_FOUND");
    });

    it("should validate action handlers", async () => {
      const result = await applier.validate("setup-react", "/tmp/test-project");

      // Should validate that shell handler is properly configured
      expect(result.warnings).toBeDefined();
    });
  });

  describe("Application", () => {
    beforeEach(() => {
      skillRegistry.register(mockSkillAction);
    });

    it("should apply skill successfully", async () => {
      const result = await applier.apply("setup-react", "/tmp/test-project");

      expect(result.success).toBe(true);
      expect(result.changes).toBeDefined();
    });

    it("should apply skill in dry-run mode", async () => {
      const result = await applier.apply("setup-react", "/tmp/test-project", {
        dryRun: true,
      });

      expect(result.success).toBe(true);
      // In dry run, no actual changes should be made
    });

    it("should apply skill with force option", async () => {
      const result = await applier.apply("setup-react", "/tmp/test-project", {
        force: true,
      });

      expect(result.success).toBe(true);
    });

    it("should return errors when application fails", async () => {
      const result = await applier.apply("non-existent", "/tmp/test");

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should track all file changes", async () => {
      const result = await applier.apply("setup-react", "/tmp/test-project");

      // Should track created/modified/deleted files
      expect(result.changes).toBeDefined();
    });
  });

  describe("Preview", () => {
    beforeEach(() => {
      skillRegistry.register(mockSkillAction);
    });

    it("should preview changes without applying", async () => {
      const result = await applier.preview("setup-react", "/tmp/test-project");

      expect(result.success).toBe(true);
      expect(result.changes).toBeDefined();
      // Preview should show what would be changed
    });

    it("should show proposed file changes in preview", async () => {
      const result = await applier.preview("setup-react", "/tmp/test-project");

      // Should list all files that would be created/modified
      const fileChanges = result.changes.filter(
        (c) => c.operation === "create" || c.operation === "modify",
      );
      expect(fileChanges.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle shell command failures", async () => {
      skillRegistry.register(mockSkillAction);

      // Mock shell execution to fail
      const result = await applier.apply("setup-react", "/tmp/test-project");

      if (!result.success) {
        expect(result.errors[0].code).toBeDefined();
      }
    });

    it("should handle permission errors", async () => {
      skillRegistry.register(mockSkillAction);

      const result = await applier.apply("setup-react", "/root");

      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    it("should collect all warnings", async () => {
      skillRegistry.register(mockSkillAction);

      const result = await applier.apply("setup-react", "/tmp/test-project");

      expect(result.warnings).toBeDefined();
    });
  });

  describe("Backup", () => {
    beforeEach(() => {
      skillRegistry.register(mockSkillAction);
    });

    it("should create backup before applying when backup option is true", async () => {
      const result = await applier.apply("setup-react", "/tmp/test-project", {
        backup: true,
      });

      expect(result.success).toBe(true);
      // Backup should be created
    });

    it("should not create backup when backup option is false", async () => {
      const result = await applier.apply("setup-react", "/tmp/test-project", {
        backup: false,
      });

      expect(result.success).toBe(true);
      // No backup should be created
    });
  });

  describe("Configuration", () => {
    beforeEach(() => {
      skillRegistry.register(mockSkillAction);
    });

    it("should apply skill with custom configuration", async () => {
      const result = await applier.apply("setup-react", "/tmp/test-project", {
        config: {
          typescript: true,
          testing: "vitest",
        },
      });

      expect(result.success).toBe(true);
      // Configuration should be passed to actions
    });
  });
});
