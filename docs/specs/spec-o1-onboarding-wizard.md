# Spec O1: Onboarding Wizard com GUI

## 🎯 Objetivo
Criar uma experiência de onboarding completa que guia o usuário desde a instalação até a primeira mensagem, com wizard visual no navegador e configuração passo a passo.

## 📋 Motivação
Atualmente o processo de setup é fragmentado:
- Usuário precisa configurar múltiplos arquivos manualmente
- Não há uma experiência unificada de primeiro uso
- Dificuldade em descobrir todas as features disponíveis
- Configuração de canais (WhatsApp, Telegram) requer múltiplos comandos

## 🏗️ Fluxo Completo

### Fluxo 1: CLI + GUI (Recomendado)
```
1. Usuário instala: npm install -g openclaw
2. Executa: openclaw onboard --wizard
3. CLI faz configuração básica (auth, defaults)
4. Pergunta: "Abrir dashboard para configuração visual?"
5. Se sim: Inicia gateway + abre navegador com token
6. GUI mostra wizard de primeiro uso
7. Usuário configura canais, modelos, preferências
8. Pronto para usar!
```

### Fluxo 2: GUI Direto
```
1. Usuário acessa: http://localhost:18789/ui/onboarding
2. Wizard detecta que é primeiro uso
3. Guia passo a passo completo
4. Configuração automática de defaults
5. Setup completo via interface
```

## 🎨 Telas do Wizard

### Tela 1: Boas-vindas
```
┌─────────────────────────────────────┐
│  🦞 Bem-vindo ao OpenClaw!          │
│                                     │
│  Seu assistente de IA pessoal       │
│  que roda em seus próprios          │
│  dispositivos.                      │
│                                     │
│  [Começar Setup]  [Modo Avançado]   │
└─────────────────────────────────────┘
```

### Tela 2: Autenticação
```
┌─────────────────────────────────────┐
│  🔐 Configure sua Autenticação      │
│                                     │
│  Escolha seu modelo de IA:          │
│                                     │
│  ○ Claude (Anthropic)               │
│    [Inserir API Key]                │
│                                     │
│  ○ GPT-4 (OpenAI)                   │
│    [Inserir API Key]                │
│                                     │
│  ○ Ollama (Local)                   │
│    [Usar modelo local]              │
│                                     │
│  [Voltar]  [Próximo]                │
└─────────────────────────────────────┘
```

### Tela 3: Canais de Comunicação
```
┌─────────────────────────────────────┐
│  💬 Configure seus Canais           │
│                                     │
│  Escolha onde quer receber          │
│  mensagens:                         │
│                                     │
│  ☑️ WhatsApp                        │
│     [Scanear QR Code]               │
│                                     │
│  ☐ Telegram                         │
│     [Inserir Bot Token]             │
│                                     │
│  ☐ Discord                          │
│     [Configurar Bot]                │
│                                     │
│  [Pular]  [Próximo]                 │
└─────────────────────────────────────┘
```

### Tela 4: Features
```
┌─────────────────────────────────────┐
│  ⚡ Ative suas Features             │
│                                     │
│  Recomendamos começar com:          │
│                                     │
│  ☑️ Voice Recorder                  │
│  ☑️ Text-to-Speech                  │
│  ☑️ Web Search                      │
│  ☐ Browser Automation               │
│  ☐ News & Intelligence              │
│                                     │
│  [Personalizar]  [Concluir]         │
└─────────────────────────────────────┘
```

### Tela 5: Pronto!
```
┌─────────────────────────────────────┐
│  🎉 Tudo Pronto!                    │
│                                     │
│  Resumo da configuração:            │
│  • Modelo: Claude                   │
│  • Canais: WhatsApp                 │
│  • Features: 5 ativas               │
│                                     │
│  [Abrir Chat]  [Ver Tutorial]       │
└─────────────────────────────────────┘
```

## ⚙️ Defaults Automáticos

Quando o usuário escolhe "Começar Setup" (modo simples), aplicar:

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "<gerado-automaticamente>"
    },
    "controlUi": {
      "enabled": true,
      "basePath": "/ui",
      "dangerouslyDisableDeviceAuth": true,
      "allowInsecureAuth": true
    }
  },
  "agent": {
    "model": "anthropic/claude-3-5-sonnet-20241022",
    "thinkingLevel": "low"
  },
  "features": {
    "voice_recorder": { "enabled": true },
    "tts": { "enabled": true },
    "web_search": { "enabled": true },
    "browser": { "enabled": false }
  }
}
```

## 🔧 Implementação Backend

### Novo Handler: `onboard.wizard`
```typescript
// src/gateway/server-methods/onboard.ts

interface OnboardWizardRequest {
  step: 'welcome' | 'auth' | 'channels' | 'features' | 'complete';
  data?: {
    provider?: string;
    apiKey?: string;
    channels?: string[];
    features?: string[];
  };
}

interface OnboardWizardResponse {
  step: string;
  progress: number; // 0-100
  nextStep?: string;
  config: Partial<OpenClawConfig>;
  token?: string; // Token gerado para acesso UI
}
```

### Novo Comando CLI: `onboard --wizard`
```typescript
// src/cli/commands/onboard.ts

