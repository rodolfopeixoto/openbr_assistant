# 🦞 OpenClaw - Personal AI Assistant

<p align="center">
  <strong>EXFOLIATE! EXFOLIATE!</strong>
</p>

<p align="center">
  <a href="https://github.com/openclaw/openclaw/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/openclaw/openclaw/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/openclaw/openclaw/releases"><img src="https://img.shields.io/github/v/release/openclaw/openclaw?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

**OpenClaw** is a personal AI assistant that runs on your own devices. It integrates with your favorite messaging platforms and provides a comprehensive gateway for AI-powered interactions, voice control, and automation.

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Features](#-features)
- [Feature Workflows](#-feature-workflows)
- [Technical Features](#-technical-features)
- [Best Practices](#-best-practices)
- [Architecture](#-architecture)
- [Development](#-development)
- [Security](#-security)
- [Documentation](#-documentation)
- [Community](#-community)

## 🔧 Prerequisites

### System Requirements

- **Node.js**: >= 22.12.0 (Required)
- **pnpm**: >= 10.23.0 (Recommended package manager)
- **Operating Systems**:
  - macOS (Intel or Apple Silicon)
  - Linux (Ubuntu 20.04+ recommended)
  - Windows via WSL2 (Ubuntu recommended)

### Optional Dependencies

- **Bun**: For development and TypeScript execution
- **Xcode**: For macOS app building (optional)
- **Docker**: For sandboxed environments (optional)
- **Tailscale**: For secure remote access (optional)

### API Keys & Authentication

You will need at least one of the following:

- **Anthropic API Key** (Recommended: Claude Pro/Max subscription)
- **OpenAI API Key** (ChatGPT/Codex subscription)
- **OAuth credentials** for supported providers

### Recommended Setup

```bash
# Install Node.js 22+ (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Install pnpm
npm install -g pnpm

# Install Bun (optional, for development)
curl -fsSL https://bun.sh/install | bash
```

## 🚀 Quick Start

### Installation

#### Option 1: Install via Script (Recommended)

```bash
# macOS/Linux
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows (PowerShell)
iwr -useb https://openclaw.ai/install.ps1 | iex
```

#### Option 2: Install via npm/pnpm

```bash
npm install -g openclaw@latest
# or
pnpm add -g openclaw@latest
```

#### Option 3: Build from Source

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build
pnpm build
```

### Onboarding

Run the interactive setup wizard:

```bash
openclaw onboard --install-daemon
```

This wizard will guide you through:
- Gateway configuration
- Authentication setup (OAuth or API keys)
- Channel configuration (WhatsApp, Telegram, Discord, etc.)
- Pairing preferences
- Workspace setup
- Optional background service installation

### Start the Gateway

```bash
# Start the gateway manually
openclaw gateway --port 18789 --verbose

# Check status
openclaw gateway status

# Install as a service (launchd/systemd)
openclaw gateway install
```

### Connect Your First Channel

#### WhatsApp (QR Login)

```bash
openclaw channels login
# Scan QR code with WhatsApp mobile app
```

#### Telegram

Set up your bot token:

```bash
openclaw config set channels.telegram.botToken "your-bot-token"
```

#### Discord

```bash
openclaw config set channels.discord.token "your-bot-token"
```

### Send Your First Message

```bash
# Send a direct message
openclaw message send --target +1234567890 --message "Hello from OpenClaw!"

# Interact with the agent
openclaw agent --message "What's the weather today?" --to +1234567890
```

### Access the Dashboard

Open your browser and navigate to:

```
http://127.0.0.1:18789/
```

## ✨ Features

### Core Features

- **Multi-Channel Support**: WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, BlueBubbles, Microsoft Teams, Matrix, Zalo, WebChat
- **AI Integration**: Support for Anthropic Claude, OpenAI GPT models, and custom providers
- **Voice Control**: Voice Wake and Talk Mode for hands-free operation
- **Live Canvas**: Visual workspace for agent-driven interactions
- **Browser Control**: Automated browser automation and control
- **Session Management**: Isolated sessions with context preservation
- **Media Processing**: Image, audio, and video handling
- **Cron Jobs**: Automated scheduling and task execution

### Gateway Features

- **WebSocket Control Plane**: Real-time bidirectional communication
- **Hot Configuration Reload**: Apply changes without restart
- **Presence Tracking**: Multi-device presence and status management
- **Security Model**: Pairing-based DM safety and sandboxing
- **Plugin System**: Extensible architecture for custom functionality
- **Health Monitoring**: Built-in health checks and diagnostics

### Mobile & Desktop Apps

- **macOS App**: Menu bar control, Voice Wake, WebChat
- **iOS Node**: Canvas, camera, screen recording, voice control
- **Android Node**: Canvas, camera, notifications
- **Web Dashboard**: Browser-based control interface

## 🔄 Feature Workflows

### 1. Message Flow (End-to-End)

```
User sends message
       │
       ▼
┌────────────────┐
│  Channel Layer │
│ (WhatsApp/TG)  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Gateway       │
│  Receives      │
└───────┬────────┘
        │
        ▼
┌────────────────┐     ┌────────────────┐
│  Pairing Check │────▶│  Unknown?      │
│  & Allowlist   │     │  Send Code     │
└───────┬────────┘     └────────────────┘
        │ Approved
        ▼
┌────────────────┐
│  Session       │
│  Lookup/Create │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Agent Runtime │
│  (Pi RPC)      │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Tool Calls    │────▶┌──────────────┐
│  (if any)      │     │  Execute     │
└───────┬────────┘     └──────┬───────┘
        │                     │
        │◄────────────────────┘
        │ Results
        ▼
┌────────────────┐
│  Model         │
│  Response      │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Send Reply    │
└────────────────┘
```

### 2. Gateway Protocol Workflow

```
Client                          Gateway
  │                               │
  │─── WebSocket Connect ────────▶│
  │                               │
  │─── connect request ─────────▶│
  │   {                           │
  │     method: "connect",       │
  │     params: {                │
  │       client: {...},         │
  │       auth: {...},           │
  │       caps: [...]            │
  │     }                        │
  │   }                          │
  │                               │
  │◄─── hello-ok response ───────│
  │   {                           │
  │     ok: true,                │
  │     payload: {               │
  │       snapshot: {...},       │
  │       presence: [...]        │
  │     }                        │
  │   }                          │
  │                               │
  │◄─── tick events (periodic) ──│
  │◄─── presence events ─────────│
  │                               │
  │─── agent request ───────────▶│
  │   {                           │
  │     method: "agent",         │
  │     params: {                │
  │       message: "..."         │
  │     }                        │
  │   }                          │
  │                               │
  │◄─── accepted (immediate) ────│
  │                               │
  │◄─── agent events (stream) ───│
  │   { type: "event", event:    │
  │     "agent", ... }           │
  │                               │
  │◄─── final response ──────────│
  │   { status: "ok", ... }      │
```

### 3. Tool Execution Flow

```
Agent generates tool call
          │
          ▼
┌─────────────────────┐
│ Parse Tool Call     │
│ (name + arguments)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Check Permissions   │
│ (sandbox/allowlist) │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
Allowed      Denied
    │             │
    ▼             ▼
┌────────┐  ┌──────────┐
│Execute │  │ Return   │
│Tool    │  │ Error    │
└───┬────┘  └──────────┘
    │
    ▼
┌─────────────────────┐
│ Stream Results      │
│ to Client           │
└─────────────────────┘
```

### 4. Session Management Flow

```
Inbound Message
       │
       ▼
┌──────────────────────────┐
│ Extract Session Key      │
│ (channel + user/group)   │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Session Exists?          │
└───────────┬──────────────┘
       Yes /     \ No
          /       \
         ▼         ▼
┌───────────┐  ┌────────────────┐
│ Load      │  │ Create New     │
│ Existing  │  │ Session        │
└─────┬─────┘  └───────┬────────┘
      │                │
      └────────┬───────┘
               │
               ▼
┌──────────────────────────┐
│ Apply Context Window     │
│ (prune if too long)      │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Process Message          │
│ & Generate Response      │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Save to Session Store    │
│ (SQLite)                 │
└──────────────────────────┘
```

### 5. Pairing Security Flow

```
Unknown User Sends Message
           │
           ▼
┌──────────────────────────┐
│ Check DM Policy          │
│ (pairing / open)         │
└───────────┬──────────────┘
            │
     Pairing /   \ Open
       Mode        Mode
          \       /
           ▼     ▼
┌──────────────────────────┐
│ Check Allowlist          │
└───────────┬──────────────┘
    Not Allowed /  \ Allowed
                 \
                  ▼
┌──────────────────────────┐
│ Generate Pairing Code    │
│ (6-digit alphanumeric)   │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Send Code to User        │
│ (Do NOT process message) │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Await Approval           │
│ (admin reviews codes)    │
└───────────┬──────────────┘
            │
    Approved /  \ Rejected
       /          \
      ▼            ▼
┌──────────┐  ┌──────────┐
│ Add to   │  │ Keep     │
│ Allowlist│  │ Blocked  │
└────┬─────┘  └──────────┘
     │
     ▼
┌──────────────────────────┐
│ Process Future Messages  │
│ Normally                 │
└──────────────────────────┘
```

### 6. Sandbox Workflow

```
Session Created
       │
       ▼
┌──────────────────────────┐
│ Check Sandbox Mode       │
│ (off / non-main / all)   │
└───────────┬──────────────┘
            │
   Off  /  Non-Main  \  All
   /         |          \
  ▼          ▼           ▼
┌──────┐ ┌──────────┐ ┌──────────┐
│ Host │ │ Is Main? │ │ Docker   │
│ Exec │ └────┬─────┘ │ Sandbox  │
└──────┘   Yes/ \ No  └──────────┘
           /    \
          ▼      ▼
    ┌───────┐ ┌──────────┐
    │ Host  │ │ Docker   │
    │ Exec  │ │ Sandbox  │
    └───────┘ └────┬─────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │ Docker Container             │
    │ • Isolated network           │
    │ • Limited filesystem         │
    │ • Resource constraints       │
    │ • Tool allowlist enforced    │
    └──────────────────────────────┘
```

## 🔬 Technical Features

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                         │
│                     (Port 18789)                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Channels   │  │    Agent     │  │  Gateway Protocol │ │
│  │  (WhatsApp   │  │   Runtime    │  │    (WebSocket)   │ │
│  │  Telegram,   │  │   (Pi RPC)   │  ├──────────────────┤ │
│  │  Discord...) │  │              │  │  - connect       │ │
│  └──────────────┘  └──────────────┘  │  - health        │ │
│                                      │  - send          │ │
│  ┌──────────────┐  ┌──────────────┐  │  - agent         │ │
│  │    Tools     │  │   Session    │  │  - node.*        │ │
│  │  (Browser,   │  │   Manager    │  │  - pairing.*     │ │
│  │  Canvas,     │  └──────────────┘  └──────────────────┘ │
│  │  Cron...)    │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### Protocol Features

- **WebSocket-based**: JSON protocol over WebSocket
- **Session Management**: Main sessions for DMs, isolated sessions for groups
- **Event Streaming**: Real-time tool and output events
- **Presence Protocol**: Multi-client presence tracking
- **Node Protocol**: Device capability advertisement and invocation

### Security Features

- **Pairing System**: Unknown senders receive pairing codes
- **Allowlists**: Channel-specific allowlists for DMs and groups
- **Sandboxing**: Docker-based sandboxing for non-main sessions
- **Authentication**: Token-based and password-based auth
- **Tailscale Integration**: Zero-config VPN exposure

### Media Pipeline

- **Image Processing**: Sharp-based image manipulation
- **Audio Processing**: Transcription hooks and TTS integration
- **Video Support**: Screen recording and camera capture
- **File Handling**: Automatic cleanup and size limits

### Tool Ecosystem

- **Browser Tool**: Chrome/Chromium CDP control
- **Canvas Tool**: A2UI visual workspace
- **Node Tool**: Device-local command execution
- **Session Tools**: Cross-session communication
- **Discord/Slack Tools**: Native platform actions
- **Cron Tool**: Scheduled task execution

## 🛡️ Best Practices

### Security Best Practices

#### 1. Enable Pairing by Default
All channels should use pairing mode for DMs to prevent unauthorized access:

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "pairing"
    },
    "telegram": {
      "dmPolicy": "pairing"
    },
    "discord": {
      "dm": {
        "policy": "pairing"
      }
    },
    "slack": {
      "dm": {
        "policy": "pairing"
      }
    }
  }
}
```

**Why**: Unknown senders receive a pairing code and messages are NOT processed until approved. This prevents spam and unauthorized access.

#### 2. Use Allowlists for Groups
Restrict group access to specific users or require mentions:

```json
{
  "channels": {
    "telegram": {
      "groups": {
        "group-id": {
          "requireMention": true,
          "allowFrom": ["user1", "user2"]
        }
      }
    },
    "discord": {
      "guilds": {
        "guild-id": {
          "channels": {
            "channel-id": {
              "requireMention": true
            }
          }
        }
      }
    }
  }
}
```

#### 3. Enable Sandboxing for Non-Main Sessions
Groups and channels should run in sandboxes while personal DMs can have full access:

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "allowedTools": [
          "bash",
          "read",
          "write",
          "edit",
          "process",
          "sessions_list",
          "sessions_history",
          "sessions_send"
        ],
        "deniedTools": [
          "browser",
          "canvas",
          "nodes",
          "cron",
          "discord",
          "gateway"
        ]
      }
    }
  }
}
```

#### 4. Set Strong Gateway Tokens
Always use cryptographically secure tokens:

```bash
# Generate secure token
openclaw config set gateway.auth.token "$(openssl rand -hex 32)"

# Or set via environment variable
export OPENCLAW_GATEWAY_TOKEN="$(openssl rand -hex 32)"
```

#### 5. Regular Security Audits
Run the built-in security audit regularly:

```bash
# Basic audit
openclaw security audit

# Deep audit with all checks
openclaw security audit --deep

# Check gateway status and security
openclaw status --all
openclaw doctor
```

#### 6. Never Commit Secrets
- Store credentials in `~/.openclaw/credentials/`
- Use environment variables for API keys
- Never commit `.env` files with real values

### Configuration Best Practices

#### 1. Use Environment Variables for Secrets
```bash
# Add to ~/.profile or ~/.bashrc
export OPENCLAW_GATEWAY_TOKEN="your-token"
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export TELEGRAM_BOT_TOKEN="your-token"
export DISCORD_BOT_TOKEN="your-token"
export SLACK_BOT_TOKEN="your-token"
export SLACK_APP_TOKEN="your-token"
```

#### 2. Separate Config by Profile
Use profiles for different environments:

```bash
# Development (isolated)
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status

# Production
openclaw --profile prod gateway
openclaw --profile prod status

# Custom profile
export OPENCLAW_PROFILE=custom
openclaw gateway
```

**Profile defaults:**
- Config: `~/.openclaw-dev/openclaw.json`
- State: `~/.openclaw-dev/`
- Port: `19001` (dev) / `18789` (default)
- Workspace: `~/.openclaw/workspace-dev`

#### 3. Enable Hot Reload for Development
```json
{
  "gateway": {
    "reload": {
      "mode": "hybrid"
    }
  }
}
```

Modes:
- `off`: No automatic reload
- `safe`: Hot-apply only safe changes
- `hybrid`: Hot-apply safe, restart on critical (recommended)
- `full`: Restart on any change

#### 4. Use Tailscale for Remote Access
Instead of exposing the gateway publicly:

```json
{
  "gateway": {
    "bind": "loopback",
    "tailscale": {
      "mode": "serve",
      "resetOnExit": true
    }
  }
}
```

Tailscale modes:
- `off`: No Tailscale automation
- `serve`: Tailnet-only HTTPS (recommended)
- `funnel`: Public HTTPS (requires password auth)

### Deployment Best Practices

#### 1. Use System Services

**macOS (launchd):**
```bash
# Install as LaunchAgent
openclaw gateway install

# Start/stop/restart
openclaw gateway start
openclaw gateway stop
openclaw gateway restart

# Check status
openclaw gateway status
```

**Linux (systemd):**
```bash
# User service (recommended for single-user)
openclaw gateway install
systemctl --user enable --now openclaw-gateway.service

# Enable lingering (survives logout)
sudo loginctl enable-linger $USER
```

**Windows (WSL2):**
- Install Ubuntu on WSL2
- Follow Linux systemd steps
- Do NOT use native Windows (untested, problematic)

#### 2. Health Monitoring
```bash
# Basic health check
openclaw health

# Deep status with probes
openclaw status --deep

# All-in-one status report
openclaw status --all

# Continuous monitoring
watch -n 30 'openclaw health --json'
```

#### 3. Log Management
```bash
# Follow logs in real-time
openclaw logs --follow

# View recent logs
openclaw logs --tail 100

# Query macOS unified logs (macOS only)
./scripts/clawlog.sh --follow
```

#### 4. Backup Strategy
```bash
# Backup important directories
tar -czf openclaw-backup-$(date +%Y%m%d).tar.gz \
  ~/.openclaw/openclaw.json \
  ~/.openclaw/credentials/ \
  ~/.openclaw/workspace/ \
  ~/.openclaw/sessions/
```

### Development Best Practices

#### 1. Pre-commit Checklist
Always run before committing:

```bash
# Linting
pnpm lint

# Type checking and building
pnpm build

# Run tests
pnpm test

# Check test coverage
pnpm test:coverage
```

#### 2. TypeScript Strict Mode
```typescript
// GOOD: Proper typing
interface Message {
  id: string;
  content: string;
  timestamp: Date;
}

function processMessage(msg: Message): void {
  // implementation
}

// BAD: Avoid 'any'
function badProcess(msg: any): any {
  // Don't do this
}
```

#### 3. File Size Guidelines
Keep files under 500 LOC (lines of code):

```bash
# Check file sizes
pnpm check:loc --max 500
```

When files grow too large:
- Extract helpers into separate files
- Split by responsibility
- Use the `scripts/check-ts-max-loc.ts` tool

#### 4. Naming Conventions

**Product/Documentation:**
- Use **OpenClaw** (PascalCase)
- Examples: "OpenClaw Gateway", "OpenClaw Documentation"

**CLI/Commands/Paths:**
- Use **openclaw** (lowercase)
- Examples: `openclaw gateway`, `~/.openclaw/`, `openclaw.json`

**Code:**
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: `_leadingUnderscore`

#### 5. Code Comments
Add brief comments for non-obvious logic:

```typescript
// GOOD: Brief explanation
// Normalize message format for legacy clients
const normalizedMsg = msg.content?.body || msg.content;

// GOOD: Explain WHY, not WHAT
// Use SIGUSR1 for soft restart to preserve WebSocket connections
process.kill(pid, 'SIGUSR1');
```

#### 6. Testing Standards
- Test files: `*.test.ts` (colocated with source)
- E2E tests: `*.e2e.test.ts`
- Coverage threshold: 70% (lines, branches, functions, statements)
- Use Vitest with V8 provider

```typescript
// Example test structure
import { describe, it, expect } from 'vitest';

describe('Feature', () => {
  it('should handle expected case', () => {
    expect(result).toBe(expected);
  });
  
  it('should handle edge case', () => {
    expect(() => fn()).toThrow();
  });
});
```

### Model Selection Best Practices

#### 1. Recommended: Anthropic Claude Pro/Max
**Why Claude Opus 4.5:**
- Better long-context handling (up to 200K tokens)
- Superior prompt injection resistance
- Stronger tool use capabilities
- More reliable reasoning

Configuration:
```json
{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  }
}
```

#### 2. Enable Model Failover
```json
{
  "models": {
    "defaults": {
      "provider": "anthropic",
      "model": "claude-opus-4-5",
      "failover": {
        "enabled": true,
        "fallbacks": [
          {
            "provider": "openai",
            "model": "gpt-4"
          }
        ]
      }
    }
  }
}
```

#### 3. Use Appropriate Thinking Levels
Available levels: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`

```bash
# Quick responses
/think off

# Balanced (default)
/think low

# Complex reasoning
/think high
```

In configuration:
```json
{
  "agent": {
    "thinkingLevel": "low"
  }
}
```

#### 4. Web Search Integration
Enable Brave Search for better results:

```bash
openclaw configure --section web
```

Or configure manually:
```json
{
  "tools": {
    "web": {
      "search": {
        "apiKey": "your-brave-api-key"
      }
    }
  }
}
```

### Multi-Agent Safety (Multi-Agent Collaboration)

When working with multiple agents on the same codebase:

#### 1. Commit Scope
- Scope commits to your changes only
- Use `scripts/committer "<msg>" <file...>` to avoid staging unrelated files
- Never use `git add .` without checking

#### 2. Stashing
- **DO NOT** create/modify git stashes unless explicitly requested
- Other agents may have work in progress

#### 3. Branch Management
- Never switch branches without explicit request
- Don't create/remove/modify git worktrees
- Focus on your changes only

#### 4. Push Strategy
```bash
# Safe push workflow
git pull --rebase  # Integrate latest changes
git push
```

#### 5. Conflict Resolution
If `git pull --rebase` has conflicts:
1. Stop and assess
2. Resolve if straightforward
3. Alert user if complex
4. Never discard other agents' work

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OpenClaw System                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   WhatsApp   │  │   Telegram   │  │    Slack     │  │    Discord   │    │
│  │   (Baileys)  │  │   (grammY)   │  │    (Bolt)    │  │  (discord.js)│    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐    │
│  │  Signal      │  │  iMessage    │  │ Google Chat  │  │   Others...  │    │
│  │ (signal-cli) │  │   (imsg)     │  │     (API)    │  │   (Plugins)  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         └─────────────────┴─────────────────┴─────────────────┘            │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Gateway Service                              │   │
│  │                         (Port 18789)                                │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    WebSocket Control Plane                  │   │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │   │
│  │  │  │ Channel  │  │  Agent   │  │  Tool    │  │ Session  │    │   │   │
│  │  │  │ Router   │  │  Runtime │  │ Registry │  │ Manager  │    │   │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                      Protocol Layer                         │   │   │
│  │  │  • Connection Handshake  • Method Routing  • Event Stream  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    HTTP Endpoints                           │   │   │
│  │  │  /v1/chat/completions  /v1/responses  /tools/invoke        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                        │
│                    ▼               ▼               ▼                        │
│  ┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐       │
│  │   Pi Agent Runtime  │ │   Tool System   │ │   Session Store     │       │
│  │   (Mario Zechner)   │ │                 │ │   (SQLite/Files)    │       │
│  │  ┌───────────────┐  │ │  • Browser    │ │                     │       │
│  │  │  AI Models    │  │ │  • Canvas     │ │  • Main Sessions    │       │
│  │  │  • Claude     │  │ │  • Cron       │ │  • Group Sessions   │       │
│  │  │  • GPT-4      │  │ │  • Nodes      │ │  • Context Memory   │       │
│  │  │  • Custom     │  │ │  • Discord    │ │  • File Attachments │       │
│  │  └───────────────┘  │ │  • Sessions_* │ │                     │       │
│  └─────────────────────┘ └─────────────────┘ └─────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │  CLI Client  │  │ Web Dashboard│  │ Mobile Apps  │
         │  (openclaw)  │  │  (Control UI)│  │ (iOS/Android)│
         └──────────────┘  └──────────────┘  └──────────────┘
```

### Component Architecture

#### 1. Gateway Service

The Gateway is the central control plane that manages all communications:

```
┌─────────────────────────────────────────────────────────────┐
│                    Gateway Core                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ Channel Manager│  │ Protocol Engine│  │ Auth Manager  │  │
│  │                │  │                │  │               │  │
│  │ • WhatsApp     │  │ • WebSocket    │  │ • Token Auth  │  │
│  │ • Telegram     │  │ • JSON-RPC     │  │ • Password    │  │
│  │ • Discord      │  │ • Streaming    │  │ • Tailscale   │  │
│  │ • Signal       │  │ • Heartbeat    │  │ • Pairing     │  │
│  │ • iMessage     │  │ • Rate Limit   │  │ • Allowlists  │  │
│  └───────┬────────┘  └───────┬────────┘  └───────┬───────┘  │
│          │                   │                   │          │
│  ┌───────┴───────────────────┴───────────────────┴───────┐  │
│  │                    Event Bus                           │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  agent  │  presence  │  tick  │  shutdown       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ Config Manager │  │  Node Registry │  │  Sandbox      │  │
│  │                │  │                │  │  Controller   │  │
│  │ • Hot Reload   │  │ • Capability   │  │               │  │
│  │ • Validation   │  │   Discovery    │  │ • Docker      │  │
│  │ • Persistence  │  │ • Pairing      │  │ • Process     │  │
│  │ • Profiles     │  │ • Invocation   │  │ • Isolation   │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Agent Runtime

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Runtime                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Pi RPC Core                          │  │
│  │              (@mariozechner/pi-agent)                  │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                  Model Provider Layer                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │  │
│  │  │Anthropic │  │  OpenAI  │  │OpenRouter│  │ Custom │ │  │
│  │  │  Claude  │  │  GPT-4   │  │          │  │        │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                   Tool System                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │  Tool Call   │  │  Execution   │  │   Results    │ │  │
│  │  │   Parser     │  │   Engine     │  │   Handler    │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                  Stream Processor                      │  │
│  │         (Real-time output to clients)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Session Management

```
┌─────────────────────────────────────────────────────────────┐
│                   Session Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────┐          ┌─────────────────┐          │
│   │   Main Session  │          │  Group Session  │          │
│   │   (Direct DMs)  │          │  (Channels)     │          │
│   │                 │          │                 │          │
│   │  • Full Tools   │          │  • Sandboxed    │          │
│   │  • Host Access  │          │  • Limited Tools│          │
│   │  • Personal     │          │  • Isolated     │          │
│   └────────┬────────┘          └────────┬────────┘          │
│            │                            │                    │
│            └────────────┬───────────────┘                    │
│                         │                                    │
│   ┌─────────────────────┴───────────────────────┐           │
│   │            Session State Manager             │           │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │           │
│   │  │ Context  │  │ Messages │  │ Metadata │  │           │
│   │  │  Window  │  │ History  │  │ (Tokens) │  │           │
│   │  └──────────┘  └──────────┘  └──────────┘  │           │
│   │                                              │           │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │           │
│   │  │ Thinking │  │  Verbose │  │   Model  │  │           │
│   │  │  Level   │  │   Mode   │  │Override  │  │           │
│   │  └──────────┘  └──────────┘  └──────────┘  │           │
│   └────────────────────────────────────────────┘           │
│                                                              │
│   Storage:                                                   │
│   • SQLite (~/.openclaw/sessions/)                          │
│   • File Attachments (~/.openclaw/workspace/)               │
│   • Vector DB (sqlite-vec for memory)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 4. Media Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   Media Processing                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    Input     │  │  Processing  │  │    Output    │       │
│  │              │  │              │  │              │       │
│  │ • WhatsApp   │  │ • Sharp      │  │ • WhatsApp   │       │
│  │ • Telegram   │  │   (images)   │  │ • Telegram   │       │
│  │ • Discord    │  │ • ffmpeg     │  │ • Discord    │       │
│  │ • Upload     │  │   (video)    │  │ • Download   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────┐         │
│  │              Media Lifecycle                     │         │
│  │                                                  │         │
│  │  1. Download → 2. Process → 3. Cache → 4. Clean │         │
│  │                                                  │         │
│  │  Size Limits:                                    │         │
│  │  • Images: 50MB per file                        │         │
│  │  • Video: 100MB per file                        │         │
│  │  • Temp files auto-cleanup (24h)                │         │
│  └──────────────────────────────────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
openclaw/
├── src/
│   ├── agents/               # Agent runtime and session management
│   │   ├── agent.ts         # Core agent logic
│   │   ├── session.ts       # Session management
│   │   ├── routing.ts       # Agent routing rules
│   │   └── sandbox.ts       # Sandbox controller
│   │
│   ├── channels/             # Messaging channel integrations
│   │   ├── whatsapp/        # Baileys-based WhatsApp
│   │   ├── telegram/        # grammY-based Telegram
│   │   ├── discord/         # Discord.js integration
│   │   ├── slack/           # Bolt SDK
│   │   ├── signal/          # signal-cli wrapper
│   │   └── imessage/        # macOS iMessage
│   │
│   ├── gateway/              # Gateway WebSocket server
│   │   ├── server.ts        # WebSocket server
│   │   ├── protocol.ts      # Protocol definitions
│   │   ├── handlers/        # Method handlers
│   │   └── events.ts        # Event system
│   │
│   ├── cli/                  # Command-line interface
│   │   ├── entry.ts         # CLI entry point
│   │   ├── progress.ts      # Progress indicators
│   │   └── palette.ts       # Terminal colors
│   │
│   ├── commands/             # CLI commands
│   │   ├── gateway.ts       # Gateway management
│   │   ├── agent.ts         # Agent interaction
│   │   ├── channels.ts      # Channel commands
│   │   └── config.ts        # Configuration
│   │
│   ├── tools/                # Tool implementations
│   │   ├── browser.ts       # Browser automation
│   │   ├── canvas.ts        # Canvas/A2UI
│   │   ├── cron.ts          # Scheduled tasks
│   │   ├── nodes.ts         # Device nodes
│   │   └── sessions.ts      # Session tools
│   │
│   ├── media/                # Media processing
│   │   ├── images.ts        # Image handling
│   │   ├── audio.ts         # Audio processing
│   │   └── video.ts         # Video handling
│   │
│   ├── infra/                # Infrastructure
│   │   ├── logging.ts       # Logging system
│   │   ├── config.ts        # Configuration
│   │   └── security.ts      # Security utilities
│   │
│   └── providers/            # AI model providers
│       ├── anthropic.ts     # Claude integration
│       ├── openai.ts        # OpenAI integration
│       └── router.ts        # Provider routing
│
├── apps/
│   ├── macos/               # macOS menu bar app (Swift)
│   ├── ios/                 # iOS companion app (Swift)
│   └── android/             # Android companion app (Kotlin)
│
├── extensions/              # Plugin extensions
│   ├── msteams/            # Microsoft Teams
│   ├── matrix/             # Matrix protocol
│   ├── zalo/               # Zalo Bot
│   └── voice-call/         # Voice calling
│
├── docs/                    # Documentation (Mintlify)
├── dist/                    # Compiled output
├── scripts/                 # Build and utility scripts
└── ui/                      # Web UI components
```

### Key Technologies

- **Runtime**: Node.js 22+ / Bun (optional)
- **Language**: TypeScript (ESM)
- **Package Manager**: pnpm 10.23.0+
- **Protocol**: WebSocket with JSON-RPC-like protocol
- **Testing**: Vitest with V8 coverage (70% threshold)
- **Linting**: Oxlint + Oxfmt (strict mode)
- **Database**: SQLite with sqlite-vec for vector search
- **Build**: TypeScript + esbuild
- **Packaging**: pkg (single binary distribution)

## 💻 Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Install dependencies
pnpm install

# Build UI dependencies
pnpm ui:build

# Build project
pnpm build

# Run in development mode
pnpm dev

# Or use the dev gateway
pnpm gateway:dev
```

### Development Commands

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run linting
pnpm lint

# Format code
pnpm format:fix

# Build for production
pnpm build

# Package macOS app
pnpm mac:package

# Watch mode (auto-reload)
pnpm gateway:watch
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Live tests (requires API keys)
CLAWDBOT_LIVE_TEST=1 pnpm test:live

# Docker tests
pnpm test:docker:all
```

### Release Channels

- **stable**: Tagged releases (`vYYYY.M.D`)
- **beta**: Prerelease tags (`vYYYY.M.D-beta.N`)
- **dev**: Moving head on `main` branch

Switch channels:

```bash
openclaw update --channel stable|beta|dev
```

## 🔒 Security

### Security Model Overview

OpenClaw implements a **defense-in-depth** security model with multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Pairing System                                    │
│  ├─ Unknown users receive pairing codes                   │
│  ├─ Messages queued until approved                         │
│  └─ Admin must explicitly approve each user               │
│                                                              │
│  Layer 2: Allowlists                                        │
│  ├─ Channel-specific allowlists                            │
│  ├─ Group-specific access controls                         │
│  └─ Mention requirements for groups                        │
│                                                              │
│  Layer 3: Sandbox Isolation                                 │
│  ├─ Docker containers for non-main sessions               │
│  ├─ Tool allowlists/denylists                             │
│  └─ Filesystem and network isolation                       │
│                                                              │
│  Layer 4: Authentication                                    │
│  ├─ Gateway token/password auth                           │
│  ├─ Tailscale identity integration                         │
│  └─ Webhook secret validation                              │
│                                                              │
│  Layer 5: Audit & Monitoring                                │
│  ├─ Security audit command                                 │
│  ├─ Doctor diagnostics                                     │
│  └─ Health checks and logging                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Default Security Posture

**OpenClaw treats ALL inbound DMs as untrusted input by default.**

#### Pairing Mode (Default)

```
Unknown User                      OpenClaw
     │                               │
     │─── "Hello" ─────────────────▶│
     │                               │
     │                               │─── Check: Known? ───┐
     │                               │                     │
     │                               │◄──── No ────────────┘
     │                               │
     │◄── "Pairing code: ABC123" ───│
     │                               │
     │    (Message NOT processed)    │
```

**Key behaviors:**
- Unknown senders receive a 6-character pairing code
- Original message is queued, NOT processed
- Admin must approve the pairing code
- Future messages from approved users are processed normally

#### Approving Pairing

```bash
# List pending pairing codes
openclaw pairing list whatsapp
openclaw pairing list telegram
openclaw pairing list discord

# Approve a specific code
openclaw pairing approve whatsapp ABC123

# Reject/deny a code
openclaw pairing reject whatsapp ABC123
```

### Channel Security Configuration

#### WhatsApp Security

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "pairing",
      "allowFrom": ["+1234567890", "+0987654321"],
      "groups": {
        "group-id": {
          "allowFrom": ["+1234567890"]
        }
      }
    }
  }
}
```

**Security features:**
- QR-based device linking (not credentials)
- Baileys library with encryption
- Local credential storage (`~/.openclaw/credentials/`)
- Pairing codes for new contacts

#### Telegram Security

```json
{
  "channels": {
    "telegram": {
      "dmPolicy": "pairing",
      "allowFrom": ["@username1", "123456789"],
      "groups": {
        "group-id": {
          "requireMention": true,
          "allowFrom": ["@username1"]
        }
      },
      "webhookSecret": "secure-random-string"
    }
  }
}
```

#### Discord Security

```json
{
  "channels": {
    "discord": {
      "token": "YOUR_BOT_TOKEN",
      "dm": {
        "policy": "pairing",
        "allowFrom": ["user-id-1", "user-id-2"]
      },
      "guilds": {
        "guild-id": {
          "channels": {
            "channel-id": {
              "requireMention": true
            }
          }
        }
      }
    }
  }
}
```

### Sandboxing

#### Sandbox Modes

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "container": "docker"
      }
    }
  }
}
```

**Modes:**

1. **off** - No sandboxing (all sessions run on host)
   - ⚠️ Only use for trusted, single-user setups
   - Fastest execution
   - Full system access

2. **non-main** - Sandbox only non-main sessions (default)
   - Main (DM) sessions: Full access
   - Group/channel sessions: Sandboxed
   - Recommended for most users

3. **all** - Sandbox all sessions
   - All sessions run in containers
   - Maximum security
   - Slight performance overhead

#### Docker Sandbox Configuration

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "container": "docker",
        "docker": {
          "image": "openclaw/sandbox:latest",
          "network": "none",
          "memory": "512m",
          "cpus": "1.0"
        }
      }
    }
  }
}
```

#### Tool Allowlists

Control which tools are available in sandboxed sessions:

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "allowedTools": [
          "bash",
          "process",
          "read",
          "write",
          "edit",
          "sessions_list",
          "sessions_history",
          "sessions_send"
        ],
        "deniedTools": [
          "browser",
          "canvas",
          "nodes",
          "cron",
          "discord",
          "slack",
          "gateway"
        ]
      }
    }
  }
}
```

