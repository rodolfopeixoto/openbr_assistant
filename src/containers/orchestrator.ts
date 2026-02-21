/**
 * ContainerOrchestrator - Manages container lifecycle
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ContainerConfig,
  ContainerStatus,
  ContainerRuntime as IContainerRuntime,
  ContainerExecutionResult,
} from "./types.js";
import { DockerRuntime } from "./docker-runtime.js";
import { runtimeDetector, type ContainerRuntime } from "./runtime-detector.js";

export { type ContainerConfig, type ContainerStatus, type ContainerExecutionResult };

export class ContainerOrchestrator {
  private runtime: IContainerRuntime | null = null;
  private activeContainers: Map<string, ContainerStatus> = new Map();
  private runtimeType: ContainerRuntime = null;

  constructor(runtime?: IContainerRuntime) {
    if (runtime) {
      this.runtime = runtime;
      this.runtimeType = runtime.type;
    }
  }

  /**
   * Initialize the orchestrator by detecting available runtime
   */
  async initialize(): Promise<void> {
    if (this.runtime) {
      return; // Already initialized
    }

    const runtimeType = await runtimeDetector.detect();

    if (!runtimeType) {
      throw new Error(
        "No container runtime found. Please install Docker, Podman, or Apple Container.",
      );
    }

    this.runtimeType = runtimeType;

    switch (runtimeType) {
      case "docker":
        this.runtime = new DockerRuntime();
        break;
      case "apple-container":
        throw new Error("Apple Container runtime not yet implemented");
      case "podman":
        throw new Error("Podman runtime not yet implemented");
      default:
        throw new Error(`Unsupported runtime: ${runtimeType}`);
    }
  }

  /**
   * Check if orchestrator is initialized
   */
  isInitialized(): boolean {
    return this.runtime !== null;
  }

  /**
   * Get the current runtime type
   */
  getRuntimeType(): ContainerRuntime {
    return this.runtimeType;
  }

  /**
   * Create and start a new container
   */
  async createContainer(config: ContainerConfig): Promise<ContainerStatus> {
    if (!this.runtime) {
      throw new Error("Orchestrator not initialized. Call initialize() first.");
    }

    const status = await this.runtime.createContainer(config);
    this.activeContainers.set(config.containerId, status);

    return status;
  }

  /**
   * Execute a command in a container
   */
  async execInContainer(
    containerId: string,
    command: string[],
    options: { timeout?: number; workingDir?: string } = {},
  ): Promise<ContainerExecutionResult> {
    if (!this.runtime) {
      throw new Error("Orchestrator not initialized. Call initialize() first.");
    }

    return this.runtime.execInContainer(containerId, command, options);
  }

  /**
   * Stop and remove a container
   */
  async destroyContainer(containerId: string, force: boolean = false): Promise<void> {
    if (!this.runtime) {
      throw new Error("Orchestrator not initialized. Call initialize() first.");
    }

    try {
      await this.runtime.stopContainer(containerId, 10);
      await this.runtime.removeContainer(containerId, force);
    } catch (error) {
      // Container might already be stopped/removed
      console.warn(`Failed to destroy container ${containerId}:`, error);
    } finally {
      this.activeContainers.delete(containerId);
    }
  }

  /**
   * Get container status
   */
  async getContainerStatus(containerId: string): Promise<ContainerStatus> {
    if (!this.runtime) {
      throw new Error("Orchestrator not initialized. Call initialize() first.");
    }

    const status = await this.runtime.getContainerStatus(containerId);

    // Update cache
    if (this.activeContainers.has(containerId)) {
      this.activeContainers.set(containerId, status);
    }

    return status;
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
    if (!this.runtime) {
      throw new Error("Orchestrator not initialized. Call initialize() first.");
    }

    return this.runtime.getContainerLogs(containerId, tail);
  }

  /**
   * List all managed containers
   */
  async listContainers(): Promise<ContainerStatus[]> {
    if (!this.runtime) {
      throw new Error("Orchestrator not initialized. Call initialize() first.");
    }

    return this.runtime.listContainers({ "openclaw.managed": "true" });
  }

  /**
   * Clean up all active containers
   */
  async cleanup(): Promise<void> {
    if (!this.runtime) {
      return;
    }

    const cleanupPromises: Promise<void>[] = [];

    for (const containerId of this.activeContainers.keys()) {
      cleanupPromises.push(
        this.destroyContainer(containerId, true).catch((error) => {
          console.error(`Failed to cleanup container ${containerId}:`, error);
        }),
      );
    }

    await Promise.all(cleanupPromises);
    this.activeContainers.clear();
  }

  /**
   * Generate a unique container ID
   */
  generateContainerId(): string {
    return `oc-${uuidv4().slice(0, 8)}`;
  }

  /**
   * Get count of active containers
   */
  getActiveContainerCount(): number {
    return this.activeContainers.size;
  }
}

// Singleton instance
export const containerOrchestrator = new ContainerOrchestrator();
