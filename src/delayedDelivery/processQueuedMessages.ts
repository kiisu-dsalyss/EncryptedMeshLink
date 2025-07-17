import { DelayedDeliveryConfig } from './types';
import { queueManager } from './queueManager';

/**
 * Process queued messages for delivery
 * Attempts to deliver messages to nodes that are now online
 */
export async function processQueuedMessages(
  config: DelayedDeliveryConfig,
  isNodeOnline: (nodeId: number) => boolean,
  directSend: (nodeId: number, message: string) => Promise<boolean>
): Promise<void> {
  try {
    // Clean up expired messages first
    const expiredMessages = queueManager.cleanupExpired();
    if (expiredMessages.length > 0) {
      console.log(`🗑️ Cleaned up ${expiredMessages.length} expired messages`);
    }

    // Get messages ready for retry
    const readyMessages = queueManager.getMessagesReadyForRetry(config.retryInterval);
    
    if (readyMessages.length === 0) {
      return;
    }

    console.log(`📨 Processing ${readyMessages.length} queued messages`);

    for (const message of readyMessages) {
      // Skip if node is still offline
      if (!isNodeOnline(message.targetNodeId)) {
        continue;
      }

      // Skip if we've exceeded max retries
      if (message.retryCount >= config.maxRetries) {
        console.warn(`❌ Message ${message.id} exceeded max retries (${config.maxRetries}), marking as failed`);
        queueManager.markFailed(message.id);
        continue;
      }

      try {
        // Update retry count before attempting delivery
        queueManager.updateRetryCount(message.id);
        
        console.log(`📤 Attempting delivery to node ${message.targetNodeId} (attempt ${message.retryCount}/${config.maxRetries})`);
        
        // Attempt delivery with timeout
        const deliveryPromise = directSend(message.targetNodeId, message.message);
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Delivery timeout')), config.deliveryTimeout);
        });

        const success = await Promise.race([deliveryPromise, timeoutPromise]);
        
        if (success) {
          console.log(`✅ Message ${message.id} delivered successfully to node ${message.targetNodeId}`);
          queueManager.markDelivered(message.id);
        } else {
          console.warn(`⚠️ Message ${message.id} delivery failed, will retry later`);
        }

      } catch (error) {
        console.warn(`⚠️ Message ${message.id} delivery error:`, error);
        
        // If this was the final retry, mark as failed
        if (message.retryCount >= config.maxRetries) {
          console.warn(`❌ Message ${message.id} failed permanently after ${config.maxRetries} retries`);
          queueManager.markFailed(message.id);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error processing queued messages:", error);
  }
}