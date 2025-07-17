import { v4 as uuidv4 } from 'uuid';
import { DelayedDeliveryResult, SendMessageOptions, QueuedMessage } from './types';
import { queueManager } from './queueManager';

/**
 * Send a message with delayed delivery support
 * If the target node is offline, the message will be queued for later delivery
 */
export async function sendMessage(
  targetNodeId: number,
  message: string,
  isNodeOnline: (nodeId: number) => boolean,
  directSend: (nodeId: number, message: string) => Promise<boolean>,
  options: SendMessageOptions = {}
): Promise<DelayedDeliveryResult> {
  const {
    priority = 1,
    retries = 3,
    ttl = 24 * 60 * 60 * 1000, // 24 hours default
    forceQueue = false
  } = options;

  // Try direct delivery if node is online and not forced to queue
  if (!forceQueue && isNodeOnline(targetNodeId)) {
    try {
      const success = await directSend(targetNodeId, message);
      if (success) {
        return {
          success: true,
          queued: false
        };
      }
    } catch (error) {
      console.warn(`Direct send failed for node ${targetNodeId}, queuing message:`, error);
    }
  }

  // Queue the message for delayed delivery
  const messageId = uuidv4();
  const queuedMessage: QueuedMessage = {
    id: messageId,
    targetNodeId,
    message,
    priority,
    queuedAt: Date.now(),
    retryCount: 0,
    expiresAt: Date.now() + ttl
  };

  queueManager.addMessage(queuedMessage);

  console.log(`📨 Message queued for offline node ${targetNodeId} (ID: ${messageId})`);

  return {
    success: true,
    messageId,
    queued: true
  };
}