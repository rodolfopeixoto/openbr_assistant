/**
 * Docker runtime implementation
 */

import { execa } from "execa";
import type {
  ContainerConfig,
  ContainerStatus,
  ContainerExecutionResult,
  ContainerRuntime as IContainerRuntime,
} from "./types.js";

export class DockerRuntime implements IContainerRuntime {
  readonly type = "docker" as const;

  async createContainer(config: ContainerConfig): Promise<ContainerStatus> {
    const args: string[] = [
      "run",
      "-d", // Detached mode
      "--rm", // Auto-remove when stopped
      `--name=openclaw-${config.containerId}`,
      `--memory=${config.resources.memory}`,
      `--cpus=${config.resources.cpus}`,
      `--network=${config.network}`,
    ];

    // Security options
    if (config.security.readOnlyRootFilesystem) {
      args.push("--read-only");
    }

    if (config.security.noNewPrivileges) {
      args.push("--security-opt=no-new-privileges:true");
    }

    if (config.security.dropCapabilities.includes("ALL")) {
      args.push("--cap-drop=ALL");
    } else {
      for (const cap of config.security.dropCapabilities) {
        args.push(`--cap-drop=${cap}`);
      }
    }

    // Add seccomp profile if provided
    if (config.security.seccompProfile) {
      args.push(`--security-opt=seccomp=${config.security.seccompProfile}`);
    }

    // Add mounts
    for (const mount of config.mounts) {
      const ro = mount.readOnly ? ":ro" : "";
      if (mount.type === "bind") {
        args.push(`-v=${mount.source}:${mount.target}${ro}`);
      } else if (mount.type === "volume") {
        args.push(
          `--mount=type=volume,source=${mount.source},target=${mount.target},readonly=${mount.readOnly}`,
        );
      } else if (mount.type === "tmpfs") {
        args.push(`--mount=type=tmpfs,target=${mount.target}`);
      }
    }

    // Add environment variables
    for (const [key, value] of Object.entries(config.env)) {
      args.push(`-e=${key}=${value}`);
    }

    // Add labels for identification
    args.push(`--label=openclaw.session=${config.sessionId}`);
    args.push(`--label=openclaw.agent=${config.agentId}`);
    args.push(`--label=openclaw.managed=true`);

    // Add image
    args.push(config.image);

    // Add custom command if provided
    if (config.command) {
      args.push(...config.command);
    }

    const { stdout } = await execa("docker", args);
    const containerId = stdout.trim();

    return {
      containerId,
      state: "running",
      startedAt: new Date(),
    };
  }

  async startContainer(containerId: string): Promise<void> {
    await execa("docker", ["start", containerId]);
  }

  async stopContainer(containerId: string, timeout: number = 30): Promise<void> {
    await execa("docker", ["stop", "-t", String(timeout), containerId]);
  }

  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    const args = ["rm"];
    if (force) {
      args.push("-f");
    }
    args.push(containerId);
    await execa("docker", args);
  }

  async execInContainer(
    containerId: string,
    command: string[],
    options: { timeout?: number; workingDir?: string } = {},
  ): Promise<ContainerExecutionResult> {
    const args = ["exec"];

    if (options.workingDir) {
      args.push("-w", options.workingDir);
    }

    args.push(containerId, ...command);

    const startTime = Date.now();

    try {
      const result = await execa("docker", args, {
        timeout: options.timeout ? options.timeout * 1000 : undefined,
        reject: false, // Don't throw on non-zero exit codes
      });

      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      // Handle timeout or other errors
      return {
        exitCode: -1,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  async getContainerStatus(containerId: string): Promise<ContainerStatus> {
    try {
      const { stdout } = await execa("docker", [
        "inspect",
        "-f",
        "{{.State.Status}}|{{.State.ExitCode}}|{{.State.StartedAt}}|{{.State.FinishedAt}}",
        containerId,
      ]);

      const [status, exitCodeStr, startedAtStr, finishedAtStr] = stdout.trim().split("|");

      let state: ContainerStatus["state"];
      switch (status) {
        case "running":
          state = "running";
          break;
        case "exited":
          state = "stopped";
          break;
        case "dead":
          state = "error";
          break;
        default:
          state = "pending";
      }

      return {
        containerId,
        state,
        startedAt:
          startedAtStr && startedAtStr !== "0001-01-01T00:00:00Z"
            ? new Date(startedAtStr)
            : undefined,
        finishedAt:
          finishedAtStr && finishedAtStr !== "0001-01-01T00:00:00Z"
            ? new Date(finishedAtStr)
            : undefined,
        exitCode: exitCodeStr ? parseInt(exitCodeStr, 10) : undefined,
      };
    } catch {
      return {
        containerId,
        state: "error",
        error: "Container not found",
      };
    }
  }

  async getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
    const { stdout } = await execa("docker", ["logs", "--tail", String(tail), containerId]);
    return stdout;
  }

  async listContainers(labels?: Record<string, string>): Promise<ContainerStatus[]> {
    const args = ["ps", "-a", "--format", "{{.ID}}|{{.Names}}|{{.State}}|{{.Status}}"];

    if (labels) {
      for (const [key, value] of Object.entries(labels)) {
        args.push("--filter", `label=${key}=${value}`);
      }
    }

    // Filter for OpenClaw managed containers
    args.push("--filter", "label=openclaw.managed=true");

    const { stdout } = await execa("docker", args);

    if (!stdout.trim()) {
      return [];
    }

    const containers: ContainerStatus[] = [];

    for (const line of stdout.trim().split("\n")) {
      const [id, , state] = line.split("|");

      let containerState: ContainerStatus["state"];
      switch (state) {
        case "running":
          containerState = "running";
          break;
        case "exited":
          containerState = "stopped";
          break;
        case "dead":
          containerState = "error";
          break;
        default:
          containerState = "pending";
      }

      containers.push({
        containerId: id,
        state: containerState,
      });
    }

    return containers;
  }
}
