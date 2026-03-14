# 🎙️ OpenClaw Speech Recognition - Índice de Documentação

## 📚 Documentação Completa do Sistema

Este diretório contém toda a documentação do sistema de reconhecimento de voz (Speech Recognition) do OpenClaw.

---

## 📄 Arquivos de Documentação

### Principal
- **[README_SPEECH.md](../README_SPEECH.md)** - Documentação completa e detalhada do sistema
  - Visão geral
  - Funcionalidades
  - Instalação e configuração
  - Uso (Web, CLI, API)
  - Comandos de voz
  - Testes e cobertura
  - Segurança
  - Troubleshooting

### Arquitetura
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Arquitetura técnica completa
  - Arquitetura em camadas
  - Módulos e componentes
  - Fluxos de dados detalhados
  - API Reference completa
  - Integração MCP Excalidraw
  - Diagramas de fluxo

### Especificação
- **[SPEECH_RECOGNITION.md](../docs/SPEECH_RECOGNITION.md)** - Especificação técnica

---

## 🎯 Resumo Executivo

### Status do Sistema

✅ **103 testes** passando  
✅ **94.44%** cobertura de código  
✅ **Pronto para produção**

### Componentes

1. **STT Service** - Transcrição (OpenAI Whisper / Deepgram)
2. **Wake Word Detector** - Detecção com fuzzy matching
3. **Voice Command Router** - 7 comandos + extensível
4. **Voice Recorder UI** - Interface web com Lit
5. **API Gateway** - REST endpoints + WebSocket

### Comandos de Voz

```bash
"clawd run tests"         # Executar testes
"clawd build project"     # Build
"clawd commit changes"    # Git commit
"clawd search for auth"   # Buscar código
"clawd deploy to staging" # Deploy
"clawd clear cache"       # Limpar cache
```

---

## 🏗️ Arquitetura em 3 Camadas

```
┌─────────────────────────────────────────┐
│  LAYER 1: Presentation                 │
│  - Voice Recorder (Lit)                │
│  - Audio Visualizer                    │
│  - CLI (Commander)                     │
└──────────────────┬──────────────────────┘
                   │ HTTP/WebSocket
                   ▼
┌─────────────────────────────────────────┐
│  LAYER 2: Gateway                      │
│  - Express Server                      │
│  - JWT Auth                            │
│  - Rate Limiting                       │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  LAYER 3: Business Logic               │
│  - STT Service (OpenAI/Deepgram)       │
│  - Wake Word Detector (Levenshtein)    │
│  - Voice Command Router                │
│  - MCP Excalidraw Server               │
└─────────────────────────────────────────┘
```

---

## 🔌 Integração MCP Excalidraw

O sistema inclui um servidor MCP para gerar diagramas programaticamente:

```bash
# Diagrama de arquitetura
npx tsx src/mcp/excalidraw/server.ts --tool create_architecture_diagram

# Fluxo de dados
npx tsx src/mcp/excalidraw/server.ts --tool create_data_flow_diagram

# Máquina de estados
npx tsx src/mcp/excalidraw/server.ts --tool create_state_machine
```

---

## 📊 Estatísticas

### Cobertura de Testes

| Métrica | Valor | Status |
|---------|-------|--------|
| Linhas | 94.44% | ✅ |
| Branches | 75.8% | ✅ |
| Funções | 93.61% | ✅ |
| Statements | 94.19% | ✅ |
| **Total** | **103 testes** | ✅ |

### Arquivos de Código

- `src/speech/stt-service.ts` - 250 linhas
- `src/speech/wake-word-detector.ts` - 180 linhas
- `src/speech/voice-command-router.ts` - 220 linhas
- `src/gateway/routes/speech.ts` - 200 linhas
- `src/cli/commands/speech.ts` - 150 linhas
- `ui/src/ui/components/speech/*.ts` - 600 linhas
- **Total Backend**: ~1.000 linhas
- **Total Frontend**: ~600 linhas
- **Total Testes**: ~3.500 linhas

---

## 🚀 Como Começar

### 1. Instalar

```bash
pnpm install
pnpm build
```

### 2. Configurar

```bash
# Adicionar API key
export OPENAI_API_KEY="sk-..."

# Ou Deepgram
export DEEPGRAM_API_KEY="..."
```

### 3. Testar

```bash
# Ver status
openclaw speech status

# Testar wake word
openclaw speech test -t "clawd run tests"

# Executar testes
pnpm test src/speech/__tests__/
```

### 4. Usar

```bash
# Iniciar gateway
openclaw gateway run

# Acessar http://localhost:8080
# Clicar em 🎤 Voice
# Falar: "clawd run tests"
```

---

## 📖 Leitura Recomendada

1. Comece com **[README_SPEECH.md](../README_SPEECH.md)** para visão geral completa
2. Consulte **[ARCHITECTURE.md](../ARCHITECTURE.md)** para detalhes técnicos
3. Veja os testes em `src/speech/__tests__/` para exemplos de uso

---

## 🔗 Links

- **Repositório**: https://github.com/openclaw/openclaw
- **Documentação**: https://docs.openclaw.ai
- **Issues**: https://github.com/openclaw/openclaw/issues
- **Discord**: https://discord.gg/openclaw

---

**Documentação criada em**: 21 de Fevereiro, 2025  
**Versão**: 1.0.0  
**Status**: ✅ Produção Ready
