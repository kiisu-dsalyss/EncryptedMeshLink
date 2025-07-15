/**
 * Message Queue Statistics Function
 * Handles retrieving queue statistics
 */

import Database from 'better-sqlite3';

export function getQueueStats(db: Database.Database): {
  total: number;
  pending: number;
  processing: number;
  delivered: number;
  failed: number;
  expired: number;
} {
  const stmt = db.prepare(`
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
