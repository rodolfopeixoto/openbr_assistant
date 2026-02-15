/**
 * MessageBatching - Batch messages for improved throughput
 * Reduces network overhead and improves performance
 */

import { EventEmitter } from 'events';

interface BatchedMessage {
  id: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
}

interface BatchConfig {
  maxSize: number;
  maxWaitMs: number;
  maxRetries: number;
  retryDelayMs: number;
  compress: boolean;
}

/**
 * MessageBatching - Efficient message batching
 * 
 * Features:
 * - Time and size-based flushing
 * - Automatic retry with backoff
 * - Compression support
 * - Dead letter queue
 */
export class MessageBatching extends EventEmitter {
  private buffer: BatchedMessage[] = [];
  private config: BatchConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private deadLetterQueue: BatchedMessage[] = [];

  constructor(config: Partial<BatchConfig> = {}) {
    super();
    this.config = {
      maxSize: 100,
      maxWaitMs: 1000,
      maxRetries: 3,
      retryDelayMs: 1000,
      compress: true,
      ...config
    };
  }

  /**
   * Add a message to the batch
   */
  async add(payload: any): Promise<void> {
    const message: BatchedMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      payload,
      timestamp: new Date(),
      retryCount: 0
    };

    this.buffer.push(message);

    // Flush if buffer full
    if (this.buffer.length >= this.config.maxSize) {
      await this.flush();
    } else {
      // Schedule flush
      this.scheduleFlush();
    }
  }

  /**
   * Force flush the buffer
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.isFlushing = true;
    this.clearFlushTimer();

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendBatch(batch);
      this.emit('batchSent', { count: batch.length });
    } catch (error) {
      // Retry logic
      const retryable = batch.filter(m => m.retryCount < this.config.maxRetries);
      const failed = batch.filter(m => m.retryCount >= this.config.maxRetries);

      // Add back to buffer with incremented retry count
      for (const msg of retryable) {
        msg.retryCount++;
        this.buffer.push(msg);
      }

      // Move to dead letter queue
      for (const msg of failed) {
        this.deadLetterQueue.push(msg);
      }

      this.emit('batchError', { error, retryCount: retryable.length, failed: failed.length });

      // Schedule retry
      if (retryable.length > 0) {
        setTimeout(() => this.flush(), this.config.retryDelayMs * retryable[0].retryCount);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Get batch statistics
   */
  getStats(): {
    buffered: number;
    deadLetter: number;
    isFlushing: boolean;
  } {
    return {
      buffered: this.buffer.length,
      deadLetter: this.deadLetterQueue.length,
      isFlushing: this.isFlushing
    };
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): BatchedMessage[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  /**
   * Dispose the batcher
   */
  async dispose(): Promise<void> {
    this.clearFlushTimer();
    await this.flush();
    this.removeAllListeners();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.config.maxWaitMs);
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async sendBatch(batch: BatchedMessage[]): Promise<void> {
    // Prepare batch data
    let payload = batch.map(m => m.payload);

    // Compress if enabled
    if (this.config.compress) {
      payload = await this.compress(payload);
    }

    // Send - this would be implemented with actual transport
    await this.transport(payload);
  }

  private async compress(data: any[]): Promise<any> {
    // Placeholder for compression logic
    // Would use zlib or similar
    return {
      compressed: true,
      data: JSON.stringify(data),
      count: data.length
    };
  }

  private async transport(_payload: any): Promise<void> {
    // Placeholder for actual transport
    // This would send to the actual message broker
    void _payload; // Intentionally unused in placeholder
    return new Promise((resolve, reject) => {
      // Simulate async transport
      setTimeout(() => {
        // Randomly fail for testing
        if (Math.random() < 0.01) {
          reject(new Error('Transport failed'));
        } else {
          resolve();
        }
      }, 10);
    });
  }
}

export default MessageBatching;
