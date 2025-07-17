/**
 * Start Delivery System Function
 * Initialize and start the delayed message delivery system
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from '../relayHandler/types';
import { MessageQueue } from '../messageQueue/index';
import { DelayedDeliveryConfig } from './types';
import { processQueuedMessages } from './processQueuedMessages';

export async function startDeliverySystem(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  messageQueue: MessageQueue,
  config: DelayedDeliveryConfig
): Promise<NodeJS.Timeout> {
  console.log('📬 Starting delayed message delivery system...');
  
  // Start periodic delivery attempts
  const deliveryTimer = setInterval(
    () => processQueuedMessages(device, knownNodes, messageQueue, config),
    config.deliveryRetryInterval * 1000
  );

  console.log(`✅ Delayed delivery active (checking every ${config.deliveryRetryInterval}s)`);
  
  return deliveryTimer;
}
