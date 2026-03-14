import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Container {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "paused" | "restarting" | "removing" | "dead";
  state: string;
  ports: Array<{
    internal: number;
    external: number;
    protocol: "tcp" | "udp";
  }>;
  mounts: Array<{
    source: string;
    destination: string;
    mode: "rw" | "ro";
  }>;
  env: Record<string, string>;
  labels: Record<string, string>;
  created: string;
  started?: string;
  finished?: string;
  exitCode?: number;
  health?: "healthy" | "unhealthy" | "starting" | "none";
  cpuPercent?: number;
  memoryUsage?: number;
  memoryLimit?: number;
}

export interface CreateContainerOptions {
  name: string;
  image: string;
  command?: string[];
  ports?: Array<{ host: number; container: number; protocol?: "tcp" | "udp" }>;
  volumes?: Array<{ host: string; container: string; readonly?: boolean }>;
  env?: Record<string, string>;
  labels?: Record<string, string>;
  restart?: "no" | "on-failure" | "always" | "unless-stopped";
  network?: string;
  memory?: string;
  cpus?: number;
  autoStart?: boolean;
}

export class ContainerManager {
  private runtime: "docker" | "podman" | null = null;

  async detectRuntime(): Promise<"docker" | "podman" | null> {
    try {
      await execAsync("docker ps");
      this.runtime = "docker";
      return "docker";
    } catch {
      try {
        await execAsync("podman ps");
        this.runtime = "podman";
        return "podman";
      } catch {
        return null;
      }
    }
  }

  async list(): Promise<Container[]> {
    const runtime = await this.detectRuntime();
    if (!runtime) return [];

    const cmd =
      runtime === "docker" ? "docker ps -a --format '{{json .}}'" : "podman ps -a --format json";

    try {
      const { stdout } = await execAsync(cmd);
      const lines = stdout
        .trim()
        .split("\n")
        .filter((l) => l.trim());

      return lines.map((line) => {
        const data = JSON.parse(line);
        return this.parseContainerData(data, runtime);
      });
    } catch (err) {
      console.error("[Containers] Failed to list:", err);
      return [];
    }
  }

  async create(options: CreateContainerOptions): Promise<Container> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");

    const args: string[] = ["create"];

    if (options.name) {
      args.push("--name", options.name);
    }

    for (const port of options.ports || []) {
      const protocol = port.protocol || "tcp";
      args.push("-p", `${port.host}:${port.container}/${protocol}`);
    }

    for (const vol of options.volumes || []) {
      const mode = vol.readonly ? "ro" : "rw";
      args.push("-v", `${vol.host}:${vol.container}:${mode}`);
    }

    for (const [key, value] of Object.entries(options.env || {})) {
      args.push("-e", `${key}=${value}`);
    }

    for (const [key, value] of Object.entries(options.labels || {})) {
      args.push("--label", `${key}=${value}`);
    }

    if (options.restart) {
      args.push("--restart", options.restart);
    }

    if (options.network) {
      args.push("--network", options.network);
    }

    if (options.memory) {
      args.push("--memory", options.memory);
    }

    if (options.cpus) {
      args.push("--cpus", options.cpus.toString());
    }

    args.push(options.image);

    if (options.command) {
      args.push(...options.command);
    }

    const cmd = runtime === "docker" ? `docker ${args.join(" ")}` : `podman ${args.join(" ")}`;

    const { stdout } = await execAsync(cmd);
    const containerId = stdout.trim();

    if (options.autoStart) {
      await this.start(containerId);
    }

