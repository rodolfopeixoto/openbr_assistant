/**
 * Ralph Loop CLI Commands
 * Manage AI-powered development automation runs
 */

import chalk from "chalk";
import { Command } from "commander";
import type { RalphServiceConfig, GitProviderType } from "../services/ralph/types.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { ContainerManager } from "../services/ralph/container-manager.js";
import { PRDManager } from "../services/ralph/prd-manager.js";
import { RalphService } from "../services/ralph/ralph-service.js";

const log = createSubsystemLogger("ralph:cli");

// Default configuration
const DEFAULT_CONFIG: RalphServiceConfig = {
  enabled: true,
  container: {
    engine: "auto",
    resources: {
      memory: { limit: "4g" },
      cpu: { cores: 2 },
    },
    gc: {
      enabled: true,
      maxIdleTime: 30 * 60 * 1000, // 30 minutes
      maxContainersPerUser: 5,
      maxContainersPerProject: 3,
      maxDiskUsage: 50 * 1024 * 1024 * 1024, // 50GB
      maxMemoryUsage: 16 * 1024 * 1024 * 1024, // 16GB
      preserveFailed: 24 * 60 * 60 * 1000, // 24 hours
      preserveCompleted: 7 * 24 * 60 * 60 * 1000, // 7 days
      backupBeforeDelete: true,
    },
    sandbox: {
      readOnlyRoot: true,
      noNewPrivileges: true,
      dropCapabilities: ["ALL"],
      addCapabilities: [],
      user: "ralph",
    },
  },
  git: {
    defaultProvider: "github",
    autoPR: true,
    commitStyle: "conventional",
    providers: {
      github: { enabled: true },
      gitlab: { enabled: true },
      bitbucket: { enabled: true },
    },
  },
  storage: {
    default: "local",
    backends: {
      local: { type: "local", path: "/tmp/ralph/storage" },
    },
  },
  backup: {
    enabled: true,
    schedule: "0 0 * * *", // Daily at midnight
    retention: {
      hourly: 6,
      daily: 7,
      weekly: 4,
    },
    compression: "gzip",
    encryption: {
      enabled: false,
    },
    backends: ["local"],
  },
  security: {
    scanOnStart: true,
    blockOnVulnerabilities: false,
    allowedHosts: [],
    blockedHosts: [],
  },
  defaults: {
    maxIterations: 10,
    qualityChecks: ["typecheck", "tests", "lint", "security"],
    autoMerge: false,
  },
};

