/**
 * Delayed Message Delivery System Types
 */

export interface DelayedDeliveryConfig {
  maxRetries: number;
  retryInterval: number; // milliseconds
  maxQueueSize: number;
  persistencePath?: string;
  deliveryTimeout: number; // milliseconds
}

export interface QueuedMessage {
  id: string;
  targetNodeId: number;
  message: string;
  priority: number;
  queuedAt: number; // timestamp
  retryCount: number;
  lastAttempt?: number; // timestamp
  expiresAt?: number; // timestamp
}

export interface DelayedDeliveryStats {
  totalQueued: number;
  totalDelivered: number;
  totalFailed: number;
  totalExpired: number;
  currentQueueSize: number;
  nodeQueues: Record<number, number>; // nodeId -> message count
}

export interface DelayedDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  queued?: boolean;
}

export interface SendMessageOptions {
  priority?: number;
  retries?: number;
  ttl?: number; // time to live in milliseconds
  forceQueue?: boolean; // force queuing even if node is online
}

export interface DeliverySystemState {
  isRunning: boolean;
  config: DelayedDeliveryConfig;
  stats: DelayedDeliveryStats;
  intervalId?: NodeJS.Timeout;
}