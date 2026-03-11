/**
 * SQLite Adapter
 * Development-friendly database adapter using better-sqlite3
 */

import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import {
  DatabaseAdapter,
  DatabaseConfig,
  QueryOptions,
  QueryResult,
  Transaction
} from '../types/index.js';

export class SQLiteAdapter extends EventEmitter implements DatabaseAdapter {
  readonly type = 'sqlite';
  private db: Database.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  get isConnected(): boolean {
    return this.db !== null;
  }

  async connect(): Promise<void> {
    const filename = this.config.filename || ':memory:';
    
    this.db = new Database(filename);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    this.emit('connected', { type: 'sqlite', filename });
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.emit('disconnected');
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.db) {
      return false;
    }
    
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  async create<T>(collection: string, data: T): Promise<T> {
    this.ensureConnected();
    
    const id = (data as any).id || randomUUID();
    const record = { ...data, id };
    
    const keys = Object.keys(record);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(record);
    
    const stmt = this.db!.prepare(
      `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders})`
    );
    
    stmt.run(values);
    
    return record as T;
  }

  async createMany<T>(collection: string, data: T[]): Promise<T[]> {
    this.ensureConnected();
    
    const records = data.map(item => ({
      ...item,
      id: (item as any).id || randomUUID()
    }));
    
    const insertMany = this.db!.transaction(() => {
      for (const record of records) {
        this.create(collection, record);
      }
    });
    
    insertMany();
    
    return records as T[];
  }

  async findById<T>(collection: string, id: string): Promise<T | null> {
    this.ensureConnected();
    
    const stmt = this.db!.prepare(
      `SELECT * FROM ${collection} WHERE id = ?`
    );
    
    const result = stmt.get(id);
    return result as T || null;
  }

  async findOne<T>(collection: string, where: Record<string, any>): Promise<T | null> {
    const results = await this.findMany<T>(collection, { where, limit: 1 });
    return results.data[0] || null;
  }

  async findMany<T>(collection: string, options: QueryOptions = {}): Promise<QueryResult<T>> {
    this.ensureConnected();
    
    let sql = `SELECT * FROM ${collection}`;
    const params: any[] = [];
    
    // WHERE clause
    if (options.where && Object.keys(options.where).length > 0) {
      const conditions = Object.entries(options.where).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // ORDER BY
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy.field} ${options.orderBy.direction.toUpperCase()}`;
    }
    
    // LIMIT and OFFSET
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }
    
    const stmt = this.db!.prepare(sql);
    const data = stmt.all(...params) as T[];
    
    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM ${collection}`;
    const countStmt = this.db!.prepare(countSql);
    const { count } = countStmt.get() as { count: number };
    
    return {
      data,
      count,
      page: options.offset ? Math.floor(options.offset / (options.limit || 1)) + 1 : 1,
      totalPages: Math.ceil(count / (options.limit || count))
    };
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    this.ensureConnected();
    
    const keys = Object.keys(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    const stmt = this.db!.prepare(
      `UPDATE ${collection} SET ${setClause} WHERE id = ?`
    );
    
    stmt.run(values);
    
    return this.findById(collection, id) as Promise<T>;
  }

  async updateMany<T>(
    collection: string, 
    where: Record<string, any>, 
    data: Partial<T>
  ): Promise<number> {
    this.ensureConnected();
    
    const keys = Object.keys(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    
    const conditions = Object.keys(where).map(k => `${k} = ?`);
    const values = [...Object.values(data), ...Object.values(where)];
    
    const stmt = this.db!.prepare(
      `UPDATE ${collection} SET ${setClause} WHERE ${conditions.join(' AND ')}`
    );
    
    const result = stmt.run(values);
    return result.changes;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    this.ensureConnected();
    
    const stmt = this.db!.prepare(`DELETE FROM ${collection} WHERE id = ?`);
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  async deleteMany(collection: string, where: Record<string, any>): Promise<number> {
    this.ensureConnected();
    
    const conditions = Object.keys(where).map(k => `${k} = ?`);
    const values = Object.values(where);
    
    const stmt = this.db!.prepare(
      `DELETE FROM ${collection} WHERE ${conditions.join(' AND ')}`
    );
    
    const result = stmt.run(values);
    return result.changes;
  }

  async beginTransaction(): Promise<Transaction> {
    this.ensureConnected();
    
    // SQLite transactions are handled differently
    // We'll use a savepoint approach
    const savepoint = `sp_${Date.now()}`;
    this.db!.exec(`SAVEPOINT ${savepoint}`);
    
    return {
      commit: async () => {
        this.db!.exec(`RELEASE SAVEPOINT ${savepoint}`);
      },
      rollback: async () => {
        this.db!.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      }
    };
  }

  async createCollection(name: string, schema?: Record<string, any>): Promise<void> {
    this.ensureConnected();
    
    // Generate CREATE TABLE statement from schema
    const columns = schema ? this.generateColumns(schema) : 'id TEXT PRIMARY KEY';
    
    const stmt = this.db!.prepare(`CREATE TABLE IF NOT EXISTS ${name} (${columns})`);
    stmt.run();
  }

  async dropCollection(name: string): Promise<void> {
    this.ensureConnected();
    
    const stmt = this.db!.prepare(`DROP TABLE IF EXISTS ${name}`);
    stmt.run();
  }

  async listCollections(): Promise<string[]> {
    this.ensureConnected();
    
    const stmt = this.db!.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    const results = stmt.all() as { name: string }[];
    return results.map(r => r.name);
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    this.ensureConnected();
    
    const stmt = this.db!.prepare(sql);
    return stmt.all(...(params || [])) as T[];
  }

  private ensureConnected(): void {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  private generateColumns(schema: Record<string, any>): string {
    const columns = Object.entries(schema).map(([key, type]) => {
      let sqlType = 'TEXT';
      
      if (type === 'number' || type === Number) {
        sqlType = 'REAL';
      }
      if (type === 'integer' || type === 'int') {
        sqlType = 'INTEGER';
      }
      if (type === 'boolean' || type === Boolean) {
        sqlType = 'INTEGER';
      }
      if (type === 'date' || type === Date) {
        sqlType = 'TEXT';
      }
      
      if (key === 'id') {
        return `${key} ${sqlType} PRIMARY KEY`;
      }
      
      return `${key} ${sqlType}`;
    });
    
    return columns.join(', ');
  }
}

export default SQLiteAdapter;
