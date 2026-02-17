# OpenClaw Ultra Performance 🚀

Branch isolada para otimizações máximas de performance, mantendo 100% de compatibilidade com o código original.

## 🎯 Objetivo

Transformar o OpenClaw na aplicação mais rápida e eficiente da categoria, rodando em qualquer hardware - desde Raspberry Pi até servidores de alta performance.

## 🏗️ Arquitetura

```
OpenClaw Ultra
├── Node.js (Orquestração, I/O, APIs)
├── Rust (Core: hash, crypto, parse, compress)
├── C++ (N-API: zero-copy buffers, SIMD)
├── WASM (Hot paths em JS)
└── Single Executable (Deployment simplificado)
```

## 📊 Performance Esperada

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Startup** | 3-5s | 200-500ms | **10x** |
| **Memória idle** | 300MB | 50-80MB | **75%** |
| **Hash SHA256** | 100MB/s | 1GB/s | **10x** |
| **JSON parse** | 200MB/s | 800MB/s | **4x** |
| **PDF process** | 2 págs/s | 10 págs/s | **5x** |
| **Bundle size** | 44MB (359 arqs) | 80MB (1 exe) | Simplificado |

## 🚀 Como Usar

### 1. Setup Inicial (Primeira vez)

```bash
cd /Users/ropeixoto/Project/experiments/openclaw-ultra

# Instalar dependências Node.js
pnpm install

# Instalar Rust (se não tiver)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build completo
pnpm build:ultra
```

### 2. Desenvolvimento

```bash
# Terminal 1 - Branch original (seu trabalho atual)
cd /Users/ropeixoto/Project/experiments/openbr_assistant
git status  # feature/analytics-tools-dev
pnpm dev

# Terminal 2 - Ultra Performance (otimizações)
cd /Users/ropeixoto/Project/experiments/openclaw-ultra
git status  # feat/ultra-performance
pnpm dev:ultra
```

### 3. Comandos Disponíveis

```bash
# Build completo
pnpm build:ultra

# Build individual
pnpm build:rust        # Compilar Rust
pnpm build:native      # Compilar C++
pnpm build:wasm        # Compilar WASM
pnpm build:bundle      # Bundle com esbuild

# Testes
pnpm test              # Testes originais
pnpm test:ultra        # Testes + benchmarks
pnpm benchmark         # Comparar performance

# Produção
pnpm build:sea         # Single executable
pnpm start:prod        # Iniciar otimizado
```

## 🔧 Feature Flags

Controle total via variáveis de ambiente:

```bash
# Desabilitar otimizações específicas
export USE_BLAKE3=false           # Usar SHA256 ao invés de Blake3
export USE_SIMD_JSON=false        # Usar JSON.parse nativo
export USE_NATIVE_CACHE=false     # Usar Map JS ao invés de LRU Rust

# Modo legacy (todas as otimizações desabilitadas)
export USE_LEGACY_MODE=true

# Ver status das features
pnpm ultra:status
```

## 📁 Estrutura do Projeto

```
openclaw-ultra/
├── src/
│   ├── config/features.ts    # Feature flags
│   ├── ultra.ts              # Loader de módulos
│   └── ...                   # Código original
├── rust/
│   ├── Cargo.toml            # Dependências Rust
│   └── src/
│       ├── lib.rs            # Entry point
│       ├── crypto.rs         # Blake3, XXH3
│       ├── json.rs           # simd-json
│       ├── cache.rs          # LRU cache
│       ├── compression.rs    # Zstd, LZ4
│       └── media.rs          # Processamento de mídia
├── native/
│   ├── binding.gyp           # Configuração node-gyp
│   ├── buffer-ops.cc         # Zero-copy buffers
│   └── simd-ops.cc           # Operações SIMD
├── scripts/
│   ├── build-ultra.mjs       # Build automatizado
│   └── benchmark.mjs         # Benchmarks
└── package.json              # Scripts e dependências
```

## 🧪 Testando

### Benchmark Comparativo

```bash
pnpm benchmark

# Resultado esperado:
# Hash Performance:
#   crypto.createHash (legacy)  ~500,000 ops/s
#   blake3 (Rust)              ~5,000,000 ops/s  ✅ 10x mais rápido
#
# JSON Performance:
#   JSON.parse (legacy)        ~200,000 ops/s
#   simd-json (Rust)           ~800,000 ops/s   ✅ 4x mais rápido
```

### Teste de Stress

```bash
# Simular carga alta
pnpm test:stress --connections=1000 --duration=60s

# Monitorar memória
pnpm test:memory --duration=300s
```

## 🎨 Otimizações Implementadas

### ✅ Fase 1: Fundação
- [x] Git worktree isolado
- [x] Estrutura Rust + C++ + WASM
- [x] Feature flags configuráveis
- [x] Build scripts automatizados

### 🔄 Fase 2: Core (Em progresso)
- [ ] Blake3 hash (10x mais rápido)
- [ ] XXH3 non-cryptographic hash
- [ ] simd-json parsing (4x mais rápido)
- [ ] Zstd/LZ4 compression
- [ ] LRU cache com TTL (Rust)
- [ ] Bounded group histories

### ⏳ Fase 3: Media (Pendente)
- [ ] Rust image processing (substituir sharp)
- [ ] Streaming PDF processing
- [ ] Zero-copy buffer operations
- [ ] SIMD-accelerated operations

### ⏳ Fase 4: Deployment (Pendente)
- [ ] esbuild bundle + tree-shaking
- [ ] Single executable application
- [ ] Binários pré-compilados para todas as plataformas

## 🔒 Compatibilidade

### 100% Backward Compatible
- Todas as otimizações são **opt-in**
- Fallback automático para implementações JS
- Feature flags permitem desabilitar qualquer otimização
- API permanece idêntica ao original

### Rollback Seguro
```typescript
// Se algo quebrar, simplesmente desabilite:
process.env.USE_BLAKE3 = 'false';
process.env.USE_SIMD_JSON = 'false';
// ...e reinicie. Tudo volta a funcionar como antes.
```

## 🐛 Debugging

### Verificar módulos carregados
```bash
pnpm ultra:debug

# Output:
# ✓ Rust core: loaded (v0.1.0)
# ✓ Native addons: loaded
# ⚠️ WASM modules: not found (optional)
# 
# Active features:
#   ✓ useBlake3
#   ✓ useSimdJson
#   ✓ useNativeCache
#   ...
```

### Profiling
```bash
# Perfil de CPU
pnpm profile:cpu --duration=30s

# Perfil de memória
pnpm profile:memory --duration=60s

# Flame graph
pnpm profile:flame
```

## 📚 Recursos

- [Rust N-API](https://napi.rs/)
- [SIMD JSON](https://github.com/simd-lite/simd-json)
- [Blake3](https://github.com/BLAKE3-team/BLAKE3)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [Node.js SEA](https://nodejs.org/api/single-executable-applications.html)

## 🤝 Contribuindo

Esta branch é **exclusivamente para otimizações de performance**.

1. Mantenha compatibilidade 100%
2. Sempre adicione feature flags
3. Benchmark antes/depois de cada mudança
4. Documente o impacto de performance

## 📄 Licença

MIT - Mesma licença do OpenClaw original.

---

**Status:** 🚧 Em desenvolvimento ativo  
**Branch:** `feat/ultra-performance`  
**Worktree:** `/Users/ropeixoto/Project/experiments/openclaw-ultra`