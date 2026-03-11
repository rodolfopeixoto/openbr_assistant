/**
 * Database Adapter Interface
 * Unified interface for all database implementations
 */

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  where?: Record<string, any>;
}

export interface QueryResult<T> {
  data: T[];
  count: number;
  page?: number;
  totalPages?: number;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mongodb';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  poolSize?: number;
  connectionString?: string;
  // SQLite specific
  filename?: string;
  // MongoDB specific
  replicaSet?: string;
  authSource?: string;
}

export interface DatabaseAdapter {
  readonly type: string;
  readonly isConnected: boolean;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;

  // CRUD Operations
  create<T>(collection: string, data: T): Promise<T>;
  createMany<T>(collection: string, data: T[]): Promise<T[]>;
  
  findById<T>(collection: string, id: string): Promise<T | null>;
  findOne<T>(collection: string, where: Record<string, any>): Promise<T | null>;
  findMany<T>(collection: string, options?: QueryOptions): Promise<QueryResult<T>>;
  
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T>;
  updateMany<T>(collection: string, where: Record<string, any>, data: Partial<T>): Promise<number>;
  
  delete(collection: string, id: string): Promise<boolean>;
  deleteMany(collection: string, where: Record<string, any>): Promise<number>;

  // Transactions
  beginTransaction(): Promise<Transaction>;

  // Schema
  createCollection(name: string, schema?: Record<string, any>): Promise<void>;
  dropCollection(name: string): Promise<void>;
  listCollections(): Promise<string[]>;

  // Raw query (for specific implementations)
  query<T>(sql: string, params?: any[]): Promise<T[]>;
}

export default DatabaseAdapter;
