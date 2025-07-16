/**
 * Handle Connection Error
 * MIB-007: P2P Connection Manager - Connection Error Handler
 */

import { EventEmitter } from 'events';

/**
 * Handle connection error events
 */
export function handleConnectionError(
  peerId: string,
  error: Error,
  eventEmitter: EventEmitter
): void {
  console.error(`❌ Connection error with ${peerId}:`, error);
  
  // Emit error event for listeners
  eventEmitter.emit('connectionError', { peerId, error });
}
