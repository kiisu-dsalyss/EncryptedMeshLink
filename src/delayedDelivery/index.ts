/**
 * Delayed Message Delivery System
 * Handles automatic queuing and delivery of messages to offline nodes
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from '../relayHandler/types';
import { MessageQueue } from '../messageQueue/index';
import { MessagePriority } from '../messageQueue/types';
import { isNodeOnline } from '../relayHandler/nodeMatching';

export interface DelayedDeliveryConfig {
  maxQueueTime: number; // Maximum time to keep messages queued (hours)
  deliveryRetryInterval: number; // How often to check for delivery (seconds)
  maxDeliveryAttempts: number; // Maximum attempts before giving up
}

export class DelayedMessageDelivery {
  private device: MeshDevice;
  private knownNodes: Map<number, NodeInfo>;
  private messageQueue: MessageQueue;
  private config: DelayedDeliveryConfig;
  private deliveryTimer?: NodeJS.Timeout;
  private isActive = false;

  constructor(
    device: MeshDevice,
    knownNodes: Map<number, NodeInfo>,
    messageQueue: MessageQueue,
    config: Partial<DelayedDeliveryConfig> = {}
  ) {
    this.device = device;
    this.knownNodes = knownNodes;
    this.messageQueue = messageQueue;
    this.config = {
      maxQueueTime: config.maxQueueTime || 24, // 24 hours default
      deliveryRetryInterval: config.deliveryRetryInterval || 30, // 30 seconds default
      maxDeliveryAttempts: config.maxDeliveryAttempts || 10,
      ...config
    };
  }

  /**
   * Start the delayed delivery system
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.log('⚠️ Delayed delivery system already active');
      return;
    }

    console.log('📬 Starting delayed message delivery system...');
    this.isActive = true;
    
    // Start periodic delivery attempts
    this.deliveryTimer = setInterval(
      this.processQueuedMessages.bind(this),
      this.config.deliveryRetryInterval * 1000
    );

    console.log(`✅ Delayed delivery active (checking every ${this.config.deliveryRetryInterval}s)`);
  }

  /**
   * Stop the delayed delivery system
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;

    console.log('🛑 Stopping delayed message delivery system...');
    this.isActive = false;

    if (this.deliveryTimer) {
      clearInterval(this.deliveryTimer);
      this.deliveryTimer = undefined;
    }

    console.log('✅ Delayed delivery stopped');
  }

  /**
   * Try to send a message, queue if target is offline
   */
  async sendMessage(
    fromNode: number,
    targetNodeId: number,
    message: string,
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<{
    delivered: boolean;
    queued: boolean;
    reason: string;
  }> {
    const targetNode = this.knownNodes.get(targetNodeId);
    
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
        await this.device.sendText(message, targetNodeId);
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
      const ttl = this.config.maxQueueTime * 3600; // Convert hours to seconds
      const messageId = await this.messageQueue.enqueue(fromNode, targetNodeId, message, {
        priority,
        ttl,
        maxAttempts: this.config.maxDeliveryAttempts
      });

      console.log(`📬 Queued message for offline node ${targetName} (ID: ${messageId.substring(0, 8)}...)`);
      
      return {
        delivered: false,
        queued: true,
        reason: `${targetName} is offline - message queued for delivery (${this.config.maxQueueTime}h TTL)`
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

  /**
   * Process queued messages and attempt delivery to online nodes
   */
  private async processQueuedMessages(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Get pending messages
      const pendingMessages = this.messageQueue.getNextMessages(50);
      
      if (pendingMessages.length === 0) return;

      console.log(`📬 Processing ${pendingMessages.length} queued messages...`);
      let deliveredCount = 0;
      let failedCount = 0;

      for (const queuedMessage of pendingMessages) {
        const targetNode = this.knownNodes.get(queuedMessage.toNode);
        
        if (!targetNode) {
          // Node no longer known, mark as failed
          this.messageQueue.markFailed(queuedMessage.id, 'Target node no longer known');
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
        this.messageQueue.markProcessing(queuedMessage.id);

        try {
          // Try delivery
          const deliveryMessage = `📬 [Delayed] ${queuedMessage.message}`;
          await this.device.sendText(deliveryMessage, queuedMessage.toNode);
          
          // Mark as delivered
          this.messageQueue.markDelivered(queuedMessage.id);
          deliveredCount++;
          
          console.log(`✅ Delayed delivery successful: ${queuedMessage.message.substring(0, 30)}... → ${targetName}`);
          
          // Notify sender of successful delayed delivery
          try {
            const senderNode = this.knownNodes.get(queuedMessage.fromNode);
            if (senderNode && isNodeOnline(senderNode)) {
              const notification = `✅ Your queued message was delivered to ${targetName}`;
              await this.device.sendText(notification, queuedMessage.fromNode);
            }
          } catch (notifyError) {
            console.warn(`⚠️ Failed to notify sender of delivery:`, notifyError);
          }
          
        } catch (error) {
          // Mark as failed (will retry if attempts remain)
          const shouldRetry = this.messageQueue.markFailed(queuedMessage.id, `Delivery failed: ${error}`);
          failedCount++;
          
          if (!shouldRetry) {
            console.error(`❌ Giving up on message to ${targetName} after ${queuedMessage.maxAttempts} attempts`);
            
            // Notify sender of permanent failure
            try {
              const senderNode = this.knownNodes.get(queuedMessage.fromNode);
              if (senderNode && isNodeOnline(senderNode)) {
                const notification = `❌ Failed to deliver queued message to ${targetName} (gave up after ${queuedMessage.maxAttempts} attempts)`;
                await this.device.sendText(notification, queuedMessage.fromNode);
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

  /**
   * Get delivery system statistics
   */
  getStats(): {
    active: boolean;
    queueStats: ReturnType<MessageQueue['getStats']>;
    config: DelayedDeliveryConfig;
  } {
    return {
      active: this.isActive,
      queueStats: this.messageQueue.getStats(),
      config: this.config
    };
  }

  /**
   * Get queued messages for a specific node
   */
  getQueuedMessagesForNode(nodeId: number): ReturnType<MessageQueue['getMessagesByStation']> {
    // The message queue is designed for inter-station messaging, but we can adapt it
    // by using a station pattern based on node ID
    return this.messageQueue.getMessagesByStation(`node-${nodeId}`, 100);
  }
}
