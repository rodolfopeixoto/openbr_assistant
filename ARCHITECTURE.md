# 🎙️ OpenClaw Speech Recognition - Arquitetura Completa

Sistema completo de reconhecimento de voz com integração MCP Excalidraw para diagramação visual dos fluxos.

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Arquitetura em Camadas](#arquitetura-em-camadas)
3. [Módulos e Componentes](#módulos-e-componentes)
4. [Fluxos de Dados](#fluxos-de-dados)
5. [Comandos Disponíveis](#comandos-disponíveis)
6. [Features Implementadas](#features-implementadas)
7. [Integração MCP Excalidraw](#integração-mcp-excalidraw)
8. [Diagramas de Fluxo](#diagramas-de-fluxo)
9. [API Reference](#api-reference)
10. [Configuração](#configuração)
11. [Testes](#testes)

---

## 🎯 Visão Geral do Sistema

O OpenClaw Speech Recognition é um sistema modular de reconhecimento de voz que permite:

- **Gravação de áudio** via navegador com interface web
- **Transcrição** usando OpenAI Whisper ou Deepgram
- **Detecção de wake words** ("clawd", "openclaw", "hey claw")
- **Execução de comandos** de voz automatizados
- **Integração MCP** com Excalidraw para diagramação

### Stack Tecnológico

```
Frontend:  Lit + WebComponents + Web Audio API
Backend:   Node.js + TypeScript + WebSocket
STT:       OpenAI Whisper API / Deepgram Nova-3
Storage:   In-memory LRU Cache (100 itens)
Security:  JWT + Rate Limiting + Input Validation
```

---

## 🏗️ Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 1: PRESENTATION                              │
│                          (User Interface & CLI)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐     │
│  │   Voice Recorder   │  │  Audio Visualizer  │  │   Chat Interface   │     │
│  │   (Web Component)  │  │   (Web Audio API)  │  │   (Lit Elements)   │     │
│  └────────┬───────────┘  └────────┬───────────┘  └────────┬───────────┘     │
│           │                       │                       │                 │
│           └───────────────────────┼───────────────────────┘                 │
│                                   │                                         │
│                                   ▼                                         │
│                          ┌────────────────┐                                 │
│                          │  CLI Interface │                                 │
│                          │  ( Commander ) │                                 │
│                          └────────┬───────┘                                 │
│                                   │                                         │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ HTTP/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 2: GATEWAY                                   │
│                      (API Routes & Security)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Express Server                                │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  POST /api/v1/speech/transcribe  │  POST /api/v1/speech/command      │   │
│  │  GET  /api/v1/speech/status      │  WebSocket /ws/speech/stream      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                          ┌─────────┴──────────┐                              │
│                          │  Auth Middleware   │  JWT + Bearer Token         │
│                          │  Rate Limiter      │  2s Cooldown               │
│                          │  CORS Handler      │  Cross-origin              │
│                          └─────────┬──────────┘                              │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 3: BUSINESS LOGIC                            │
│                      (Speech Processing Core)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌────────────────┐   │
│  │   STT Service       │───►│  Wake Word Detector │───►│ Voice Command  │   │
│  │                     │    │                     │    │    Router      │   │
│  │ • OpenAI Whisper    │    │ • Fuzzy Matching    │    │                │   │
│  │ • Deepgram          │    │ • Levenshtein       │    │ • 7 Built-in   │   │
│  │ • Web Speech API    │    │ • Sensitivity       │    │ • Extensible   │   │
│  │ • LRU Cache         │    │ • Cooldown          │    │ • Context      │   │
│  └─────────────────────┘    └─────────────────────┘    └────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      MCP Integration Layer                           │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  Excalidraw MCP Server  │  create_excalidraw_diagram()              │    │
│  │  Diagram Generation     │  export_diagram()                         │    │
│  │  Flow Visualization     │  update_diagram_element()                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Módulos e Componentes

### 1. **STT Service** (`src/speech/stt-service.ts`)

Responsável pela transcrição de áudio para texto.

**Interface:**
```typescript
interface STTConfig {
  provider: 'openai' | 'deepgram' | 'web-speech';
  model: string;
  language?: string;
  apiKey?: string;
  baseUrl?: string;
}

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
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}
```

**Features:**
- ✅ Multi-provider (OpenAI Whisper, Deepgram, Web Speech API)
- ✅ Caching LRU com limite de 100 itens
- ✅ Validação de formatos de áudio
- ✅ Rate limiting automático
- ✅ Suporte a 50+ idiomas

---

### 2. **Wake Word Detector** (`src/speech/wake-word-detector.ts`)

Detecta wake words no texto transcrito usando fuzzy matching.

**Interface:**
```typescript
interface WakeWordConfig {
  words: string[];              // ["clawd", "openclaw"]
  aliases?: string[];           // ["hey claw"]
  sensitivity: number;          // 0.0 - 1.0 (default: 0.8)
  cooldownMs: number;           // Tempo entre ativações
  caseSensitive?: boolean;      // false (default)
}

interface WakeWordMatch {
  matched: boolean;
  word: string;
  confidence: number;
  command?: string;             // Texto após wake word
}
```

**Algoritmo:**
```
1. Normaliza texto (lowercase, trim)
2. Para cada wake word:
   a. Calcula Levenshtein distance
   b. Converte para confidence score: 1 - (distance / maxLength)
   c. Se confidence >= sensitivity: MATCH
3. Extrai comando (texto após wake word)
4. Verifica cooldown
5. Retorna resultado
```

---

### 3. **Voice Command Router** (`src/speech/voice-command-router.ts`)

Roteia e executa comandos baseados no texto detectado.

**Comandos Built-in:**

| Comando | Padrões | Ação | Contexto |
|---------|---------|------|----------|
| **test** | `test`, `run tests` | `npm test` | Diretório atual |
| **build** | `build`, `compile` | `npm run build` | Diretório atual |
| **commit** | `commit`, `commit changes` | `git commit -m "msg"` | Git context |
| **status** | `status`, `show status` | Mostra diretório/branch | Git context |
| **search** | `search`, `find` | Busca no código | Workspace |
| **deploy** | `deploy`, `ship to` | Deploy para ambiente | Config |
| **clear** | `clear`, `clean` | `npm run clean` | Diretório atual |

**Interface:**
```typescript
interface CommandDefinition {
  name: string;
  description: string;
  patterns: string[];           // Regex patterns
  action: (
    args: string[],
    context: CommandContext
  ) => Promise<CommandResult>;
}

interface CommandContext {
  userId: string;
  sessionId: string;
  currentDirectory?: string;
  gitBranch?: string;
  timestamp: number;
}
```

---

### 4. **Voice Recorder Component** (`ui/src/ui/components/speech/voice-recorder.ts`)

Componente Lit para gravação de áudio.

**Estados:**
```
┌─────────┐     ┌───────────┐     ┌───────────┐     ┌──────────┐
│  IDLE   │────►│ RECORDING │────►│PROCESSING │────►│ PREVIEW  │
└─────────┘     └───────────┘     └───────────┘     └──────────┘
     ▲                                                  │
     └──────────────────────────────────────────────────┘
                    (Send ou Cancel)
```

**Eventos:**
- `@recording-started` - Início da gravação
- `@transcription-complete` - Transcrição finalizada
- `@send` - Usuário clicou em enviar
- `@cancelled` - Usuário cancelou

---

### 5. **Audio Visualizer** (`ui/src/ui/components/speech/audio-visualizer.ts`)

Visualização em tempo real do áudio.

**Tecnologia:**
- Web Audio API
- AnalyserNode (FFT)
- 30 barras de frequência
- Animação via requestAnimationFrame

---

## 🔄 Fluxos de Dados

### Fluxo 1: Gravação e Transcrição

```
Usuário
   │
   │ Clique em "🎤 Voice"
   ▼
┌──────────────────────┐
│   Voice Recorder     │
│   (Estado: IDLE)     │
└──────────┬───────────┘
           │
           │ MediaRecorder.start()
           ▼
┌──────────────────────┐
│   Audio Visualizer   │◄── Stream do microfone
│   (Animação ativa)   │
└──────────┬───────────┘
           │
           │ Usuário fala...
           │
           │ MediaRecorder.stop()
           ▼
┌──────────────────────┐
│   Audio Blob         │
│   (WebM/MP4/WAV)     │
└──────────┬───────────┘
           │
           │ POST /api/v1/speech/transcribe
           ▼
┌──────────────────────┐
│   Gateway Server     │
└──────────┬───────────┘
           │
           │ Validação de auth/formato
           ▼
┌──────────────────────┐
│   STT Service        │
│   • Check cache      │
│   • Call OpenAI API  │
│   • Store result     │
└──────────┬───────────┘
           │
           │ TranscriptionResult
           ▼
┌──────────────────────┐
│   Response JSON      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Voice Recorder     │
│   (Estado: PREVIEW)  │
└──────────────────────┘
```

### Fluxo 2: Detecção de Wake Word e Execução

```
TranscriptionResult
   │
   │ text: "clawd run tests"
   ▼
┌──────────────────────┐
│  Wake Word Detector  │
├──────────────────────┤
│  1. Normalize text   │
│  2. Check each word: │
│     - "clawd": 100%  │  ✓ MATCH
│     - "run": skip    │
│     - "tests": skip  │
│  3. Extract command  │
│     - "run tests"    │
│  4. Check cooldown   │
│     - Ready ✓        │
└──────────┬───────────┘
           │
           │ WakeWordMatch
           │ { matched: true, command: "run tests" }
           ▼
┌──────────────────────┐
│  Voice Command Router│
├──────────────────────┤
│  1. Match patterns   │
│     - "run tests"    │
│     - matches: test  │  ✓
│  2. Extract args     │
│     - []             │
│  3. Execute action   │
│     - npm test       │
└──────────┬───────────┘
           │
           │ CommandResult
           │ { success: true, ... }
           ▼
┌──────────────────────┐
│  Response to Client  │
└──────────────────────┘
```

### Fluxo 3: Caching

```
Request
   │
   ▼
┌──────────────────────┐
│  Generate Cache Key  │
│  (hash of audio)     │
└──────────┬───────────┘
           │
           │ Check Map.has(key)
           ▼
    ┌──────┴──────┐
    │             │
   YES            NO
    │             │
    ▼             ▼
┌────────┐   ┌──────────────────┐
│ Return │   │ Call STT API     │
│ cached │   │ Store in cache   │
│ result │   │ Evict oldest if  │
│        │   │ size > 100       │
└────────┘   └──────────────────┘
```

---

## ⌨️ Comandos Disponíveis

### CLI Commands

```bash
# Speech module commands
openclaw speech status              # Show service status
openclaw speech test -t <text>      # Test wake word detection
openclaw speech commands            # List available commands
openclaw speech config              # Show configuration

# Gateway commands
openclaw gateway run                # Start gateway server
openclaw gateway status             # Check gateway status

# Config commands
openclaw config set speech.provider openai
openclaw config set speech.sensitivity 0.8
openclaw config set speech.cooldownMs 2000
```

### Voice Commands

```bash
# Development workflow
"clawd run tests"                   # Execute test suite
"clawd build project"               # Build application
"clawd compile"                     # Alternative build

# Git operations
"clawd commit changes"              # Git commit
"clawd commit with message fix bug" # Commit with message
"clawd show status"                 # Git status + directory

# Code search
"clawd search for authentication"   # Search codebase
"clawd find router"                 # Alternative search

# Deployment
"clawd deploy to staging"           # Deploy staging
"clawd deploy to production"        # Deploy production
"clawd ship to dev"                 # Alternative deploy

# Maintenance
"clawd clear cache"                 # Clean cache
"clawd clean"                       # Alternative clear
```

---

## ✨ Features Implementadas

### Core Features

✅ **Multi-Provider STT**
- OpenAI Whisper API (gpt-4o-mini-transcribe)
- Deepgram Nova-3
- Web Speech API (Chrome/Edge)

✅ **Wake Word Detection**
- Fuzzy matching com Levenshtein distance
- Múltiplas wake words configuráveis
- Sensitivity ajustável (0.0 - 1.0)
- Cooldown entre ativações

✅ **Voice Commands**
- 7 comandos built-in
- Sistema extensível
- Extração de parâmetros
- Contexto de execução (git, diretório)

✅ **Web Interface**
- Voice Recorder com 4 estados
- Audio Visualizer em tempo real
- Integração com chat
- Auto-send quando detecta wake word

✅ **Performance**
- LRU Cache (100 itens)
- Rate limiting
- Validação de formatos
- Compressão de áudio

✅ **Security**
- JWT Authentication
- Bearer token validation
- Input sanitization
- HTTPS-only API calls

---

## 🔌 Integração MCP Excalidraw

### Sobre o MCP Excalidraw

O Model Context Protocol (MCP) permite que o sistema gere e manipule diagramas no Excalidraw programaticamente.

### Instalação do MCP Server

```bash
# Instalar dependências
npm install @modelcontextprotocol/server-excalidraw

# Ou adicionar ao package.json
{
  "dependencies": {
    "@modelcontextprotocol/server-excalidraw": "^1.0.0"
  }
}
```

### Configuração do MCP

```typescript
// src/mcp/excalidraw-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "openclaw-speech-excalidraw",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        create_speech_flow_diagram: {
          description: "Create a flow diagram for speech recognition",
          parameters: {
            type: "object",
            properties: {
              flow_type: {
                type: "string",
                enum: ["recording", "transcription", "command_execution"],
              },
              include_details: { type: "boolean" },
            },
            required: ["flow_type"],
          },
        },
        export_architecture: {
          description: "Export system architecture diagram",
          parameters: {
            type: "object",
            properties: {
              format: {
                type: "string",
                enum: ["png", "svg", "excalidraw"],
              },
            },
            required: ["format"],
          },
        },
      },
    },
  }
);

// Tool implementations
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "create_speech_flow_diagram":
      return createSpeechFlowDiagram(args);
    case "export_architecture":
      return exportArchitecture(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function createSpeechFlowDiagram(args: any) {
  // Generate Excalidraw elements based on flow type
  const elements = generateFlowElements(args.flow_type);
  
  return {
    content: [
      {
        type: "application/vnd.excalidraw+json",
        data: {
          type: "excalidraw",
          version: 2,
          source: "openclaw-speech",
          elements: elements,
        },
      },
    ],
  };
}

async function exportArchitecture(args: any) {
  // Export architecture diagram
  return {
    content: [
      {
        type: "image",
        data: generateArchitectureDiagram(),
        mimeType: `image/${args.format}`,
      },
    ],
  };
}
```

### Uso do MCP

```bash
# Gerar diagrama de fluxo de gravação
npx @modelcontextprotocol/server-excalidraw \
  --tool create_speech_flow_diagram \
  --arg flow_type=recording

# Exportar arquitetura em PNG
npx @modelcontextprotocol/server-excalidraw \
  --tool export_architecture \
  --arg format=png
```

---

## 📊 Diagramas de Fluxo

### Diagrama da Arquitetura

```excalidraw
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    // User Interface Layer
    {
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "strokeColor": "#1971c2",
      "backgroundColor": "#e7f5ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roundness": {"type": 3},
      "text": "Voice Recorder",
      "fontSize": 16,
      "fontFamily": 1
    },
    {
      "type": "rectangle",
      "x": 350,
      "y": 100,
      "width": 200,
      "height": 100,
      "strokeColor": "#1971c2",
      "backgroundColor": "#e7f5ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roundness": {"type": 3},
      "text": "Audio Visualizer",
      "fontSize": 16,
      "fontFamily": 1
    },
    
    // Gateway Layer
    {
      "type": "rectangle",
      "x": 100,
      "y": 300,
      "width": 600,
      "height": 150,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#d3f9d8",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roundness": {"type": 3},
      "text": "Gateway Server\\nAPI Routes + Security",
      "fontSize": 18,
      "fontFamily": 1
    },
    
    // Business Logic Layer
    {
      "type": "rectangle",
      "x": 50,
      "y": 550,
      "width": 180,
      "height": 120,
      "strokeColor": "#e8590c",
      "backgroundColor": "#fff4e6",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roundness": {"type": 3},
      "text": "STT Service\\n• OpenAI\\n• Deepgram\\n• Cache",
      "fontSize": 14,
      "fontFamily": 1
    },
    {
      "type": "rectangle",
      "x": 310,
      "y": 550,
      "width": 180,
      "height": 120,
      "strokeColor": "#e8590c",
      "backgroundColor": "#fff4e6",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roundness": {"type": 3},
      "text": "Wake Word\\nDetector\\n• Fuzzy Match\\n• Cooldown",
      "fontSize": 14,
      "fontFamily": 1
    },
    {
      "type": "rectangle",
      "x": 570,
      "y": 550,
      "width": 180,
      "height": 120,
      "strokeColor": "#e8590c",
      "backgroundColor": "#fff4e6",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roundness": {"type": 3},
      "text": "Command\\nRouter\\n• 7 Built-in\\n• Extensible",
      "fontSize": 14,
      "fontFamily": 1
    },
    
    // Connections
    {
      "type": "arrow",
      "x": 200,
      "y": 200,
      "points": [[0, 0], [0, 100]],
      "strokeColor": "#495057",
      "strokeWidth": 2
    },
    {
      "type": "arrow",
      "x": 400,
      "y": 450,
      "points": [[0, 0], [-300, 100]],
      "strokeColor": "#495057",
      "strokeWidth": 2
    },
    {
      "type": "arrow",
      "x": 400,
      "y": 670,
      "points": [[0, 0], [0, 30]],
      "strokeColor": "#495057",
      "strokeWidth": 2
    },
    {
      "type": "arrow",
      "x": 230,
      "y": 610,
      "points": [[0, 0], [80, 0]],
      "strokeColor": "#495057",
      "strokeWidth": 2
    },
    {
      "type": "arrow",
      "x": 490,
      "y": 610,
      "points": [[0, 0], [80, 0]],
      "strokeColor": "#495057",
      "strokeWidth": 2
    }
  ]
}
```

---

## 📚 API Reference

### REST API Endpoints

#### POST /api/v1/speech/transcribe

Transcreve áudio e opcionalmente detecta wake words.

**Request:**
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
    "data": {
      "command": "npm test",
      "exitCode": 0
    }
  }
}
```

#### POST /api/v1/speech/command

Executa um comando de voz diretamente.

**Request:**
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

**Response:**
```json
{
  "success": true,
  "command": "build project",
  "message": "Building project...",
  "data": {
    "command": "npm run build",
    "exitCode": 0
  }
}
```

#### GET /api/v1/speech/status

Retorna status do serviço de speech.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "stt": {
      "available": true,
      "provider": "openai",
      "cacheSize": 45
    },
    "wakeWord": {
      "available": true,
      "words": ["clawd", "openclaw"],
      "sensitivity": 0.8
    },
    "commands": {
      "available": true,
      "registeredCommands": ["test", "build", "commit", "status", "search", "deploy", "clear"]
    }
  }
}
```

### WebSocket Events

#### /ws/speech/stream

Streaming em tempo real da transcrição.

**Client -> Server:**
```json
{
  "type": "start_recording",
  "language": "pt-BR"
}
```

**Server -> Client:**
```json
{
  "type": "interim_transcript",
  "text": "clawd run...",
  "isFinal": false
}
```

```json
{
  "type": "final_transcript",
  "text": "clawd run tests",
  "wakeWordDetected": true,
  "command": "run tests"
}
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# OpenAI (padrão)
export OPENAI_API_KEY="sk-..."

# Deepgram (alternativo)
export DEEPGRAM_API_KEY="..."

# Configurações opcionais
export SPEECH_CACHE_SIZE="100"
export SPEECH_COOLDOWN_MS="2000"
export SPEECH_SENSITIVITY="0.8"
export SPEECH_WAKE_WORDS="clawd,openclaw,hey claw"
```

### Configuração via Arquivo

```typescript
// config/speech.config.ts
export default {
  stt: {
    provider: 'openai',
    model: 'gpt-4o-mini-transcribe',
    language: 'auto',
    cache: {
      enabled: true,
      maxSize: 100,
      ttl: 3600000, // 1 hour
    },
  },
  wakeWord: {
    words: ['clawd', 'openclaw'],
    aliases: ['hey claw'],
    sensitivity: 0.8,
    cooldownMs: 2000,
    caseSensitive: false,
  },
  commands: {
    enabled: true,
    context: {
      includeGitInfo: true,
      includeDirectory: true,
    },
  },
};
```

---

## 🧪 Testes

### Estrutura de Testes

```
src/speech/__tests__/
├── stt-service.test.ts              # 33 testes
├── wake-word-detector.test.ts       # 39 testes
├── voice-command-router.test.ts     # 20 testes
├── speech-integration.test.ts       # 11 testes
└── speech-security.test.ts          # 8 testes (novo)

Total: 111 testes
```

### Executar Testes

```bash
# Todos os testes
pnpm test src/speech/__tests__/

# Com cobertura
pnpm test:coverage src/speech/__tests__/

# Modo watch
pnpm test:watch src/speech/__tests__/

# Testes específicos
pnpm test src/speech/__tests__/stt-service.test.ts
pnpm test src/speech/__tests__/wake-word-detector.test.ts
```

### Cobertura

| Métrica | Valor | Status |
|---------|-------|--------|
| Linhas | 94.44% | ✅ |
| Branches | 75.8% | ✅ |
| Funções | 93.61% | ✅ |
| Statements | 94.19% | ✅ |

---

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  openclaw:
    build: .
    ports:
      - "8080:8080"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./config:/app/config
```

---

## 📞 Suporte

- **Issues**: https://github.com/openclaw/openclaw/issues
- **Documentação**: https://docs.openclaw.ai/speech
- **Discord**: https://discord.gg/openclaw

---

**Documentação gerada em**: $(date)
**Versão**: 1.0.0
**Autor**: OpenClaw Team
