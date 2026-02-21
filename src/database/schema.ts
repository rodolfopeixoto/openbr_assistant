/**
 * Database Schema for Intelligence & Marketplace
 * SQLite/PostgreSQL compatible
 */

export const SCHEMA = {
  // Articles from news sources
  articles: `
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      url TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      published_at DATETIME NOT NULL,
      collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      category TEXT,
      tags TEXT, -- JSON array
      sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')),
      relevance_score REAL DEFAULT 0,
      read_time INTEGER, -- minutes
      image_url TEXT,
      metadata TEXT, -- JSON
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'processed', 'analyzed', 'published', 'archived')),
      UNIQUE(url)
    );
    
    CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id);
    CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
  `,

  // Insights extracted from articles
  insights: `
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('trend', 'opportunity', 'risk', 'action', 'key_point')),
      content TEXT NOT NULL,
      confidence REAL DEFAULT 0,
      extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      related_insights TEXT, -- JSON array of insight IDs
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_insights_article ON insights(article_id);
    CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);
  `,

  // User preferences and reading history
  user_preferences: `
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      interests TEXT, -- JSON array
      business_context TEXT,
      preferred_times TEXT, -- JSON array ["morning", "afternoon", "evening"]
      preferred_channels TEXT, -- JSON array
      digest_frequency TEXT DEFAULT 'daily' CHECK(digest_frequency IN ('realtime', 'daily', 'weekly')),
      content_filters TEXT, -- JSON
      language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'UTC',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Reading history
  reading_history: `
    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      time_spent INTEGER, -- seconds
      completed BOOLEAN DEFAULT FALSE,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      feedback TEXT,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_reading_history_article ON reading_history(article_id);
  `,

  // Saved articles
  saved_articles: `
    CREATE TABLE IF NOT EXISTS saved_articles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      tags TEXT, -- JSON array
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(user_id, article_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_saved_articles_user ON saved_articles(user_id);
  `,

  // Digests (daily newsletters)
  digests: `
    CREATE TABLE IF NOT EXISTS digests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('morning', 'afternoon', 'evening', 'custom')),
      title TEXT NOT NULL,
      summary TEXT,
      articles TEXT, -- JSON array of article IDs
      insights TEXT, -- JSON array of insight IDs
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'failed')),
      format TEXT DEFAULT 'full' CHECK(format IN ('short', 'medium', 'full'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_digests_user ON digests(user_id);
    CREATE INDEX IF NOT EXISTS idx_digests_type ON digests(type);
  `,

  // News sources configuration
  news_sources: `
    CREATE TABLE IF NOT EXISTS news_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('rss', 'api', 'webhook')),
      url TEXT NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      category TEXT,
      refresh_interval INTEGER DEFAULT 30, -- minutes
      max_articles INTEGER DEFAULT 20,
      filters TEXT, -- JSON
      last_fetch_at DATETIME,
      fetch_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_news_sources_enabled ON news_sources(enabled);
  `,

  // MCP Servers from marketplace
  mcp_servers: `
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      transport TEXT CHECK(transport IN ('stdio', 'http', 'websocket')),
      registry_id TEXT, -- ID from MCP Registry
      installed_version TEXT,
      enabled BOOLEAN DEFAULT FALSE,
      auth_type TEXT CHECK(auth_type IN ('bearer', 'api-key', 'basic', 'none')),
      auth_config TEXT, -- JSON (encrypted)
      tools TEXT, -- JSON array
      resources TEXT, -- JSON array
      prompts TEXT, -- JSON array
      installed_at DATETIME,
      updated_at DATETIME,
      last_connected_at DATETIME,
      connection_status TEXT DEFAULT 'disconnected',
      error_message TEXT,
      metadata TEXT -- JSON
    );
    
    CREATE INDEX IF NOT EXISTS idx_mcp_servers_enabled ON mcp_servers(enabled);
  `,

  // Skills from skills.sh
  skills: `
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      skill_path TEXT,
      description TEXT,
      version TEXT,
      installed_version TEXT,
      enabled BOOLEAN DEFAULT FALSE,
      type TEXT CHECK(type IN ('pack', 'action')),
      tags TEXT, -- JSON array
      installs INTEGER DEFAULT 0,
      installed_at DATETIME,
      updated_at DATETIME,
      config TEXT, -- JSON
      metadata TEXT -- JSON
    );
    
    CREATE INDEX IF NOT EXISTS idx_skills_enabled ON skills(enabled);
    CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
  `,

  // Installation history
  installation_history: `
    CREATE TABLE IF NOT EXISTS installation_history (
      id TEXT PRIMARY KEY,
      type TEXT CHECK(type IN ('mcp', 'skill')),
      item_id TEXT NOT NULL,
      action TEXT CHECK(action IN ('install', 'uninstall', 'update', 'enable', 'disable')),
      previous_version TEXT,
      new_version TEXT,
      success BOOLEAN DEFAULT TRUE,
      error_message TEXT,
      performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      performed_by TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_installation_history_item ON installation_history(item_id);
  `,

  // Channel configurations
  channel_configs: `
    CREATE TABLE IF NOT EXISTS channel_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel_type TEXT CHECK(channel_type IN ('whatsapp', 'telegram', 'slack', 'email', 'push')),
      enabled BOOLEAN DEFAULT FALSE,
      credentials TEXT, -- JSON (encrypted)
      settings TEXT, -- JSON
      format TEXT DEFAULT 'rich' CHECK(format IN ('rich', 'simple')),
      schedule TEXT, -- JSON
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, channel_type)
    );
    
    CREATE INDEX IF NOT EXISTS idx_channel_configs_user ON channel_configs(user_id);
  `,

  // Delivery logs
  delivery_logs: `
    CREATE TABLE IF NOT EXISTS delivery_logs (
      id TEXT PRIMARY KEY,
      digest_id TEXT,
      article_id TEXT,
      user_id TEXT NOT NULL,
      channel_type TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT CHECK(status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
      error_message TEXT,
      metadata TEXT -- JSON
    );
    
    CREATE INDEX IF NOT EXISTS idx_delivery_logs_user ON delivery_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON delivery_logs(status);
  `,

  // Search index (for SQLite FTS or Elasticsearch sync)
  search_index: `
    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
      title,
      summary,
      content,
      content='articles',
      content_rowid='id'
    );
    
    -- Triggers to keep FTS index updated
    CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, summary, content)
      VALUES (new.id, new.title, new.summary, new.content);
    END;
    
    CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary, content)
      VALUES ('delete', old.id, old.title, old.summary, old.content);
    END;
    
    CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary, content)
      VALUES ('delete', old.id, old.title, old.summary, old.content);
      INSERT INTO articles_fts(rowid, title, summary, content)
      VALUES (new.id, new.title, new.summary, new.content);
    END;
  `,
};

export const MIGRATIONS = [
  // Version 1: Initial schema
  {
    version: 1,
    name: "Initial schema",
    up: Object.values(SCHEMA).join("\n"),
  },
];

// Helper to run migrations
export async function runMigrations(db: any): Promise<void> {
  // Create migrations table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get current version
  const result = await db.get("SELECT MAX(version) as version FROM schema_migrations");
  const currentVersion = result?.version || 0;

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);
      await db.exec(migration.up);
      await db.run("INSERT INTO schema_migrations (version, name) VALUES (?, ?)", [
        migration.version,
        migration.name,
      ]);
    }
  }
}
