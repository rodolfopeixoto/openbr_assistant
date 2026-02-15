/**
 * PostgreSQL Adapter
 * Production-ready adapter for PostgreSQL
 */

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import {
  DatabaseAdapter,
  DatabaseConfig,
  QueryOptions,
  QueryResult,
  Transaction
} from '../types/index.js';

export class PostgreSQLAdapter extends EventEmitter implements DatabaseAdapter {
  readonly type = 'postgresql';
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  get isConnected(): boolean {
    return this.pool !== null;
  }

  async connect(): Promise<void> {
    const connectionConfig = this.config.connectionString
      ? { connectionString: this.config.connectionString }
      : {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.username,
          password: this.config.password,
          ssl: this.config.ssl,
          max: this.config.poolSize || 10
        };

    this.pool = new Pool(connectionConfig);

    // Test connection
    const client = await this.pool.connect();
    client.release();

    this.emit('connected', { type: 'postgresql', host: this.config.host });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.emit('disconnected');
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const result = await this.pool.query('SELECT 1');
      return result.rowCount === 1;
    } catch {
      return false;
    }
  }

  async create<T>(collection: string, data: T): Promise<T> {
    this.ensureConnected();

    const id = (data as any).id || randomUUID();
    const record = { ...data, id };

    const keys = Object.keys(record);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(record);

    const sql = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.pool!.query(sql, values);

    return result.rows[0] as T;
  }

  async createMany<T>(collection: string, data: T[]): Promise<T[]> {
    this.ensureConnected();

    if (data.length === 0) {
      return [];
    }

    const records = data.map(item => ({
      ...item,
      id: (item as any).id || randomUUID()
    }));

    const keys = Object.keys(records[0]);
    const placeholders: string[] = [];
    const values: any[] = [];

    records.forEach((record, index) => {
      const recordPlaceholders = keys.map((_, keyIndex) => {
        return `$${index * keys.length + keyIndex + 1}`;
      });
      placeholders.push(`(${recordPlaceholders.join(', ')})`);
      values.push(...Object.values(record));
    });

    const sql = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES ${placeholders.join(', ')} RETURNING *`;
    const result = await this.pool!.query(sql, values);

    return result.rows as T[];
  }

  async findById<T>(collection: string, id: string): Promise<T | null> {
    const result = await this.findMany<T>(collection, { 
      where: { id }, 
      limit: 1 
    });
    return result.data[0] || null;
  }

  async findOne<T>(collection: string, where: Record<string, any>): Promise<T | null> {
    const result = await this.findMany<T>(collection, { where, limit: 1 });
    return result.data[0] || null;
  }

  async findMany<T>(collection: string, options: QueryOptions = {}): Promise<QueryResult<T>> {
    this.ensureConnected();

    let sql = `SELECT * FROM ${collection}`;
    const values: any[] = [];
    let paramIndex = 1;

    // WHERE clause
    if (options.where && Object.keys(options.where).length > 0) {
      const conditions = Object.entries(options.where).map(([key, value]) => {
        values.push(value);
        return `${key} = $${paramIndex++}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy.field} ${options.orderBy.direction.toUpperCase()}`;
    }

    // LIMIT and OFFSET
    if (options.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      values.push(options.limit);

      if (options.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        values.push(options.offset);
      }
    }

    const result = await this.pool!.query(sql, values);

    // Get total count
    let countSql = `SELECT COUNT(*) FROM ${collection}`;
    if (options.where && Object.keys(options.where).length > 0) {
      const whereConditions = Object.keys(options.where).map((key, idx) => {
        return `${key} = $${idx + 1}`;
      });
      countSql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    const countResult = await this.pool!.query(countSql, Object.values(options.where || {}));
    const count = parseInt(countResult.rows[0].count, 10);

    return {
      data: result.rows as T[],
      count,
      page: options.offset ? Math.floor(options.offset / (options.limit || 1)) + 1 : 1,
      totalPages: Math.ceil(count / (options.limit || count))
    };
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    this.ensureConnected();

    const keys = Object.keys(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(data), id];

    const sql = `UPDATE ${collection} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    const result = await this.pool!.query(sql, values);

    return result.rows[0] as T;
  }

  async updateMany<T>(
    collection: string,
    where: Record<string, any>,
    data: Partial<T>
  ): Promise<number> {
    this.ensureConnected();

    const dataKeys = Object.keys(data);
    const whereKeys = Object.keys(where);

    const setClause = dataKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const whereClause = whereKeys.map((k, i) => `${k} = $${dataKeys.length + i + 1}`).join(' AND ');

    const values = [...Object.values(data), ...Object.values(where)];

    const sql = `UPDATE ${collection} SET ${setClause} WHERE ${whereClause}`;
    const result = await this.pool!.query(sql, values);

    return result.rowCount || 0;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    this.ensureConnected();

    const sql = `DELETE FROM ${collection} WHERE id = $1`;
    const result = await this.pool!.query(sql, [id]);

    return (result.rowCount || 0) > 0;
  }

  async deleteMany(collection: string, where: Record<string, any>): Promise<number> {
    this.ensureConnected();

    const keys = Object.keys(where);
    const whereClause = keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
    const values = Object.values(where);

    const sql = `DELETE FROM ${collection} WHERE ${whereClause}`;
    const result = await this.pool!.query(sql, values);

    return result.rowCount || 0;
  }

  async beginTransaction(): Promise<Transaction> {
    this.ensureConnected();

    const client = await this.pool!.connect();
    await client.query('BEGIN');

    return {
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK');
        client.release();
      }
    };
  }

  async createCollection(name: string, schema?: Record<string, any>): Promise<void> {
    this.ensureConnected();

    const columns = schema ? this.generateColumns(schema) : 'id UUID PRIMARY KEY';
    const sql = `CREATE TABLE IF NOT EXISTS ${name} (${columns})`;

    await this.pool!.query(sql);
  }

  async dropCollection(name: string): Promise<void> {
    this.ensureConnected();

    const sql = `DROP TABLE IF EXISTS ${name}`;
    await this.pool!.query(sql);
  }

  async listCollections(): Promise<string[]> {
    this.ensureConnected();

    const sql = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

    const result = await this.pool!.query(sql);
    return result.rows.map(row => row.table_name);
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    this.ensureConnected();

    const result = await this.pool!.query(sql, params);
    return result.rows as T[];
  }

  private ensureConnected(): void {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  private generateColumns(schema: Record<string, any>): string {
    return Object.entries(schema).map(([key, type]) => {
      let pgType = 'TEXT';

      if (type === 'string' || type === String) pgType = 'TEXT';
      if (type === 'number' || type === Number) pgType = 'NUMERIC';
      if (type === 'integer' || type === 'int') pgType = 'INTEGER';
      if (type === 'boolean' || type === Boolean) pgType = 'BOOLEAN';
      if (type === 'date' || type === Date) pgType = 'TIMESTAMPTZ';
      if (type === 'uuid' || key === 'id') pgType = 'UUID';

      if (key === 'id') {
        return `${key} ${pgType} PRIMARY KEY DEFAULT gen_random_uuid()`;
      }

      return `${key} ${pgType}`;
    }).join(', ');
  }
}

export default PostgreSQLAdapter;
