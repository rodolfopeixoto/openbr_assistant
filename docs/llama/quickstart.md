# Llama 3.2:3b Local LLM

Run Llama 3.2:3b locally for zero API costs and complete privacy.

## Overview

The Local LLM feature allows you to run Meta's Llama 3.2:3b model directly on your machine using llama.cpp. This provides:

- **Zero API costs** - No per-token charges
- **Complete privacy** - Data never leaves your machine
- **Low latency** - No network calls to external APIs
- **Offline capability** - Works without internet connection

## System Requirements

### Minimum Requirements
- **RAM**: 4GB (8GB recommended)
- **Storage**: 3GB free space
- **OS**: macOS, Linux, or Windows
- **CPU**: Any modern x64 or ARM64 processor

### Recommended for Best Performance
- **RAM**: 8GB+
- **GPU**: Apple Silicon (M1/M2/M3) or NVIDIA with CUDA
- **Storage**: SSD with 5GB free space

## Quick Start

### 1. Enable the Feature

Navigate to **AI > Local LLM** in the web UI and toggle the feature ON.

### 2. Install llama.cpp

Click **"Install llama.cpp"** button. This downloads the optimized binary for your platform:
- macOS: Universal binary with Metal support
- Linux: Optimized for x64/ARM64
- Windows: CUDA-enabled binary

### 3. Download the Model

Click **"Download Llama 3.2:3b"** to download the 1.9GB model file. This is a one-time download.

### 4. Start the Server

Click **"Start Server"** to launch the llama.cpp server with the model.

### 5. Use in Chat

Select **"Llama 3.2:3b (Local)"** from the model selector in any chat session.

## Configuration

### Rate Limiting

Control how many requests the local model can handle:

```json
{
  "llama": {
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 30,
      "burstSize": 5
    }
  }
}
```

- **requestsPerMinute**: Maximum requests allowed per minute
- **burstSize**: Immediate requests allowed before rate limiting kicks in

### Hardware Configuration

Optimize performance for your hardware:

```json
{
  "llama": {
    "hardware": {
      "useGPU": true,
      "gpuLayers": 99,
      "threads": 4,
      "useMetal": true,
      "useCUDA": false
    }
  }
}
```

**GPU Layers**: Number of model layers to run on GPU (0-99)
- 0: CPU only
- 99: All layers on GPU (fastest, uses most VRAM)
- 35: Good balance for 8GB systems

**Threads**: Number of CPU threads to use
- Default: 4 or number of CPU cores, whichever is lower
- Increase for better CPU performance
- Decrease to reduce CPU usage

**Auto-Detection**
The system automatically detects your hardware on startup:
- Apple Silicon → Enables Metal
- NVIDIA GPU → Enables CUDA
- Others → Uses CPU with optimized thread count

### Context Management

The local model maintains conversation context automatically:

- **Max messages**: Last 10 messages kept
- **Max tokens**: ~6000 tokens of context
- **Per-session**: Each chat session has isolated context
- **Auto-trim**: Old messages removed when limits exceeded

To clear context for a session:
```bash
openclaw llama context clear --session-id <session-id>
```

## Performance Metrics

Monitor your local model performance in real-time:

- **Tokens/sec**: Generation speed (typical: 10-50 tokens/sec)
- **Avg Response Time**: Average time to generate responses
- **Total Requests**: Number of requests processed
- **Memory Usage**: RAM used by the model

### Expected Performance

| Hardware | Tokens/sec | RAM Usage |
|----------|-----------|-----------|
| Apple M1/M2 | 25-40 | 1.8GB |
| Apple M3 | 35-50 | 1.8GB |
| NVIDIA RTX 4090 | 40-60 | 1.9GB |
| CPU (8 cores) | 10-20 | 1.8GB |
| CPU (4 cores) | 5-12 | 1.8GB |

## Fallback Behavior

If the local model becomes unavailable (crashed, not installed, rate limited), the system automatically falls back to your configured cloud models:

