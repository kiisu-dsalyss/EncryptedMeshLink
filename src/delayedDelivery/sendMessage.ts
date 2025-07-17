/**
 * Send Message Function
 * Try to send a message immediately, queue if target is offline
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from '../relayHandler/types';
import { MessageQueue } from '../messageQueue/index';
import { MessagePriority } from '../messageQueue/types';
import { isNodeOnline } from '../relayHandler/nodeMatching';
import { DelayedDeliveryResult, DelayedDeliveryConfig } from './types';

export async function sendMessage(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  messageQueue: MessageQueue,
  config: DelayedDeliveryConfig,
  fromNode: number,
  targetNodeId: number,
  message: string,
  priority: MessagePriority = MessagePriority.NORMAL
): Promise<DelayedDeliveryResult> {
  const targetNode = knownNodes.get(targetNodeId);
  
  if (!targetNode) {
    return {
      delivered: false,
      queued: false,
      reason: `Target node ${targetNodeId} not found`
    };
  }

  const targetName = targetNode.user?.longName || targetNode.user?.shortName || `Node-${targetNodeId}`;
  const isOnline = isNodeOnline(targetNode);

  if (isOnline) {
    // Try immediate delivery
    try {
      await device.sendText(message, targetNodeId);
      console.log(`📤 Immediate delivery: ${message.substring(0, 50)}... → ${targetName}`);
      
      return {
        delivered: true,
        queued: false,
        reason: `Delivered immediately to ${targetName} (online)`
      };
    } catch (error) {
      console.error(`❌ Immediate delivery failed to ${targetName}:`, error);
      // Fall through to queuing
    }
  }

  // Queue for delayed delivery
  try {
    const ttl = config.maxQueueTime * 3600; // Convert hours to seconds
    const messageId = await messageQueue.enqueue(fromNode, targetNodeId, message, {
      priority,
      ttl,
      maxAttempts: config.maxDeliveryAttempts
    });

    console.log(`📬 Queued message for offline node ${targetName} (ID: ${messageId.substring(0, 8)}...)`);
    
    return {
      delivered: false,
      queued: true,
      reason: `${targetName} is offline - message queued for delivery (${config.maxQueueTime}h TTL)`
    };
  } catch (error) {
    console.error(`❌ Failed to queue message:`, error);
    return {
      delivered: false,
      queued: false,
      reason: `Failed to queue message: ${error}`
    };
  }
}
