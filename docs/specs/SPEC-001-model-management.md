# SPEC-001: Sistema de Gerenciamento de Modelos LLM

## 1. Objetivo
Criar interface intuitiva para seleção, configuração e gerenciamento de modelos LLM com suporte a múltiplos provedores.

## 2. Escopo
- Interface de seleção de modelo no chat
- Configuração de provedores (existentes + novos)
- Persistência segura de credenciais
- Validação de conectividade

## 3. Arquitetura

### 3.1 Componentes
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (UI)                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ModelSelector│  │ ProviderCard │  │ ConfigWizard │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────┴────────────────────────────────────────┐
│                   BACKEND (Gateway)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ModelAPI     │  │ Credential   │  │ Validation   │      │
│  │ Controller   │  │ Manager      │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Endpoints API

#### GET /api/v1/models/providers
Lista todos os provedores configurados e disponíveis.

**Response:**
```json
{
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "icon": "openai-logo",
      "status": "configured",
      "models": [
        {
          "id": "gpt-4-turbo",
          "name": "GPT-4 Turbo",
          "features": ["vision", "tools"],
          "cost": { "input": 10, "output": 30 },
          "contextWindow": 128000,
          "isDefault": true
        }
      ]
    },
    {
      "id": "kimi",
      "name": "Moonshot (Kimi)",
      "icon": "kimi-logo",
      "status": "unconfigured",
      "models": []
    }
  ]
}
```

#### POST /api/v1/models/select
Seleciona modelo ativo para a sessão.

**Request:**
```json
{
  "providerId": "openai",
  "modelId": "gpt-4-turbo",
  "sessionKey": "agent:main:main"
}
```

#### POST /api/v1/models/providers
Adiciona novo provedor.

**Request:**
```json
{
  "providerId": "kimi",
  "config": {
    "baseUrl": "https://api.moonshot.cn/v1",
    "apiKey": "encrypted_api_key",
    "auth": "api-key"
  },
  "models": [
    {
      "id": "kimi-k2",
      "name": "Kimi K2"
    }
  ]
}
```

## 4. Interface do Usuário

### 4.1 Model Selector Dropdown
```
┌─ Modelo Atual: GPT-4 Turbo (OpenAI) ───────────────┐
│                                                    │
│ Provedores:                                        │
│ 🟢 OpenAI                    [▸]                  │
│   ○ GPT-4 Vision              $10/$30 👁️          │
│   ● GPT-4 Turbo               $10/$30 ✓           │
│   ○ GPT-3.5 Turbo             $0.5/$1.5           │
│                                                    │
│ 🔴 Anthropic (Claude)        [▸]                  │
│   ○ Claude 3 Opus             $15/$75             │
│                                                    │
│ ⚪ Moonshot (Kimi)            [+ Configurar]       │
│ ⚪ GLM-5 (Zhipu)              [+ Configurar]       │
│                                                    │
│ [⚙️ Gerenciar Provedores]                          │
└────────────────────────────────────────────────────┘
```

### 4.2 Configuração de Novo Provedor (Wizard)
```
┌─ Adicionar Provedor: Moonshot (Kimi) ──────────────┐
│                                                    │
│ Passo 1: Credenciais                               │
│ ┌──────────────────────────────────────────────┐   │
│ │ API Key: [sk-***************************]    │   │
│ │          [?] Obter em: platform.moonshot.cn  │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Passo 2: Modelos                                   │
│ ☑ Kimi K2 (contexto: 128k)                       │
│ ☑ Kimi K1.5 (contexto: 256k)                     │
│                                                    │
│ [Testar Conexão] ✓ Conectado!                    │
│                                                    │
│ [Salvar] [Cancelar]                                │
└────────────────────────────────────────────────────┘
```

## 5. Provedores Suportados

### 5.1 Built-in (Pré-configurados)
1. **OpenAI** - GPT-4, GPT-3.5
2. **Anthropic** - Claude 3 (Opus/Sonnet/Haiku)
3. **Google** - Gemini Pro/Ultra
4. **Groq** - Llama, Mixtral
5. **Cerebras** - Cerebras-GPT
6. **XAI** - Grok
7. **OpenRouter** - Múltiplos modelos
8. **Azure OpenAI** - Enterprise

### 5.2 Para Adicionar via Interface
1. **Moonshot (Kimi)** - China
2. **Zhipu AI (GLM-5)** - China
3. **Alibaba (Qwen)** - China
4. **MiniMax** - China
5. **Xiaomi** - China
6. **Ollama** - Local
7. **Venice** - Privacy-focused
8. **Mistral** - Europa
9. **DeepSeek** - China
10. **Cohere** - Enterprise

## 6. Persistência

### 6.1 Estrutura de Configuração
```json
{
  "models": {
    "active": {
      "provider": "openai",
      "model": "gpt-4-turbo",
      "session": "agent:main:main"
    },
    "providers": {
      "openai": {
        "enabled": true,
        "baseUrl": "https://api.openai.com/v1",
        "auth": {
          "type": "api-key",
          "key": "ENCRYPTED_KEY"
        }
      },
      "kimi": {
        "enabled": true,
        "baseUrl": "https://api.moonshot.cn/v1",
        "auth": {
          "type": "api-key",
          "key": "ENCRYPTED_KEY"
        },
        "models": ["kimi-k2", "kimi-k1.5"]
      }
    }
  }
}
```

## 7. Critérios de Aceitação
- [ ] Dropdown de seleção de modelo no header do chat
- [ ] Wizard de configuração de novo provedor
- [ ] Validação de API key em tempo real
- [ ] Indicador visual de modelo ativo
- [ ] Persistência segura de credenciais
- [ ] Suporte a mínimo 10 provedores
- [ ] Testes de integração
- [ ] Documentação de uso

## 8. Dependências
- SPEC-002: Sistema de Criptografia de Credenciais
- SPEC-003: Validação de Segurança de Input

## 9. Riscos
- **Médio**: Integração com APIs chinesas pode ter latência
- **Baixo**: Provedores podem mudar formato de API
- **Alto**: Segurança de credenciais (mitigado por criptografia)

## 10. Estimativa
- **Desenvolvimento**: 5-7 dias
- **Testes**: 2-3 dias
- **Documentação**: 1 dia
- **Total**: 8-11 dias