### Gateway Authentication

#### Token-Based Authentication

```json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "your-secure-random-token"
    }
  }
}
```

Clients must include the token in connect params:
```json
{
  "method": "connect",
  "params": {
    "auth": {
      "token": "your-secure-random-token"
    }
  }
}
```

#### Password-Based Authentication

```json
{
  "gateway": {
    "auth": {
      "mode": "password",
      "password": "your-secure-password"
    }
  }
}
```

#### Tailscale Identity (Zero-Config)

```json
{
  "gateway": {
    "bind": "loopback",
    "tailscale": {
      "mode": "serve"
    },
    "auth": {
      "allowTailscale": true
    }
  }
}
```

When `allowTailscale` is true and accessing via Tailscale:
- Gateway reads Tailscale identity headers
- No separate token/password needed
- Works with `serve` mode

### Security Commands

#### Audit Command

```bash
# Basic security audit
openclaw security audit

# Deep audit with all checks
openclaw security audit --deep

# Check specific areas
openclaw security audit --check pairing,sandbox,auth
```

**Checks performed:**
- DM policy configuration
- Allowlist status
- Sandbox mode
- Authentication strength
- Token/password security
- Exposed services
- Permission issues

#### Doctor Command

```bash
# Run full diagnostics
openclaw doctor

# Fix common issues automatically
openclaw doctor --fix

# Check specific areas
openclaw doctor --check gateway,channels,config
```

