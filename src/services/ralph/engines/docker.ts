/**
 * Docker Container Engine
 * Primary container engine supporting Linux, macOS, and Windows
 */

import { execSync, spawn } from "child_process";
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

const log = createSubsystemLogger("ralph:docker");

export class DockerEngine implements ContainerEngine {
  readonly name = "docker" as const;
  version = "unknown";

  async isAvailable(): Promise<boolean> {
    try {
      const result = execSync("docker --version", { encoding: "utf8" });
      const match = result.match(/Docker version ([\d.]+)/);
      if (match) {
        this.version = match[1];
      }
      return true;
    } catch {
      return false;
    }
  }

  async createContainer(config: ContainerConfig): Promise<Container> {
    log.info(`Creating container: ${config.name}`);

    try {
      await this.pullImage(config.image);

      const args = this.buildDockerArgs(config);
      const result = execSync(`docker create ${args.join(" ")} ${config.image}`, {
        encoding: "utf8",
      });

      const containerId = result.trim();

      log.info(`Container created: ${containerId}`);

      return {
        id: containerId,
        name: config.name,
        image: config.image,
        status: "created",
        createdAt: new Date(),
        labels: config.labels || {},
      };
    } catch (err: any) {
      log.error(`Failed to create container: ${err.message}`);
      throw new Error(`Failed to create container: ${err.message}`, { cause: err });
    }
  }

  async startContainer(id: string): Promise<void> {
    try {
      execSync(`docker start ${id}`);
      log.info(`Container started: ${id}`);
    } catch (err: any) {
      log.error(`Failed to start container ${id}: ${err.message}`);
      throw new Error(`Failed to start container: ${err.message}`, { cause: err });
    }
  }

  async stopContainer(id: string, timeout = 30): Promise<void> {
    try {
      execSync(`docker stop -t ${timeout} ${id}`);
      log.info(`Container stopped: ${id}`);
    } catch (err: any) {
      log.error(`Failed to stop container ${id}: ${err.message}`);
      throw new Error(`Failed to stop container: ${err.message}`, { cause: err });
    }
  }

  async removeContainer(id: string, force = false): Promise<void> {
    try {
      const forceFlag = force ? "-f" : "";
      execSync(`docker rm ${forceFlag} ${id}`);
      log.info(`Container removed: ${id}`);
    } catch (err: any) {
      log.error(`Failed to remove container ${id}: ${err.message}`);
      throw new Error(`Failed to remove container: ${err.message}`, { cause: err });
    }
  }

  async listContainers(filters?: ContainerFilters): Promise<Container[]> {
    try {
      let filterArgs = "";

      if (filters?.status) {
        filterArgs += ` -f status=${filters.status}`;
      }

      if (filters?.label) {
        for (const [key, value] of Object.entries(filters.label)) {
          filterArgs += ` -f label=${key}=${value}`;
        }
      }

      const result = execSync(`docker ps -a --format '{{json .}}'${filterArgs}`, {
        encoding: "utf8",
      });

      const lines = result.trim().split("\n").filter(Boolean);
      return lines.map((line) => this.parseContainerJson(line));
    } catch (err: any) {
      log.error(`Failed to list containers: ${err.message}`);
      return [];
    }
  }

  async getContainer(id: string): Promise<Container | null> {
    try {
      const result = execSync(`docker inspect ${id} --format '{{json .}}'`, { encoding: "utf8" });
      return this.parseContainerInspect(result.trim());
    } catch {
      return null;
    }
  }

  async getStats(id: string): Promise<ContainerStats> {
    try {
      const result = execSync(`docker stats ${id} --no-stream --format '{{json .}}'`, {
        encoding: "utf8",
      });
      return this.parseStatsJson(result.trim());
    } catch (err: any) {
      log.error(`Failed to get stats for ${id}: ${err.message}`);
      throw new Error(`Failed to get container stats: ${err.message}`, { cause: err });
    }
  }

