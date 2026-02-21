/**
 * Skills CLI Command
 *
 * Manage OpenClaw skills (install, list, apply, etc.)
 */

import { Command } from "commander";
import { loadConfig } from "../../config/config.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { skillRegistry, skillApplier } from "../../skills/index.js";

const log = createSubsystemLogger("cli:skills");

export function createSkillsCommand(): Command {
  const cmd = new Command("skills")
    .description("Manage OpenClaw skills")
    .option("-v, --verbose", "Verbose output");

  cmd
    .command("list")
    .description("List all registered skills")
    .option("-t, --type <type>", "Filter by type (pack|action)")
    .action(async (options) => {
      try {
        let skills = skillRegistry.list();

        if (options.type) {
          skills = skillRegistry.listByType(options.type);
        }

        console.log("\n📦 Registered Skills:\n");

        if (skills.length === 0) {
          console.log("   No skills registered.\n");
          return;
        }

        for (const skill of skills) {
          const installed = skillRegistry.getInstallation(skill.id);
          const status = installed
            ? installed.enabled
              ? "✅ enabled"
              : "⏸️  disabled"
            : "❌ not installed";

          console.log(`   ${skill.name} (${skill.id})`);
          console.log(`   Type: ${skill.type} | Version: ${skill.version}`);
          console.log(`   Status: ${status}`);
          console.log(`   ${skill.description}\n`);
        }
      } catch (error) {
        log.error("Failed to list skills", error);
        process.exit(1);
      }
    });

  cmd
    .command("install <skillId>")
    .description("Install a skill")
    .option("-c, --config <json>", "Configuration as JSON string")
    .action(async (skillId, options) => {
      try {
        const config = options.config ? JSON.parse(options.config) : {};
        const installation = await skillRegistry.install(skillId, config);
        console.log(`✅ Skill ${skillId} installed successfully`);
        console.log(`   Version: ${installation.version}`);
        console.log(`   Installed at: ${installation.installedAt}`);
      } catch (error) {
        log.error(`Failed to install skill ${skillId}`, error);
        console.error(
          `❌ Failed to install skill: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("uninstall <skillId>")
    .description("Uninstall a skill")
    .action(async (skillId) => {
      try {
        await skillRegistry.uninstall(skillId);
        console.log(`✅ Skill ${skillId} uninstalled successfully`);
      } catch (error) {
        log.error(`Failed to uninstall skill ${skillId}`, error);
        console.error(
          `❌ Failed to uninstall skill: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("enable <skillId>")
    .description("Enable a skill")
    .action(async (skillId) => {
      try {
        skillRegistry.enable(skillId);
        console.log(`✅ Skill ${skillId} enabled`);
      } catch (error) {
        log.error(`Failed to enable skill ${skillId}`, error);
        console.error(
          `❌ Failed to enable skill: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("disable <skillId>")
    .description("Disable a skill")
    .action(async (skillId) => {
      try {
        skillRegistry.disable(skillId);
        console.log(`⏸️  Skill ${skillId} disabled`);
      } catch (error) {
        log.error(`Failed to disable skill ${skillId}`, error);
        console.error(
          `❌ Failed to disable skill: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("apply <skillId> <targetPath>")
    .description("Apply a skill to a target directory")
    .option("--dry-run", "Preview changes without applying")
    .option("--force", "Force apply even if validation fails")
    .option("--no-backup", "Skip creating backup")
    .action(async (skillId, targetPath, options) => {
      try {
        console.log(`🎯 Applying skill ${skillId} to ${targetPath}...\n`);

        const result = await skillApplier.apply(skillId, targetPath, {
          dryRun: options.dryRun,
          force: options.force,
          backup: options.backup,
        });

        if (result.success) {
          console.log(`✅ Skill applied successfully!\n`);

          if (result.changes.length > 0) {
            console.log("📋 Changes:");
            for (const change of result.changes) {
              const icon =
                change.operation === "create"
                  ? "➕"
                  : change.operation === "modify"
                    ? "✏️ "
                    : "🗑️ ";
              console.log(`   ${icon} ${change.operation}: ${change.path}`);
            }
          }

          if (result.warnings.length > 0) {
            console.log("\n⚠️  Warnings:");
            for (const warning of result.warnings) {
              console.log(`   ${warning}`);
            }
          }
        } else {
          console.log(`❌ Skill application failed!\n`);

          if (result.errors.length > 0) {
            console.log("Errors:");
            for (const error of result.errors) {
              console.log(`   ❌ ${error.path}: ${error.message}`);
            }
          }

          process.exit(1);
        }
      } catch (error) {
        log.error(`Failed to apply skill ${skillId}`, error);
        console.error(
          `❌ Failed to apply skill: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("preview <skillId> <targetPath>")
    .description("Preview skill changes without applying")
    .action(async (skillId, targetPath) => {
      try {
        console.log(`👁️  Previewing skill ${skillId} on ${targetPath}...\n`);

        const result = await skillApplier.preview(skillId, targetPath);

        console.log(`📋 Preview Results:\n`);

        if (result.changes.length > 0) {
          console.log("Proposed Changes:");
          for (const change of result.changes) {
            const icon =
              change.operation === "create" ? "➕" : change.operation === "modify" ? "✏️ " : "🗑️ ";
            console.log(`   ${icon} ${change.operation}: ${change.path}`);
          }
        } else {
          console.log("No changes would be made.");
        }

        if (result.warnings.length > 0) {
          console.log("\n⚠️  Warnings:");
          for (const warning of result.warnings) {
            console.log(`   ${warning}`);
          }
        }

        console.log('\n💡 Use "openclaw skills apply" to apply these changes.');
      } catch (error) {
        log.error(`Failed to preview skill ${skillId}`, error);
        console.error(
          `❌ Failed to preview: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("search <query>")
    .description("Search skills by name, description, or keywords")
    .action(async (query) => {
      try {
        const skills = skillRegistry.search(query);

        console.log(`\n🔍 Search results for "${query}":\n`);

        if (skills.length === 0) {
          console.log("   No skills found.\n");
          return;
        }

        for (const skill of skills) {
          console.log(`   ${skill.name} (${skill.id})`);
          console.log(`   Type: ${skill.type} | Version: ${skill.version}`);
          console.log(`   Tags: ${skill.tags.join(", ")}`);
          console.log(`   ${skill.description}\n`);
        }
      } catch (error) {
        log.error("Failed to search skills", error);
        process.exit(1);
      }
    });

  return cmd;
}