**Doctor checks:**
- Gateway installation status
- Configuration validity
- Channel connectivity
- Authentication setup
- Service health
- Legacy migration issues

#### Status Commands

```bash
# Basic status
openclaw status

# All-in-one pasteable report
openclaw status --all

# Deep probe with health checks
openclaw status --deep

# JSON output for scripting
openclaw status --json
```

### Credential Storage

#### Secure Storage Locations

```
~/.openclaw/
├── credentials/
│   ├── oauth.json              # OAuth tokens (if used)
│   └── whatsapp/
│       └── auth_info.json      # WhatsApp credentials
├── agents/
│   └── main/
│       └── agent/
│           └── auth-profiles.json  # API keys
└── openclaw.json               # Config (no secrets)
```

#### Environment Variables

For secrets, prefer environment variables over config files:

```bash
# Add to ~/.profile or ~/.bashrc
export ANTHROPIC_API_KEY="sk-ant-api03-..."
export OPENAI_API_KEY="sk-..."
export OPENCLAW_GATEWAY_TOKEN="..."
export TELEGRAM_BOT_TOKEN="..."
export DISCORD_BOT_TOKEN="..."
```

**Note:** Never commit files with real credentials to git.

### Tailscale Security

#### Serve Mode (Recommended)

```json
{
  "gateway": {
    "bind": "loopback",
    "port": 18789,
    "tailscale": {
      "mode": "serve",
      "resetOnExit": true
    },
    "auth": {
      "allowTailscale": true
    }
  }
}
```

