# 🎙️ Swabble - Speech Recognition System

Uma solução completa e open-source de reconhecimento de voz para OpenClaw, permitindo controle total via comandos de voz com suporte multi-idioma, detecção inteligente de wake words e execução automatizada de comandos.

[![Tests](https://img.shields.io/badge/tests-103%20passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-94.44%25-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Instalação e Requisitos](#instalação-e-requisitos)
- [Uso](#uso)
  - [Interface Web](#interface-web)
  - [CLI](#cli)
  - [API REST](#api-rest)
- [Comandos de Voz](#comandos-de-voz)
- [Configuração](#configuração)
- [Testes](#testes)
- [Segurança](#segurança)
- [Troubleshooting](#troubleshooting)
- [Contribuição](#contribuição)

## 🎯 Visão Geral

Swabble é um sistema de reconhecimento de voz cross-platform que permite:

- 🎤 Gravar áudio diretamente no navegador
- 📝 Transcrever fala para texto com alta precisão
- 🎙️ Detectar wake words ("clawd", "openclaw", "hey claw")
- ⚡ Executar comandos automaticamente
- 🌍 Suporte a múltiplos idiomas

### Demo

```bash
# Diga: "clawd, run tests"
# Resultado: npm test é executado automaticamente
```

## ✨ Funcionalidades

### Core Features

- **🎙️ Gravação de Áudio**
  - Interface web intuitiva com visualização em tempo real
  - Suporte a múltiplos formatos (WebM/Opus, MP4/AAC, WAV)
  - Limite de 25MB por arquivo
  - Duração máxima de 5 minutos

- **📝 Transcrição**
  - OpenAI Whisper API (padrão)
  - Deepgram Nova-3 (alternativa)
  - Caching inteligente para economia de custos
  - Suporte a 50+ idiomas

- **🎧 Detecção de Wake Word**
  - Múltiplas wake words: "clawd", "openclaw", "hey claw"
  - Fuzzy matching para tolerar typos
  - Sensitivity configurável (0.0 - 1.0)
  - Cooldown entre ativações (anti-spam)

- **⚡ Comandos de Voz**
  - 7 comandos built-in
  - Extensível via registro de comandos customizados
  - Extração inteligente de parâmetros
  - Contexto de execução (diretório atual, branch git)

- **🔒 Segurança**
  - Autenticação JWT
  - Rate limiting
  - Validação de formatos
  - Sanitização de inputs

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Chat UI    │◄──►│Voice Recorder│◄──►│ Audio Visual │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ MediaRecorder API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    GATEWAY SERVER                            │
├─────────────────────────────────────────────────────────────┤
│                    API Routes                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  POST        │    │  POST        │    │  GET         │  │
│  │  /transcribe │    │  /command    │    │  /status     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 SPEECH MODULE                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   STT        │    │ Wake Word    │    │   Voice      │  │
│  │  Service     │───►│  Detector    │───►│  Command     │  │
│  │              │    │              │    │  Router      │  │
│  │ • OpenAI     │    │ • Fuzzy      │    │              │  │
│  │ • Deepgram   │    │ • Cooldown   │    │ • 7 Built-in │  │
│  │ • Cache      │    │ • Config     │    │ • Extensible │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principais

#### 1. **STT Service** (`src/speech/stt-service.ts`)
Serviço de transcrição de fala para texto.

**Features:**
- Multi-provider (OpenAI Whisper, Deepgram)
- Caching LRU (100 itens)
- Validação de formatos
- Rate limiting

**API:**
```typescript
interface TranscriptionRequest {
  audioBuffer: Buffer;
  mimeType: string;
  language?: string;
  prompt?: string;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  words?: WordTiming[];
}
```

#### 2. **Wake Word Detector** (`src/speech/wake-word-detector.ts`)
Detecção inteligente de wake words com fuzzy matching.

**Features:**
- Levenshtein distance para tolerância a typos
- Configuração de sensitivity
- Cooldown entre ativações
- Suporte a múltiplas wake words e aliases

**API:**
```typescript
interface WakeWordConfig {
  words: string[];
  aliases?: string[];
  sensitivity: number;
  cooldownMs: number;
  caseSensitive?: boolean;
}

interface WakeWordMatch {
  matched: boolean;
  word: string;
  confidence: number;
  command?: string;
}
```

#### 3. **Voice Command Router** (`src/speech/voice-command-router.ts`)
Roteamento e execução de comandos de voz.

**Features:**
- 7 comandos built-in (test, build, commit, status, search, deploy, clear)
- Registro dinâmico de comandos
- Extração de parâmetros
- Contexto de execução

**API:**
```typescript
interface CommandDefinition {
  name: string;
  description: string;
  patterns: string[];
  action: (args: string[], context: CommandContext) => Promise<CommandResult>;
}
```

#### 4. **Voice Recorder Component** (`ui/src/ui/components/speech/voice-recorder.ts`)
Componente Lit para gravação de áudio na interface web.

**Features:**
- 4 estados: idle, recording, processing, preview
- Visualização de waveform em tempo real
- Transcrição preview
- Auto-send quando wake word detectada
- Indicadores visuais de wake word e comando

#### 5. **Audio Visualizer** (`ui/src/ui/components/speech/audio-visualizer.ts`)
Visualização animada do áudio em tempo real.

**Features:**
- Web Audio API
- AnalyserNode para frequências
- Barras animadas ou waveform
- 30 barras de frequência

## 📦 Instalação e Requisitos

### Pré-requisitos

- Node.js 18+
- pnpm ou npm
- API Key (OpenAI ou Deepgram)

### Instalação

```bash
# Clonar repositório
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env e adicionar:
# OPENAI_API_KEY=sk-...
# Ou:
# DEEPGRAM_API_KEY=...

# Build
pnpm build
```

### Configuração Inicial

```bash
# Verificar status
openclaw speech status

# Testar wake word detection
openclaw speech test -t "clawd run tests"
```

## 🚀 Uso

### Interface Web

1. **Iniciar o Gateway:**
   ```bash
   openclaw gateway run
   ```

2. **Acessar UI:**
   Abra http://localhost:8080 no navegador

3. **Usar Voice Recorder:**
   - Clique em "🎤 Voice" na barra de ferramentas
   - O botão fica azul quando ativo
   - Fale seu comando (ex: "clawd run tests")
   - Visualize o waveform animado
   - Aguarde a transcrição
   - Se detectar wake word, envia automaticamente

**Estados do Voice Recorder:**
- **Idle**: Pronto para gravar
- **Recording**: Gravando com waveform animado
- **Processing**: Transcrevendo (spinner)
- **Preview**: Mostra transcrição com botões Send/Cancel

### CLI

```bash
# Ver status completo do serviço
openclaw speech status

# Testar detecção de wake word
openclaw speech test -t "clawd run tests"

# Listar comandos disponíveis
openclaw speech commands

# Ver configuração
openclaw speech config
```

### API REST

#### Transcrever Áudio

```bash
curl -X POST http://localhost:8080/api/v1/speech/transcribe \
  -H "Authorization: Bearer <TOKEN>" \
  -F "audio=@recording.webm" \
  -F "language=auto" \
  -F "enableWakeWord=true"
```

**Response:**
```json
{
  "text": "clawd run tests",
  "confidence": 0.95,
  "language": "en",
  "duration": 2.5,
  "wakeWordDetected": true,
  "command": "run tests",
  "commandResult": {
    "success": true,
    "message": "Running tests...",
    "data": { "command": "npm test" }
  }
}
```

#### Executar Comando

```bash
curl -X POST http://localhost:8080/api/v1/speech/command \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "clawd build project",
    "context": {
      "userId": "user123",
      "sessionId": "session456"
    }
  }'
```

#### Ver Status

```bash
curl http://localhost:8080/api/v1/speech/status \
  -H "Authorization: Bearer <TOKEN>"
```

## 🎙️ Comandos de Voz

### Comandos Built-in

| Comando | Padrões | Ação | Exemplo |
|---------|---------|------|---------|
| **test** | `test`, `run tests`, `execute tests` | Executa testes | "clawd run tests" |
| **build** | `build`, `compile`, `build project` | Compila projeto | "clawd build" |
| **commit** | `commit`, `commit changes` | Faz commit | "clawd commit with message 'fix'" |
| **status** | `status`, `show status` | Mostra status | "openclaw status" |
| **search** | `search`, `find`, `search for` | Busca no código | "clawd search for auth" |
| **deploy** | `deploy`, `ship to` | Faz deploy | "clawd deploy to staging" |
| **clear** | `clear`, `clean`, `clear cache` | Limpa cache | "clawd clear" |

### Exemplos de Uso

```bash
# Testes
"clawd run tests"
"openclaw execute tests"
"hey claw test"

# Build
"clawd build project"
"openclaw compile"

# Commit
"clawd commit changes"
"clawd commit with message fix bug"

# Busca
"clawd search for authentication"
"openclaw find router"

# Deploy
"clawd deploy to production"
"openclaw ship to staging"
```

### Adicionar Comando Customizado

```typescript
import { voiceCommandRouter } from "./speech/voice-command-router.js";

voiceCommandRouter.register({
  name: "mycommand",
  description: "My custom command",
  patterns: [
    "^my command$",
    "^do something$",
  ],
  action: async (args, context) => {
    // Implementação do comando
    return {
      success: true,
      message: "Command executed!",
      data: { result: "..." }
    };
  },
});
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# OpenAI (padrão)
export OPENAI_API_KEY="sk-..."

# Deepgram (alternativo)
export DEEPGRAM_API_KEY="..."

# Web Speech API (Chrome/Edge - gratuito)
# Não requer API key
```

### Configuração via CLI

```bash
# Provider
openclaw config set speech.provider openai  # ou deepgram

# Modelo
openclaw config set speech.model gpt-4o-mini-transcribe

# Wake words
openclaw config set speech.wakeWords "clawd,openclaw"

# Sensibilidade (0.0 - 1.0)
openclaw config set speech.sensitivity 0.8

# Cooldown (ms)
openclaw config set speech.cooldownMs 2000

# Idioma padrão
openclaw config set speech.language auto
```

### Configuração Programática

```typescript
import { sttService } from "./speech/stt-service.js";
import { wakeWordDetector } from "./speech/wake-word-detector.js";

// Configurar STT
sttService.updateConfig({
  provider: "openai",
  model: "gpt-4o-mini-transcribe",
  language: "pt",
});

// Configurar wake words
wakeWordDetector.updateConfig({
  words: ["clawd", "openclaw"],
  aliases: ["hey claw"],
  sensitivity: 0.8,
  cooldownMs: 2000,
});
```

## 🧪 Testes

### Executar Todos os Testes

```bash
# Todos os testes de speech
pnpm test src/speech/__tests__/

# Com cobertura
pnpm test:coverage src/speech/__tests__/

# Modo watch
pnpm test:watch src/speech/__tests__/
```

### Estrutura de Testes

```
src/speech/__tests__/
├── stt-service.test.ts           (33 testes)
├── wake-word-detector.test.ts    (39 testes)
├── voice-command-router.test.ts  (20 testes)
└── speech-integration.test.ts    (11 testes)

Total: 103 testes
```

### Cobertura

| Métrica | Valor | Status |
|---------|-------|--------|
| **Linhas** | 94.44% | ✅ |
| **Branches** | 75.8% | ✅ |
| **Funções** | 93.61% | ✅ |
| **Statements** | 94.19% | ✅ |

## 🔒 Segurança

### Autenticação

- Todas as rotas da API requerem Bearer token
- Validação JWT no gateway

### Rate Limiting

- Cooldown de 2s entre comandos (configurável)
- Previne spam e uso abusivo

### Validação

- Limite de 25MB por arquivo de áudio
- Validação de formatos suportados
- Sanitização de inputs de texto
- Rejeição de MIME types perigosos

### HTTPS

- Todas as chamadas às APIs externas usam HTTPS
- Verificação de certificados

## 🐛 Troubleshooting

### Problemas Comuns

#### Microfone não funciona
1. Verifique permissões do navegador
2. Certifique-se de usar HTTPS ou localhost
3. Teste em outro navegador
4. Verifique se o microfone está funcionando em outros apps

#### Wake word não detectada
1. Fale claramente e perto do microfone
2. Verifique sensibilidade: `openclaw speech config`
3. Tente variações: "clawd", "openclaw", "hey claw"
4. Verifique cooldown: aguarde 2s entre comandos

#### Comando não reconhecido
1. Liste comandos disponíveis: `openclaw speech commands`
2. Verifique se o comando está registrado
3. Consulte logs: `openclaw logs`

#### Erro de API
1. Verifique se a API key está configurada
2. Verifique se tem créditos suficientes
3. Verifique rate limits das APIs

### Logs

```bash
# Ver logs do serviço de speech
openclaw logs --filter speech

# Ver logs de erro
openclaw logs --level error

# Ver logs em tempo real
openclaw logs --follow
```

## 🤝 Contribuição

### Como Contribuir

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/my-feature`
3. Faça commit das mudanças: `git commit -am 'Add feature'`
4. Push para a branch: `git push origin feature/my-feature`
5. Abra um Pull Request

### Diretrizes

- Mantenha cobertura de testes acima de 80%
- Siga o estilo de código existente
- Adicione testes para novas funcionalidades
- Atualize a documentação

### Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Build
pnpm build

# Testar
pnpm test src/speech/__tests__/

# Lint
pnpm lint

# Format
pnpm format
```

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- OpenAI Whisper API
- Deepgram
- Web Speech API
- Comunidade OpenClaw

## 📞 Suporte

- **Issues**: https://github.com/openclaw/openclaw/issues
- **Discord**: https://discord.gg/openclaw
- **Docs**: https://docs.openclaw.ai

---

**Made with ❤️ by the OpenClaw team**
