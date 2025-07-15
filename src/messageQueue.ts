/**
 * Message Queue System
 * MIB-006: SQLite-based message persistence for offline delivery
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';

export interface QueuedMessage {
  id: string;
  fromNode: number;
  toNode: number;
  message: string;
  targetStation?: string; // For bridge messages
  priority: MessagePriority;
  ttl: number; // Time to live in seconds
  createdAt: Date;
  scheduledFor: Date;
  attempts: number;
  maxAttempts: number;
  status: MessageStatus;
  lastError?: string;
}

export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface MessageQueueConfig {
  dbPath?: string;
  maxQueueSize?: number;
  defaultTTL?: number;
  maxAttempts?: number;
  cleanupInterval?: number;
  backoffMultiplier?: number;
  maxBackoffDelay?: number;
}

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

    this.initializeDatabase();
    this.startCleanupTimer();
  }

  private initializeDatabase(): void {
    // Ensure data directory exists
    const dbDir = path.dirname(this.config.dbPath);
    require('fs').mkdirSync(dbDir, { recursive: true });

    // Initialize database
    this.db = new Database(this.config.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.createTables();
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS message_queue (
        id TEXT PRIMARY KEY,
        from_node INTEGER NOT NULL,
        to_node INTEGER NOT NULL,
        message TEXT NOT NULL,
        target_station TEXT,
        priority INTEGER NOT NULL DEFAULT 1,
        ttl INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        scheduled_for INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'pending',
        last_error TEXT,
        UNIQUE(from_node, to_node, message, created_at)
      );

      CREATE INDEX IF NOT EXISTS idx_status_priority_scheduled 
      ON message_queue(status, priority DESC, scheduled_for ASC);
      
      CREATE INDEX IF NOT EXISTS idx_created_at 
      ON message_queue(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_target_station 
      ON message_queue(target_station);
    `);
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
    // Check queue size limit
    const queueSize = this.getQueueSize();
    if (queueSize >= this.config.maxQueueSize) {
      throw new Error(`Queue is full (${queueSize}/${this.config.maxQueueSize} messages)`);
    }

    const messageId = randomUUID();
    const now = Date.now();
    const scheduledFor = now + (options.delay || 0);

    const queuedMessage: QueuedMessage = {
      id: messageId,
      fromNode,
      toNode,
      message,
      targetStation: options.targetStation,
      priority: options.priority !== undefined ? options.priority : MessagePriority.NORMAL,
      ttl: options.ttl || this.config.defaultTTL,
      createdAt: new Date(now),
      scheduledFor: new Date(scheduledFor),
      attempts: 0,
      maxAttempts: options.maxAttempts || this.config.maxAttempts,
      status: MessageStatus.PENDING
    };

    try {
      const stmt = this.db.prepare(`
        INSERT INTO message_queue (
          id, from_node, to_node, message, target_station, priority, ttl,
          created_at, scheduled_for, attempts, max_attempts, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        messageId,
        fromNode,
        toNode,
        message,
        options.targetStation || null,
        queuedMessage.priority,
        queuedMessage.ttl,
        now,
        scheduledFor,
        0,
        queuedMessage.maxAttempts,
        MessageStatus.PENDING
      );

      console.log(`📥 Queued message ${messageId} from ${fromNode} to ${toNode}${options.targetStation ? ` via ${options.targetStation}` : ''}`);
      return messageId;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        console.log(`⚠️ Duplicate message detected, skipping`);
        return 'duplicate';
      }
      throw error;
    }
  }

  /**
   * Get next pending message(s) for processing
   */
  getNextMessages(limit: number = 10): QueuedMessage[] {
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      SELECT * FROM message_queue 
      WHERE status = ? AND scheduled_for <= ?
      ORDER BY priority DESC, scheduled_for ASC
      LIMIT ?
    `);

    const rows = stmt.all(MessageStatus.PENDING, now, limit);
    return rows.map(this.rowToMessage);
  }

  /**
   * Mark message as processing
   */
  markProcessing(messageId: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE message_queue 
      SET status = ?, attempts = attempts + 1
      WHERE id = ? AND status = ?
    `);

    const result = stmt.run(MessageStatus.PROCESSING, messageId, MessageStatus.PENDING);
    return result.changes > 0;
  }

  /**
   * Mark message as delivered
   */
  markDelivered(messageId: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE message_queue 
      SET status = ?
      WHERE id = ?
    `);

    const result = stmt.run(MessageStatus.DELIVERED, messageId);
    console.log(`✅ Message ${messageId} delivered successfully`);
    return result.changes > 0;
  }

  /**
   * Mark message as failed and reschedule if retries remain
   */
  markFailed(messageId: string, error: string): boolean {
    const message = this.getMessage(messageId);
    if (!message) return false;

    const newAttempts = message.attempts + 1;
    
    if (newAttempts >= message.maxAttempts) {
      // Max attempts reached, mark as failed
      const stmt = this.db.prepare(`
        UPDATE message_queue 
        SET status = ?, last_error = ?
        WHERE id = ?
      `);
      
      stmt.run(MessageStatus.FAILED, error, messageId);
      console.log(`❌ Message ${messageId} failed permanently after ${newAttempts} attempts`);
      return false;
    } else {
      // Reschedule with exponential backoff
      const backoffDelay = Math.min(
        Math.pow(this.config.backoffMultiplier, newAttempts - 1) * 1000,
        this.config.maxBackoffDelay
      );
      
      const newScheduledFor = Date.now() + backoffDelay;
      
      const stmt = this.db.prepare(`
        UPDATE message_queue 
        SET status = ?, scheduled_for = ?, last_error = ?
        WHERE id = ?
      `);
      
      stmt.run(MessageStatus.PENDING, newScheduledFor, error, messageId);
      console.log(`🔄 Message ${messageId} rescheduled (attempt ${newAttempts}/${message.maxAttempts}) in ${backoffDelay}ms`);
      return true;
    }
  }

  /**
   * Get a specific message by ID
   */
  getMessage(messageId: string): QueuedMessage | null {
    const stmt = this.db.prepare(`SELECT * FROM message_queue WHERE id = ?`);
    const row = stmt.get(messageId);
    return row ? this.rowToMessage(row) : null;
  }

  /**
   * Get messages by station
   */
  getMessagesByStation(targetStation: string, limit: number = 100): QueuedMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM message_queue 
      WHERE target_station = ?
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `);
    
    const rows = stmt.all(targetStation, limit);
    return rows.map(this.rowToMessage);
  }

  /**
   * Clean up expired and delivered messages
   */
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;

    // Delete delivered messages older than 1 hour
    const deliveredStmt = this.db.prepare(`
      DELETE FROM message_queue 
      WHERE status = ? AND created_at < ?
    `);
    const deliveredResult = deliveredStmt.run(MessageStatus.DELIVERED, now - (60 * 60 * 1000));
    deletedCount += deliveredResult.changes;

    // Mark expired messages
    const expiredStmt = this.db.prepare(`
      UPDATE message_queue 
      SET status = ? 
      WHERE status IN (?, ?) AND created_at + (ttl * 1000) < ?
    `);
    const expiredResult = expiredStmt.run(
      MessageStatus.EXPIRED, 
      MessageStatus.PENDING, 
      MessageStatus.PROCESSING, 
      now
    );

    // Delete expired messages older than 24 hours
    const deleteExpiredStmt = this.db.prepare(`
      DELETE FROM message_queue 
      WHERE status = ? AND created_at < ?
    `);
    const deleteExpiredResult = deleteExpiredStmt.run(MessageStatus.EXPIRED, now - (24 * 60 * 60 * 1000));
    deletedCount += deleteExpiredResult.changes;

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} messages from queue`);
    }

    return deletedCount;
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
    const stmt = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM message_queue 
      GROUP BY status
    `);
    
    const rows = stmt.all() as { status: string; count: number }[];
    
    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      delivered: 0,
      failed: 0,
      expired: 0
    };

    for (const row of rows) {
      stats.total += row.count;
      (stats as any)[row.status] = row.count;
    }

    return stats;
  }

  /**
   * Get current queue size (pending + processing)
   */
  private getQueueSize(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM message_queue 
      WHERE status IN (?, ?)
    `);
    
    const result = stmt.get(MessageStatus.PENDING, MessageStatus.PROCESSING) as { count: number };
    return result.count;
  }

  /**
   * Convert database row to QueuedMessage
   */
  private rowToMessage(row: any): QueuedMessage {
    return {
      id: row.id,
      fromNode: row.from_node,
      toNode: row.to_node,
      message: row.message,
      targetStation: row.target_station,
      priority: row.priority,
      ttl: row.ttl,
      createdAt: new Date(row.created_at),
      scheduledFor: new Date(row.scheduled_for),
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      status: row.status,
      lastError: row.last_error
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
    
    // Use unref() so this timer doesn't keep the process alive
    this.cleanupTimer.unref();
  }

  /**
   * Shutdown the message queue
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.db.close();
    console.log('📪 Message queue shutdown complete');
  }
}
