/**
 * Process Queued Messages Function
 * Attempt delivery of queued messages to nodes that are now online
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from '../relayHandler/types';
import { MessageQueue } from '../messageQueue/index';
import { isNodeOnline } from '../relayHandler/nodeMatching';
import { DelayedDeliveryConfig } from './types';

export async function processQueuedMessages(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  messageQueue: MessageQueue,
  config: DelayedDeliveryConfig
): Promise<void> {
  try {
    // Get pending messages
    const pendingMessages = messageQueue.getNextMessages(50);
    
    if (pendingMessages.length === 0) return;

    console.log(`📬 Processing ${pendingMessages.length} queued messages...`);
    let deliveredCount = 0;
    let failedCount = 0;

    for (const queuedMessage of pendingMessages) {
      const targetNode = knownNodes.get(queuedMessage.toNode);
      
      if (!targetNode) {
        // Node no longer known, mark as failed
        messageQueue.markFailed(queuedMessage.id, 'Target node no longer known');
        failedCount++;
        continue;
      }

      const isOnline = isNodeOnline(targetNode);
      const targetName = targetNode.user?.longName || targetNode.user?.shortName || `Node-${queuedMessage.toNode}`;

      if (!isOnline) {
        // Still offline, skip for now
        continue;
      }

      // Mark as processing
      messageQueue.markProcessing(queuedMessage.id);

      try {
        // Try delivery
        const deliveryMessage = `📬 [Delayed] ${queuedMessage.message}`;
        await device.sendText(deliveryMessage, queuedMessage.toNode);
        
        // Mark as delivered
        messageQueue.markDelivered(queuedMessage.id);
        deliveredCount++;
        
        console.log(`✅ Delayed delivery successful: ${queuedMessage.message.substring(0, 30)}... → ${targetName}`);
        
        // Notify sender of successful delayed delivery
        try {
          const senderNode = knownNodes.get(queuedMessage.fromNode);
          if (senderNode && isNodeOnline(senderNode)) {
            const notification = `✅ Your queued message was delivered to ${targetName}`;
            await device.sendText(notification, queuedMessage.fromNode);
          }
        } catch (notifyError) {
          console.warn(`⚠️ Failed to notify sender of delivery:`, notifyError);
        }
        
      } catch (error) {
        // Mark as failed (will retry if attempts remain)
        const shouldRetry = messageQueue.markFailed(queuedMessage.id, `Delivery failed: ${error}`);
        failedCount++;
        
        if (!shouldRetry) {
          console.error(`❌ Giving up on message to ${targetName} after ${queuedMessage.maxAttempts} attempts`);
          
          // Notify sender of permanent failure
          try {
            const senderNode = knownNodes.get(queuedMessage.fromNode);
            if (senderNode && isNodeOnline(senderNode)) {
              const notification = `❌ Failed to deliver queued message to ${targetName} (gave up after ${queuedMessage.maxAttempts} attempts)`;
              await device.sendText(notification, queuedMessage.fromNode);
            }
          } catch (notifyError) {
            console.warn(`⚠️ Failed to notify sender of failure:`, notifyError);
          }
        }
      }
    }

    if (deliveredCount > 0 || failedCount > 0) {
      console.log(`📊 Queue processing: ${deliveredCount} delivered, ${failedCount} failed`);
    }

  } catch (error) {
    console.error(`❌ Error processing message queue:`, error);
  }
}
