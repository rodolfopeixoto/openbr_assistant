/**
 * Apple Container runtime implementation (macOS only)
 *
 * Apple Container is a lightweight container runtime optimized
 * for Apple Silicon Macs using the Containerization Swift package.
 *
 * Website: https://github.com/apple/container
 *
 * Note: Apple Container has a different CLI interface than Docker/Podman
 * and is still in early development.
 */

import { execa } from "execa";
import type {
  ContainerConfig,
  ContainerStatus,
  ContainerExecutionResult,
  ContainerRuntime as IContainerRuntime,
} from "./types.js";

export class AppleContainerRuntime implements IContainerRuntime {
  readonly type = "apple-container" as const;

  /**
   * Check if running on macOS
   */
  private checkPlatform(): void {
    if (process.platform !== "darwin") {
      throw new Error("Apple Container is only supported on macOS");
    }
  }

  async createContainer(config: ContainerConfig): Promise<ContainerStatus> {
    this.checkPlatform();

    // Apple Container uses a different CLI structure
    // Commands: container run, container create, container start, etc.
    const args: string[] = ["run", "--detach", `--name=openclaw-${config.containerId}`];

    // Resource limits (Apple Container uses different flags)
    if (config.resources.memory) {
      args.push(`--memory-limit=${config.resources.memory}`);
    }

    // Security options
    if (config.security.readOnlyRootFilesystem) {
      args.push("--read-only");
    }

    // Note: Apple Container may have different security capabilities
    // These are mapped from Docker-style to Apple Container style

    // Add mounts
    for (const mount of config.mounts) {
      if (mount.type === "bind") {
        const ro = mount.readOnly ? ",readonly" : "";
        args.push(`--volume=${mount.source}:${mount.target}${ro}`);
      } else if (mount.type === "tmpfs") {
        args.push(`--tmpfs=${mount.target}`);
      }
      // Note: Apple Container may not support volume mounts the same way
    }

    // Add environment variables
    for (const [key, value] of Object.entries(config.env)) {
      args.push(`--env=${key}=${value}`);
    }

    // Add labels
    args.push(`--label=openclaw.session=${config.sessionId}`);
    args.push(`--label=openclaw.agent=${config.agentId}`);
    args.push(`--label=openclaw.managed=true`);

    // Add image
    args.push(config.image);

    // Add custom command if provided
    if (config.command) {
      args.push("--");
      args.push(...config.command);
    }

    try {
      const { stdout } = await execa("container", args);
      const containerId = stdout.trim();

      return {
        containerId,
        state: "running",
        startedAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to create Apple Container: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  async startContainer(containerId: string): Promise<void> {
    this.checkPlatform();
    await execa("container", ["start", containerId]);
  }

  async stopContainer(containerId: string, timeout: number = 30): Promise<void> {
    this.checkPlatform();
    await execa("container", ["stop", "--timeout", String(timeout), containerId]);
  }

  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    this.checkPlatform();
    const args = ["rm"];
    if (force) {
      args.push("--force");
    }
    args.push(containerId);
    await execa("container", args);
  }

  async execInContainer(
    containerId: string,
    command: string[],
    options: { timeout?: number; workingDir?: string } = {},
  ): Promise<ContainerExecutionResult> {
    this.checkPlatform();

    const args = ["exec"];

    if (options.workingDir) {
      args.push("--workdir", options.workingDir);
    }

    args.push(containerId);
    args.push("--");
    args.push(...command);

    const startTime = Date.now();

    try {
      const result = await execa("container", args, {
        timeout: options.timeout ? options.timeout * 1000 : undefined,
        reject: false,
      });

      return {
        exitCode: result.exitCode ?? -1,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        exitCode: -1,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  async getContainerStatus(containerId: string): Promise<ContainerStatus> {
    this.checkPlatform();

    try {
      // Apple Container inspect format may differ
      const { stdout } = await execa("container", [
        "inspect",
        "--format",
        "{{.State}}|{{.ExitCode}}|{{.Created}}",
        containerId,
      ]);

      const [state, exitCodeStr, createdStr] = stdout.trim().split("|");

      let containerState: ContainerStatus["state"];
      switch (state?.toLowerCase()) {
        case "running":
          containerState = "running";
          break;
        case "stopped":
        case "exited":
          containerState = "stopped";
          break;
        case "error":
        case "dead":
          containerState = "error";
          break;
        default:
          containerState = "pending";
      }

      return {
        containerId,
        state: containerState,
        startedAt: createdStr ? new Date(createdStr) : undefined,
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
    this.checkPlatform();

    try {
      const { stdout } = await execa("container", ["logs", "--tail", String(tail), containerId]);
      return stdout;
    } catch {
      // Apple Container may not support --tail, fallback to all logs
      try {
        const { stdout } = await execa("container", ["logs", containerId]);
        const lines = stdout.split("\n");
        return lines.slice(-tail).join("\n");
      } catch (error) {
        return `Error getting logs: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }

  async listContainers(labels?: Record<string, string>): Promise<ContainerStatus[]> {
    this.checkPlatform();

    const args = ["ps", "--all", "--format", "{{.ID}}|{{.Names}}|{{.State}}"];

    if (labels) {
      for (const [key, value] of Object.entries(labels)) {
        args.push("--filter", `${key}=${value}`);
      }
    }

    // Filter for OpenClaw managed containers
    args.push("--filter", "openclaw.managed=true");

    try {
      const { stdout } = await execa("container", args);

      if (!stdout.trim()) {
        return [];
      }

      const containers: ContainerStatus[] = [];

      for (const line of stdout.trim().split("\n")) {
        const [id, , state] = line.split("|");

        let containerState: ContainerStatus["state"];
        switch (state?.toLowerCase()) {
          case "running":
            containerState = "running";
            break;
          case "stopped":
          case "exited":
            containerState = "stopped";
            break;
          case "error":
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
    } catch {
      return [];
    }
  }

  /**
   * Check if Apple Container is properly configured and running
   */
  async checkSystemStatus(): Promise<{
    installed: boolean;
    running: boolean;
    version?: string;
    error?: string;
  }> {
    if (process.platform !== "darwin") {
      return { installed: false, running: false, error: "Not macOS" };
    }

    try {
      // Check if container CLI is available
      const { stdout } = await execa("container", ["--version"], { timeout: 5000 });
      const version = stdout.match(/version\s+(\S+)/)?.[1] || "unknown";

      // Check if container service is running
      try {
        await execa("container", ["system", "status"], { timeout: 5000 });
        return { installed: true, running: true, version };
      } catch {
        return {
          installed: true,
          running: false,
          version,
          error: "Container service not running. Run: container system start",
        };
      }
    } catch {
      return {
        installed: false,
        running: false,
        error: "Apple Container not installed. See: https://github.com/apple/container",
      };
    }
  }
}