export function createRalphCommands(): Command {
  const ralph = new Command("ralph")
    .description("AI-powered development automation (Ralph Loop)")
    .configureOutput({
      writeOut: (str) => process.stdout.write(str),
      writeErr: (str) => process.stderr.write(str),
    });

  // Initialize Ralph service
  let ralphService: RalphService | null = null;

  async function getRalphService(): Promise<RalphService> {
    if (!ralphService) {
      ralphService = new RalphService(DEFAULT_CONFIG);
      await ralphService.initialize();
    }
    return ralphService;
  }

  // List runs
  ralph
    .command("list")
    .alias("ls")
    .description("List all Ralph development runs")
    .option("-a, --all", "Show all runs including completed")
    .action(async (_options) => {
      try {
        const service = await getRalphService();
        const runs = service.getAllRuns();

        if (runs.length === 0) {
          console.log(chalk.yellow("No Ralph runs found. Create one with: openclaw ralph run"));
          return;
        }

        console.log(chalk.bold("\nRalph Development Runs\n"));
        console.log(
          `${chalk.dim("ID".padEnd(25))} ${"Status".padEnd(12)} ${"Name".padEnd(30)} ${"Progress"}`,
        );
        console.log(chalk.dim("─".repeat(100)));

        for (const run of runs) {
          const statusColor =
            {
              pending: chalk.gray,
              initializing: chalk.yellow,
              running: chalk.green,
              paused: chalk.yellow,
              completed: chalk.green.bold,
              failed: chalk.red,
              cancelled: chalk.gray,
            }[run.status] || chalk.white;

          const progress = `${run.currentIteration}/${run.maxIterations}`;
          console.log(
            `${run.id.padEnd(25)} ` +
              `${statusColor(run.status.padEnd(12))} ` +
              `${run.name.substring(0, 30).padEnd(30)} ` +
              `${progress}`,
          );
        }

        console.log();
      } catch (err) {
        log.error("Failed to list runs", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // Show run details
  ralph
    .command("show")
    .description("Show details of a Ralph run")
    .argument("<run-id>", "Run ID")
    .action(async (runId: string) => {
      try {
        const service = await getRalphService();
        const run = service.getRun(runId);

        if (!run) {
          console.error(chalk.red(`Run not found: ${runId}`));
          process.exit(1);
        }

        console.log(chalk.bold(`\nRun: ${run.name}\n`));
        console.log(`ID: ${run.id}`);
        console.log(`Status: ${run.status}`);
        console.log(`Branch: ${run.gitBranch}`);
        console.log(`Provider: ${run.gitProvider}`);
        console.log(`Created: ${run.createdAt.toLocaleString()}`);

        if (run.completedAt) {
          console.log(`Completed: ${run.completedAt.toLocaleString()}`);
        }

        if (run.error) {
          console.log(chalk.red(`Error: ${run.error}`));
        }

        console.log(chalk.bold("\nPRD:"));
        console.log(`Title: ${run.prd.title}`);
        console.log(`Description: ${run.prd.description}`);

        console.log(chalk.bold("\nUser Stories:"));
        for (const story of run.stories) {
          const status = story.passes
            ? chalk.green("✓")
            : story.attempts >= story.maxAttempts
              ? chalk.red("✗")
              : chalk.yellow("⏳");
          console.log(`  ${status} ${story.title} (${story.priority})`);
        }

        console.log();
      } catch (err) {
        log.error("Failed to show run", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // Create new run
  ralph
    .command("run")
    .description("Start a new development run")
    .requiredOption("-n, --name <name>", "Run name")
    .requiredOption("-r, --repo <repo>", "Repository URL")
    .requiredOption("-t, --token <token>", "Git provider access token")
    .option("--provider <provider>", "Git provider", "github")
    .option("--base-branch <branch>", "Base branch", "main")
    .option("--template <template>", "PRD template", "web-app")
    .option("--description <description>", "PRD description")
    .action(async (options) => {
      try {
        const service = await getRalphService();
        const prdManager = service.getPRDManager();

        // Create PRD from template
        const prd = prdManager.createFromTemplate(options.template, {
          title: options.name,
          description: options.description || `Development run for ${options.name}`,
        });

        console.log(chalk.blue(`Starting Ralph development run: ${options.name}`));

        // Start the run
        const run = await service.startRun({
          name: options.name,
          prd,
          gitProvider: options.provider as GitProviderType,
          gitRepoUrl: options.repo,
          gitCredentials: {
            type: "pat",
            token: options.token,
          },
          baseBranch: options.baseBranch,
        });

        console.log(chalk.green(`✓ Run started successfully!`));
        console.log(`Run ID: ${run.id}`);
        console.log(`Branch: ${run.gitBranch}`);
        console.log(chalk.dim('\nUse "openclaw ralph logs ' + run.id + '" to view progress'));
      } catch (err) {
        log.error("Failed to start run", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // Cancel run
  ralph
    .command("cancel")
    .description("Cancel a running Ralph run")
    .argument("<run-id>", "Run ID")
    .action(async (runId: string) => {
      try {
        const service = await getRalphService();
        await service.cancelRun(runId);
        console.log(chalk.green(`✓ Run ${runId} cancelled`));
      } catch (err) {
        log.error("Failed to cancel run", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // Pause run
  ralph
    .command("pause")
    .description("Pause a running Ralph run")
    .argument("<run-id>", "Run ID")
    .action(async (runId: string) => {
      try {
        const service = await getRalphService();
        await service.pauseRun(runId);
        console.log(chalk.green(`✓ Run ${runId} paused`));
      } catch (err) {
        log.error("Failed to pause run", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // Resume run
  ralph
    .command("resume")
    .description("Resume a paused Ralph run")
    .argument("<run-id>", "Run ID")
    .action(async (runId: string) => {
      try {
        const service = await getRalphService();
        await service.resumeRun(runId);
        console.log(chalk.green(`✓ Run ${runId} resumed`));
      } catch (err) {
        log.error("Failed to resume run", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // View logs
  ralph
    .command("logs")
    .description("View container logs for a Ralph run")
    .argument("<run-id>", "Run ID")
    .option("-f, --follow", "Follow log output")
    .action(async (runId: string, _options) => {
      try {
        const service = await getRalphService();
        const logs = await service.getContainerLogs(runId);

        if (logs.length === 0) {
          console.log(chalk.yellow("No logs available"));
          return;
        }

        console.log(chalk.bold(`\nContainer logs for run ${runId}:\n`));
        for (const log of logs) {
          console.log(log);
        }
      } catch (err) {
        log.error("Failed to get logs", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // List templates
  ralph
    .command("templates")
    .description("List available PRD templates")
    .action(async () => {
      try {
        const prdManager = new PRDManager();
        const templates = prdManager.getTemplates();

        console.log(chalk.bold("\nAvailable PRD Templates\n"));

        for (const template of templates) {
          console.log(chalk.cyan(`${template.name} (${template.id})`));
          console.log(`  ${template.description}`);
          console.log(`  Category: ${template.category}`);
          console.log(`  Default stories: ${template.defaultStories.length}\n`);
        }
      } catch (err) {
        log.error("Failed to list templates", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // Container management
  const container = ralph.command("container").description("Manage Ralph containers");

  container
    .command("list")
    .alias("ls")
    .description("List all Ralph containers")
    .action(async () => {
      try {
        const containerManager = new ContainerManager(DEFAULT_CONFIG.container);
        const containers = await containerManager.listRalphContainers();

        if (containers.length === 0) {
          console.log(chalk.yellow("No Ralph containers found"));
          return;
        }

        console.log(chalk.bold("\nRalph Containers\n"));
        console.log(
          `${chalk.dim("ID".padEnd(15))} ${"Name".padEnd(30)} ${"Status".padEnd(12)} ${"Image"}`,
        );
        console.log(chalk.dim("─".repeat(100)));

        for (const c of containers) {
          console.log(
            `${c.id.substring(0, 15).padEnd(15)} ` +
              `${c.name.padEnd(30)} ` +
              `${c.status.padEnd(12)} ` +
              `${c.image}`,
          );
        }

        console.log();
      } catch (err) {
        log.error("Failed to list containers", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  container
    .command("cleanup")
    .description("Clean up all Ralph containers")
    .option("-f, --force", "Force cleanup without confirmation")
    .action(async (options) => {
      try {
        if (!options.force) {
          console.log(chalk.yellow("⚠️  This will stop and remove all Ralph containers"));
          console.log(chalk.dim("Use --force to skip this confirmation"));
          return;
        }

        const containerManager = new ContainerManager(DEFAULT_CONFIG.container);
        const removed = await containerManager.cleanupRalphContainers();
        console.log(chalk.green(`✓ Cleaned up ${removed} containers`));
      } catch (err) {
        log.error("Failed to cleanup containers", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // Security scanning
  ralph
    .command("scan")
    .description("Run security scan on repository")
    .argument("<repo-path>", "Path to repository")
    .action(async (repoPath: string) => {
      try {
        console.log(chalk.blue(`Scanning ${repoPath} for security issues...`));

        const scanner = new (
          await import("../services/ralph/security/scanner.js")
        ).RalphSecurityScanner();
        const report = await scanner.scanRepository(repoPath);

        console.log(chalk.bold("\nSecurity Scan Results\n"));

        if (report.vulnerabilities.length) {
          console.log(chalk.red(`\n⚠️  Found ${report.vulnerabilities.length} vulnerabilities:`));
          for (const vuln of report.vulnerabilities) {
            console.log(`  ${chalk.red(vuln.severity)}: ${vuln.package}@${vuln.version}`);
            console.log(`    ${vuln.description}`);
            if (vuln.cve) {
              console.log(`    CVE: ${vuln.cve}`);
            }
          }
        }

        if (report.secrets.length) {
          console.log(chalk.red(`\n🔑 Found ${report.secrets.length} secrets:`));
          for (const secret of report.secrets) {
            console.log(`  ${chalk.red(secret.severity)}: ${secret.type}`);
            console.log(`    File: ${secret.file}:${secret.line}`);
          }
        }

        if (report.suspiciousFiles.length) {
          console.log(
            chalk.yellow(`\n📄 Found ${report.suspiciousFiles.length} suspicious files:`),
          );
          for (const file of report.suspiciousFiles) {
            console.log(`  ${chalk.yellow(file.severity)}: ${file.path}`);
            console.log(`    Reason: ${file.reason}`);
          }
        }

        if (
          !report.vulnerabilities.length &&
          !report.secrets.length &&
          !report.suspiciousFiles.length
        ) {
          console.log(chalk.green("✓ No security issues found"));
        }

        console.log();
      } catch (err) {
        log.error("Failed to scan repository", { error: String(err) });
        console.error(chalk.red(`Error: ${err}`));
        process.exit(1);
      }
    });

  // Cleanup on exit
  process.on("exit", () => {
    if (ralphService) {
      ralphService.shutdown().catch(console.error);
    }
  });

  return ralph;
}
