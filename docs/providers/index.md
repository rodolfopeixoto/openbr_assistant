---
summary: "Model providers (LLMs) supported by OpenClaw"
read_when:
  - You want to choose a model provider
  - You need a quick overview of supported LLM backends
title: "Model Providers"
---

# Model Providers

OpenClaw can use many LLM providers. Pick a provider, authenticate, then set the
default model as `provider/model`.

Looking for chat channel docs (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.)? See [Channels](/channels).

## Highlight: Venice (Venice AI)

Venice is our recommended Venice AI setup for privacy-first inference with an option to use Opus for hard tasks.

- Default: `venice/llama-3.3-70b`
- Best overall: `venice/claude-opus-45` (Opus remains the strongest)

See [Venice AI](/providers/venice).

## Quick Start

### Add Your First Provider

Choose a provider and add it in one command:

```bash
# OpenAI
openclaw providers add openai --api-key "sk-..."

# NVIDIA API Catalog
openclaw providers add nvidia --api-key "nvapi-..."

# Local Ollama instance
openclaw providers add custom --template ollama --url http://localhost:11434
```

### Set Default Model

Configure your default model in `openclaw.config.json`:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallback: "openai/gpt-4o"
      }
    }
  }
}
```

### List and Manage Providers

```bash
# See all configured providers
openclaw providers list

# Test a provider connection
openclaw providers test <provider-id>

# Set default provider
openclaw providers default <provider-id>
```

## Managing Providers

For detailed instructions on adding, configuring, and troubleshooting providers:

- **[User Guide](/providers/user-guide)** - Step-by-step setup for NVIDIA, OpenAI, and custom endpoints
- **[Developer Guide](/providers/developer-guide)** - API reference and architecture for building provider integrations
- **[Code Examples](https://github.com/openclaw/openclaw/tree/main/examples/providers)** - Working JavaScript examples for programmatic provider management

## Provider Docs

### Cloud Providers

- [OpenAI (API + Codex)](/providers/openai) - GPT-4o, GPT-4o Mini, o1 reasoning
- [Anthropic (API + Claude Code CLI)](/providers/anthropic) - Claude 3.5 Sonnet, Claude 3 Opus
- [NVIDIA API Catalog](/providers/nvidia) - GLM5, Kimi K2.5, Qwen3 Coder via NVIDIA
- [Groq](/providers/groq) - Fast inference with open models
- [Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot) - Kimi models for long context
- [Qwen (OAuth)](/providers/qwen) - Alibaba's Qwen models
- [MiniMax](/providers/minimax) - MiniMax model family
- [OpenRouter](/providers/openrouter) - Unified API for multiple providers
- [Venice (Venice AI, privacy-focused)](/providers/venice)

### Enterprise & Custom

- [Amazon Bedrock](/bedrock) - AWS managed models
- [Vercel AI Gateway](/providers/vercel-ai-gateway) - Unified AI gateway
- [Z.AI](/providers/zai)
- [Xiaomi](/providers/xiaomi)
- [OpenCode Zen](/providers/opencode)

### Local & Self-Hosted

- [Ollama (local models)](/providers/ollama) - Run models locally
- [GLM models](/providers/glm) - ChatGLM model family

### Transcription

- [Deepgram (audio transcription)](/providers/deepgram)

## Transcription providers

- [Deepgram (audio transcription)](/providers/deepgram)

## Community tools

- [Claude Max API Proxy](/providers/claude-max-api-proxy) - Use Claude Max/Pro subscription as an OpenAI-compatible API endpoint

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/concepts/model-providers).
