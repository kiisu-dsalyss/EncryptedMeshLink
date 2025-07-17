/**
 * Delayed Delivery Types
 * Type definitions for the delayed message delivery system
 */

import { MessagePriority } from '../messageQueue/types';

export interface DelayedDeliveryConfig {
  maxQueueTime: number; // Maximum time to keep messages queued (hours)
  deliveryRetryInterval: number; // How often to check for delivery (seconds)
  maxDeliveryAttempts: number; // Maximum attempts before giving up
}

export interface DelayedDeliveryResult {
  delivered: boolean;
  queued: boolean;
  reason: string;
}

export interface DelayedDeliveryStats {
  active: boolean;
  queueStats: any; // From MessageQueue['getStats']
  config: DelayedDeliveryConfig;
}

export interface SendMessageOptions {
  priority?: MessagePriority;
  fromNode: number;
  targetNodeId: number;
  message: string;
}
