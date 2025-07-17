/**
 * Example usage of the Delayed Delivery System
 */

import { MeshDevice } from "@jsr/meshtastic__core";
import { NodeManager } from '../nodeManager';
import { integrateDelayedDelivery } from './integrateDelayedDelivery';
import { getDeliveryStats } from './getDeliveryStats';
import { getQueuedMessagesForNode } from './getQueuedMessagesForNode';

/**
 * Example: Setting up delayed delivery with custom configuration
 */
export function exampleDelayedDeliverySetup(device: MeshDevice, nodeManager: NodeManager) {
  // Initialize delayed delivery with custom config
  const delayedDelivery = integrateDelayedDelivery(device, nodeManager, {
    maxRetries: 5,
    retryInterval: 60000, // 1 minute
    maxQueueSize: 500,
    deliveryTimeout: 15000 // 15 seconds
  });

  // Example: Send a message with delayed delivery
  async function sendMessageExample() {
    const targetNodeId = 123456789;
    const message = "Hello! This message will be delivered when you come online.";
    
    const result = await delayedDelivery.sendMessageWithDelayedDelivery(
      targetNodeId,
      message,
      {
        priority: 2, // Higher priority
        ttl: 48 * 60 * 60 * 1000, // 48 hours
        retries: 3
      }
    );

    if (result.queued) {
      console.log(`Message queued for offline node ${targetNodeId} (ID: ${result.messageId})`);
    } else if (result.success) {
      console.log(`Message sent immediately to online node ${targetNodeId}`);
    } else {
      console.error(`Failed to send message: ${result.error}`);
    }
  }

  // Example: Check delivery statistics
  function checkStats() {
    const stats = getDeliveryStats();
    console.log("📊 Delivery Statistics:");
    console.log(`  Total Queued: ${stats.totalQueued}`);
    console.log(`  Total Delivered: ${stats.totalDelivered}`);
    console.log(`  Total Failed: ${stats.totalFailed}`);
    console.log(`  Current Queue Size: ${stats.currentQueueSize}`);
    console.log(`  Node Queues:`, stats.nodeQueues);
  }

  // Example: Check queued messages for a specific node
  function checkNodeQueue(nodeId: number) {
    const messages = getQueuedMessagesForNode(nodeId);
    console.log(`📨 Node ${nodeId} has ${messages.length} queued messages:`);
    messages.forEach(msg => {
      console.log(`  - ${msg.message} (Priority: ${msg.priority}, Retries: ${msg.retryCount})`);
    });
  }

  return {
    delayedDelivery,
    sendMessageExample,
    checkStats,
    checkNodeQueue
  };
}

/**
 * Example: Using delayed delivery in a message handler
 */
export function exampleMessageHandler(device: MeshDevice, nodeManager: NodeManager) {
  const { sendMessageWithDelayedDelivery } = integrateDelayedDelivery(device, nodeManager);

  // Handle incoming relay requests
  function handleRelayRequest(fromNodeId: number, targetNodeId: number, message: string) {
    // Attempt to relay the message with automatic delayed delivery
    sendMessageWithDelayedDelivery(targetNodeId, message, {
      priority: 1,
      ttl: 6 * 60 * 60 * 1000 // 6 hours for relay messages
    }).then(result => {
      if (result.queued) {
        // Send acknowledgment back to requester
        device.sendText(
          `Message queued for delivery to node ${targetNodeId}`,
          undefined,
          false,
          fromNodeId
        );
      } else if (result.success) {
        // Send success confirmation
        device.sendText(
          `Message delivered to node ${targetNodeId}`,
          undefined,
          false,
          fromNodeId
        );
      }
    });
  }

  return { handleRelayRequest };
}