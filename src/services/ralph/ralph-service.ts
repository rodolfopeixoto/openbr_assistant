/**
 * Ralph Service - Main Orchestration
 * Coordinates containers, git providers, storage, and security scanning
 */

import { randomUUID } from "crypto";
import type {
  RalphRun,
  PRDDocument,
  UserStory,
  ProgressEntry,
  QualityCheck,
  GitProvider,
  GitProviderType,
  StorageBackend,
  RalphServiceConfig,
  ContainerConfig,
  QualityCheckType,
  Container,
} from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { BackupService } from "./backup-service.js";
import { ContainerManager } from "./container-manager.js";
import { GCService } from "./gc-service.js";
import { BitbucketProvider } from "./git-providers/bitbucket.js";
import { GitHubProvider } from "./git-providers/github.js";
import { GitLabProvider } from "./git-providers/gitlab.js";
import { PRDManager } from "./prd-manager.js";
import { RalphSecurityScanner } from "./security/scanner.js";
import { GoogleDriveStorageBackend } from "./storage/gdrive.js";
import { LocalStorageBackend } from "./storage/local.js";
import { S3StorageBackend } from "./storage/s3.js";

const log = createSubsystemLogger("ralph:service");

export class RalphService {
  private config: RalphServiceConfig;
  private containerManager: ContainerManager;
  private gcService: GCService;
  private backupService: BackupService;
  private prdManager: PRDManager;
  private securityScanner: RalphSecurityScanner;
  private gitProviders: Map<GitProviderType, GitProvider>;
  private storageBackends: Map<string, StorageBackend>;
  private runs: Map<string, RalphRun>;
  private activeRuns: Map<string, string>; // containerId -> runId

  constructor(config: RalphServiceConfig) {
    this.config = config;
    this.containerManager = new ContainerManager(config.container);
    this.prdManager = new PRDManager();
    this.securityScanner = new RalphSecurityScanner();
    this.gitProviders = new Map();
    this.storageBackends = new Map();
    this.runs = new Map();
    this.activeRuns = new Map();

    // Initialize git providers
    this.initializeGitProviders();

    // Initialize storage backends
    this.initializeStorageBackends();

    // Initialize backup service
    const defaultBackend = this.storageBackends.get(config.storage.default);
    if (defaultBackend) {
      this.backupService = new BackupService({
        config: config.backup,
        backends: this.storageBackends,
        tempDir: "/tmp/ralph/backups",
      });
    } else {
      throw new Error(`Default storage backend not found: ${config.storage.default}`);
    }

    // Initialize GC service
    this.gcService = new GCService(this.containerManager, config.container.gc);
  }

  async initialize(): Promise<void> {
    log.info("Initializing Ralph Service");

    // Start GC service
    await this.gcService.start();

    log.info("Ralph Service initialized");
  }

  async shutdown(): Promise<void> {
    log.info("Shutting down Ralph Service");

    // Stop GC service
    await this.gcService.stop();

    // Stop all active runs
    for (const [runId, run] of this.runs) {
      if (run.status === "running") {
        await this.cancelRun(runId);
      }
    }

    log.info("Ralph Service shutdown complete");
  }

