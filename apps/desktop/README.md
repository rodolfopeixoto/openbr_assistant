# OpenBR Desktop

Aplicativo desktop nativo para Linux e Windows do OpenBR - Seu assistente pessoal de IA.

## Requisitos

- **Rust**: 1.70 ou superior
- **Node.js**: 18+ (opcional, para desenvolvimento)
- **OpenBR Gateway**: Rodando em `http://localhost:18789`

## Estrutura

```
apps/desktop/
├── src-tauri/           # Código Rust (backend)
│   ├── src/
│   │   ├── main.rs      # Entrypoint
│   │   └── lib.rs       # Lógica core
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json         # Scripts npm
```

## Desenvolvimento

```bash
# Instalar dependências Rust
cd src-tauri
cargo build

# Rodar em modo desenvolvimento
cd ..
pnpm desktop:dev
# ou
cargo tauri dev

# O app abrirá carregando http://localhost:18789
```

## Build

```bash
# Build de produção
pnpm desktop:build

# Gerar instaladores
# Linux: .deb, .rpm
# Windows: .msi
```

## Comandos Tauri Disponíveis

- `get_app_version` - Retorna versão do app
- `get_gateway_status` - Verifica se gateway está online
- `set_gateway_url` - Configura URL do gateway
- `show_window` - Mostra janela
- `hide_window` - Esconde janela
- `quit_app` - Fecha aplicação

## Milestones

- **M1: Foundation** ✅ Estrutura Tauri + Comandos básicos
- M2: System Tray - Menu na bandeja
- M3: Window Management - Atalhos e persistência
- M4: Gateway Integration - Health checks
- M5: Auto-Updater - Atualizações automáticas
- M6: Distribution - CI/CD e instaladores

## Licença

MIT - OpenBR Team
