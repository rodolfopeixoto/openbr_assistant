# Spec: Containers CRUD Completo

## 🎯 Objetivo
Implementar operações CRUD completas para containers Docker/Podman, permitindo criar, visualizar, controlar e remover containers.

## 📋 Estado Atual
- ✅ UI básica existe (77 linhas) - lista containers
- ✅ Listagem funcional via `system.containers.list`
- ⚠️ Start/Stop parcial (chama system handlers)
- ❌ Create container não implementado
- ❌ Remove container não implementado
- ❌ View logs stubbed
- ❌ Resource stats não implementado

## 🏗️ Arquitetura

```
src/
├── gateway/server-methods/containers.ts    # Handlers RPC (NOVO)
├── services/containers/
│   ├── docker.ts                           # Docker API client
│   ├── podman.ts                           # Podman API client
│   └── manager.ts                          # Gerenciador abstrato
└── config/feature-registry.ts              # Feature flag
```

## 🔧 Implementação Backend

### 1. Container Manager (src/services/containers/manager.ts)

```typescript
interface Container {
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

interface CreateContainerOptions {
  name: string;
  image: string;
  command?: string[];
  ports?: Array<{ host: number; container: number; protocol?: "tcp" | "udp" }>;
  volumes?: Array<{ host: string; container: string; readonly?: boolean }>;
  env?: Record<string, string>;
  labels?: Record<string, string>;
  restart?: "no" | "on-failure" | "always" | "unless-stopped";
  network?: string;
  memory?: string;      // e.g., "512m", "2g"
  cpus?: number;        // e.g., 1.5
  autoStart?: boolean;
}

class ContainerManager {
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
    
    const cmd = runtime === "docker" 
      ? "docker ps -a --format '{{json .}}'"
      : "podman ps -a --format json";
    
    try {
      const { stdout } = await execAsync(cmd);
      const lines = stdout.trim().split("\n");
      
      return lines.map(line => {
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
    
    // Nome
    if (options.name) {
      args.push("--name", options.name);
    }
    
    // Ports
    for (const port of options.ports || []) {
      const protocol = port.protocol || "tcp";
      args.push("-p", `${port.host}:${port.container}/${protocol}`);
    }
    
    // Volumes
    for (const vol of options.volumes || []) {
      const mode = vol.readonly ? "ro" : "rw";
      args.push("-v", `${vol.host}:${vol.container}:${mode}`);
    }
    
    // Environment
    for (const [key, value] of Object.entries(options.env || {})) {
      args.push("-e", `${key}=${value}`);
    }
    
    // Labels
    for (const [key, value] of Object.entries(options.labels || {})) {
      args.push("--label", `${key}=${value}`);
    }
    
    // Restart policy
    if (options.restart) {
      args.push("--restart", options.restart);
    }
    
    // Network
    if (options.network) {
      args.push("--network", options.network);
    }
    
    // Memory limit
    if (options.memory) {
      args.push("--memory", options.memory);
    }
    
    // CPU limit
    if (options.cpus) {
      args.push("--cpus", options.cpus.toString());
    }
    
    // Image
    args.push(options.image);
    
    // Command
    if (options.command) {
      args.push(...options.command);
    }
    
    const cmd = runtime === "docker" 
      ? `docker ${args.join(" ")}`
      : `podman ${args.join(" ")}`;
    
    const { stdout } = await execAsync(cmd);
    const containerId = stdout.trim();
    
    // Auto-start if requested
    if (options.autoStart) {
      await this.start(containerId);
    }
    
    // Retornar container criado
    const containers = await this.list();
    return containers.find(c => c.id === containerId || c.id.startsWith(containerId))!;
  }
  
  async start(containerId: string): Promise<void> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");
    
    const cmd = runtime === "docker"
      ? `docker start ${containerId}`
      : `podman start ${containerId}`;
    
    await execAsync(cmd);
  }
  
  async stop(containerId: string, timeout: number = 10): Promise<void> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");
    
    const cmd = runtime === "docker"
      ? `docker stop -t ${timeout} ${containerId}`
      : `podman stop -t ${timeout} ${containerId}`;
    
    await execAsync(cmd);
  }
  
  async restart(containerId: string, timeout: number = 10): Promise<void> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");
    
    const cmd = runtime === "docker"
      ? `docker restart -t ${timeout} ${containerId}`
      : `podman restart -t ${timeout} ${containerId}`;
    
    await execAsync(cmd);
  }
  
  async remove(containerId: string, force: boolean = false): Promise<void> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");
    
    const args = force ? ["-f"] : [];
    const cmd = runtime === "docker"
      ? `docker rm ${args.join(" ")} ${containerId}`
      : `podman rm ${args.join(" ")} ${containerId}`;
    
    await execAsync(cmd);
  }
  
  async logs(containerId: string, options: { tail?: number; since?: string; follow?: boolean } = {}): Promise<string> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");
    
    const args: string[] = ["logs"];
    
    if (options.tail) {
      args.push("--tail", options.tail.toString());
    }
    
    if (options.since) {
      args.push("--since", options.since);
    }
    
    const cmd = runtime === "docker"
      ? `docker ${args.join(" ")} ${containerId}`
      : `podman ${args.join(" ")} ${containerId}`;
    
    const { stdout } = await execAsync(cmd);
    return stdout;
  }
  
  async stats(containerId?: string): Promise<ContainerStats[]> {
    const runtime = await this.detectRuntime();
    if (!runtime) return [];
    
    const cmd = runtime === "docker"
      ? `docker stats --no-stream --format '{{json .}}' ${containerId || ""}`
      : `podman stats --no-stream --format json ${containerId || ""}`;
    
    try {
      const { stdout } = await execAsync(cmd);
      const lines = stdout.trim().split("\n");
      
      return lines.map(line => {
        const data = JSON.parse(line);
        return {
          id: data.ID || data.Container,
          name: data.Name,
          cpuPercent: parseFloat(data.CPUPerc || "0"),
          memoryUsage: this.parseMemory(data.MemUsage),
          memoryLimit: this.parseMemory(data.MemLimit),
          memoryPercent: parseFloat(data.MemPerc || "0"),
          netIO: data.NetIO,
          blockIO: data.BlockIO,
          pids: parseInt(data.PIDs || "0"),
        };
      });
    } catch (err) {
      console.error("[Containers] Failed to get stats:", err);
      return [];
    }
  }
  
  async exec(containerId: string, command: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const runtime = await this.detectRuntime();
    if (!runtime) throw new Error("No container runtime available");
    
    const cmd = runtime === "docker"
      ? `docker exec ${containerId} ${command.join(" ")}`
      : `podman exec ${containerId} ${command.join(" ")}`;
    
    try {
      const { stdout, stderr } = await execAsync(cmd);
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return { 
        stdout: err.stdout || "", 
        stderr: err.stderr || "", 
        exitCode: err.code || 1 
      };
    }
  }
  
  private parseContainerData(data: any, runtime: string): Container {
    // Parser genérico que funciona tanto para Docker quanto Podman
    return {
      id: data.ID || data.Id,
      name: (data.Names || data.Name || "").replace(/^\//, ""),
      image: data.Image,
      status: this.parseStatus(data.State || data.Status),
      state: data.State || data.Status,
      ports: this.parsePorts(data.Ports),
      mounts: this.parseMounts(data.Mounts),
      env: {},  // Requer inspect
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
    
    // Docker: "0.0.0.0:8080->80/tcp, 0.0.0.0:3000->3000/tcp"
    // Podman: array de objetos
    
    if (typeof portsStr === "string") {
      return portsStr.split(", ").map(port => {
        const match = port.match(/:(\d+)->(\d+)\/(tcp|udp)/);
        if (match) {
          return {
            external: parseInt(match[1]),
            internal: parseInt(match[2]),
            protocol: match[3] as "tcp" | "udp",
          };
        }
        return null;
      }).filter(Boolean) as Container["ports"];
    }
    
    return [];
  }
  
  private parseMounts(mounts: any[]): Container["mounts"] {
    if (!Array.isArray(mounts)) return [];
    
    return mounts.map(m => ({
      source: m.Source || m.source,
      destination: m.Destination || m.destination || m.Target,
      mode: (m.Mode || m.mode || "rw") === "ro" ? "ro" : "rw",
    }));
  }
  
  private parseMemory(memStr: string): number {
    if (!memStr) return 0;
    
    // Parse "1.5GiB / 7.663GiB"
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
```

