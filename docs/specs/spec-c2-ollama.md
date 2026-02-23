# Spec C2: Ollama Native Manager

## 🎯 Objetivo
Gerenciamento completo do Ollama via UI: instalação, modelos, configuração, com feature flag e heartbeat.

## 🔧 Backend

### Gateway Handlers
- `ollama.status` - Check instalação, running, versão, modelos
- `ollama.install` - Instalar Ollama (OS-specific)
- `ollama.uninstall` - Remover Ollama
- `ollama.start` - Iniciar serviço
- `ollama.stop` - Parar serviço
- `ollama.models.list` - Listar modelos instalados
- `ollama.models.pull` - Download modelo (streaming progress)
- `ollama.models.remove` - Remover modelo
- `ollama.config` - Configurar GPU, port, etc.

### Instalação OS-Specific
```typescript
// Mac: brew install ollama
// Linux: curl -fsSL https://ollama.com/install.sh | sh
// Windows: winget install Ollama.Ollama (ou download)
```

### Feature Flag
- Default: **DISABLED** (usa 2GB RAM)
- Toggle na UI para ativar/desativar
- Quando desativado: não carrega modelos, não usa memória

### Heartbeat
- Verifica a cada 5 minutos se Ollama está rodando
- Se disponível: usa para requests simples (economizar tokens)
- Se indisponível: fallback para cloud models

### Configuração
```typescript
interface OllamaConfig {
  enabled: boolean;
  autoStart: boolean;
  gpuAcceleration: boolean;
  port: number;
  defaultModel: string;
  models: {
    [modelName: string]: {
      size: number;
      modified: string;
    }
  };
}
```

## 🎨 Frontend

### View: Ollama Manager
```typescript
- Status Card: Installed? Running? Version
- Resource Usage: RAM, GPU, Disk
- Actions: Install/Start/Stop/Uninstall
- Models List: Nome, tamanho, versão, ações (remove)
- Pull Model: Input com autocomplete, botão download, progress bar
- Settings: GPU toggle, port config, auto-start
- Feature Flag Toggle: Enable/Disable (DESTACADO - default OFF)
```

### Componentes
```typescript
// Install Button
// - Detecta OS automaticamente
// - Mostra comando que será executado
// - Progresso da instalação
// - Verificação de requisitos (RAM disponível)

// Model Card
// - Nome: llama3.2, codellama, etc.
// - Tamanho: 2.0GB
// - Status: Ready/Downloading
// - Actions: Run, Remove

// Feature Flag Section
// - Toggle grande e destacado
// - Warning: "Uses ~2GB RAM"
// - Stats de economia quando ativo
```

## 📊 Critérios
- [ ] Instalação automática por OS
- [ ] Feature flag (default OFF)
- [ ] Heartbeat a cada 5min
- [ ] Pull models com progresso
- [ ] GPU configuration
- [ ] Toggle enable/disable
- [ ] Stats de uso e economia

## ⏱️ Estimativa: 5 dias
