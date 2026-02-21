# OpenClaw Container Security Module

Módulo de segurança com isolamento por containers para execução de agentes.

## Funcionalidades

- **Runtime Detection**: Auto-detecção de Docker, Apple Container e Podman
- **Container Orchestration**: Gerenciamento de ciclo de vida de containers
- **Secure Executor**: Execução segura com validação de comandos
- **Blocked Commands**: Bloqueio de 30+ comandos perigosos
- **Audit Logging**: Log estruturado de todas as operações

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    SecureExecutor                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Permission  │  │   Command    │  │     Audit        │  │
│  │   Check      │  │  Validation  │  │    Logger        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│                    ContainerOrchestrator                    │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         ▼                 ▼                 ▼              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │   Docker    │   │   Podman    │   │   Apple     │     │
│  │             │   │             │   │  Container  │     │
│  └─────────────┘   └─────────────┘   └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Uso

### Inicialização

```typescript
import { secureExecutor } from './containers/index.js';

// Inicializa o executor
await secureExecutor.initialize();
```

### Execução Segura

```typescript
const result = await secureExecutor.execute({
  tool: 'file-read',
  args: { path: '/workspace/data.txt' },
  sessionId: 'session-123',
  agentId: 'agent-456',
  permissions: {
    allowTools: ['file-read', 'file-write'],
    denyTools: ['shell'],
    allowedPaths: ['/workspace'],
    blockedPaths: ['/etc', '/root'],
    networkAccess: false,
    maxExecutionTime: 30,
    maxMemory: '512m',
  },
});

if (result.success) {
  console.log('Output:', result.output);
} else {
  console.error('Error:', result.error);
}
```

### Validação de Comandos

```typescript
import { isCommandBlocked, validateCommands } from './security/blocked-commands.js';

// Verifica se um comando é bloqueado
const blocked = isCommandBlocked('rm -rf /');
if (blocked) {
  console.error(`Blocked: ${blocked.description} (${blocked.severity})`);
}

// Valida múltiplos comandos
const validation = validateCommands([
  'ls -la',
  'rm -rf /',
  'cat file.txt',
]);

if (!validation.valid) {
  console.error('Blocked commands:', validation.blocked);
}
```

### Container Orchestrator

```typescript
import { containerOrchestrator } from './containers/index.js';

// Inicializa
await containerOrchestrator.initialize();

// Lista containers ativos
const containers = await containerOrchestrator.listContainers();

// Limpa todos os containers
await containerOrchestrator.cleanup();
```

## Comandos Bloqueados

### Críticos
- `rm -rf /` - Deleção recursiva do root
- `mkfs.*` - Formatação de discos
- `dd if=* of=/dev/*` - Escrita direta em dispositivos
- `chmod -R 777 /` - Permissões 777 no root

### Altos
- `shutdown`, `reboot`, `halt`, `poweroff` - Controle de energia
- `userdel -r root` - Deleção de usuário root
- `iptables -F` - Flush de regras de firewall
- `apt-get remove systemd` - Remoção de systemd

### Médios
- Fork bombs (`:(){ :|: & };:`)
- Download e execução de scripts (`wget | bash`)
- Comandos eval perigosos

Total: **30+ comandos bloqueados** em 8 categorias

## Docker Image

```bash
# Build da imagem do agente
cd containers/agent-runtime
docker build -t openclaw/agent-runtime:latest .
```

A imagem inclui:
- Node.js 20 (Alpine)
- Usuário não-root (openclaw)
- Dependências mínimas (bash, curl, git)
- Filesystem read-only
- Capabilities drop ALL

## Testes

```bash
# Testes de comandos bloqueados
pnpm test src/security/__tests__/blocked-commands.test.ts

# Testes do runtime detector
pnpm test src/containers/__tests__/runtime-detector.test.ts
```

## Configuração de Segurança

### Permissões por Sessão

```typescript
interface ExecutionPermissions {
  allowTools: string[];      // Ferramentas permitidas
  denyTools: string[];       // Ferramentas explicitamente negadas
  allowedPaths: string[];    // Paths acessíveis
  blockedPaths: string[];    // Paths bloqueados
  networkAccess: boolean;    // Acesso à rede
  maxExecutionTime: number;  // Timeout em segundos
  maxMemory: string;         // Limite de memória (ex: '512m')
}
```

### Container Security

- **Read-only root filesystem**: Previne modificações no sistema
- **No new privileges**: Processos não podem escalar privilégios
- **Drop all capabilities**: Remove todas as capabilities do kernel
- **Seccomp**: Opcional - perfil seccomp para filtrar syscalls
- **AppArmor**: Opcional - perfil AppArmor para controle de acesso

## Integração com Audit Logger

```typescript
import { secureExecutor } from './containers/index.js';

const executor = new SecureExecutor(undefined, async (event) => {
  // Envia para sistema de audit
  await auditLogger.log({
    timestamp: event.timestamp,
    type: event.type,
    tool: event.tool,
    command: event.command,
    outcome: event.outcome,
    context: event.context,
  });
});
```

## Roadmap

### Implementado
- [x] Runtime detection (Docker, Podman, Apple Container)
- [x] Container orchestrator com Docker
- [x] Secure executor com permissões
- [x] 30+ comandos bloqueados
- [x] Audit logging integrado
- [x] Dockerfile para agent runtime
- [x] Testes unitários

### Em Desenvolvimento
- [ ] Podman runtime support
- [ ] Apple Container runtime support
- [ ] ContainerPanel UI component (Lit)
- [ ] Seccomp profile padrão
- [ ] AppArmor profile

### Futuro
- [ ] gVisor runtime support
- [ ] Kata Containers support
- [ ] WebAssembly runtime
- [ ] Policy engine avançado

## Licença

MIT
