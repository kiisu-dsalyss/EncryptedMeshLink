/**
 * Enqueue Message Function
 * Handles adding messages to the queue
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { QueuedMessage, MessagePriority, MessageStatus, MessageQueueConfig } from './types';

export async function enqueueMessage(
  db: Database.Database,
  config: Required<MessageQueueConfig>,
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
  const queueSize = getQueueSize(db);
  if (queueSize >= config.maxQueueSize) {
    throw new Error(`Queue is full (${queueSize}/${config.maxQueueSize} messages)`);
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
    ttl: options.ttl || config.defaultTTL,
    createdAt: new Date(now),
    scheduledFor: new Date(scheduledFor),
    attempts: 0,
    maxAttempts: options.maxAttempts || config.maxAttempts,
    status: MessageStatus.PENDING
  };

  try {
    const stmt = db.prepare(`
      INSERT INTO message_queue (
        id, from_node, to_node, message, target_station, priority, ttl,
        created_at, scheduled_for, attempts, max_attempts, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);      stmt.run(
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

      return messageId;    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return 'duplicate';
      }
      throw error;
    }
}

function getQueueSize(db: Database.Database): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM message_queue 
    WHERE status IN (?, ?)
  `);
  
  const result = stmt.get(MessageStatus.PENDING, MessageStatus.PROCESSING) as { count: number };
  return result.count;
}
