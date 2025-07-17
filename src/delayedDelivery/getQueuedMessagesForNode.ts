import { QueuedMessage } from './types';
import { queueManager } from './queueManager';

/**
 * Get all queued messages for a specific node
 */
export function getQueuedMessagesForNode(nodeId: number): QueuedMessage[] {
  return queueManager.getMessagesForNode(nodeId);
}