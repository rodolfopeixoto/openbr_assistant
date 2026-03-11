/**
 * MongoDB Adapter
 * NoSQL adapter for MongoDB
 */

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { EventEmitter } from 'events';
import {
  DatabaseAdapter,
  DatabaseConfig,
  QueryOptions,
  QueryResult,
  Transaction
} from '../types/index.js';

export class MongoDBAdapter extends EventEmitter implements DatabaseAdapter {
  readonly type = 'mongodb';
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  get isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  async connect(): Promise<void> {
    let uri = this.config.connectionString;

    if (!uri) {
      const auth = this.config.username
        ? `${this.config.username}:${this.config.password}@`
        : '';
      const host = `${this.config.host || 'localhost'}:${this.config.port || 27017}`;
      const options: string[] = [];

      if (this.config.replicaSet) {
        options.push(`replicaSet=${this.config.replicaSet}`);
      }
      if (this.config.authSource) {
        options.push(`authSource=${this.config.authSource}`);
      }
      if (this.config.ssl) {
        options.push('ssl=true');
      }

      uri = `mongodb://${auth}${host}/${this.config.database}`;
      if (options.length > 0) {
        uri += `?${options.join('&')}`;
      }
    }

    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(this.config.database);

    this.emit('connected', { type: 'mongodb', database: this.config.database });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.emit('disconnected');
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  async create<T>(collection: string, data: T): Promise<T> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);
    const result = await coll.insertOne(data as any);

    return { ...data, _id: result.insertedId } as T;
  }

  async createMany<T>(collection: string, data: T[]): Promise<T[]> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);
    const result = await coll.insertMany(data as any[]);

    return data.map((item, index) => ({
      ...item,
      _id: Object.values(result.insertedIds)[index]
    })) as T[];
  }

  async findById<T>(collection: string, id: string): Promise<T | null> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);
    let query: any = { id };

    // Try ObjectId if valid
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      // Use string id
    }

    const result = await coll.findOne(query);
    return result as T || null;
  }

  async findOne<T>(collection: string, where: Record<string, any>): Promise<T | null> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);
    const result = await coll.findOne(where);
    return result as T || null;
  }

  async findMany<T>(collection: string, options: QueryOptions = {}): Promise<QueryResult<T>> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);

    let query = coll.find(options.where || {});

    // Sort
    if (options.orderBy) {
      query = query.sort(
        options.orderBy.field,
        options.orderBy.direction === 'asc' ? 1 : -1
      );
    }

    // Pagination
    if (options.offset) {
      query = query.skip(options.offset);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const [data, count] = await Promise.all([
      query.toArray(),
      coll.countDocuments(options.where || {})
    ]);

    return {
      data: data as T[],
      count,
      page: options.offset ? Math.floor(options.offset / (options.limit || 1)) + 1 : 1,
      totalPages: Math.ceil(count / (options.limit || count))
    };
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);
    let query: any = { id };

    try {
      query = { _id: new ObjectId(id) };
    } catch {
      // Use string id
    }

    await coll.updateOne(query, { $set: data });
    return this.findById(collection, id) as Promise<T>;
  }

  async updateMany<T>(
    collection: string,
    where: Record<string, any>,
    data: Partial<T>
  ): Promise<number> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);
    const result = await coll.updateMany(where, { $set: data });

    return result.modifiedCount;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);
    let query: any = { id };

    try {
      query = { _id: new ObjectId(id) };
    } catch {
      // Use string id
    }

    const result = await coll.deleteOne(query);
    return result.deletedCount > 0;
  }

  async deleteMany(collection: string, where: Record<string, any>): Promise<number> {
    this.ensureConnected();

    const coll = this.db!.collection(collection);
    const result = await coll.deleteMany(where);

    return result.deletedCount;
  }

  async beginTransaction(): Promise<Transaction> {
    this.ensureConnected();

    const session = this.client!.startSession();
    session.startTransaction();

    return {
      commit: async () => {
        await session.commitTransaction();
        session.endSession();
      },
      rollback: async () => {
        await session.abortTransaction();
        session.endSession();
      }
    };
  }

  async createCollection(name: string, _schema?: Record<string, any>): Promise<void> {
    this.ensureConnected();
    await this.db!.createCollection(name);
  }

  async dropCollection(name: string): Promise<void> {
    this.ensureConnected();
    await this.db!.dropCollection(name);
  }

  async listCollections(): Promise<string[]> {
    this.ensureConnected();

    const collections = await this.db!.listCollections().toArray();
    return collections.map(c => c.name);
  }

  async query<T>(_sql: string, _params?: any[]): Promise<T[]> {
    // MongoDB doesn't support SQL
    throw new Error('MongoDB does not support SQL queries. Use findMany instead.');
  }

  private ensureConnected(): void {
    if (!this.db || !this.client) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}

export default MongoDBAdapter;
