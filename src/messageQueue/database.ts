/**
 * Database Initialization
 * Handles SQLite database setup and table creation
 */

import Database from 'better-sqlite3';
import path from 'path';
import { MessageQueueConfig } from './types';

export function initializeDatabase(config: Required<MessageQueueConfig>): Database.Database {
  // Ensure data directory exists
  const dbDir = path.dirname(config.dbPath);
  require('fs').mkdirSync(dbDir, { recursive: true });

  // Initialize database
  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  createTables(db);
  
  return db;
}

function createTables(db: Database.Database): void {
  db.exec(`
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
