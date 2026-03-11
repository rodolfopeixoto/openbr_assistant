/**
 * Database Adapter Factory
 * Creates the appropriate adapter based on configuration
 */

import { DatabaseAdapter, DatabaseConfig } from '../types/index.js';

// Lazy load adapters
let SQLiteAdapter: any;
let PostgreSQLAdapter: any;
let MongoDBAdapter: any;

export class DatabaseAdapterFactory {
  private static adapters: Map<string, DatabaseAdapter> = new Map();

  /**
   * Create or get a database adapter
   */
  static async createAdapter(config: DatabaseConfig): Promise<DatabaseAdapter> {
    const key = this.getAdapterKey(config);

    // Return existing adapter if available
    if (this.adapters.has(key)) {
      const adapter = this.adapters.get(key)!;
      if (adapter.isConnected) {
        return adapter;
      }
    }

    // Create new adapter
    let adapter: DatabaseAdapter;

    switch (config.type) {
      case 'sqlite':
        if (!SQLiteAdapter) {
          const { SQLiteAdapter: Adapter } = await import('./sqlite.js');
          SQLiteAdapter = Adapter;
        }
        adapter = new SQLiteAdapter(config);
        break;

      case 'postgresql':
        if (!PostgreSQLAdapter) {
          const { PostgreSQLAdapter: Adapter } = await import('./postgresql.js');
          PostgreSQLAdapter = Adapter;
        }
        adapter = new PostgreSQLAdapter(config);
        break;

      case 'mongodb':
        if (!MongoDBAdapter) {
          const { MongoDBAdapter: Adapter } = await import('./mongodb.js');
          MongoDBAdapter = Adapter;
        }
        adapter = new MongoDBAdapter(config);
        break;

      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }

    // Connect and cache
    await adapter.connect();
    this.adapters.set(key, adapter);

    return adapter;
  }

  /**
   * Get an existing adapter
   */
  static getAdapter(config: DatabaseConfig): DatabaseAdapter | null {
    const key = this.getAdapterKey(config);
    return this.adapters.get(key) || null;
  }

  /**
   * Close all adapters
   */
  static async closeAll(): Promise<void> {
    for (const [key, adapter] of this.adapters) {
      if (adapter.isConnected) {
        await adapter.disconnect();
      }
      this.adapters.delete(key);
    }
  }

  /**
   * Create development adapter (SQLite in-memory)
   */
  static async createDevAdapter(): Promise<DatabaseAdapter> {
    return this.createAdapter({
      type: 'sqlite',
      database: 'development',
      filename: ':memory:'
    });
  }

  /**
   * Create test adapter (SQLite file-based)
   */
  static async createTestAdapter(dbName: string = 'test'): Promise<DatabaseAdapter> {
    return this.createAdapter({
      type: 'sqlite',
      database: dbName,
      filename: `./test-${Date.now()}.db`
    });
  }

  private static getAdapterKey(config: DatabaseConfig): string {
    if (config.connectionString) {
      return `${config.type}:${config.connectionString}`;
    }
    return `${config.type}:${config.host || 'localhost'}:${config.port || 'default'}/${config.database}`;
  }
}

export default DatabaseAdapterFactory;