    const containers = await this.list();
    const container = containers.find((c) => c.id === containerId || c.id.startsWith(containerId));
    if (!container) throw new Error("Failed to find created container");
    return container;
  }

  async start(containerId: string): Promise<void> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");

    const cmd =
      runtime === "docker" ? `docker start ${containerId}` : `podman start ${containerId}`;

    await execAsync(cmd);
  }

  async stop(containerId: string, timeout: number = 10): Promise<void> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");

    const cmd =
      runtime === "docker"
        ? `docker stop -t ${timeout} ${containerId}`
        : `podman stop -t ${timeout} ${containerId}`;

    await execAsync(cmd);
  }

  async restart(containerId: string, timeout: number = 10): Promise<void> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");

    const cmd =
      runtime === "docker"
        ? `docker restart -t ${timeout} ${containerId}`
        : `podman restart -t ${timeout} ${containerId}`;

    await execAsync(cmd);
  }

  async remove(containerId: string, force: boolean = false): Promise<void> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");

    const args = force ? ["-f"] : [];
    const cmd =
      runtime === "docker"
        ? `docker rm ${args.join(" ")} ${containerId}`
        : `podman rm ${args.join(" ")} ${containerId}`;

    await execAsync(cmd);
  }

  async logs(
    containerId: string,
    options: { tail?: number; since?: string } = {},
  ): Promise<string> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");

    const args: string[] = ["logs"];

    if (options.tail) {
      args.push("--tail", options.tail.toString());
    }

    if (options.since) {
      args.push("--since", options.since);
    }

    const cmd =
      runtime === "docker"
        ? `docker ${args.join(" ")} ${containerId}`
        : `podman ${args.join(" ")} ${containerId}`;

    const { stdout } = await execAsync(cmd);
    return stdout;
  }

  async stats(containerId?: string): Promise<any[]> {
    const runtime = await this.detectRuntime();
    if (!runtime) return [];

    const cmd =
      runtime === "docker"
        ? `docker stats --no-stream --format '{{json .}}' ${containerId || ""}`
        : `podman stats --no-stream --format json ${containerId || ""}`;

    try {
      const { stdout } = await execAsync(cmd);
      const lines = stdout
        .trim()
        .split("\n")
        .filter((l) => l.trim());

      return lines.map((line) => {
        const data = JSON.parse(line);
        return {
          id: data.ID || data.Container,
          name: data.Name,
          cpuPercent: parseFloat(data.CPUPerc || "0"),
          memoryUsage: this.parseMemory(data.MemUsage),
          memoryLimit: this.parseMemory(data.MemLimit),
          memoryPercent: parseFloat(data.MemPerc || "0"),
        };
      });
    } catch (err) {
      console.error("[Containers] Failed to get stats:", err);
      return [];
    }
  }

  private parseContainerData(data: any, runtime: string): Container {
    return {
      id: data.ID || data.Id,
      name: (data.Names || data.Name || "").replace(/^\//, ""),
      image: data.Image,
      status: this.parseStatus(data.State || data.Status),
      state: data.State || data.Status,
      ports: this.parsePorts(data.Ports),
      mounts: this.parseMounts(data.Mounts),
      env: {},
      labels: data.Labels || {},
      created: data.Created || data.CreatedAt,
      started: data.StartedAt,
      finished: data.FinishedAt,
      exitCode: data.ExitCode,
      health: data.Health?.Status,
    };
  }

  private parseStatus(state: string): Container["status"] {
    const statusMap: Record<string, Container["status"]> = {
      running: "running",
      exited: "stopped",
      paused: "paused",
      restarting: "restarting",
      dead: "dead",
      created: "stopped",
    };
    return statusMap[state.toLowerCase()] || "stopped";
  }

  private parsePorts(portsStr: string): Container["ports"] {
    if (!portsStr) return [];

    if (typeof portsStr === "string") {
      return portsStr
        .split(", ")
        .map((port) => {
          const match = port.match(/:(\d+)->(\d+)\/(tcp|udp)/);
          if (match) {
            return {
              external: parseInt(match[1]),
              internal: parseInt(match[2]),
              protocol: match[3] as "tcp" | "udp",
            };
          }
          return null;
        })
        .filter(Boolean) as Container["ports"];
    }

    return [];
  }

  private parseMounts(mounts: any[]): Container["mounts"] {
    if (!Array.isArray(mounts)) return [];

    return mounts.map((m) => ({
      source: m.Source || m.source,
      destination: m.Destination || m.destination || m.Target,
      mode: (m.Mode || m.mode || "rw") === "ro" ? "ro" : "rw",
    }));
  }

  private parseMemory(memStr: string): number {
    if (!memStr) return 0;

    const match = memStr.match(/^([\d.]+)\s*(KiB|MiB|GiB|TiB|kB|MB|GB|TB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers: Record<string, number> = {
      kib: 1024,
      mib: 1024 ** 2,
      gib: 1024 ** 3,
      tib: 1024 ** 4,
      kb: 1000,
      mb: 1000 ** 2,
      gb: 1000 ** 3,
      tb: 1000 ** 4,
    };

    return Math.floor(value * (multipliers[unit] || 1));
  }
}

// Singleton
let containerManager: ContainerManager | null = null;

export function getContainerManager(): ContainerManager {
  if (!containerManager) {
    containerManager = new ContainerManager();
  }
  return containerManager;
}
