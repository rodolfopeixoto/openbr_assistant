---
summary: "Complete guide to managing AI model providers in OpenClaw"
read_when:
  - You want to add or configure a new provider
  - You need to troubleshoot provider connections
  - You want to manage existing providers
title: "Provider Management User Guide"
---

# Provider Management User Guide

OpenClaw supports multiple AI model providers, allowing you to use different LLM backends based on your needs. This guide covers everything from adding your first provider to managing multiple configurations.

## Overview

OpenClaw's provider system allows you to:

- **Use multiple providers** simultaneously with automatic failover
- **Configure custom endpoints** for self-hosted or enterprise models
- **Test connections** before saving configurations
- **Set default providers** for automatic selection
- **Manage API keys** securely with profile-based credentials

## Quick Start

### List Available Provider Templates

View all built-in provider templates before configuration:

```bash
openclaw providers templates list
```

### Check Your Current Providers

See all configured providers and their status:

```bash
openclaw providers list
```

## Supported Providers

OpenClaw includes built-in templates for:

| Provider | Type | Best For |
|----------|------|----------|
| [OpenAI](/providers/openai) | Cloud | GPT-4o, GPT-4o Mini, o1 reasoning |
| [Anthropic](/providers/anthropic) | Cloud | Claude 3.5 Sonnet, Claude 3 Opus |
| [NVIDIA](/providers/nvidia) | Cloud | Enterprise models (GLM5, Kimi K2.5) |
| [Groq](/providers/groq) | Cloud | Fast inference with open models |
| [Moonshot AI](/providers/moonshot) | Cloud | Kimi models for long context |
| [Venice AI](/providers/venice) | Cloud | Privacy-focused inference |
| [Ollama](/providers/ollama) | Local | Self-hosted models |
| [Qwen](/providers/qwen) | Cloud | Alibaba's Qwen models |

For the complete list, see [Model Providers](/providers).

## Adding NVIDIA Provider

NVIDIA provides access to production-grade models through their API Catalog. Follow these steps to add NVIDIA as a provider.

### Step 1: Get Your API Key

1. Visit [build.nvidia.com](https://build.nvidia.com/)
2. Sign up or log in to your NVIDIA account
3. Navigate to **API Keys** in your profile
4. Generate a new API key
5. Copy the key (starts with `nvapi-`)

### Step 2: Add the Provider via CLI

```bash
openclaw providers add nvidia \
  --name "My NVIDIA Provider" \
  --api-key "nvapi-YOUR_API_KEY_HERE"
```

### Step 3: Test the Connection

```bash
openclaw providers test nvidia
```

You should see:
```
✓ Connection successful
  Latency: 45ms
  Models available: 3
```

### Step 4: Set as Default (Optional)

```bash
openclaw providers default nvidia
```

### Using in Configuration

Once configured, use NVIDIA models in your `openclaw.config.json`:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "nvidia/z-ai/glm5"
      }
    }
  }
}
```

Available NVIDIA models:
- `nvidia/z-ai/glm5` - Excels in agentic coding with 256K context
- `nvidia/moonshotai/kimi-k2.5` - Advanced reasoning model
- `nvidia/qwen/qwen3-coder-480b-a35b-instruct` - Specialized for coding

## Adding OpenAI Provider

### Step 1: Get Your API Key

1. Visit [platform.openai.com](https://platform.openai.com/api-keys)
2. Sign in to your OpenAI account
3. Click **Create new secret key**
4. Copy the key (starts with `sk-`)

### Step 2: Add the Provider

```bash
openclaw providers add openai \
  --name "Production OpenAI" \
  --api-key "sk-YOUR_API_KEY_HERE"
```

### Step 3: Verify Configuration

```bash
openclaw providers list
```

Output:
```
ID                    NAME                STATUS      TEMPLATE
openai_1234567890     Production OpenAI   connected   openai
```

### Step 4: Use OpenAI Models

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-4o"
      }
    }
  }
}
```

## Adding Custom Endpoint

For self-hosted models (via Ollama, vLLM, etc.) or enterprise endpoints:

### Basic Custom Provider

```bash
openclaw providers add custom \
  --name "My Local LLM" \
  --base-url "http://localhost:11434" \
  --api-key "optional-api-key" \
  --template "openai-compatible"
```

### Ollama Example

