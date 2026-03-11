/**
 * ConnectionPool - Manage connection pooling for channels
 * Reduces connection overhead and improves performance
 */

import { EventEmitter } from 'events';

interface Connection {
  id: string;
  channel: string;
  socket: any;
  createdAt: Date;
  lastUsed: Date;
  inUse: boolean;
  healthCheckFailures: number;
}

interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  maxIdleTimeMs: number;
  healthCheckIntervalMs: number;
  acquireTimeoutMs: number;
}

/**
 * ConnectionPool - Efficient connection management
 * 
 * Features:
 * - Connection reuse
 * - Health monitoring
 * - Automatic cleanup
 * - Channel isolation
 */
export class ConnectionPool extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private channelConnections: Map<string, Set<string>> = new Map();
  private config: ConnectionPoolConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    super();
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      maxIdleTimeMs: 300000, // 5 minutes
      healthCheckIntervalMs: 30000, // 30 seconds
      acquireTimeoutMs: 5000,
      ...config
    };

    this.startMaintenance();
  }

  /**
   * Acquire a connection for a channel
   */
  async acquire(channel: string): Promise<Connection | null> {
    const channelConns = this.channelConnections.get(channel);
    
    if (channelConns) {
      // Find available connection
      for (const connId of channelConns) {
        const conn = this.connections.get(connId);
        if (conn && !conn.inUse) {
          conn.inUse = true;
          conn.lastUsed = new Date();
          return conn;
        }
      }
    }

    // Create new connection if under limit
    const totalConnections = this.connections.size;
    if (totalConnections < this.config.maxConnections) {
      const conn = await this.createConnection(channel);
      if (conn) {
        conn.inUse = true;
        return conn;
      }
    }

    // Wait for available connection
    return this.waitForConnection(channel);
  }

  /**
   * Release a connection back to the pool
   */
  release(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.inUse = false;
      conn.lastUsed = new Date();
      this.emit('connectionReleased', { connection: conn });
    }
  }

  /**
   * Remove a connection from the pool
   */
  remove(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      // Remove from channel connections
      const channelConns = this.channelConnections.get(conn.channel);
      if (channelConns) {
        channelConns.delete(connectionId);
      }

      // Close connection
      if (conn.socket) {
        try {
          conn.socket.close();
        } catch {}
      }

      this.connections.delete(connectionId);
      this.emit('connectionRemoved', { connectionId });
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    byChannel: { channel: string; total: number; active: number }[];
  } {
    const byChannel: { channel: string; total: number; active: number }[] = [];
    
    for (const [channel, connIds] of this.channelConnections) {
      const connections = Array.from(connIds)
        .map(id => this.connections.get(id))
        .filter(Boolean) as Connection[];
      
      byChannel.push({
        channel,
        total: connections.length,
        active: connections.filter(c => c.inUse).length
      });
    }

    const allConnections = Array.from(this.connections.values());
    return {
      totalConnections: allConnections.length,
      activeConnections: allConnections.filter(c => c.inUse).length,
      idleConnections: allConnections.filter(c => !c.inUse).length,
      byChannel
    };
  }

  /**
   * Dispose the pool
   */
  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const conn of this.connections.values()) {
      if (conn.socket) {
        try {
          conn.socket.close();
        } catch {}
      }
    }

    this.connections.clear();
    this.channelConnections.clear();
    this.removeAllListeners();
  }

  private async createConnection(channel: string): Promise<Connection | null> {
    try {
      // This would be implemented with actual connection logic
      const conn: Connection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channel,
        socket: null, // Would be actual socket
        createdAt: new Date(),
        lastUsed: new Date(),
        inUse: false,
        healthCheckFailures: 0
      };

      this.connections.set(conn.id, conn);

      // Track by channel
      if (!this.channelConnections.has(channel)) {
        this.channelConnections.set(channel, new Set());
      }
      this.channelConnections.get(channel)!.add(conn.id);

      this.emit('connectionCreated', { connection: conn });
      return conn;
    } catch (error) {
      this.emit('connectionError', { channel, error });
      return null;
    }
  }

  private async waitForConnection(channel: string): Promise<Connection | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, this.config.acquireTimeoutMs);

      const checkAvailable = () => {
        const channelConns = this.channelConnections.get(channel);
        if (channelConns) {
          for (const connId of channelConns) {
            const conn = this.connections.get(connId);
            if (conn && !conn.inUse) {
              clearTimeout(timeout);
              conn.inUse = true;
              conn.lastUsed = new Date();
              resolve(conn);
              return;
            }
          }
        }
        setTimeout(checkAvailable, 100);
      };

      checkAvailable();
    });
  }

  private startMaintenance(): void {
    // Health checks
    this.healthCheckInterval = setInterval(() => {
      for (const conn of this.connections.values()) {
        // Simple health check - would be more sophisticated in production
        const isHealthy = this.checkConnectionHealth(conn);
        if (!isHealthy) {
          conn.healthCheckFailures++;
          if (conn.healthCheckFailures >= 3) {
            this.remove(conn.id);
          }
        } else {
          conn.healthCheckFailures = 0;
        }
      }
    }, this.config.healthCheckIntervalMs);

    // Cleanup idle connections
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const conn of this.connections.values()) {
        if (!conn.inUse && 
            now - conn.lastUsed.getTime() > this.config.maxIdleTimeMs) {
          // Keep minimum connections per channel
          const channelConns = this.channelConnections.get(conn.channel);
          if (channelConns && channelConns.size > this.config.minConnections) {
            this.remove(conn.id);
          }
        }
      }
    }, this.config.maxIdleTimeMs);
  }

  private checkConnectionHealth(_conn: Connection): boolean {
    // Placeholder - would implement actual health check
    // _conn parameter intentionally prefixed to avoid unused warning
    return true;
  }
}

export default ConnectionPool;
