# OpenClaw Next-Gen Implementation

Implementação completa do sistema de segurança com containers, Skills, MCP, Rust e Go.

## 📁 Estrutura de Projetos

```
openbr_assistant/
├── src/
│   ├── containers/          # Container Security System
│   ├── security/            # Blocked Commands + Audit
│   ├── skills/              # Skills System (Pack + Action)
│   ├── mcp/                 # MCP Client + Inspector
│   └── gateway/routes/      # Container API Routes
├── openclaw-rs/             # Rust Performance Modules
├── openclaw-go/             # Go Gateway Service
├── ui/src/ui/components/    # ContainerPanel + MCPInspector
└── containers/agent-runtime/# Docker Image
```

## 🔒 Container Security System

### Runtime Detection
- Auto-detecção: Docker, Apple Container, Podman
- Suporte multiplataforma: Linux/macOS
- Cache de informações de runtime

### Container Orchestrator
- Lifecycle management completo
- Docker Runtime implementado
- Suporte para Podman e Apple Container (futuro)

### Secure Executor
- Permissões por sessão
- Validação de comandos
- Bloqueio de comandos perigosos (30+)

### Blocked Commands (30+)
**Críticos:**
- `rm -rf /` - Destruição total
- `mkfs.*` - Formatação de disco
- `dd if=* of=/dev/*` - Escrita direta em dispositivos

**Altos:**
- `shutdown`, `reboot`, `halt` - Controle de energia
- `iptables -F` - Remoção de firewall
- `userdel -r root` - Deleção de root

**Médios:**
- Fork bombs
- Download + execute (`wget | bash`)

## 🎯 Skills System

### Skill Pack (Conhecimento)
```typescript
const skillPack: SkillManifest = {
  type: 'pack',
  id: 'react-patterns',
  knowledge: [
    { title: 'Hooks Guide', content: '...' },
    { title: 'Best Practices', content: '...' }
  ]
};
```

### Skill Action (Automação)
```typescript
const skillAction: SkillManifest = {
  type: 'action',
  id: 'setup-project',
  actions: [{
    trigger: { type: 'command', pattern: 'setup react' },
    handler: { type: 'shell', script: 'npx create-react-app' }
  }]
};
```

### API Skills
```typescript
import { skillRegistry, skillApplier } from './src/skills';

// Registrar skill
skillRegistry.register(skillManifest);

// Instalar
await skillRegistry.install('skill-id');

// Aplicar
await skillApplier.apply('skill-id', '/path/to/project');
```

## 🔌 MCP (Model Context Protocol)

### MCP Client
```typescript
import { mcpClient } from './src/mcp';

// Adicionar servidor
mcpClient.addServer({
  id: 'weather-api',
  name: 'Weather API',
  url: 'ws://localhost:3000',
  transport: 'websocket',
  enabled: true
});

// Conectar
await mcpClient.connect('weather-api');

// Chamar tool
const result = await mcpClient.callTool('weather-api', 'getForecast', {
  city: 'São Paulo'
});
```

### MCP Inspector UI
```html
<mcp-inspector
  .servers="${servers}"
  @server-select="${handleSelect}"
  @test-tool="${handleTest}"
></mcp-inspector>
```

## 🦀 Rust Performance Modules

### Modules
- **crypto**: SHA256/384/512, HMAC-SHA256, Base64 encode/decode, parallel batch hashing
- **json**: Parse, stringify, prettify, validate, get value by path
- **cache**: Thread-safe in-memory cache with TTL support, cleanup, size tracking
- **image**: Image dimensions, resize, convert, thumbnail calculation

### Build
```bash
cd openclaw-rs
cargo build --release
```