```bash
openclaw providers add custom \
  --name "Local Ollama" \
  --base-url "http://localhost:11434/v1" \
  --template "ollama"
```

### Enterprise/Private Endpoint

```bash
openclaw providers add custom \
  --name "Company LLM" \
  --base-url "https://llm.company.com/api" \
  --api-key "enterprise-key" \
  --template "openai-compatible"
```

### Testing Custom Endpoints

Always test before using:

```bash
openclaw providers test custom \
  --base-url "http://localhost:11434/v1" \
  --api-key "your-key"
```

## Managing Configured Providers

### List All Providers

```bash
# All providers
openclaw providers list

# Only enabled providers
openclaw providers list --enabled

# Only providers with errors
openclaw providers list --status error
```

### Provider Details

```bash
openclaw providers show <provider-id>
```

Output:
```json
{
  "id": "nvidia_1234567890",
  "templateId": "nvidia",
  "name": "My NVIDIA Provider",
  "status": "connected",
  "baseUrl": "https://integrate.api.nvidia.com/v1",
  "isDefault": true,
  "isEnabled": true,
  "createdAt": "2026-02-19T10:00:00.000Z",
  "modelsAvailable": 3
}
```

### Update Provider

```bash
# Rename provider
openclaw providers update <provider-id> --name "New Name"

# Update API key
openclaw providers update <provider-id> --api-key "new-key"

# Disable provider
openclaw providers update <provider-id> --disable

# Enable provider
openclaw providers update <provider-id> --enable
```

### Set Default Provider

```bash
openclaw providers default <provider-id>
```

### Remove Provider

```bash
openclaw providers remove <provider-id>
```

## Troubleshooting

### Connection Test Fails

**Symptom:**
```
✗ Connection failed: 401 Unauthorized
```

**Solutions:**

1. **Verify API Key**
   ```bash
   # Check if key is valid with curl
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.openai.com/v1/models
   ```

2. **Check API Key Permissions**
   - Some keys are scoped to specific models
   - Ensure your account has access to the models you want to use

3. **Verify Base URL**
   - Enterprise endpoints may use different paths
   - Check documentation for correct endpoint format

### Provider Shows "Error" Status

**Check logs:**
```bash
openclaw logs providers
```

**Common fixes:**
- Regenerate API key
- Check network connectivity: `ping api.provider.com`
- Verify firewall/proxy settings

### Rate Limiting

**Symptom:**
```
✗ Connection failed: 429 Too Many Requests
```

**Solutions:**
1. Add multiple providers for failover
2. Configure rate limits in provider settings
3. Contact provider for increased limits

### Model Not Available

**Symptom:** Model not listed in available models

**Solutions:**
1. Verify your API key has access to the model
2. Check provider documentation for model availability
3. Update provider template: `openclaw providers refresh`

### Custom Endpoint Not Working

**Symptom:** Local/custom endpoint connection fails

**Solutions:**
1. **Verify endpoint is running:**
   ```bash
   curl http://localhost:11434/v1/models
   ```

2. **Check CORS settings** (for web UI access)

3. **Verify OpenAI compatibility:**
   ```bash
   curl -X POST http://localhost:11434/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"llama2","messages":[{"role":"user","content":"hi"}]}'
   ```

## Best Practices

### Security

- **Never commit API keys** to version control
- Use environment variables for keys in scripts
- Rotate keys regularly
- Use separate keys for different environments

### Multiple Providers Setup

Configure multiple providers for redundancy:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-4o",
        "fallback": "anthropic/claude-3-5-sonnet-20241022"
      }
    }
  }
}
```

### Profile Naming

Use descriptive names:
- ❌ "API Key 1"
- ✅ "Production OpenAI"
- ✅ "NVIDIA Enterprise (Team)"

### Monitoring

Regular health checks:
```bash
# Test all providers
openclaw providers list --format json | jq '.[] | .id' | xargs openclaw providers test
```

## Next Steps

- Learn about [Model Failover](/concepts/model-failover)
- Configure [Routing Rules](/concepts/routing)
- Set up [Custom Providers](/providers/custom)
- Read [Developer Guide](/providers/developer-guide) for creating templates

## Related Documentation

- [Model Providers Overview](/providers) - Full list of supported providers
- [Configuration](/gateway/configuration) - Gateway configuration reference
- [CLI Reference](/cli) - Complete CLI command reference