1. **Local fails** → Try next model in routing tier
2. **All local exhausted** → Use GPT-4o-mini or other configured model
3. **Context preserved** → Conversation continues seamlessly

To configure fallback:
```json
{
  "modelRouting": {
    "enabled": true,
    "tiers": {
      "simple": {
        "models": ["local/llama-3.2-3b", "gpt-4o-mini"]
      }
    }
  }
}
```

## Troubleshooting

### Server Won't Start

**Problem**: "llama.cpp not installed" error

**Solution**:
1. Check if installation completed successfully
2. Try reinstalling: `openclaw llama install`
3. Check logs: `openclaw logs --filter llama`

### Out of Memory

**Problem**: System runs out of RAM when using local model

**Solutions**:
1. Reduce GPU layers: Set `gpuLayers` to 35 or lower
2. Close other applications
3. Use CPU-only mode: Set `useGPU: false`

### Slow Performance

**Problem**: Model generates text slowly

**Solutions**:
1. Enable GPU: Check hardware auto-detection worked
2. Reduce GPU layers: May be swapping to system RAM
3. Increase threads: If you have spare CPU cores
4. Check thermal throttling: CPU/GPU may be overheating

### Model Not Found

**Problem**: "Model not installed" error

**Solution**:
1. Download the model from UI or CLI:
   ```bash
   openclaw llama model download llama-3.2-3b
   ```
2. Check download completed: Look for `.gguf` file in `~/.openclaw/llama/models/`

### Rate Limit Errors

**Problem**: "Rate limit exceeded" errors

**Solutions**:
1. Increase rate limit in config
2. Wait for rate limit to reset (1 minute)
3. Check for runaway processes making requests

## CLI Commands

```bash
# Install llama.cpp
openclaw llama install

# Download model
openclaw llama model download llama-3.2-3b

# Start server
openclaw llama server start

# Stop server
openclaw llama server stop

# Check status
openclaw llama status

# Configure hardware
openclaw llama config hardware --gpu-layers 99 --threads 4

# Export model (for backup)
openclaw llama model export llama-3.2-3b ~/backup/

# Import model
openclaw llama model import ~/backup/llama-3.2-3b-instruct-q4_k_m.gguf

# Clear context
openclaw llama context clear --session-id my-session
```

## Advanced Usage

### Custom System Prompts

Create custom system prompts in `~/.openclaw/llama/prompts/`:

```bash
mkdir -p ~/.openclaw/llama/prompts
echo "You are a coding assistant specialized in TypeScript." > ~/.openclaw/llama/prompts/coder.txt
```

Use in chat with directive:
```
/system coder
How do I implement a generic type in TypeScript?
```

### Multiple Models

Install alternative models for different use cases:

- **Llama 3.2:3b** (default): Balanced performance/quality
- **Phi-4 Mini**: Better for code tasks
- **Gemma 2B**: Ultra-fast for simple queries

Switch models in the UI or via CLI:
```bash
openclaw llama server start --model phi-4-mini
```

### Integration with Model Routing

The local model integrates with the Model Routing feature for intelligent model selection:

```json
{
  "modelRouting": {
    "enabled": true,
    "autoSelect": true,
    "tiers": {
      "simple": {
        "models": ["local/llama-3.2-3b", "gpt-4o-mini"]
      },
      "complex": {
        "models": ["gpt-4o", "claude-opus-3"]
      }
    }
  }
}
```

Simple queries use the local model, complex ones use cloud APIs.

## Security Considerations

- **Local processing**: All data stays on your machine
- **No network calls**: Works completely offline
- **No logging**: Requests aren't logged to external services
- **Model file**: Downloaded model is just a file, easily auditable

## Limitations

- **Context window**: 8192 tokens (vs 128k+ for cloud models)
- **Knowledge cutoff**: Training data is static
- **No internet access**: Cannot browse web or access real-time info
- **Tool use**: Limited tool use compared to cloud models

## Getting Help

- Check logs: `openclaw logs --filter llama`
- Run diagnostics: `openclaw doctor`
- Community support: [GitHub Issues](https://github.com/openclaw/openclaw/issues)
