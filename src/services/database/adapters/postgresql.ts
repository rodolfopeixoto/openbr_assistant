// Stub adapters for PostgreSQL and MySQL
// These will be implemented when needed

import type { DatabaseAdapter } from "../adapter.js";

export class PostgreSQLAdapter implements DatabaseAdapter {
  readonly type = "postgresql";

  async connect(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async disconnect(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  isConnected(): boolean {
    return false;
  }

  async initializeSchema(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async createNewsItem(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async getNewsItems(): Promise<any> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async updateNewsItem(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async deleteNewsItem(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async deleteNewsItemsBySource(): Promise<number> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async getNewsItemByUrl(): Promise<any> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async createSource(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async getSources(): Promise<any[]> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async updateSource(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async deleteSource(): Promise<void> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async getSourceItemCount(): Promise<number> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async getTotalItemCount(): Promise<number> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }

  async cleanupOldItems(): Promise<number> {
    throw new Error("PostgreSQL adapter not yet implemented");
  }
}

export class MySQLAdapter implements DatabaseAdapter {
  readonly type = "mysql";

  async connect(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async disconnect(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  isConnected(): boolean {
    return false;
  }

  async initializeSchema(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async createNewsItem(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async getNewsItems(): Promise<any> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async updateNewsItem(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async deleteNewsItem(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async deleteNewsItemsBySource(): Promise<number> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async getNewsItemByUrl(): Promise<any> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async createSource(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async getSources(): Promise<any[]> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async updateSource(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async deleteSource(): Promise<void> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async getSourceItemCount(): Promise<number> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async getTotalItemCount(): Promise<number> {
    throw new Error("MySQL adapter not yet implemented");
  }

  async cleanupOldItems(): Promise<number> {
    throw new Error("MySQL adapter not yet implemented");
  }
}
