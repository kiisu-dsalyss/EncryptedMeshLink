/**
 * Integrate Delayed Delivery Function
 * Integration helper to add delayed delivery to relay handlers
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from '../relayHandler/types';
import { MessageQueue } from '../messageQueue/index';
import { MessagePriority } from '../messageQueue/types';
import { sendMessage } from './sendMessage';
import { DelayedDeliveryConfig, DelayedDeliveryResult } from './types';

export async function integrateDelayedDelivery(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  messageQueue: MessageQueue,
  config: DelayedDeliveryConfig,
  fromNode: number,
  targetNodeId: number,
  message: string,
  priority: MessagePriority = MessagePriority.NORMAL
): Promise<DelayedDeliveryResult> {
  return sendMessage(
    device,
    knownNodes,
    messageQueue,
    config,
    fromNode,
    targetNodeId,
    message,
    priority
  );
}
