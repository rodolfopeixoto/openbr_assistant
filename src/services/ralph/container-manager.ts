/**
 * Container Manager - Orchestrates container engines and manages lifecycle
 */

import { platform } from "os";
import type {
  Container,
  ContainerConfig,
  ContainerEngine,
  ContainerEngineType,
  ContainerFilters,
  ContainerStats,
  ExecOptions,
  ExecResult,
  RalphServiceConfig,
} from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

export type { Container } from "./types.js";
import { AppleContainerEngine } from "./engines/apple-container.js";
import { DockerEngine } from "./engines/docker.js";
import { PodmanEngine } from "./engines/podman.js";

const log = createSubsystemLogger("ralph:container-manager");

export class ContainerManager {
  private engines: Map<ContainerEngineType, ContainerEngine> = new Map();
  private activeEngine: ContainerEngine | null = null;
  private config: RalphServiceConfig["container"];

  constructor(config: RalphServiceConfig["container"]) {
    this.config = config;
    this.initializeEngines();
  }

  private async initializeEngines(): Promise<void> {
    const engines: ContainerEngine[] = [
      new DockerEngine(),
      new PodmanEngine(),
      new AppleContainerEngine(),
    ];

    for (const engine of engines) {
      try {
        const available = await engine.isAvailable();
        if (available) {
          this.engines.set(engine.name, engine);
          log.info(`Container engine available: ${engine.name} v${engine.version}`);
        }
      } catch (err) {
        log.debug(`Engine ${engine.name} not available:`, { error: String(err) });
      }
    }

    await this.selectActiveEngine();
  }

  private async selectActiveEngine(): Promise<void> {
    const preferredEngine = this.config.engine;

    if (preferredEngine !== "auto") {
      if (this.engines.has(preferredEngine)) {
        this.activeEngine = this.engines.get(preferredEngine)!;
        log.info(`Using preferred engine: ${preferredEngine}`);
        return;
      }
      log.warn(`Preferred engine ${preferredEngine} not available, auto-selecting`);
    }

    // Auto-select best engine
    const os = platform();
    const priority: ContainerEngineType[] =
      os === "darwin" && process.arch === "arm64"
        ? ["apple-container", "docker", "podman"]
        : ["docker", "podman"];

    for (const engineName of priority) {
      if (this.engines.has(engineName)) {
        this.activeEngine = this.engines.get(engineName)!;
        log.info(`Auto-selected engine: ${engineName}`);
        return;
      }
    }

    throw new Error(
      "No container engine available. Please install Docker, Podman, or Apple Container.",
    );
  }

  getActiveEngine(): ContainerEngine {
    if (!this.activeEngine) {
      throw new Error("No container engine active");
    }
    return this.activeEngine;
  }

  getAvailableEngines(): ContainerEngineType[] {
    return Array.from(this.engines.keys());
  }

  async switchEngine(engineName: ContainerEngineType): Promise<void> {
    if (!this.engines.has(engineName)) {
      throw new Error(`Engine ${engineName} not available`);
    }
    this.activeEngine = this.engines.get(engineName)!;
    log.info(`Switched to engine: ${engineName}`);
  }

  async createContainer(config: ContainerConfig): Promise<Container> {
    const engine = this.getActiveEngine();
    return engine.createContainer(config);
  }

  async startContainer(id: string): Promise<void> {
    const engine = this.getActiveEngine();
    return engine.startContainer(id);
  }

  async stopContainer(id: string, timeout?: number): Promise<void> {
    const engine = this.getActiveEngine();
    return engine.stopContainer(id, timeout);
  }

  async removeContainer(id: string, force?: boolean): Promise<void> {
    const engine = this.getActiveEngine();
    return engine.removeContainer(id, force);
  }

  async listContainers(filters?: ContainerFilters): Promise<Container[]> {
    const engine = this.getActiveEngine();
    return engine.listContainers(filters);
  }

  async getContainer(id: string): Promise<Container | null> {
    const engine = this.getActiveEngine();
    return engine.getContainer(id);
  }

  async getStats(id: string): Promise<ContainerStats> {
    const engine = this.getActiveEngine();
    return engine.getStats(id);
  }

  async exec(id: string, command: string[], options?: ExecOptions): Promise<ExecResult> {
    const engine = this.getActiveEngine();
    return engine.exec(id, command, options);
  }

  async pullImage(image: string): Promise<void> {
    const engine = this.getActiveEngine();
    return engine.pullImage(image);
  }

  async createRalphContainer(
    runId: string,
    workspacePath: string,
    env: Record<string, string>,
  ): Promise<Container> {
    const config: ContainerConfig = {
      name: `ralph-${runId}`,
      image: this.getDefaultImage(),
      env,
      volumes: [
        {
          source: workspacePath,
          target: "/workspace",
          type: "bind",
          readOnly: false,
        },
      ],
      resources: this.config.resources,
      sandbox: this.config.sandbox,
      workingDir: "/workspace",
      labels: {
        "ralph.run.id": runId,
        "ralph.managed": "true",
        "ralph.created": new Date().toISOString(),
      },
    };

    return this.createContainer(config);
  }

  private getDefaultImage(): string {
    return "mcr.microsoft.com/devcontainers/typescript-node:20";
  }

  async listRalphContainers(): Promise<Container[]> {
    return this.listContainers({
      label: { "ralph.managed": "true" },
    });
  }

  async cleanupRalphContainers(): Promise<number> {
    const containers = await this.listRalphContainers();
    let removed = 0;

    for (const container of containers) {
      try {
        if (container.status === "running") {
          await this.stopContainer(container.id, 10);
        }
        await this.removeContainer(container.id, true);
        removed++;
        log.info(`Cleaned up container: ${container.name}`);
      } catch (err) {
        log.error(`Failed to cleanup container ${container.id}:`, { error: String(err) });
      }
    }

    return removed;
  }
}