### 2. Gateway Handlers (src/gateway/server-methods/containers.ts)

```typescript
import { ContainerManager } from "../../services/containers/manager.js";

const manager = new ContainerManager();

export const containersHandlers: GatewayRequestHandlers = {
  "containers.list": async ({ respond }) => {
    try {
      const containers = await manager.list();
      respond(true, { containers });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to list containers: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "containers.create": async ({ params, respond }) => {
    try {
      const container = await manager.create(params);
      respond(true, { container });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to create container: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "containers.start": async ({ params, respond }) => {
    const { id } = params;
    
    try {
      await manager.start(id);
      respond(true, { success: true });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to start container: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "containers.stop": async ({ params, respond }) => {
    const { id, timeout = 10 } = params;
    
    try {
      await manager.stop(id, timeout);
      respond(true, { success: true });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to stop container: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "containers.restart": async ({ params, respond }) => {
    const { id, timeout = 10 } = params;
    
    try {
      await manager.restart(id, timeout);
      respond(true, { success: true });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to restart container: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "containers.remove": async ({ params, respond }) => {
    const { id, force = false } = params;
    
    try {
      await manager.remove(id, force);
      respond(true, { success: true });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to remove container: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "containers.logs": async ({ params, respond }) => {
    const { id, tail = 100, since } = params;
    
    try {
      const logs = await manager.logs(id, { tail, since });
      respond(true, { logs });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to get logs: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "containers.stats": async ({ params, respond }) => {
    const { id } = params;
    
    try {
      const stats = await manager.stats(id);
      respond(true, { stats });
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to get stats: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
  
  "containers.exec": async ({ params, respond }) => {
    const { id, command } = params;
    
    try {
      const result = await manager.exec(id, command);
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to exec command: ${err instanceof Error ? err.message : String(err)}`
      ));
    }
  },
};
```

## 🎨 UI Improvements

### 1. Container List Melhorada (ui/src/ui/views/containers.ts)

```typescript
function renderContainerCard(container: Container, state: AppViewState) {
  const statusColors: Record<string, string> = {
    running: "#22c55e",
    stopped: "#ef4444",
    paused: "#f59e0b",
    restarting: "#3b82f6",
  };
  
  return html`
    <div class="container-card ${container.status}">
      <div class="container-header">
        <div class="container-info">
          <span class="status-dot" style="background: ${statusColors[container.status]}"></span>
          <span class="container-name">${container.name}</span>
          <span class="container-image">${container.image}</span>
        </div>
        
        <div class="container-actions">
          ${container.status === "running" ? html`
            <button @click="${() => state.handleContainerStop(container.id)}" title="Stop">⏹️</button>
            <button @click="${() => state.handleContainerRestart(container.id)}" title="Restart">🔄</button>
            <button @click="${() => state.handleContainerLogs(container.id)}" title="Logs">📋</button>
          ` : html`
            <button @click="${() => state.handleContainerStart(container.id)}" title="Start">▶️</button>
            <button @click="${() => state.handleContainerRemove(container.id)}" title="Remove">🗑️</button>
          `}
        </div>
      </div>
      
      <div class="container-meta">
        ${container.ports?.length > 0 ? html`
          <div class="meta-item">
            <span class="label">Ports:</span>
            ${container.ports.map(p => html`
              <span class="port">${p.external}:${p.internal}/${p.protocol}</span>
            `)}
          </div>
        ` : nothing}
        
        ${container.cpuPercent !== undefined ? html`
          <div class="meta-item">
            <span class="label">CPU:</span>
            <span>${container.cpuPercent.toFixed(1)}%</span>
          </div>
        ` : nothing}
        
        ${container.memoryUsage !== undefined ? html`
          <div class="meta-item">
            <span class="label">Memory:</span>
            <span>${formatBytes(container.memoryUsage)} / ${formatBytes(container.memoryLimit || 0)}</span>
          </div>
        ` : nothing}
      </div>
    </div>
  `;
}
```

### 2. Create Container Modal

```typescript
function renderCreateModal(state: AppViewState) {
  if (!state.containerCreateModalOpen) return nothing;
  
  return html`
    <div class="modal-overlay" @click="${() => state.handleContainerCloseCreateModal()}">
      <div class="modal-content" @click="${(e: Event) => e.stopPropagation()}">
        <h3>Create Container</h3>
        
        <div class="form-group">
          <label>Name</label>
          <input 
            type="text" 
            .value="${state.containerCreateForm.name}"
            @input="${(e: InputEvent) => state.handleContainerFormUpdate('name', (e.target as HTMLInputElement).value)}"
            placeholder="my-container"
          />
        </div>
        
        <div class="form-group">
          <label>Image *</label>
          <input 
            type="text" 
            .value="${state.containerCreateForm.image}"
            @input="${(e: InputEvent) => state.handleContainerFormUpdate('image', (e.target as HTMLInputElement).value)}"
            placeholder="nginx:latest"
            required
          />
        </div>
        
        <div class="form-group">
          <label>Command</label>
          <input 
            type="text" 
            .value="${state.containerCreateForm.command}"
            @input="${(e: InputEvent) => state.handleContainerFormUpdate('command', (e.target as HTMLInputElement).value)}"
            placeholder="Optional: sh -c 'echo hello'"
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Port Mapping</label>
            <div class="port-mapping">
              <input 
                type="number" 
                placeholder="Host"
                .value="${state.containerCreateForm.portHost}"
                @input="${(e: InputEvent) => state.handleContainerFormUpdate('portHost', (e.target as HTMLInputElement).value)}"
              />
              <span>→</span>
              <input 
                type="number" 
                placeholder="Container"
                .value="${state.containerCreateForm.portContainer}"
                @input="${(e: InputEvent) => state.handleContainerFormUpdate('portContainer', (e.target as HTMLInputElement).value)}"
              />
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label>Environment Variables</label>
          <textarea 
            .value="${state.containerCreateForm.env}"
            @input="${(e: InputEvent) => state.handleContainerFormUpdate('env', (e.target as HTMLTextAreaElement).value)}"
            placeholder="KEY=value\nANOTHER_KEY=value"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>Volume Mounts</label>
          <input 
            type="text" 
            .value="${state.containerCreateForm.volumes}"
            @input="${(e: InputEvent) => state.handleContainerFormUpdate('volumes', (e.target as HTMLInputElement).value)}"
            placeholder="/host/path:/container/path"
          />
        </div>
        
        <div class="form-group">
          <label class="checkbox">
            <input 
              type="checkbox"
              .checked="${state.containerCreateForm.autoStart}"
              @change="${(e: InputEvent) => state.handleContainerFormUpdate('autoStart', (e.target as HTMLInputElement).checked)}"
            />
            Start container after creation
          </label>
        </div>
        
        <div class="modal-actions">
          <button class="btn-secondary" @click="${() => state.handleContainerCloseCreateModal()}">Cancel</button>
          <button 
            class="btn-primary" 
            @click="${() => state.handleContainerCreate()}"
            ?disabled="${!state.containerCreateForm.image}"
          >
            Create Container
          </button>
        </div>
      </div>
    </div>
  `;
}
```

### 3. Logs Viewer Modal

```typescript
function renderLogsModal(state: AppViewState) {
  if (!state.containerLogsModalOpen) return nothing;
  
  const logs = state.containerLogs || "Loading...";
  
  return html`
    <div class="modal-overlay logs-modal" @click="${() => state.handleContainerCloseLogsModal()}">
      <div class="modal-content logs-content" @click="${(e: Event) => e.stopPropagation()}">
        <div class="logs-header">
          <h3>Container Logs: ${state.containerLogsName}</h3>
          <div class="logs-actions">
            <button @click="${() => state.handleContainerLogsRefresh()}">🔄 Refresh</button>
            <button @click="${() => state.handleContainerLogsDownload()}">⬇️ Download</button>
          </div>
        </div>
        
        <pre class="logs-output">${logs}</pre>
        
        <div class="modal-actions">
          <button class="btn-secondary" @click="${() => state.handleContainerCloseLogsModal()}">Close</button>
        </div>
      </div>
    </div>
  `;
}
```

## ✅ Acceptance Criteria

- [ ] Criar `src/gateway/server-methods/containers.ts`
- [ ] Implementar detecção automática de Docker/Podman
- [ ] Implementar `containers.list` real
- [ ] Implementar `containers.create` com form completo
- [ ] Implementar `containers.remove` com opção force
- [ ] Implementar `containers.logs` funcional
- [ ] Implementar `containers.stats` com CPU/Memory
- [ ] UI com botão "Create Container"
- [ ] Modal de criação com todos os campos
- [ ] Visualização de logs em modal
- [ ] Mostrar resource stats (CPU/Memory)
- [ ] Registrar handler em `server-methods.ts`

## 🚀 Testing

```bash
# Verificar se Docker/Podman está instalado
docker ps
# ou
podman ps

# Testar via gateway
curl -X POST http://localhost:18789/api \
  -H "Content-Type: application/json" \
  -d '{"method": "containers.list"}'

# Criar container
curl -X POST http://localhost:18789/api \
  -H "Content-Type: application/json" \
  -d '{
    "method": "containers.create",
    "params": {
      "name": "test-nginx",
      "image": "nginx:alpine",
      "ports": [{"host": 8080, "container": 80}],
      "autoStart": true
    }
  }'
```
