# OpenClaw Provider Examples

This directory contains example scripts demonstrating how to use the OpenClaw provider management system programmatically.

## Prerequisites

- OpenClaw gateway running (default: http://localhost:18789)
- Node.js 18+ for running examples
- Valid API keys for providers you want to configure

## Available Examples

### 1. Add NVIDIA Provider

Demonstrates adding NVIDIA as a model provider with API key authentication.

```bash
export NVIDIA_API_KEY="nvapi-YOUR_KEY_HERE"
node add-nvidia.js
```

**What it does:**
- Tests connection to NVIDIA API
- Creates provider configuration
- Lists available models
- Shows example configuration

### 2. List Providers

Shows how to list and manage configured providers.

```bash
# List all configured providers
node list-providers.js

# Output as JSON
node list-providers.js --json

# List available templates
node list-providers.js --templates

# Check provider status and test connections
node list-providers.js --status
```

**Features:**
- Formatted table view
- JSON output option
- Provider status checking
- Template discovery
- Connection testing

### 3. Custom Endpoint

Demonstrates adding custom OpenAI-compatible endpoints (Ollama, vLLM, etc.).

```bash
# Add local Ollama instance
node custom-endpoint.js ollama

# Add with custom URL
node custom-endpoint.js ollama --url http://192.168.1.100:11434

# Add enterprise endpoint with API key
node custom-endpoint.js custom \
  --url https://llm.company.com/api \
  --key YOUR_API_KEY \
  --name "Company LLM"

# Set as default provider
node custom-endpoint.js ollama --default
```

**Supported presets:**
- `ollama` - Ollama local server
- `lmstudio` - LM Studio server
- `vllm` - vLLM inference server
- `custom` - Any OpenAI-compatible endpoint

## Common Environment Variables

```bash
# Gateway URL (default: http://localhost:18789)
export OPENCLAW_GATEWAY="http://localhost:18789"

# Provider API keys
export NVIDIA_API_KEY="nvapi-..."
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

## API Reference

All examples use the OpenClaw Gateway REST API:

- `GET /api/v1/providers` - List configured providers
- `POST /api/v1/providers` - Create new provider
- `DELETE /api/v1/providers/:id` - Remove provider
- `POST /api/v1/providers/test` - Test provider connection
- `GET /api/v1/providers/templates` - List available templates

See [Developer Guide](/providers/developer-guide) for complete API documentation.

## Using in Your Own Code

Import and use the example functions:

```javascript
const { addNvidiaProvider } = require('./add-nvidia');
const { listProviders } = require('./list-providers');
const { addCustomEndpoint } = require('./custom-endpoint');

// Use programmatically
await addNvidiaProvider();
const providers = await listProviders();
```

## Troubleshooting

### Connection Refused

Make sure the gateway is running:
```bash
openclaw gateway run
```

Or check the gateway URL:
```bash
export OPENCLAW_GATEWAY="http://your-gateway:18789"
```

### Invalid API Key

Verify your API key format:
- NVIDIA: Should start with `nvapi-`
- OpenAI: Should start with `sk-`
- Anthropic: Should start with `sk-ant-`

Test directly with curl:
```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.openai.com/v1/models
```

## More Information

- [Provider User Guide](/providers/user-guide)
- [Provider Developer Guide](/providers/developer-guide)
- [Model Providers](/providers) - Full list of supported providers
