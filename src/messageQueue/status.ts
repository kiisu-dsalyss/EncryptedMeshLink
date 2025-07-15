/**
 * Message Status Update Functions
 * Handles updating message status and retry logic
 */

import Database from 'better-sqlite3';
import { MessageStatus, MessageQueueConfig } from './types';
import { getMessage } from './dequeue';

export function markProcessing(db: Database.Database, messageId: string): boolean {
  const stmt = db.prepare(`
    UPDATE message_queue 
    SET status = ?, attempts = attempts + 1
    WHERE id = ? AND status = ?
  `);

  const result = stmt.run(MessageStatus.PROCESSING, messageId, MessageStatus.PENDING);
  return result.changes > 0;
}

export function markDelivered(db: Database.Database, messageId: string): boolean {
  const stmt = db.prepare(`
    UPDATE message_queue 
    SET status = ?
    WHERE id = ?
  `);

  const result = stmt.run(MessageStatus.DELIVERED, messageId);
  return result.changes > 0;
}

export function markFailed(db: Database.Database, config: Required<MessageQueueConfig>, messageId: string, error: string): boolean {
  const message = getMessage(db, messageId);
  if (!message) return false;

  const newAttempts = message.attempts + 1;
  
  if (newAttempts >= message.maxAttempts) {
    // Max attempts reached, mark as failed
    const stmt = db.prepare(`
      UPDATE message_queue 
      SET status = ?, last_error = ?
      WHERE id = ?
    `);
    
    stmt.run(MessageStatus.FAILED, error, messageId);
    return false;
  } else {
    // Reschedule with exponential backoff
    const backoffDelay = Math.min(
      Math.pow(config.backoffMultiplier, newAttempts - 1) * 1000,
      config.maxBackoffDelay
    );
    
    const newScheduledFor = Date.now() + backoffDelay;
    
    const stmt = db.prepare(`
      UPDATE message_queue 
      SET status = ?, scheduled_for = ?, last_error = ?
      WHERE id = ?
    `);
    
    stmt.run(MessageStatus.PENDING, newScheduledFor, error, messageId);
    return true;
  }
}
