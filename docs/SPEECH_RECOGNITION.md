# Speech Recognition (Swabble)

O OpenClaw agora possui reconhecimento de voz integrado, permitindo controlar o agente via comandos de voz.

## 🎯 Funcionalidades

- **Gravação de áudio** diretamente na interface web
- **Transcrição** usando OpenAI Whisper ou Deepgram
- **Detecção de wake word** ("clawd", "openclaw", "hey claw")
- **Comandos de voz** para automação de tarefas
- **Suporte multi-idioma** (português, inglês, espanhol, etc.)

## 🚀 Como Usar

### Via Interface Web

1. Abra o OpenClaw Web UI
2. Inicie uma sessão de chat
3. Clique no botão **"🎤 Voice"** na barra de ferramentas
4. Fale seu comando (ex: "clawd, run tests")
5. Aguarde a transcrição e execução automática

### Via CLI

```bash
# Ver status do serviço
openclaw speech status

# Testar detecção de wake word
openclaw speech test -t "clawd run tests"

# Listar comandos disponíveis
openclaw speech commands

# Ver configuração atual
openclaw speech config
```

### Via API

```bash
curl -X POST http://localhost:8080/api/v1/speech/transcribe \
  -H "Authorization: Bearer <token>" \
  -F "audio=@recording.webm" \
  -F "language=auto"
```

## 🎙️ Comandos de Voz Disponíveis

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `test` | Executar testes | "clawd run tests" |
| `build` | Compilar projeto | "clawd build project" |
| `commit` | Commitar alterações | "clawd commit changes" |
| `status` | Mostrar status | "openclaw show status" |
| `search` | Buscar no código | "clawd search for auth" |
| `deploy` | Fazer deploy | "clawd deploy to production" |
| `clear` | Limpar cache | "clawd clear cache" |

## ⚙️ Configuração

### Configuração via CLI

```bash
# Configurar provider de STT
openclaw config set speech.provider openai  # ou deepgram

# Configurar wake words
openclaw config set speech.wakeWords "clawd,openclaw"

# Configurar sensibilidade (0.0 - 1.0)
openclaw config set speech.sensitivity 0.8

# Configurar cooldown (ms)
openclaw config set speech.cooldownMs 2000
```

### Variáveis de Ambiente

```bash
# API Key para OpenAI Whisper
export OPENAI_API_KEY="sk-..."

# API Key para Deepgram
export DEEPGRAM_API_KEY="..."
```

## 🔧 Arquitetura

```
┌─────────────────┐
│  VoiceRecorder  │  ← Componente UI (Lit)
│    (Web UI)     │
└────────┬────────┘
         │
         │ MediaRecorder API
         ▼
┌─────────────────┐
│  /api/v1/speech │  ← API REST
│   /transcribe   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STT Service    │  ← OpenAI Whisper/Deepgram
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WakeWordDetector│  ← Detecção de "clawd"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│VoiceCommandRouter│ ← Roteamento de comandos
└─────────────────┘
```

## 🧪 Testes

```bash
# Executar todos os testes de speech
pnpm test src/speech/__tests__/

# Ver cobertura
pnpm test:coverage src/speech/__tests__/
```

## 📁 Estrutura de Arquivos

```
src/speech/
├── stt-service.ts              # Serviço de transcrição
├── wake-word-detector.ts       # Detecção de wake word
├── voice-command-router.ts     # Roteamento de comandos
└── __tests__/
    ├── stt-service.test.ts
    ├── wake-word-detector.test.ts
    ├── voice-command-router.test.ts
    └── speech-integration.test.ts

ui/src/ui/components/speech/
├── voice-recorder.ts           # Componente de gravação
├── audio-visualizer.ts         # Visualização de áudio
└── index.ts

src/gateway/routes/
└── speech.ts                   # Rotas da API

src/cli/commands/
└── speech.ts                   # Comandos CLI
```

## 🎨 Personalização

### Adicionar Novo Comando de Voz

```typescript
// Em src/speech/voice-command-router.ts
this.register({
  name: 'mycommand',
  description: 'My custom command',
  patterns: ['^my command$', '^do something$'],
  action: async (args, context) => {
    return {
      success: true,
      message: 'Command executed!',
      data: { result: '...' }
    };
  },
});
```

### Adicionar Nova Wake Word

```typescript
// Via CLI
openclaw speech config --wake-words "hey openbr,assist"

// Ou programaticamente
wakeWordDetector.addWakeWord('hey openbr');
```

## 📱 Compatibilidade

- **Chrome/Edge**: ✅ Completo (WebM/Opus)
- **Firefox**: ✅ Completo (WebM/Opus)
- **Safari**: ✅ Completo (MP4/AAC)
- **Mobile**: ✅ Via browser

## 🔒 Segurança

- Autenticação via Bearer token
- Limite de 25MB por arquivo de áudio
- Validação de formatos suportados
- Cooldown entre comandos (anti-spam)

## 🐛 Troubleshooting

### Microfone não funciona
1. Verifique permissões do navegador
2. Certifique-se de estar em HTTPS (ou localhost)
3. Teste em outro navegador

### Wake word não detectada
1. Fale claramente e perto do microfone
2. Verifique a sensibilidade: `openclaw speech config`
3. Tente variações: "clawd", "openclaw", "hey claw"

### Comando não reconhecido
1. Liste comandos disponíveis: `openclaw speech commands`
2. Verifique se o comando está registrado
3. Consulte logs do servidor

## 📚 Referências

- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Deepgram Nova-3](https://developers.deepgram.com/docs/nova-3)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

**Nota**: Este é um recurso em evolução. Sugestões e contribuições são bem-vindas!
