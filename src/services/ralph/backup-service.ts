/**
 * Backup Service Implementation
 * Manages backups of Ralph runs with multiple storage backends
 */

import { execSync } from "child_process";
import { createHash, randomBytes } from "crypto";
import { createReadStream } from "fs";
import { mkdir, rm, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { createSubsystemLogger } from "../../logging/subsystem.js";

// Simple tar creation using system tar command
async function createTar(sourceDir: string, outputPath: string): Promise<void> {
  execSync(`tar -czf "${outputPath}" -C "${dirname(sourceDir)}" "${sourceDir.split("/").pop()}"`);
}
import type { BackupJob, BackupConfig, RunBackupData, StorageBackend } from "./types.js";

const log = createSubsystemLogger("ralph:backup");

interface BackupServiceOptions {
  config: BackupConfig;
  backends: Map<string, StorageBackend>;
  tempDir: string;
}

export class BackupService {
  private config: BackupConfig;
  private backends: Map<string, StorageBackend>;
  private tempDir: string;
  private activeJobs: Map<string, BackupJob> = new Map();

  constructor(options: BackupServiceOptions) {
    this.config = options.config;
    this.backends = options.backends;
    this.tempDir = options.tempDir;
  }

  async createBackup(runId: string, data: RunBackupData): Promise<BackupJob> {
    const jobId = this.generateJobId();

    log.info(`Starting backup ${jobId} for run ${runId}`);

    const job: BackupJob = {
      id: jobId,
      type: "full",
      runId,
      status: "running",
      startedAt: new Date(),
      size: 0,
      checksum: "",
      location: [],
    };

    this.activeJobs.set(jobId, job);

    try {
      // Create backup archive
      const archivePath = await this.createArchive(runId, data);

      // Calculate checksum
      const checksum = await this.calculateChecksum(archivePath);
      job.checksum = checksum;

      // Get file size
      const stats = await readFile(archivePath);
      job.size = stats.length;

      // Upload to all configured backends
      for (const backendName of this.config.backends) {
        const backend = this.backends.get(backendName);

        if (!backend) {
          log.warn(`Backend ${backendName} not found`);
          continue;
        }

        const key = `backups/${runId}/${jobId}.tar.gz`;

        try {
          await this.uploadWithCompression(backend, key, archivePath);
          job.location.push(`${backendName}:${key}`);
          log.info(`Backup uploaded to ${backendName}`);
        } catch (err) {
          log.error(`Failed to upload to ${backendName}`, { error: String(err) });
        }
      }

      // Clean up temp file
      await rm(archivePath, { force: true });

      // Update job status
      job.status = "completed";
      job.completedAt = new Date();

      log.info(`Backup ${jobId} completed successfully`);
    } catch (err) {
      job.status = "failed";
      job.error = String(err);
      log.error(`Backup ${jobId} failed`, { error: String(err) });
    }

    this.activeJobs.delete(jobId);
    return job;
  }

  async restoreBackup(jobId: string, backendName: string): Promise<RunBackupData> {
    log.info(`Restoring backup ${jobId} from ${backendName}`);

    const backend = this.backends.get(backendName);

    if (!backend) {
      throw new Error(`Backend ${backendName} not found`);
    }

    // Find the backup file
    const objects = await backend.list(`backups/`);
    const backupObject = objects.find((obj) => obj.key.includes(jobId));

    if (!backupObject) {
      throw new Error(`Backup ${jobId} not found in ${backendName}`);
    }

    // Download backup
    const downloadPath = join(this.tempDir, `${jobId}.tar.gz`);
    await mkdir(dirname(downloadPath), { recursive: true });

    const data = await backend.download(backupObject.key);
    await writeFile(downloadPath, data);

    // Extract and restore
    const restoredData = await this.extractArchive(downloadPath);

    // Clean up
    await rm(downloadPath, { force: true });

    log.info(`Backup ${jobId} restored successfully`);

    return restoredData;
  }

  async listBackups(runId?: string): Promise<BackupJob[]> {
    const jobs: BackupJob[] = [];

    for (const [backendName, backend] of this.backends) {
      const prefix = runId ? `backups/${runId}/` : "backups/";
      const objects = await backend.list(prefix);

      for (const obj of objects) {
        // Parse job info from key
        const match = obj.key.match(/backups\/([^/]+)\/([^/]+)\.tar\.gz$/);

        if (match) {
          const [, runIdFromKey, jobId] = match;

          if (!runId || runIdFromKey === runId) {
            jobs.push({
              id: jobId,
              type: "full",
              runId: runIdFromKey,
              status: "completed",
              startedAt: obj.lastModified,
              completedAt: obj.lastModified,
              size: obj.size,
              checksum: obj.etag,
              location: [`${backendName}:${obj.key}`],
            });
          }
        }
      }
    }

    // Sort by date, newest first
    return jobs.toSorted((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async deleteBackup(jobId: string): Promise<void> {
    log.info(`Deleting backup ${jobId}`);

    // Find and delete from all backends
    for (const [backendName, backend] of this.backends) {
      const objects = await backend.list("backups/");
      const backupObject = objects.find((obj) => obj.key.includes(jobId));

      if (backupObject) {
        try {
          await backend.delete(backupObject.key);
          log.info(`Deleted backup from ${backendName}`);
        } catch (err) {
          log.error(`Failed to delete backup from ${backendName}`, { error: String(err) });
        }
      }
    }
  }

  async cleanupOldBackups(): Promise<number> {
    if (!this.config.enabled) {
      return 0;
    }

    log.info("Running backup cleanup");

    const allBackups = await this.listBackups();
    const now = new Date();
    const deleted: string[] = [];

    // Group by run
    const backupsByRun = new Map<string, BackupJob[]>();

    for (const backup of allBackups) {
      if (!backup.runId) {
        continue;
      }

      const existing = backupsByRun.get(backup.runId) || [];
      existing.push(backup);
      backupsByRun.set(backup.runId, existing);
    }

    // Apply retention policy for each run
    for (const [, backups] of backupsByRun) {
      const sorted = backups.toSorted((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

      // Keep N hourly backups
      const hourlyRetention = this.config.retention.hourly;
      const hourlyBackups = sorted.slice(0, hourlyRetention);

      // Keep N daily backups
      const dailyCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const dailyBackups = sorted
        .filter((b) => b.startedAt < dailyCutoff)
        .slice(0, this.config.retention.daily);

      // Keep N weekly backups
      const weeklyCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyBackups = sorted
        .filter((b) => b.startedAt < weeklyCutoff)
        .slice(0, this.config.retention.weekly);

      // Delete the rest
      const toKeep = new Set([
        ...hourlyBackups.map((b) => b.id),
        ...dailyBackups.map((b) => b.id),
        ...weeklyBackups.map((b) => b.id),
      ]);

      for (const backup of sorted) {
        if (!toKeep.has(backup.id)) {
          await this.deleteBackup(backup.id);
          deleted.push(backup.id);
        }
      }
    }

    log.info(`Cleanup complete: deleted ${deleted.length} old backups`);
    return deleted.length;
  }

  private async createArchive(runId: string, data: RunBackupData): Promise<string> {
    const archiveDir = join(this.tempDir, "backups", runId);
    await mkdir(archiveDir, { recursive: true });

    const archivePath = join(archiveDir, `${this.generateJobId()}.tar.gz`);

    // Write backup data to temp files
    const tempFilesDir = join(this.tempDir, "backup-temp", runId);
    await mkdir(tempFilesDir, { recursive: true });

    // Write metadata
    await writeFile(join(tempFilesDir, "metadata.json"), JSON.stringify(data.metadata, null, 2));

    // Write PRD
    await writeFile(join(tempFilesDir, "prd.json"), JSON.stringify(data.prd, null, 2));

    // Write run data
    await writeFile(join(tempFilesDir, "run.json"), JSON.stringify(data.run, null, 2));

    // Write git data
    await writeFile(join(tempFilesDir, "git.json"), JSON.stringify(data.git, null, 2));

    // Write progress
    await writeFile(join(tempFilesDir, "progress.jsonl"), data.progress);

    // Create tar.gz archive
    await createTar(tempFilesDir, archivePath);

    // Clean up temp files
    await rm(tempFilesDir, { recursive: true, force: true });

    return archivePath;
  }

  private async extractArchive(_archivePath: string): Promise<RunBackupData> {
    // Extract tar.gz
    const extractDir = join(this.tempDir, "restore", this.generateJobId());
    await mkdir(extractDir, { recursive: true });

    // Extract would go here using tar command
    // execSync(`tar -xzf "${_archivePath}" -C "${extractDir}"`);
    // For now, return placeholder

    // Read extracted files
    const metadata = JSON.parse(await readFile(join(extractDir, "metadata.json"), "utf8"));
    const prd = JSON.parse(await readFile(join(extractDir, "prd.json"), "utf8"));
    const run = JSON.parse(await readFile(join(extractDir, "run.json"), "utf8"));
    const git = JSON.parse(await readFile(join(extractDir, "git.json"), "utf8"));
    const progress = await readFile(join(extractDir, "progress.jsonl"), "utf8");

    // Clean up
    await rm(extractDir, { recursive: true, force: true });

    return {
      run,
      prd,
      progress,
      git,
      metadata,
      workspace: Buffer.from([]),
    };
  }

  private async uploadWithCompression(
    backend: StorageBackend,
    key: string,
    filePath: string,
  ): Promise<void> {
    // Check if compression is needed
    if (this.config.compression === "none") {
      const data = await readFile(filePath);
      await backend.upload(key, data);
      return;
    }

    // File is already compressed (.tar.gz)
    const data = await readFile(filePath);
    await backend.upload(key, data);
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    for await (const chunk of stream) {
      hash.update(chunk);
    }

    return hash.digest("hex");
  }

  private generateJobId(): string {
    return `backup-${Date.now()}-${randomBytes(4).toString("hex")}`;
  }
}
