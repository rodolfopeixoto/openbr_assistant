/**
 * Apple Container Engine - macOS Apple Silicon lightweight VMs
 */

import { execSync, spawn } from "child_process";
import { platform } from "os";
import type {
  Container,
  ContainerConfig,
  ContainerEngine,
  ContainerFilters,
  ContainerStats,
  ExecOptions,
  ExecResult,
} from "../types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";

const log = createSubsystemLogger("ralph:apple-container");

export class AppleContainerEngine implements ContainerEngine {
  readonly name = "apple-container" as const;
  version = "unknown";

  async isAvailable(): Promise<boolean> {
    // Only available on macOS with Apple Silicon
    if (platform() !== "darwin") {
      return false;
    }

    if (process.arch !== "arm64") {
      return false;
    }

    try {
      const result = execSync("container --version", { encoding: "utf8" });
      const match = result.match(/container version ([\d.]+)/);
      if (match) {
        this.version = match[1];
      }
      return true;
    } catch {
      return false;
    }
  }

  async createContainer(config: ContainerConfig): Promise<Container> {
    log.info(`Creating Apple container: ${config.name}`);

    try {
      // Apple Container uses Containerfile and builds images
      // First, ensure the base image is available
      await this.pullImage(config.image);

      // Create container using 'container run' with --detach
      const args = this.buildContainerArgs(config);
      const result = execSync(`container run --detach ${args.join(" ")} ${config.image}`, {
        encoding: "utf8",
      });

      const containerId = result.trim();

      log.info(`Apple container created: ${containerId}`);

      return {
        id: containerId,
        name: config.name,
        image: config.image,
        status: "running", // Apple Container starts immediately
        createdAt: new Date(),
        startedAt: new Date(),
        labels: config.labels || {},
      };
    } catch (err: any) {
      log.error(`Failed to create Apple container: ${err.message}`);
      throw new Error(`Failed to create Apple container: ${err.message}`, { cause: err });
    }
  }

  async startContainer(id: string): Promise<void> {
    try {
      execSync(`container start ${id}`);
      log.info(`Apple container started: ${id}`);
    } catch (err: any) {
      log.error(`Failed to start Apple container ${id}: ${err.message}`);
      throw new Error(`Failed to start container: ${err.message}`, { cause: err });
    }
  }

  async stopContainer(id: string, timeout = 30): Promise<void> {
    try {
      execSync(`container stop --time ${timeout} ${id}`);
      log.info(`Apple container stopped: ${id}`);
    } catch (err: any) {
      log.error(`Failed to stop Apple container ${id}: ${err.message}`);
      throw new Error(`Failed to stop container: ${err.message}`, { cause: err });
    }
  }

  async removeContainer(id: string, force = false): Promise<void> {
    try {
      // Apple Container uses 'rm' command
      const forceFlag = force ? "--force" : "";
      execSync(`container rm ${forceFlag} ${id}`);
      log.info(`Apple container removed: ${id}`);
    } catch (err: any) {
      log.error(`Failed to remove Apple container ${id}: ${err.message}`);
      throw new Error(`Failed to remove container: ${err.message}`, { cause: err });
    }
  }

  async listContainers(filters?: ContainerFilters): Promise<Container[]> {
    try {
      let filterArgs = "";

      if (filters?.status) {
        filterArgs += ` --filter status=${filters.status}`;
      }

      if (filters?.label) {
        for (const [key, value] of Object.entries(filters.label)) {
          filterArgs += ` --filter label=${key}=${value}`;
        }
      }

      const result = execSync(`container ps --all --format json${filterArgs}`, {
        encoding: "utf8",
      });

      // Apple Container outputs JSON lines
      const lines = result.trim().split("\n").filter(Boolean);
      return lines.map((line) => this.parseContainerJson(line));
    } catch (err: any) {
      log.error(`Failed to list Apple containers: ${err.message}`);
      return [];
    }
  }

  async getContainer(id: string): Promise<Container | null> {
    try {
      const result = execSync(`container inspect ${id}`, { encoding: "utf8" });
      return this.parseContainerInspect(result.trim());
    } catch {
      return null;
    }
  }

  async getStats(id: string): Promise<ContainerStats> {
    try {
      // Apple Container doesn't have direct stats command
      // We can use 'container inspect' to get some info
      const result = execSync(`container inspect ${id}`, { encoding: "utf8" });
      return this.parseStatsFromInspect(result.trim());
    } catch (err: any) {
      log.error(`Failed to get stats for Apple container ${id}: ${err.message}`);
      // Return default stats on error
      return {
        cpu: { usage: 0, system: 0, user: 0 },
        memory: { used: 0, total: 0, limit: 0, percent: 0 },
        disk: { read: 0, write: 0 },
        network: { rx: 0, tx: 0 },
        pids: 0,
      };
    }
  }

