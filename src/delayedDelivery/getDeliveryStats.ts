/**
 * Get Delivery Stats Function
 * Get statistics about the delayed delivery system
 */

import { MessageQueue } from '../messageQueue/index';
import { DelayedDeliveryStats, DelayedDeliveryConfig } from './types';

export function getDeliveryStats(
  messageQueue: MessageQueue,
  config: DelayedDeliveryConfig,
  isActive: boolean
): DelayedDeliveryStats {
  return {
    active: isActive,
    queueStats: messageQueue.getStats(),
    config: config
  };
}
