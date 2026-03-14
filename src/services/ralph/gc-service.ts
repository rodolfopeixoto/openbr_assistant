/**
 * Garbage Collector Service - Manages container lifecycle and cleanup
 */

import type { Container, ContainerManager } from "./container-manager.js";
import type { GCPolicy, GCReport } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("ralph:gc");

interface ContainerInfo extends Container {
  runId?: string;
  runStatus?: string;
  lastActivity: number;
  completedAt?: number;
  failedAt?: number;
}

export class GCService {
  private containerManager: ContainerManager;
  private policy: GCPolicy;
  private gcInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(containerManager: ContainerManager, policy: GCPolicy) {
    this.containerManager = containerManager;
    this.policy = policy;
  }

  start(): void {
    if (this.gcInterval || !this.policy.enabled) {
      return;
    }

    log.info("Starting GC service");

    // Run GC every 5 minutes
    this.gcInterval = setInterval(
      () => {
        this.runGC().catch((err) => {
          log.error("GC run failed:", err);
        });
      },
      5 * 60 * 1000,
    );

    // Run initial GC
    this.runGC().catch((err) => {
      log.error("Initial GC run failed:", err);
    });
  }

  stop(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
      log.info("GC service stopped");
    }
  }

  async runGC(): Promise<GCReport> {
    if (this.isRunning) {
      log.debug("GC already running, skipping");
      return { removed: [], archived: [], errors: [], timestamp: new Date() };
    }

    this.isRunning = true;
    log.info("Running garbage collection");

    const report: GCReport = {
      removed: [],
      archived: [],
      errors: [],
      timestamp: new Date(),
    };

    try {
      const containers = await this.getRalphContainersInfo();

      for (const container of containers) {
        try {
          const shouldRemove = await this.shouldRemoveContainer(container);

          if (shouldRemove) {
            if (this.policy.backupBeforeDelete && container.runId) {
              await this.backupContainer(container);
              report.archived.push(container.id);
            }

            await this.removeContainer(container);
            report.removed.push(container.id);
            log.info(`GC removed container: ${container.name}`);
          }
        } catch (err: any) {
          log.error(`Failed to process container ${container.id}:`, err);
          report.errors.push({ containerId: container.id, error: err.message });
        }
      }

      // Check resource limits
      await this.enforceResourceLimits(report);
    } finally {
      this.isRunning = false;
    }

    log.info(
      `GC completed: ${report.removed.length} removed, ${report.archived.length} archived, ${report.errors.length} errors`,
    );
    return report;
  }

  private async getRalphContainersInfo(): Promise<ContainerInfo[]> {
    const containers = await this.containerManager.listRalphContainers();
    const now = Date.now();

    return containers.map((container) => {
      const labels = container.labels || {};
      const created = container.createdAt?.getTime() || now;
      const started = container.startedAt?.getTime();

      return {
        ...container,
        runId: labels["ralph.run.id"],
        runStatus: labels["ralph.run.status"],
        lastActivity: started || created,
        completedAt: labels["ralph.completed.at"]
          ? new Date(labels["ralph.completed.at"]).getTime()
          : undefined,
        failedAt: labels["ralph.failed.at"]
          ? new Date(labels["ralph.failed.at"]).getTime()
          : undefined,
      };
    });
  }

  private async shouldRemoveContainer(container: ContainerInfo): Promise<boolean> {
    const now = Date.now();

    // Don't remove running containers
    if (container.status === "running") {
      return false;
    }

    // Check idle time
    const idleTime = now - container.lastActivity;
    if (idleTime > this.policy.maxIdleTime) {
      log.debug(`Container ${container.name} idle for ${idleTime}ms, marking for removal`);
      return true;
    }

    // Check completed run retention
    if (container.runStatus === "completed" && container.completedAt) {
      const timeSinceCompletion = now - container.completedAt;
      if (timeSinceCompletion > this.policy.preserveCompleted) {
        log.debug(
          `Container ${container.name} completed ${timeSinceCompletion}ms ago, marking for removal`,
        );
        return true;
      }
    }

    // Check failed run retention
    if (container.runStatus === "failed" && container.failedAt) {
      const timeSinceFailure = now - container.failedAt;
      if (timeSinceFailure > this.policy.preserveFailed) {
        log.debug(
          `Container ${container.name} failed ${timeSinceFailure}ms ago, marking for removal`,
        );
        return true;
      }
    }

    return false;
  }

  private async enforceResourceLimits(report: GCReport): Promise<void> {
    const containers = await this.getRalphContainersInfo();

    // Check container count per user
    if (containers.length > this.policy.maxContainersPerUser) {
      log.warn(
        `Container count (${containers.length}) exceeds limit (${this.policy.maxContainersPerUser})`,
      );

      // Sort by last activity (oldest first)
      const sorted = containers
        .filter((c) => c.status !== "running")
        .toSorted((a, b) => a.lastActivity - b.lastActivity);

      const toRemove = sorted.slice(0, sorted.length - this.policy.maxContainersPerUser);

      for (const container of toRemove) {
        try {
          if (this.policy.backupBeforeDelete && container.runId) {
            await this.backupContainer(container);
            report.archived.push(container.id);
          }

          await this.removeContainer(container);
          report.removed.push(container.id);
          log.info(`GC removed container due to limit: ${container.name}`);
        } catch (err: any) {
          log.error(`Failed to remove container ${container.id}:`, err);
          report.errors.push({ containerId: container.id, error: err.message });
        }
      }
    }
  }

  private async backupContainer(container: ContainerInfo): Promise<void> {
    if (!container.runId) {
      return;
    }

    log.info(`Backing up container ${container.name} before removal`);

    try {
      // Export container logs
      const logsResult = await this.containerManager
        .exec(container.id, ["cat", "/workspace/progress.txt"])
        .catch(() => ({ stdout: "", stderr: "", exitCode: 1 }));

      // In a full implementation, this would save to storage backend
      // For now, just log that we would backup
      log.info(`Would backup logs for ${container.runId}: ${logsResult.stdout.length} bytes`);
    } catch (err) {
      log.error(`Failed to backup container ${container.id}:`, { error: String(err) });
    }
  }

  private async removeContainer(container: ContainerInfo): Promise<void> {
    try {
      if (container.status === "running") {
        await this.containerManager.stopContainer(container.id, 10);
      }
      await this.containerManager.removeContainer(container.id, true);
    } catch (err: any) {
      log.error(`Failed to remove container ${container.id}:`, err);
      throw err;
    }
  }

  async cleanupAll(): Promise<number> {
    log.info("Cleaning up all Ralph containers");
    return this.containerManager.cleanupRalphContainers();
  }

  getPolicy(): GCPolicy {
    return { ...this.policy };
  }

  updatePolicy(policy: Partial<GCPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    log.info("GC policy updated:", { policy: JSON.stringify(this.policy) });
  }
}
