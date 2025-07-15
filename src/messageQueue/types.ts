/**
 * Message Queue Types
 * Type definitions for the message queue system
 */

export interface QueuedMessage {
  id: string;
  fromNode: number;
  toNode: number;
  message: string;
  targetStation?: string; // For bridge messages
  priority: MessagePriority;
  ttl: number; // Time to live in seconds
  createdAt: Date;
  scheduledFor: Date;
  attempts: number;
  maxAttempts: number;
  status: MessageStatus;
  lastError?: string;
}

export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface MessageQueueConfig {
  dbPath?: string;
  maxQueueSize?: number;
  defaultTTL?: number;
  maxAttempts?: number;
  cleanupInterval?: number;
  backoffMultiplier?: number;
  maxBackoffDelay?: number;
}
