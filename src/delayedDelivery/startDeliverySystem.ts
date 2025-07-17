import { DelayedDeliveryConfig, DeliverySystemState } from './types';
import { processQueuedMessages } from './processQueuedMessages';
import { createDefaultConfig } from './createDefaultConfig';

// Global delivery system state
let deliverySystem: DeliverySystemState | null = null;

/**
 * Start the delayed delivery system
 * Begins periodic processing of queued messages
 */
export function startDeliverySystem(
  isNodeOnline: (nodeId: number) => boolean,
  directSend: (nodeId: number, message: string) => Promise<boolean>,
  config?: Partial<DelayedDeliveryConfig>
): DelayedDeliveryConfig {
  if (deliverySystem?.isRunning) {
    console.warn("⚠️ Delayed delivery system is already running");
    return deliverySystem.config;
  }

  const finalConfig = { ...createDefaultConfig(), ...config };
  
  deliverySystem = {
    isRunning: true,
    config: finalConfig,
    stats: {
      totalQueued: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalExpired: 0,
      currentQueueSize: 0,
      nodeQueues: {}
    }
  };

  // Start the processing interval
  deliverySystem.intervalId = setInterval(async () => {
    await processQueuedMessages(finalConfig, isNodeOnline, directSend);
  }, finalConfig.retryInterval);

  console.log(`🚀 Delayed delivery system started (retry interval: ${finalConfig.retryInterval}ms)`);
  
  return finalConfig;
}

/**
 * Get the current delivery system state
 */
export function getDeliverySystemState(): DeliverySystemState | null {
  return deliverySystem;
}