import { QueuedMessage, DelayedDeliveryStats } from './types';

/**
 * Simple in-memory queue manager for delayed message delivery
 * TODO: Add SQLite persistence for production use
 */
class QueueManager {
  private queues: Map<number, QueuedMessage[]> = new Map();
  private allMessages: Map<string, QueuedMessage> = new Map();
  private stats: DelayedDeliveryStats = {
    totalQueued: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalExpired: 0,
    currentQueueSize: 0,
    nodeQueues: {}
  };

  /**
   * Add a message to the queue for a specific node
   */
  addMessage(message: QueuedMessage): void {
    if (!this.queues.has(message.targetNodeId)) {
      this.queues.set(message.targetNodeId, []);
    }

    const nodeQueue = this.queues.get(message.targetNodeId)!;
    nodeQueue.push(message);
    
    // Sort by priority (higher number = higher priority)
    nodeQueue.sort((a, b) => b.priority - a.priority);

    this.allMessages.set(message.id, message);
    this.stats.totalQueued++;
    this.stats.currentQueueSize++;
    this.updateNodeQueueStats();
  }

  /**
   * Get all queued messages for a specific node
   */
  getMessagesForNode(nodeId: number): QueuedMessage[] {
    return this.queues.get(nodeId) || [];
  }

  /**
   * Remove a message from the queue
   */
  removeMessage(messageId: string): boolean {
    const message = this.allMessages.get(messageId);
    if (!message) return false;

    const nodeQueue = this.queues.get(message.targetNodeId);
    if (nodeQueue) {
      const index = nodeQueue.findIndex(m => m.id === messageId);
      if (index >= 0) {
        nodeQueue.splice(index, 1);
      }
    }

    this.allMessages.delete(messageId);
    this.stats.currentQueueSize--;
    this.updateNodeQueueStats();
    return true;
  }

  /**
   * Mark a message as delivered
   */
  markDelivered(messageId: string): boolean {
    if (this.removeMessage(messageId)) {
      this.stats.totalDelivered++;
      return true;
    }
    return false;
  }

  /**
   * Mark a message as failed
   */
  markFailed(messageId: string): boolean {
    if (this.removeMessage(messageId)) {
      this.stats.totalFailed++;
      return true;
    }
    return false;
  }

  /**
   * Update retry count for a message
   */
  updateRetryCount(messageId: string): boolean {
    const message = this.allMessages.get(messageId);
    if (message) {
      message.retryCount++;
      message.lastAttempt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get expired messages and remove them
   */
  cleanupExpired(): QueuedMessage[] {
    const now = Date.now();
    const expired: QueuedMessage[] = [];

    for (const [messageId, message] of this.allMessages) {
      if (message.expiresAt && now > message.expiresAt) {
        expired.push(message);
        this.removeMessage(messageId);
        this.stats.totalExpired++;
      }
    }

    return expired;
  }

  /**
   * Get all messages that are ready for retry
   */
  getMessagesReadyForRetry(retryInterval: number): QueuedMessage[] {
    const now = Date.now();
    const ready: QueuedMessage[] = [];

    for (const message of this.allMessages.values()) {
      if (!message.lastAttempt || (now - message.lastAttempt) >= retryInterval) {
        ready.push(message);
      }
    }

    return ready.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get current delivery statistics
   */
  getStats(): DelayedDeliveryStats {
    return { ...this.stats };
  }

  /**
   * Update node queue statistics
   */
  private updateNodeQueueStats(): void {
    this.stats.nodeQueues = {};
    for (const [nodeId, queue] of this.queues) {
      this.stats.nodeQueues[nodeId] = queue.length;
    }
  }

  /**
   * Clear all queues (for testing)
   */
  clear(): void {
    this.queues.clear();
    this.allMessages.clear();
    this.stats = {
      totalQueued: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalExpired: 0,
      currentQueueSize: 0,
      nodeQueues: {}
    };
  }
}

// Export singleton instance
export const queueManager = new QueueManager();
