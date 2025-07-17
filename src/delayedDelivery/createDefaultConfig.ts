/**
 * Create Default Config Function
 * Create default configuration for delayed delivery system
 */

import { DelayedDeliveryConfig } from './types';

export function createDefaultConfig(overrides: Partial<DelayedDeliveryConfig> = {}): DelayedDeliveryConfig {
  return {
    maxQueueTime: overrides.maxQueueTime || 24, // 24 hours default
    deliveryRetryInterval: overrides.deliveryRetryInterval || 30, // 30 seconds default
    maxDeliveryAttempts: overrides.maxDeliveryAttempts || 10,
    ...overrides
  };
}