**Security characteristics:**
- Only accessible within your Tailnet
- Uses Tailscale identity for auth
- Gateway stays bound to loopback
- No public exposure

#### Funnel Mode (Public)

```json
{
  "gateway": {
    "bind": "loopback",
    "port": 18789,
    "tailscale": {
      "mode": "funnel"
    },
    "auth": {
      "mode": "password",
      "password": "strong-password"
    }
  }
}
```

**Security requirements:**
- Password auth is MANDATORY
- Publicly accessible URL
- Use strong, unique password
- Consider additional allowlists

### Security Checklist

#### Initial Setup

- [ ] Enable pairing mode for all channels
- [ ] Set strong gateway token/password
- [ ] Configure allowlists for known contacts
- [ ] Enable sandboxing (non-main mode)
- [ ] Run `openclaw security audit --deep`
- [ ] Configure Tailscale (if remote access needed)

#### Regular Maintenance

- [ ] Review pairing list monthly
- [ ] Update allowlists as needed
- [ ] Rotate gateway tokens periodically
- [ ] Run `openclaw doctor` weekly
- [ ] Check `openclaw status --deep`
- [ ] Review logs for suspicious activity

#### Before Exposing Publicly

- [ ] Ensure password auth is enabled
- [ ] Verify allowlists are restrictive
- [ ] Enable full sandbox mode
- [ ] Set up monitoring/alerts
- [ ] Test security controls
- [ ] Document incident response plan

