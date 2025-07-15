/**
 * Message Queue Timer Management
 * Handles cleanup timer operations
 */

import { cleanupMessages } from './cleanup';
import Database from 'better-sqlite3';
import { MessageQueueConfig } from './types';

export function startCleanupTimer(db: Database.Database, config: Required<MessageQueueConfig>): NodeJS.Timeout {
  const timer = setInterval(() => {
    cleanupMessages(db);
  }, config.cleanupInterval);
  
  // Use unref() so this timer doesn't keep the process alive
  timer.unref();
  
  return timer;
}

export function stopCleanupTimer(timer?: NodeJS.Timeout): void {
  if (timer) {
    clearInterval(timer);
  }
}
