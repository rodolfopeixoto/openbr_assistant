# Spec A3: Containers - API Completa

## 🎯 Objetivo
Completar a API de containers para suportar lifecycle completo (create, start, stop, remove, logs, exec).

## 📋 Estado Atual
- **UI:** Básica (77 linhas), funcionalidade limitada
- **Backend:** Parcial - só `stop` implementado
- **Problemas:**
  - `handleContainerStart` retorna erro: "Container start is handled via the sandbox system"
  - Sem criação de containers
  - Sem logs streaming
  - Sem exec

## 🏗️ Arquitetura

### Backend
```
src/
├── gateway/server-methods/containers.ts    # EXPANDIR
├── services/container/
│   ├── lifecycle.ts                        # Create/start/stop/remove
│   ├── logs.ts                            # Logs streaming
│   └── exec.ts                            # Exec commands
└── config/types.containers.ts
```

## 🔧 Implementação Backend

### 1. Gateway Handlers

#### `containers.list`
```typescript
// Já existe, mas melhorar para retornar mais info
interface Container {
  id: string;
  name: string;
  image: string;
  status: 'created' | 'running' | 'paused' | 'restarting' | 'removing' | 'exited' | 'dead';
  state: {
    running: boolean;
    paused: boolean;
    restarting: boolean;
    oomKilled: boolean;
    dead: boolean;
    pid: number;
    exitCode: number;
    error: string;
    startedAt: string;
    finishedAt: string;
  };
  ports: Array<{
    ip: string;
    privatePort: number;
    publicPort: number;
    type: 'tcp' | 'udp';
  }>;
  mounts: Array<{
    type: 'bind' | 'volume' | 'tmpfs';
    source: string;
    target: string;
  }>;
  network: {
    ipAddress: string;
    gateway: string;
  };
  resources: {
    cpuUsage: number;      // Percentage
    memoryUsage: number;   // Bytes
    memoryLimit: number;   // Bytes
  };
  createdAt: string;
  labels: Record<string, string>;
}
```

#### `containers.create`
```typescript
interface CreateContainerParams {
  name: string;
  image: string;
  command?: string[];
  env?: Record<string, string>;
  ports?: Array<{
    hostPort: number;
    containerPort: number;
    protocol?: 'tcp' | 'udp';
  }>;
  volumes?: Array<{
    hostPath: string;
    containerPath: string;
    readOnly?: boolean;
  }>;
  resources?: {
    memoryLimit?: number;     // Bytes
    cpuLimit?: number;        // Percentage (0-100)
  };
  network?: {
    mode?: 'bridge' | 'host' | 'none';
  };
  restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  labels?: Record<string, string>;
}

// Retorna: { containerId: string }
// Pull image se necessário (com progresso)
```

#### `containers.start` (CORRIGIR)
```typescript
interface StartContainerParams {
  containerId: string;
}

// CORRIGIR: Atualmente retorna erro
// Implementar: docker start {containerId}
// Retorna: { success: boolean }
```

#### `containers.stop` (Já existe)
```typescript
// Implementado, mas melhorar:
// - Adicionar timeout parameter
// - Graceful shutdown
```

#### `containers.restart`
```typescript
interface RestartContainerParams {
  containerId: string;
  timeout?: number;  // Segundos para graceful shutdown
}
```

#### `containers.remove`
```typescript
interface RemoveContainerParams {
  containerId: string;
  force?: boolean;      // Forçar remoção mesmo se running
  removeVolumes?: boolean;  // Remover volumes associados
}
```

#### `containers.logs`
```typescript
interface ContainerLogsParams {
  containerId: string;
  tail?: number;        // Últimas N linhas
  since?: string;       // ISO timestamp
  until?: string;       // ISO timestamp
  follow?: boolean;     // Streaming (WebSocket)
  timestamps?: boolean; // Incluir timestamps
}

// Retorna: { lines: string[] }
// Se follow=true, abre WebSocket connection
```

#### `containers.exec`
```typescript
interface ContainerExecParams {
  containerId: string;
  command: string[];    // ['ls', '-la']
  tty?: boolean;        // Alocar TTY
  stdin?: boolean;      // Permitir stdin
  env?: Record<string, string>;
  workingDir?: string;
}

// Retorna: { execId: string, output: string }
// Se tty=true, abre WebSocket para interatividade
```