## 📚 Documentation

### Getting Started

- [Getting Started Guide](https://docs.openclaw.ai/start/getting-started)
- [Onboarding Wizard](https://docs.openclaw.ai/start/wizard)
- [Configuration Reference](https://docs.openclaw.ai/gateway/configuration)

### Platform Guides

- [macOS Setup](https://docs.openclaw.ai/platforms/macos)
- [iOS Node](https://docs.openclaw.ai/platforms/ios)
- [Android Node](https://docs.openclaw.ai/platforms/android)
- [Windows WSL2](https://docs.openclaw.ai/platforms/windows)
- [Linux Setup](https://docs.openclaw.ai/platforms/linux)

### Channel Configuration

- [WhatsApp](https://docs.openclaw.ai/channels/whatsapp)
- [Telegram](https://docs.openclaw.ai/channels/telegram)
- [Discord](https://docs.openclaw.ai/channels/discord)
- [Slack](https://docs.openclaw.ai/channels/slack)
- [All Channels](https://docs.openclaw.ai/channels)

### Advanced Topics

- [Architecture Overview](https://docs.openclaw.ai/concepts/architecture)
- [Gateway Protocol](https://docs.openclaw.ai/gateway/protocol)
- [Security Model](https://docs.openclaw.ai/gateway/security)
- [Remote Access](https://docs.openclaw.ai/gateway/remote)
- [Troubleshooting](https://docs.openclaw.ai/channels/troubleshooting)

### API References

- [OpenAI HTTP API](https://docs.openclaw.ai/gateway/openai-http-api)
- [OpenResponses HTTP API](https://docs.openclaw.ai/gateway/openresponses-http-api)
- [Tools Invoke API](https://docs.openclaw.ai/gateway/tools-invoke-http-api)

## 🤝 Community

### Resources

- **Website**: [openclaw.ai](https://openclaw.ai)
- **Documentation**: [docs.openclaw.ai](https://docs.openclaw.ai)
- **Discord**: [discord.gg/clawd](https://discord.gg/clawd)
- **GitHub**: [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Acknowledgments

OpenClaw was built for **Molty**, a space lobster AI assistant. 🦞

Special thanks to:
- [Mario Zechner](https://mariozechner.at/) for [pi-mono](https://github.com/badlogic/pi-mono)
- Adam Doppelt for lobster.bot
- All our amazing [contributors](https://github.com/openclaw/openclaw/graphs/contributors)

### License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with 🦞 by the OpenClaw community
</p>
