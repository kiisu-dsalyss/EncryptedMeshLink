/**
 * Dequeue Message Function
 * Handles retrieving messages from the queue
 */

import Database from 'better-sqlite3';
import { QueuedMessage, MessageStatus } from './types';

export function getNextMessages(db: Database.Database, limit: number = 10): QueuedMessage[] {
  const now = Date.now();
  
  const stmt = db.prepare(`
    SELECT * FROM message_queue 
    WHERE status = ? AND scheduled_for <= ?
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT ?
  `);

  const rows = stmt.all(MessageStatus.PENDING, now, limit);
  return rows.map(rowToMessage);
}

export function getMessage(db: Database.Database, messageId: string): QueuedMessage | null {
  const stmt = db.prepare(`SELECT * FROM message_queue WHERE id = ?`);
  const row = stmt.get(messageId);
  return row ? rowToMessage(row) : null;
}

export function getMessagesByStation(db: Database.Database, targetStation: string, limit: number = 100): QueuedMessage[] {
  const stmt = db.prepare(`
    SELECT * FROM message_queue 
    WHERE target_station = ?
    ORDER BY priority DESC, created_at ASC
    LIMIT ?
  `);
  
  const rows = stmt.all(targetStation, limit);
  return rows.map(rowToMessage);
}

function rowToMessage(row: any): QueuedMessage {
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
