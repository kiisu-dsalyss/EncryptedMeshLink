import { DelayedDeliveryStats } from './types';
import { queueManager } from './queueManager';

/**
 * Get current delivery statistics
 */
export function getDeliveryStats(): DelayedDeliveryStats {
  return queueManager.getStats();
}