  async exec(id: string, command: string[], options?: ExecOptions): Promise<ExecResult> {
    const args = ["exec"];

    if (options?.workingDir) {
      args.push("--workdir", options.workingDir);
    }

    if (options?.env) {
      for (const [key, value] of Object.entries(options.env)) {
        args.push("--env", `${key}=${value}`);
      }
    }

    args.push(id, ...command);

    return new Promise((resolve, reject) => {
      const child = spawn("container", args, {
        timeout: options?.timeout,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on("error", (err) => {
        reject(err);
      });
    });
  }

  async pullImage(image: string): Promise<void> {
    try {
      log.info(`Pulling Apple container image: ${image}`);
      execSync(`container pull ${image}`, { stdio: "pipe" });
      log.info(`Apple container image pulled: ${image}`);
    } catch (err: any) {
      log.error(`Failed to pull Apple container image ${image}: ${err.message}`);
      throw new Error(`Failed to pull image: ${err.message}`, { cause: err });
    }
  }

  private buildContainerArgs(config: ContainerConfig): string[] {
    const args: string[] = [];

    args.push(`--name ${config.name}`);

    if (config.labels) {
      for (const [key, value] of Object.entries(config.labels)) {
        args.push(`--label ${key}=${value}`);
      }
    }

    for (const [key, value] of Object.entries(config.env)) {
      args.push(`--env ${key}=${value}`);
    }

    // Apple Container uses --volume for mounts
    for (const vol of config.volumes) {
      const ro = vol.readOnly ? ":ro" : "";
      args.push(`--volume ${vol.source}:${vol.target}${ro}`);
    }

    // Resource limits
    if (config.resources.cpu?.cores) {
      // Apple Container uses --cpus
      args.push(`--cpus ${config.resources.cpu.cores}`);
    }

    if (config.resources.memory?.limit) {
      args.push(`--memory ${config.resources.memory.limit}`);
    }

    // Security options
    if (config.sandbox.readOnlyRoot) {
      args.push("--read-only");
    }

    if (config.sandbox.user) {
      args.push(`--user ${config.sandbox.user}`);
    }

    if (config.workingDir) {
      args.push(`--workdir ${config.workingDir}`);
    }

    return args;
  }

  private parseContainerJson(json: string): Container {
    const data = JSON.parse(json);
    return {
      id: data.ID || data.Id,
      name: data.Names?.replace(/^\//, "") || data.Name?.replace(/^\//, ""),
      image: data.Image,
      status: this.mapStatus(data.State),
      createdAt: new Date(data.CreatedAt || data.Created),
      startedAt: data.StartedAt ? new Date(data.StartedAt) : undefined,
      finishedAt: data.FinishedAt ? new Date(data.FinishedAt) : undefined,
      labels: data.Labels || {},
    };
  }

  private parseContainerInspect(json: string): Container {
    const data = JSON.parse(json);
    const state = data.State || {};
    const config = data.Config || {};

    return {
      id: data.ID || data.Id,
      name: (data.Name || data.Names || "").replace(/^\//, ""),
      image: config.Image || data.Image,
      status: this.mapStatus(state.Status || state.status),
      createdAt: new Date(data.Created),
      startedAt: state.StartedAt ? new Date(state.StartedAt) : undefined,
      finishedAt: state.FinishedAt ? new Date(state.FinishedAt) : undefined,
      exitCode: state.ExitCode,
      labels: config.Labels || {},
    };
  }

  private parseStatsFromInspect(_json: string): ContainerStats {
    // Apple Container inspect doesn't provide detailed stats
    // Return minimal stats
    return {
      cpu: { usage: 0, system: 0, user: 0 },
      memory: { used: 0, total: 0, limit: 0, percent: 0 },
      disk: { read: 0, write: 0 },
      network: { rx: 0, tx: 0 },
      pids: 0,
    };
  }

  private mapStatus(status: string): Container["status"] {
    const mapping: Record<string, Container["status"]> = {
      created: "created",
      running: "running",
      paused: "paused",
      restarting: "restarting",
      removing: "removing",
      exited: "exited",
      dead: "dead",
    };
    return mapping[status] || "exited";
  }
}
