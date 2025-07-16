/**
 * Handle Connection Close
 * MIB-007: P2P Connection Manager - Connection Close Handler
 */

import { EventEmitter } from 'events';

/**
 * Handle connection close events and cleanup
 */
export function handleConnectionClose(
  peerId: string,
  reason: string,
  connections: Map<string, any>,
  eventEmitter: EventEmitter
): void {
  console.log(`🔌 Connection to ${peerId} closed: ${reason}`);
  
  // Remove from active connections
  connections.delete(peerId);
  
  // Emit close event for listeners
  eventEmitter.emit('connectionClosed', { peerId, reason });
}
