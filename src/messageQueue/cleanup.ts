/**
 * Message Queue Cleanup Function
 * Handles cleaning up expired and delivered messages
 */

import Database from 'better-sqlite3';
import { MessageStatus } from './types';

export function cleanupMessages(db: Database.Database): number {
  const now = Date.now();
  let deletedCount = 0;

  // Delete delivered messages older than 1 hour
  const deliveredStmt = db.prepare(`
    DELETE FROM message_queue 
    WHERE status = ? AND created_at < ?
  `);
  const deliveredResult = deliveredStmt.run(MessageStatus.DELIVERED, now - (60 * 60 * 1000));
  deletedCount += deliveredResult.changes;

  // Mark expired messages
  const expiredStmt = db.prepare(`
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
  const deleteExpiredStmt = db.prepare(`
    DELETE FROM message_queue 
    WHERE status = ? AND created_at < ?
  `);
  const deleteExpiredResult = deleteExpiredStmt.run(MessageStatus.EXPIRED, now - (24 * 60 * 60 * 1000));
  deletedCount += deleteExpiredResult.changes;

  return deletedCount;
}