#### `containers.stats`
```typescript
interface ContainerStatsParams {
  containerId: string;
  stream?: boolean;     // Se true, stream contínuo
}

// Retorna stats de CPU, memory, network, disk
// { cpu: { usage: 45.2 }, memory: { usage: 1024000, limit: 2048000 } }
```

#### `containers.inspect`
```typescript
// Retorna detalhes completos do container
// Config, state, network, volumes, etc.
```

### 2. Container Service

```typescript
// src/services/container/lifecycle.ts

class ContainerLifecycle {
  async create(params: CreateContainerParams): Promise<string> {
    // 1. Validar parâmetros
    // 2. Verificar se imagem existe localmente
    // 3. Se não existir, fazer pull (com progresso reportável)
    // 4. Criar container
    // 5. Retornar ID
  }
  
  async start(containerId: string): Promise<void> {
    // FIX: Implementar de verdade
    // docker start {containerId}
  }
  
  async stop(containerId: string, timeout?: number): Promise<void> {
    // docker stop -t {timeout} {containerId}
  }
  
  async remove(containerId: string, options: RemoveOptions): Promise<void> {
    // docker rm {force ? '-f' : ''} {containerId}
    // Se removeVolumes, também remover volumes
  }
}

class ContainerLogs {
  async getLogs(containerId: string, options: LogsOptions): Promise<string[]> {
    // docker logs {containerId} --tail {tail} --since {since}
  }
  
  async streamLogs(containerId: string, ws: WebSocket): Promise<void> {
    // docker logs -f {containerId}
    // Pipe para WebSocket
  }
}

class ContainerExec {
  async exec(containerId: string, command: string[]): Promise<string> {
    // docker exec {containerId} {command}
    // Capturar stdout/stderr
    // Retornar output
  }
  
  async execInteractive(containerId: string, ws: WebSocket): Promise<void> {
    // docker exec -it {containerId} /bin/bash
    // Pipe stdin/stdout para WebSocket
  }
}
```

## 🎨 Implementação Frontend

### View (Expandir)