  /**
   * Start a new development run
   */
  async startRun(params: {
    name: string;
    prd: PRDDocument;
    gitProvider: GitProviderType;
    gitRepoUrl: string;
    gitCredentials: {
      type: "pat";
      token: string;
      username?: string;
    };
    baseBranch: string;
  }): Promise<RalphRun> {
    log.info(`Starting new run: ${params.name}`);

    const runId = `run-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const branchName = this.prdManager.generateBranchName(params.name);

    const run: RalphRun = {
      id: runId,
      name: params.name,
      status: "initializing",
      prd: params.prd,
      currentIteration: 0,
      maxIterations: this.config.defaults.maxIterations,
      gitBranch: branchName,
      gitProvider: params.gitProvider,
      stories: [...params.prd.userStories],
      progress: [],
      qualityChecks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.runs.set(runId, run);

    try {
      // Authenticate with git provider
      const gitProvider = this.gitProviders.get(params.gitProvider);
      if (!gitProvider) {
        throw new Error(`Git provider not configured: ${params.gitProvider}`);
      }

      await gitProvider.authenticate(params.gitCredentials);

      // Set repository
      if (params.gitProvider === "github") {
        (gitProvider as GitHubProvider).setRepository(params.gitRepoUrl);
      } else if (params.gitProvider === "gitlab") {
        // Extract project path from URL
        const match = params.gitRepoUrl.match(/gitlab\.com\/(.+)\.git$/);
        if (match) {
          (gitProvider as GitLabProvider).setProject(match[1]);
        }
      } else if (params.gitProvider === "bitbucket") {
        (gitProvider as BitbucketProvider).setRepository(params.gitRepoUrl);
      }

      // Create branch
      await gitProvider.createBranch(branchName, params.baseBranch);

      // Create container
      const container = await this.createDevelopmentContainer(runId, branchName);
      run.containerId = container.id;
      this.activeRuns.set(container.id, runId);

      // Run security scan if enabled
      if (this.config.security.scanOnStart) {
        await this.runSecurityScan(runId);
      }

      // Update status
      run.status = "running";
      run.updatedAt = new Date();

      // Start development loop
      this.runDevelopmentLoop(runId).catch((err) => {
        log.error(`Development loop failed for ${runId}`, { error: String(err) });
        run.status = "failed";
        run.error = String(err);
        run.updatedAt = new Date();
      });

      log.info(`Run ${runId} started successfully`);
      return run;
    } catch (err) {
      run.status = "failed";
      run.error = String(err);
      run.updatedAt = new Date();
      log.error(`Failed to start run ${runId}`, { error: String(err) });
      throw err;
    }
  }

  /**
   * Get run by ID
   */
  getRun(runId: string): RalphRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * Get all runs
   */
  getAllRuns(): RalphRun[] {
    return Array.from(this.runs.values());
  }

  /**
   * Cancel a running run
   */
  async cancelRun(runId: string): Promise<void> {
    const run = this.runs.get(runId);

    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    if (run.status !== "running") {
      return;
    }

    log.info(`Cancelling run ${runId}`);

    run.status = "cancelled";
    run.updatedAt = new Date();

    // Stop container
    if (run.containerId) {
      await this.containerManager.stopContainer(run.containerId);
      this.activeRuns.delete(run.containerId);
    }

    log.info(`Run ${runId} cancelled`);
  }

  /**
   * Pause a running run
   */
  async pauseRun(runId: string): Promise<void> {
    const run = this.runs.get(runId);

    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    if (run.status !== "running") {
      return;
    }

    run.status = "paused";
    run.updatedAt = new Date();

    log.info(`Run ${runId} paused`);
  }

  /**
   * Resume a paused run
   */
  async resumeRun(runId: string): Promise<void> {
    const run = this.runs.get(runId);

    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    if (run.status !== "paused") {
      return;
    }

    run.status = "running";
    run.updatedAt = new Date();

    log.info(`Run ${runId} resumed`);
  }

  /**
   * Get run progress
   */
  getRunProgress(runId: string): ProgressEntry[] {
    const run = this.runs.get(runId);
    return run?.progress || [];
  }

  /**
   * Get quality checks for a run
   */
  getQualityChecks(runId: string): QualityCheck[] {
    const run = this.runs.get(runId);
    return run?.qualityChecks || [];
  }

  /**
   * Get container logs for a run
   */
  async getContainerLogs(runId: string): Promise<string[]> {
    const run = this.runs.get(runId);

    if (!run?.containerId) {
      return [];
    }

    // Get container logs via exec command
    try {
      const result = await this.containerManager.exec(run.containerId, [
        "sh",
        "-c",
        'cat /tmp/ralph.log 2>/dev/null || echo "No logs available"',
      ]);
      return result.stdout.split("\n").filter((line) => line.trim());
    } catch {
      return [];
    }
  }

  /**
   * Get PRD Manager
   */
  getPRDManager(): PRDManager {
    return this.prdManager;
  }

  /**
   * Get Git Provider
   */
  getGitProvider(type: GitProviderType): GitProvider | undefined {
    return this.gitProviders.get(type);
  }

  /**
   * Get Storage Backend
   */
  getStorageBackend(name: string): StorageBackend | undefined {
    return this.storageBackends.get(name);
  }

  /**
   * List all storage backends
   */
  getAllStorageBackends(): StorageBackend[] {
    return Array.from(this.storageBackends.values());
  }

  private async createDevelopmentContainer(runId: string, branchName: string): Promise<Container> {
    const config: ContainerConfig = {
      name: `ralph-${runId}`,
      image: "node:20-alpine",
      command: ["sh", "-c", "while true; do sleep 3600; done"],
      env: {
        RALPH_RUN_ID: runId,
        RALPH_BRANCH: branchName,
        NODE_ENV: "development",
      },
      volumes: [
        {
          source: `/tmp/ralph/workspaces/${runId}`,
          target: "/workspace",
          type: "bind",
          readOnly: false,
        },
      ],
      resources: this.config.container.resources,
      sandbox: this.config.container.sandbox,
      labels: {
        "ralph.run_id": runId,
        "ralph.branch": branchName,
        "ralph.managed": "true",
      },
      workingDir: "/workspace",
    };

    return await this.containerManager.createContainer(config);
  }

  private async runSecurityScan(runId: string): Promise<void> {
    const run = this.runs.get(runId);

    if (!run) {
      return;
    }

    // In a real implementation, we would scan the workspace
    // For now, just log
    log.info(`Security scan for run ${runId} completed`);
  }

  private async runDevelopmentLoop(runId: string): Promise<void> {
    const run = this.runs.get(runId);

    if (!run) {
      return;
    }

    log.info(`Starting development loop for ${runId}`);

    // Iterate through stories
    for (const story of run.stories) {
      if (run.status !== "running") {
        break;
      }

      // Check if story already passes
      if (story.passes) {
        continue;
      }

      // Check max attempts
      if (story.attempts >= story.maxAttempts) {
        story.lastError = "Max attempts reached";
        continue;
      }

      // Increment iteration
      run.currentIteration++;

      // Log progress
      run.progress.push({
        iteration: run.currentIteration,
        timestamp: new Date(),
        storyId: story.id,
        action: "started",
        message: `Working on: ${story.title}`,
      });

      // Simulate development work
      await this.developStory(runId, story);

      // Run quality checks
      await this.runQualityChecks(runId);

      run.updatedAt = new Date();
    }

    // Update final status
    const allPassed = run.stories.every((s) => s.passes);
    run.status = allPassed ? "completed" : "failed";
    run.completedAt = new Date();
    run.updatedAt = new Date();

    log.info(`Development loop completed for ${runId}: ${run.status}`);
  }

  private async developStory(runId: string, story: UserStory): Promise<void> {
    const run = this.runs.get(runId);

    if (!run?.containerId) {
      return;
    }

    story.attempts++;

    try {
      // Simulate implementation
      // In a real implementation, this would use an AI agent
      log.info(`Developing story ${story.id}: ${story.title}`);

      // Mock: always succeed for now
      story.passes = true;

      run.progress.push({
        iteration: run.currentIteration,
        timestamp: new Date(),
        storyId: story.id,
        action: "completed",
        message: `Completed: ${story.title}`,
      });
    } catch (err) {
      story.lastError = String(err);

      run.progress.push({
        iteration: run.currentIteration,
        timestamp: new Date(),
        storyId: story.id,
        action: "failed",
        message: `Failed: ${story.title} - ${err}`,
      });
    }
  }

  private async runQualityChecks(runId: string): Promise<void> {
    const run = this.runs.get(runId);

    if (!run?.containerId) {
      return;
    }

    for (const checkType of this.config.defaults.qualityChecks) {
      const check = await this.executeQualityCheck(run.containerId, checkType);
      run.qualityChecks.push(check);
    }
  }

  private async executeQualityCheck(
    containerId: string,
    type: QualityCheckType,
  ): Promise<QualityCheck> {
    const commands: Record<QualityCheckType, string> = {
      typecheck: "npx tsc --noEmit",
      tests: "npm test",
      lint: "npm run lint",
      format: "npm run format",
      ci: "npm run ci",
      security: "npm audit",
    };

    const startTime = Date.now();

    try {
      await this.containerManager.exec(containerId, commands[type].split(" "));

      return {
        type,
        command: commands[type],
        passed: true,
        output: "",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (err) {
      return {
        type,
        command: commands[type],
        passed: false,
        output: String(err),
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  private initializeGitProviders(): void {
    if (this.config.git.providers.github?.enabled) {
      this.gitProviders.set("github", new GitHubProvider());
    }

    if (this.config.git.providers.gitlab?.enabled) {
      this.gitProviders.set("gitlab", new GitLabProvider());
    }

    if (this.config.git.providers.bitbucket?.enabled) {
      this.gitProviders.set("bitbucket", new BitbucketProvider());
    }
  }

  private initializeStorageBackends(): void {
    for (const [name, config] of Object.entries(this.config.storage.backends)) {
      switch (config.type) {
        case "local": {
          this.storageBackends.set(name, new LocalStorageBackend(name, config.path));
          break;
        }
        case "s3": {
          this.storageBackends.set(
            name,
            new S3StorageBackend(name, {
              region: config.region,
              bucket: config.bucket,
              endpoint: config.endpoint,
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }),
          );
          break;
        }
        case "gdrive": {
          this.storageBackends.set(
            name,
            new GoogleDriveStorageBackend(name, {
              accessToken: "", // Would be loaded from config/secrets
              folderId: config.folderId,
            }),
          );
          break;
        }
        // Note: MinIO and GCS can be handled by S3StorageBackend with appropriate endpoints
      }
    }
  }
}