### API Examples
```rust
use openclaw_rs::crypto;
use openclaw_rs::json;
use openclaw_rs::cache;

// Crypto
let hash = crypto::sha256("hello world");
let hashes = crypto::hash_batch(inputs, crypto::HashAlgorithm::Sha256);

// JSON
let parsed = json::json_parse('{"key": "value"}');
let value = json::json_get(json_str, "path.to.key");

// Cache
let cache = cache::Cache::new();
cache.set("key", "value", Some(60000)); // 60s TTL
let value = cache.get("key");
```

## 🚀 Go Gateway

### Run
```bash
cd openclaw-go
go run cmd/gateway/main.go
```

### Features
- HTTP/WebSocket gateway
- Graceful shutdown
- Prometheus metrics
- Context propagation

## 🎨 UI Components

### ContainerPanel
```typescript
import { ContainerPanel } from './ui/components';

<container-panel
  .containers="${containers}"
  .runtime="${runtime}"
  @view-logs="${handleLogs}"
  @stop-container="${handleStop}"
></container-panel>
```

### MCP Inspector
```typescript
import { MCPInspector } from './ui/components';

<mcp-inspector
  .servers="${servers}"
  .events="${events}"
  @add-server="${handleAdd}"
  @test-tool="${handleTest}"
></mcp-inspector>
```

## 🔌 API Endpoints

### Containers
```
GET    /api/containers              # Listar containers
GET    /api/containers/runtime      # Info do runtime
GET    /api/containers/:id/logs     # Logs
POST   /api/containers/:id/stop     # Parar
DELETE /api/containers/:id          # Remover
```

## 🖥️ CLI Commands

### Skills
```bash
openclaw skills list                  # List all skills
openclaw skills install <skillId>     # Install a skill
openclaw skills uninstall <skillId>   # Uninstall a skill
openclaw skills enable <skillId>      # Enable a skill
openclaw skills disable <skillId>     # Disable a skill
openclaw skills apply <id> <path>     # Apply skill to directory
openclaw skills preview <id> <path>   # Preview changes
openclaw skills search <query>        # Search skills
```

### MCP
```bash
openclaw mcp list                     # List MCP servers
openclaw mcp add --name <n> --url <u> # Add server
openclaw mcp remove <serverId>        # Remove server
openclaw mcp connect <serverId>       # Connect to server
openclaw mcp disconnect <serverId>    # Disconnect
openclaw mcp tools <serverId>         # List tools
openclaw mcp call <id> <tool>         # Call a tool
openclaw mcp resources <serverId>     # List resources
openclaw mcp status                   # Show status
```

## 📊 Estatísticas

- **6,976 linhas** adicionadas
- **30+ comandos** bloqueados
- **23 módulos** TypeScript
- **4 módulos** Rust
- **3 módulos** Go
- **2 linguagens** adicionais (Rust + Go)
- **2 UI components** Lit
- **2 CLI commands** (skills + mcp)

## 🛣️ Roadmap

### Implementado ✅
- [x] Container Security System
- [x] Blocked Commands
- [x] Skills System (Pack + Action)
- [x] MCP Client + Inspector
- [x] ContainerPanel UI
- [x] Rust modules (crypto, json, cache, image)
- [x] Go gateway (server, handlers, MCP manager)
- [x] CLI commands (skills + mcp)
- [x] Gateway integration

### Em Progresso 🔄
- [ ] Podman runtime support
- [ ] Apple Container runtime
- [ ] Seccomp profiles
- [ ] AppArmor profiles

### Futuro 📅
- [ ] gVisor support
- [ ] Kata Containers
- [ ] WebAssembly runtime
- [ ] Complete Rust N-API bindings
- [ ] Go channel adapters

## 📖 Referências

- `src/containers/README.md` - Container Security
- `.opencode/plans/container-security-spec.md`
- `.opencode/plans/mcp-skills-integration-spec.md`
- `.opencode/plans/migration-go-rust-spec.md`

## 🤝 Contribuição

1. Criar branch: `feat/nome-da-feature`
2. Implementar com testes
3. Seguir padrões de código
4. Abrir PR para `develop`

## 📄 Licença

MIT