```typescript
// ui/src/ui/views/containers.ts

export function renderContainersView(state: AppViewState) {
  return html`
    <div class="containers-view">
      ${renderHeader(state)}
      ${state.containersLoading
        ? renderLoading()
        : html`
            <div class="containers-grid">
              ${state.containers.map(container => renderContainerCard(container, state))}
            </div>
          `}
      ${state.containerCreateModalOpen ? renderCreateModal(state) : nothing}
      ${state.containerLogsModalOpen ? renderLogsModal(state) : nothing}
    </div>
  `;
}

function renderContainerCard(container: Container, state: AppViewState) {
  const statusColor = container.status === 'running' ? 'success' : 
                      container.status === 'exited' ? 'neutral' : 'warning';
  
  return html`
    <div class="container-card">
      <div class="card-header">
        <div class="status-indicator ${statusColor}"></div>
        <h3>${container.name}</h3>
        <span class="image">${container.image}</span>
      </div>
      
      <div class="card-body">
        <div class="info-row">
          <span class="label">Status:</span>
          <span class="value ${container.status}">${container.status}</span>
        </div>
        <div class="info-row">
          <span class="label">Ports:</span>
          <span class="value">
            ${container.ports.map(p => `${p.publicPort}:${p.privatePort}`).join(', ')}
          </span>
        </div>
        <div class="info-row">
          <span class="label">CPU:</span>
          <span class="value">${container.resources.cpuUsage.toFixed(1)}%</span>
        </div>
        <div class="info-row">
          <span class="label">Memory:</span>
          <span class="value">
            ${formatBytes(container.resources.memoryUsage)} / ${formatBytes(container.resources.memoryLimit)}
          </span>
        </div>
      </div>
      
      <div class="card-actions">
        ${container.status === 'exited' ? html`
          <button @click="${() => state.handleContainerStart(container.id)}" class="btn-primary">
            ${icons.play} Start
          </button>
        ` : nothing}
        ${container.status === 'running' ? html`
          <button @click="${() => state.handleContainerStop(container.id)}" class="btn-secondary">
            ${icons.square} Stop
          </button>
          <button @click="${() => state.handleContainerLogs(container.id)}" class="btn-secondary">
            ${icons.terminal} Logs
          </button>
        ` : nothing}
        <button @click="${() => state.handleContainerRemove(container.id)}" class="btn-danger">
          ${icons.trash} Remove
        </button>
      </div>
    </div>
  `;
}

function renderCreateModal(state: AppViewState) {
  return html`
    <div class="modal-overlay" @click="${() => state.handleCloseCreateModal()}">
      <div class="modal" @click="${(e: Event) => e.stopPropagation()}">
        <h2>Create Container</h2>
        <form @submit="${(e: SubmitEvent) => {
          e.preventDefault();
          state.handleContainerCreate();
        }}">
          <div class="form-group">
            <label>Name</label>
            <input type="text" .value="${state.containerForm.name}" 
                   @input="${(e: InputEvent) => state.handleContainerFormChange('name', (e.target as HTMLInputElement).value)}"
                   required />
          </div>
          
          <div class="form-group">
            <label>Image</label>
            <input type="text" .value="${state.containerForm.image}"
                   @input="${(e: InputEvent) => state.handleContainerFormChange('image', (e.target as HTMLInputElement).value)}"
                   placeholder="e.g., node:18-alpine"
                   required />
          </div>
          
          <div class="form-group">
            <label>Command</label>
            <input type="text" .value="${state.containerForm.command}"
                   @input="${(e: InputEvent) => state.handleContainerFormChange('command', (e.target as HTMLInputElement).value)}"
                   placeholder="e.g., npm start" />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Host Port</label>
              <input type="number" .value="${state.containerForm.hostPort}"
                     @input="${(e: InputEvent) => state.handleContainerFormChange('hostPort', (e.target as HTMLInputElement).value)}" />
            </div>
            <div class="form-group">
              <label>Container Port</label>
              <input type="number" .value="${state.containerForm.containerPort}"
                     @input="${(e: InputEvent) => state.handleContainerFormChange('containerPort', (e.target as HTMLInputElement).value)}" />
            </div>
          </div>
          
          <div class="form-group">
            <label>Memory Limit (MB)</label>
            <input type="number" .value="${state.containerForm.memoryLimit}"
                   @input="${(e: InputEvent) => state.handleContainerFormChange('memoryLimit', (e.target as HTMLInputElement).value)}" />
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="${() => state.handleCloseCreateModal()}" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderLogsModal(state: AppViewState) {
  return html`
    <div class="modal-overlay" @click="${() => state.handleCloseLogsModal()}">
      <div class="modal modal-large" @click="${(e: Event) => e.stopPropagation()}">
        <div class="modal-header">
          <h2>Container Logs</h2>
          <button @click="${() => state.handleCloseLogsModal()}" class="btn-close">
            ${icons.x}
          </button>
        </div>
        <div class="logs-container" id="logs-container">
          ${state.containerLogs.map(line => html`<div class="log-line">${line}</div>`)}
        </div>
        <div class="modal-actions">
          <button @click="${() => state.handleContainerLogsFollow()}" class="btn-secondary">
            ${state.containerLogsFollowing ? 'Stop Following' : 'Follow'}
          </button>
          <button @click="${() => state.handleContainerLogsClear()}" class="btn-secondary">
            Clear
          </button>
        </div>
      </div>
    </div>
  `;
}
```

## 📊 Critérios de Aceitação

- [ ] Backend: `containers.create` com pull automático
- [ ] Backend: `containers.start` (CORRIGIR erro atual)
- [ ] Backend: `containers.stop` com timeout
- [ ] Backend: `containers.restart`
- [ ] Backend: `containers.remove`
- [ ] Backend: `containers.logs` com streaming
- [ ] Backend: `containers.exec`
- [ ] Backend: `containers.stats`
- [ ] Frontend: Grid de cards com status
- [ ] Frontend: Ações (start/stop/remove)
- [ ] Frontend: Modal de criação
- [ ] Frontend: Modal de logs com streaming
- [ ] Frontend: Visualização de recursos (CPU/memory)

## ⏱️ Estimativa
- Backend: 2 dias
- Frontend: 2 dias
- Testes: 1 dia
- **Total: 5 dias**
