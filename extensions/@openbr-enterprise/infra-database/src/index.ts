/**
 * Database Infrastructure Module
 * Unified database adapter supporting SQLite, PostgreSQL, and MongoDB
 */

// Types
export {
  DatabaseAdapter,
  DatabaseConfig,
  QueryOptions,
  QueryResult,
  Transaction
} from './types/index.js';

// Adapters
export { SQLiteAdapter } from './adapters/sqlite.js';
export { PostgreSQLAdapter } from './adapters/postgresql.js';
export { MongoDBAdapter } from './adapters/mongodb.js';

// Factory
export { DatabaseAdapterFactory } from './adapters/factory.js';

// Version
export const VERSION = '1.0.0';
