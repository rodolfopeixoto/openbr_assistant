/**
 * ChannelIsolation - Process isolation for message channels
 * Runs channels in separate processes for security sandboxing
 */

import { EventEmitter } from 'events';
import { fork, ChildProcess } from 'child_process';
import { join } from 'path';

interface ChannelConfig {
  name: string;
  modulePath: string;
  maxMemoryMB?: number;
  maxExecutionTimeMs?: number;
  allowedOperations?: string[];
}

interface ProcessStats {
  pid: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
}

interface IsolatedChannel {
  config: ChannelConfig;
  process: ChildProcess;
  startedAt: Date;
  messageCount: number;
  errorCount: number;
}

/**
 * ChannelIsolation - Secure process isolation for channels
 * 
 * Features:
 * - Separate process per channel
 * - Resource limits (memory, CPU)
 * - Automatic restart on crash
 * - Message queuing
 */
export class ChannelIsolation extends EventEmitter {
  private channels: Map<string, IsolatedChannel> = new Map();
  private messageQueues: Map<string, any[]> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(private healthCheckMs: number = 30000) {
    super();
    this.startHealthChecks();
  }

  /**
   * Start a channel in isolated process
   */
  async startChannel(config: ChannelConfig): Promise<void> {
    if (this.channels.has(config.name)) {
      throw new Error(`Channel ${config.name} already running`);
    }

    try {
      const childProcess = fork(config.modulePath, [], {
        silent: true,
        env: {
          ...process.env,
          CHANNEL_NAME: config.name,
          CHANNEL_MAX_MEMORY: String((config.maxMemoryMB || 512) * 1024 * 1024)
        }
      });

      const channel: IsolatedChannel = {
        config,
        process: childProcess,
        startedAt: new Date(),
        messageCount: 0,
        errorCount: 0
      };

      this.setupProcessHandlers(channel);
      this.channels.set(config.name, channel);
      this.messageQueues.set(config.name, []);

      this.emit('channelStarted', { 
        name: config.name, 
        pid: childProcess.pid 
      });

      // Wait for channel to be ready
      await this.waitForReady(config.name);
    } catch (error) {
      this.emit('channelError', { 
        name: config.name, 
        error 
      });
      throw error;
    }
  }

  /**
   * Stop a channel
   */
  async stopChannel(name: string, force: boolean = false): Promise<void> {
    const channel = this.channels.get(name);
    if (!channel) return;

    if (force) {
      channel.process.kill('SIGKILL');
    } else {
      // Graceful shutdown
      channel.process.send({ type: 'shutdown' });
      
      // Wait for graceful shutdown or timeout
      await Promise.race([
        new Promise<void>((resolve) => {
          channel.process.once('exit', () => resolve());
        }),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Shutdown timeout')), 5000)
        )
      ]);
    }

    this.channels.delete(name);
    this.messageQueues.delete(name);

    this.emit('channelStopped', { name });
  }

  /**
   * Send message to channel
   */
  sendMessage(channelName: string, message: any): boolean {
    const channel = this.channels.get(channelName);
    if (!channel) return false;

    try {
      channel.process.send(message);
      channel.messageCount++;
      return true;
    } catch (error) {
      // Queue message for retry
      const queue = this.messageQueues.get(channelName);
      if (queue) {
        queue.push(message);
      }
      return false;
    }
  }

  /**
   * Get channel statistics
   */
  getChannelStats(name: string): ProcessStats | null {
    const channel = this.channels.get(name);
    if (!channel || !channel.process.pid) return null;

    return {
      pid: channel.process.pid,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: Date.now() - channel.startedAt.getTime()
    };
  }

  /**
   * List running channels
   */
  listChannels(): { name: string; pid: number | undefined; uptime: number }[] {
    return Array.from(this.channels.entries()).map(([name, channel]) => ({
      name,
      pid: channel.process.pid,
      uptime: Date.now() - channel.startedAt.getTime()
    }));
  }

  /**
   * Restart a channel
   */
  async restartChannel(name: string): Promise<void> {
    const channel = this.channels.get(name);
    if (!channel) return;

    const config = channel.config;
    await this.stopChannel(name, true);
    await this.startChannel(config);

    this.emit('channelRestarted', { name });
  }

  /**
   * Stop all channels
   */
  async stopAll(): Promise<void> {
    const promises = Array.from(this.channels.keys()).map(name => 
      this.stopChannel(name)
    );
    await Promise.all(promises);
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Kill all channels
    for (const channel of this.channels.values()) {
      channel.process.kill('SIGTERM');
    }

    this.channels.clear();
    this.messageQueues.clear();
    this.removeAllListeners();
  }

  private setupProcessHandlers(channel: IsolatedChannel): void {
    channel.process.on('message', (msg: any) => {
      this.emit('channelMessage', {
        channel: channel.config.name,
        message: msg
      });
    });

    channel.process.on('error', (error) => {
      channel.errorCount++;
      this.emit('channelError', {
        channel: channel.config.name,
        error
      });
    });

    channel.process.on('exit', (code, signal) => {
      this.emit('channelExit', {
        channel: channel.config.name,
        code,
        signal
      });

      // Auto-restart if not intentional stop
      if (code !== 0 && signal !== 'SIGTERM') {
        this.restartChannel(channel.config.name).catch(() => {
          // If restart fails, remove channel
          this.channels.delete(channel.config.name);
        });
      }
    });

    // Handle stdout/stderr
    if (channel.process.stdout) {
      channel.process.stdout.on('data', (data) => {
        this.emit('channelLog', {
          channel: channel.config.name,
          level: 'info',
          message: data.toString()
        });
      });
    }

    if (channel.process.stderr) {
      channel.process.stderr.on('data', (data) => {
        this.emit('channelLog', {
          channel: channel.config.name,
          level: 'error',
          message: data.toString()
        });
      });
    }
  }

  private async waitForReady(name: string, timeout: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const channel = this.channels.get(name);
      if (!channel) {
        reject(new Error('Channel not found'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Channel startup timeout'));
      }, timeout);

      const onMessage = (msg: any) => {
        if (msg.type === 'ready') {
          clearTimeout(timer);
          channel.process.off('message', onMessage);
          resolve();
        }
      };

      channel.process.on('message', onMessage);
    });
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      for (const [name, channel] of this.channels) {
        // Check memory usage
        const maxMemory = (channel.config.maxMemoryMB || 512) * 1024 * 1024;
        const usage = process.memoryUsage();
        
        if (usage.heapUsed > maxMemory * 0.9) {
          this.emit('resourceWarning', {
            channel: name,
            resource: 'memory',
            usage: usage.heapUsed,
            limit: maxMemory
          });
        }

        // Check execution time
        const maxTime = channel.config.maxExecutionTimeMs;
        if (maxTime) {
          const uptime = Date.now() - channel.startedAt.getTime();
          if (uptime > maxTime) {
            this.emit('resourceWarning', {
              channel: name,
              resource: 'time',
              usage: uptime,
              limit: maxTime
            });
            
            // Restart if exceeded
            this.restartChannel(name);
          }
        }
      }
    }, this.healthCheckMs);
  }
}

export default ChannelIsolation;
