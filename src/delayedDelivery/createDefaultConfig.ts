import { DelayedDeliveryConfig } from './types';

/**
 * Creates a default configuration for the delayed delivery system
 */
export function createDefaultConfig(): DelayedDeliveryConfig {
  return {
    maxRetries: 3,
    retryInterval: 30000, // 30 seconds
    maxQueueSize: 1000,
    deliveryTimeout: 10000, // 10 seconds per delivery attempt
    persistencePath: './data/delayed_messages.db'
  };
}