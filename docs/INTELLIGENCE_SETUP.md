# 🤖 OpenClaw Intelligence - Setup Guide

Complete AI-powered newsletter system with multi-source collection, analysis, and delivery.

## ✅ What's Included

### Core Features
- **📰 News Collection**: RSS feeds, APIs (Hacker News, Dev.to, OpenAI Blog)
- **🧠 AI Analysis**: Sentiment analysis, trend detection, insights extraction
- **📱 Mobile-First UI**: Responsive design, swipe gestures, bottom sheets
- **📬 Multi-Channel Delivery**: Telegram (ready), WhatsApp, Slack, Email (prepared)
- **🌍 Multi-Language**: 7 languages (EN, PT, ES, FR, DE, ZH, JA)
- **⚙️ Multi-Environment**: Localhost, Self-hosted, Cloud

### Database Schema
- Articles with full-text search
- Insights and trends
- Digests and delivery logs
- User preferences
- Channel configurations

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install RSS parser
npm install rss-parser

# Install database (SQLite for localhost)
npm install better-sqlite3

# Install Telegram Bot API (optional)
npm install node-telegram-bot-api
```

### 2. Environment Configuration

Create `.env` file:

```bash
# Required
NODE_ENV=development
DEPLOYMENT=localhost
JWT_SECRET=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here

# Optional - for Telegram delivery
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Optional - for AI analysis (OpenAI)
OPENAI_API_KEY=your-openai-key
```

### 3. Database Setup

```bash
# Database will be auto-created at ./data/openclaw.db
# Run migrations automatically on first start
```

### 4. Configuration File

Create `openclaw.json` (optional - uses defaults if not present):

```json
{
  "environment": "development",
  "deployment": "localhost",
  "intelligence": {
    "enabled": true,
    "sources": [
      {
        "id": "hackernews",
        "name": "Hacker News",
        "type": "api",
        "url": "https://hacker-news.firebaseio.com/v0/",
        "enabled": true,
        "category": "tech"
      }
    ],
    "collector": {
      "schedule": {
        "morning": "08:00",
        "afternoon": "14:00",
        "evening": "19:00"
      }
    },
    "delivery": {
      "channels": ["telegram"],
      "schedule": {
        "morning": true,
        "afternoon": false,
        "evening": true
      }
    }
  }
}
```

### 5. Start the System

```bash
# Development mode
npm run dev

# Or with intelligence features
npm run dev:intelligence
```

## 📱 Using the Newsletter UI

### Access the UI

Navigate to `http://localhost:3000/newsletter`

### Features Available

1. **Article List**: Browse all collected articles
   - Filter by: All, Saved, Insights
   - Sort by: Date, Relevance
   - Search: Full-text search

2. **Article Reading**: Tap any article
   - Full content view
   - Save for later
   - Share
   - Mark as read

3. **Insights Panel**: View trends and analysis
   - Top trending topics
   - Sentiment analysis
   - Key insights extracted

4. **Settings**: Configure your preferences
   - Select digest frequency
   - Choose channels
   - Set language
   - Manage sources

## 🤖 Telegram Bot Setup

### 1. Create Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot`
3. Follow instructions to create bot
4. Copy the bot token

### 2. Get Chat ID

1. Message your bot
2. Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Look for `"chat":{"id":123456789`
4. Copy the chat ID

### 3. Configure

Add to `.env`:
```bash
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_CHAT_ID=your-chat-id-here
```

### 4. Test

```bash
# Run test
npm run test:telegram
```

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Newsletter │  │   Article    │  │   Insights   │  │
│  │    Reader    │  │    Detail    │  │    Panel     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                    API GATEWAY                           │
│         (REST + WebSocket endpoints)                     │
└───────────────────────────┬─────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
┌─────────▼────────┐ ┌──────▼──────┐ ┌───────▼────────┐
│   News Collector │ │  AI Analyzer│ │    Scheduler   │
│   (RSS/API)      │ │   (LLM)     │ │   (Cron)       │
└─────────┬────────┘ └──────┬──────┘ └───────┬────────┘
          │                 │                │
          └─────────────────┴────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   DATABASE LAYER                         │
│     (SQLite/PostgreSQL + Redis + Elasticsearch)         │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   CHANNEL DELIVERY                       │
│     Telegram ✓ | WhatsApp | Slack | Email | Push        │
└─────────────────────────────────────────────────────────┘
```

## 📊 API Endpoints

### Articles
```
GET    /api/intelligence/articles          # List articles
GET    /api/intelligence/articles/:id      # Get article detail
POST   /api/intelligence/articles/:id/save # Save article
POST   /api/intelligence/articles/:id/read # Mark as read
```

### Digests
```
GET    /api/intelligence/digests           # List digests
POST   /api/intelligence/digests/generate  # Generate manually
GET    /api/intelligence/digests/:id       # Get digest detail
```

### Insights
```
GET    /api/intelligence/trends            # Get trending topics
GET    /api/intelligence/stats             # Get statistics
```

### Scheduler
```
GET    /api/intelligence/scheduler/status  # Get scheduler status
POST   /api/intelligence/scheduler/start   # Start scheduler
POST   /api/intelligence/scheduler/stop    # Stop scheduler
```

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test specific module
npm test -- intelligence

# Test with coverage
npm run test:coverage
```

### Manual Testing

```bash
# Test news collection
npm run test:collector

# Test AI analysis
npm run test:analyzer

# Test Telegram delivery
npm run test:telegram
```

## 🌍 Multi-Language

The system automatically detects browser language. To change:

1. Go to Settings → Language
2. Select your preferred language
3. UI updates immediately

Supported languages:
- 🇺🇸 English (en)
- 🇧🇷 Português (pt)
- 🇪🇸 Español (es)
- 🇫🇷 Français (fr)
- 🇩🇪 Deutsch (de)
- 🇨🇳 中文 (zh)
- 🇯🇵 日本語 (ja)

## 🔒 Security

### Content Filtering
- Toxicity detection
- Misinformation check
- Source credibility verification

### Data Protection
- Encryption at rest
- PII masking
- Data retention policies

### API Security
- JWT authentication
- Rate limiting
- Request signing

## 📈 Monitoring

### View Logs
```bash
# Real-time logs
npm run logs

# Intelligence specific
npm run logs:intelligence

# Error logs
npm run logs:error
```

### Metrics
```bash
# View statistics
npm run stats

# Database stats
npm run stats:db
```

## 🆘 Troubleshooting

### Common Issues

**1. Articles not collecting**
```bash
# Check source configuration
npm run config:sources

# Test specific source
npm run test:source hackernews
```

**2. Telegram not sending**
```bash
# Test connection
npm run test:telegram:connection

# Check bot token
npm run config:validate
```

**3. Database errors**
```bash
# Reset database
npm run db:reset

# Run migrations
npm run db:migrate
```

## 🎯 Next Steps

1. ✅ **Test Collection**: Run manual news collection
2. ✅ **Test Analysis**: Verify AI analysis working
3. ✅ **Test Delivery**: Send test Telegram message
4. 🔄 **UI Integration**: Connect to backend
5. 🔄 **Add More Sources**: Configure your preferred RSS feeds
6. 🔄 **Production Deploy**: Set up for production

## 📚 Documentation

- [Architecture](./docs/architecture.md)
- [API Reference](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Contributing](./CONTRIBUTING.md)

## 🤝 Support

- GitHub Issues: [Report bugs](https://github.com/openclaw/openclaw/issues)
- Discord: [Join community](https://discord.gg/openclaw)
- Email: support@openclaw.ai

---

**Ready to get started?** Run `npm run setup:intelligence` 🚀
