/**
 * Message Queue System (Modular)
 * MIB-006: SQLite-based message persistence for offline delivery
 */

import Database from 'better-sqlite3';
import path from 'path';
import { MessageQueueConfig, QueuedMessage, MessagePriority, MessageStatus } from './types';
import { initializeDatabase } from './database';
import { enqueueMessage } from './enqueue';
import { getNextMessages, getMessage, getMessagesByStation } from './dequeue';
import { markProcessing, markDelivered, markFailed } from './status';
import { cleanupMessages } from './cleanup';
import { getQueueStats } from './stats';
import { startCleanupTimer, stopCleanupTimer } from './timer';

export { MessagePriority, MessageStatus, QueuedMessage, MessageQueueConfig } from './types';

export class MessageQueue {
  private db!: Database.Database;
  private config: Required<MessageQueueConfig>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: MessageQueueConfig = {}) {
    this.config = {
      dbPath: config.dbPath || path.join(process.cwd(), 'data', 'message_queue.db'),
      maxQueueSize: config.maxQueueSize || 10000,
      defaultTTL: config.defaultTTL || 24 * 60 * 60, // 24 hours
      maxAttempts: config.maxAttempts || 5,
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000, // 5 minutes
      backoffMultiplier: config.backoffMultiplier || 2,
      maxBackoffDelay: config.maxBackoffDelay || 5 * 60 * 1000 // 5 minutes
    };

    this.db = initializeDatabase(this.config);
    this.cleanupTimer = startCleanupTimer(this.db, this.config);
  }

  /**
   * Add a message to the queue
   */
  async enqueue(
    fromNode: number,
    toNode: number,
    message: string,
    options: {
      targetStation?: string;
      priority?: MessagePriority;
      ttl?: number;
      maxAttempts?: number;
      delay?: number;
    } = {}
  ): Promise<string> {
    return enqueueMessage(this.db, this.config, fromNode, toNode, message, options);
  }

  /**
   * Get next pending message(s) for processing
   */
  getNextMessages(limit: number = 10): QueuedMessage[] {
    return getNextMessages(this.db, limit);
  }

  /**
   * Mark message as processing
   */
  markProcessing(messageId: string): boolean {
    return markProcessing(this.db, messageId);
  }

  /**
   * Mark message as delivered
   */
  markDelivered(messageId: string): boolean {
    return markDelivered(this.db, messageId);
  }

  /**
   * Mark message as failed and reschedule if retries remain
   */
  markFailed(messageId: string, error: string): boolean {
    return markFailed(this.db, this.config, messageId, error);
  }

  /**
   * Get a specific message by ID
   */
  getMessage(messageId: string): QueuedMessage | null {
    return getMessage(this.db, messageId);
  }

  /**
   * Get messages by station
   */
  getMessagesByStation(targetStation: string, limit: number = 100): QueuedMessage[] {
    return getMessagesByStation(this.db, targetStation, limit);
  }

  /**
   * Clean up expired and delivered messages
   */
  cleanup(): number {
    return cleanupMessages(this.db);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    delivered: number;
    failed: number;
    expired: number;
  } {
    return getQueueStats(this.db);
  }

  /**
   * Shutdown the message queue
   */
  shutdown(): void {
    stopCleanupTimer(this.cleanupTimer);
    this.db.close();
    console.log('📪 Message queue shutdown complete');
  }
}