export const onboardWizardCommand = {
  command: 'onboard',
  describe: 'Interactive setup wizard',
  builder: (yargs) => {
    return yargs
      .option('wizard', {
        type: 'boolean',
        default: true,
        describe: 'Use GUI wizard'
      })
      .option('open-dashboard', {
        type: 'boolean',
        default: true,
        describe: 'Open browser after setup'
      });
  },
  handler: async (argv) => {
    // 1. Verificar se é primeiro uso
    // 2. Configurar defaults
    // 3. Perguntar sobre GUI
    // 4. Se sim: iniciar gateway
    // 5. Gerar token
    // 6. Abrir navegador
  }
};
```

### Geração Automática de Token
```typescript
function generateOnboardingToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function createOnboardingSession(): {
  token: string;
  expiresAt: Date;
  config: Partial<OpenClawConfig>;
} {
  return {
    token: generateOnboardingToken(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
    config: generateDefaultConfig()
  };
}
```

## 🎨 Implementação Frontend

### Nova View: `onboarding-wizard.ts`
```typescript
// ui/src/ui/views/onboarding-wizard.ts

export function renderOnboardingWizard(state: AppViewState) {
  const step = state.onboardingStep;
  
  switch (step) {
    case 'welcome':
      return renderWelcomeStep(state);
    case 'auth':
      return renderAuthStep(state);
    case 'channels':
      return renderChannelsStep(state);
    case 'features':
      return renderFeaturesStep(state);
    case 'complete':
      return renderCompleteStep(state);
  }
}

function renderWelcomeStep(state: AppViewState) {
  return html`
    <div class="onboarding-welcome">
      <h1>🦞 Bem-vindo ao OpenClaw!</h1>
      <p>Seu assistente de IA pessoal...</p>
      <button @click=${() => state.nextOnboardingStep()}>
        Começar Setup
      </button>
      <button @click=${() => state.skipOnboarding()}>
        Modo Avançado
      </button>
    </div>
  `;
}
```

### Progress Bar Component
```typescript
function renderProgressBar(progress: number) {
  return html`
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress}%"></div>
    </div>
    <div class="progress-text">${progress}% completo</div>
  `;
}
```

## 📱 Fluxo de Navegação

```
/onboarding
  ├── /welcome        → Tela inicial
  ├── /auth          → Configuração de auth
  ├── /channels      → Setup de canais
  ├── /features      → Ativação de features
  └── /complete      → Tela final
```

## 🔒 Segurança

1. **Token Temporário**: Válido apenas durante onboarding (30 min)
2. **Rate Limit**: Máximo 3 tentativas de onboarding por hora
3. **Validação**: Verificar se porta está disponível antes de iniciar
4. **Isolamento**: Configuração só é aplicada após confirmação final

## 🧪 Testes

### Testes Unitários
```typescript
describe('Onboarding Wizard', () => {
  it('should generate valid default config', () => {
    const config = generateDefaultConfig();
    expect(config.gateway.port).toBe(18789);
    expect(config.gateway.auth.token).toBeDefined();
  });
  
  it('should complete wizard flow', async () => {
    const wizard = new OnboardingWizard();
    await wizard.start();
    await wizard.setAuthProvider('anthropic');
    await wizard.enableChannel('whatsapp');
    const result = await wizard.complete();
    expect(result.success).toBe(true);
  });
});
```

### Testes E2E
```bash
# Fluxo completo
openclaw onboard --wizard --non-interactive
# Verificar se config foi criada
# Verificar se gateway iniciou
# Verificar se UI abriu
```

## 📋 Checklist de Implementação

### Backend
- [ ] Criar handler `onboard.wizard`
- [ ] Implementar geração de defaults
- [ ] Criar sistema de sessões temporárias
- [ ] Adicionar rate limiting
- [ ] Implementar validação de config

### CLI
- [ ] Modificar comando `onboard`
- [ ] Adicionar flag `--wizard`
- [ ] Implementar abertura automática de browser
- [ ] Adicionar detecção de primeiro uso

### Frontend
- [ ] Criar view `onboarding-wizard.ts`
- [ ] Implementar 5 telas do wizard
- [ ] Criar componente de progresso
- [ ] Adicionar validação em tempo real
- [ ] Implementar navegação entre steps

### Integração
- [ ] Conectar CLI com Gateway
- [ ] Passar token via URL
- [ ] Detectar modo onboarding na UI
- [ ] Aplicar config após conclusão

## ⏱️ Estimativa

- **Backend**: 2 dias
- **CLI**: 1 dia
- **Frontend**: 3 dias
- **Testes**: 1 dia
- **Integração**: 1 dia
- **Total**: **8 dias**

## 🎯 Critérios de Aceitação

1. ✅ Usuário consegue fazer setup completo via GUI
2. ✅ CLI abre navegador automaticamente
3. ✅ Defaults são aplicados corretamente
4. ✅ Token é gerado e funciona
5. ✅ Wizard pode ser pulado (modo avançado)
6. ✅ Config é validada antes de aplicar
7. ✅ UX é intuitiva e rápida (< 5 minutos)

## 🔗 Relacionamentos

- **Depende de**: Spec B1 (Features Dashboard) - para mostrar features
- **Relacionado**: Spec C1 (Model Routing) - seleção de modelos
- **Usa**: Spec A3 (Containers) - para verificação de ambiente