  async exec(id: string, command: string[], options?: ExecOptions): Promise<ExecResult> {
    const args = ["exec"];

    if (options?.workingDir) {
      args.push("-w", options.workingDir);
    }

    if (options?.env) {
      for (const [key, value] of Object.entries(options.env)) {
        args.push("-e", `${key}=${value}`);
      }
    }

    args.push(id, ...command);

    return new Promise((resolve, reject) => {
      const child = spawn("docker", args, {
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
      log.info(`Pulling image: ${image}`);
      execSync(`docker pull ${image}`, { stdio: "pipe" });
      log.info(`Image pulled: ${image}`);
    } catch (err: any) {
      log.error(`Failed to pull image ${image}: ${err.message}`);
      throw new Error(`Failed to pull image: ${err.message}`, { cause: err });
    }
  }

  private buildDockerArgs(config: ContainerConfig): string[] {
    const args: string[] = [];

    args.push(`--name ${config.name}`);

    if (config.labels) {
      for (const [key, value] of Object.entries(config.labels)) {
        args.push(`--label ${key}=${value}`);
      }
    }

    for (const [key, value] of Object.entries(config.env)) {
      args.push(`-e ${key}=${value}`);
    }

    for (const vol of config.volumes) {
      const ro = vol.readOnly ? ":ro" : "";
      args.push(`-v ${vol.source}:${vol.target}${ro}`);
    }

    if (config.resources.cpu?.cores) {
      args.push(`--cpus=${config.resources.cpu.cores}`);
    }

    if (config.resources.memory?.limit) {
      args.push(`--memory=${config.resources.memory.limit}`);
    }

    if (config.resources.pids?.limit) {
      args.push(`--pids-limit=${config.resources.pids.limit}`);
    }

    if (config.network) {
      if (config.network.mode === "none") {
        args.push("--network none");
      } else if (config.network.mode === "host") {
        args.push("--network host");
      } else if (config.network.name) {
        args.push(`--network ${config.network.name}`);
      }
    }

    if (config.sandbox.readOnlyRoot) {
      args.push("--read-only");
    }

    if (config.sandbox.noNewPrivileges) {
      args.push("--security-opt no-new-privileges:true");
    }

    if (config.sandbox.user) {
      args.push(`--user ${config.sandbox.user}`);
    }

    for (const cap of config.sandbox.dropCapabilities) {
      args.push(`--cap-drop ${cap}`);
    }

    for (const cap of config.sandbox.addCapabilities) {
      args.push(`--cap-add ${cap}`);
    }

    if (config.workingDir) {
      args.push(`-w ${config.workingDir}`);
    }

    return args;
  }

  private parseContainerJson(json: string): Container {
    const data = JSON.parse(json);
    return {
      id: data.ID,
      name: data.Names.replace(/^\//, ""),
      image: data.Image,
      status: this.mapStatus(data.State),
      createdAt: new Date(data.CreatedAt),
      startedAt: data.StartedAt ? new Date(data.StartedAt) : undefined,
      finishedAt: data.FinishedAt ? new Date(data.FinishedAt) : undefined,
      labels: {},
    };
  }

  private parseContainerInspect(json: string): Container {
    const data = JSON.parse(json);
    return {
      id: data.Id,
      name: data.Name.replace(/^\//, ""),
      image: data.Config.Image,
      status: this.mapStatus(data.State.Status),
      createdAt: new Date(data.Created),
      startedAt: data.State.StartedAt ? new Date(data.State.StartedAt) : undefined,
      finishedAt: data.State.FinishedAt ? new Date(data.State.FinishedAt) : undefined,
      exitCode: data.State.ExitCode,
      labels: data.Config.Labels || {},
    };
  }

  private parseStatsJson(json: string): ContainerStats {
    const data = JSON.parse(json);
    const cpuPercent = parseFloat(data.CPUPerc) || 0;

    return {
      cpu: {
        usage: cpuPercent,
        system: 0,
        user: cpuPercent,
      },
      memory: {
        used: 0,
        total: 0,
        limit: 0,
        percent: cpuPercent,
      },
      disk: {
        read: 0,
        write: 0,
      },
      network: {
        rx: 0,
        tx: 0,
      },
      pids: parseInt(data.PIDs) || 0,
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
