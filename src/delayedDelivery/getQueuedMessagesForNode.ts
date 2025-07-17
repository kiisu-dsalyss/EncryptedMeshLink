/**
 * Get Queued Messages For Node Function
 * Get queued messages for a specific node
 */

import { MessageQueue } from '../messageQueue/index';

export function getQueuedMessagesForNode(
  messageQueue: MessageQueue,
  nodeId: number
): ReturnType<MessageQueue['getMessagesByStation']> {
  // The message queue is designed for inter-station messaging, but we can adapt it
  // by using a station pattern based on node ID
  return messageQueue.getMessagesByStation(`node-${nodeId}`, 100);
}
