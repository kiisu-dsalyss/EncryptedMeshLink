/**
 * Enhanced Relay Handler with Delayed Delivery Example
 * Shows how to integrate delayed delivery into relay operations
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from '../relayHandler/types';
import { MessageQueue } from '../messageQueue/index';
import { MessagePriority } from '../messageQueue/types';
import { findBestNodeMatch } from '../relayHandler/nodeMatching';
import { 
  sendMessage, 
  startDeliverySystem, 
  stopDeliverySystem,
  createDefaultConfig,
  DelayedDeliveryConfig 
} from '../delayedDelivery';

export class EnhancedRelayHandlerWithDelayedDelivery {
  private device: MeshDevice;
  private knownNodes: Map<number, NodeInfo>;
  private messageQueue: MessageQueue;
  private config: DelayedDeliveryConfig;
  private deliveryTimer?: NodeJS.Timeout;

  constructor(
    device: MeshDevice,
    knownNodes: Map<number, NodeInfo>,
    messageQueue: MessageQueue,
    config?: Partial<DelayedDeliveryConfig>
  ) {
    this.device = device;
    this.knownNodes = knownNodes;
    this.messageQueue = messageQueue;
    this.config = createDefaultConfig(config);
  }

  async start(): Promise<void> {
    this.deliveryTimer = await startDeliverySystem(
      this.device,
      this.knownNodes,
      this.messageQueue,
      this.config
    );
  }

  async stop(): Promise<void> {
    if (this.deliveryTimer) {
      stopDeliverySystem(this.deliveryTimer);
      this.deliveryTimer = undefined;
    }
  }

  /**
   * Handle relay message with automatic delayed delivery for offline nodes
   */
  async handleRelayMessage(
    packet: any,
    targetIdentifier: string,
    message: string
  ): Promise<void> {
    // Use enhanced node matching
    const matchResult = findBestNodeMatch(this.knownNodes, targetIdentifier);
    
    if (matchResult) {
      const { nodeId, node } = matchResult;
      
      // Use delayed delivery system
      const result = await sendMessage(
        this.device,
        this.knownNodes,
        this.messageQueue,
        this.config,
        packet.from,
        nodeId,
        message,
        MessagePriority.NORMAL
      );

      // Send confirmation to sender
      await this.device.sendText(result.reason, packet.from);
      
    } else {
      console.log(`❌ Target "${targetIdentifier}" not found in known nodes`);
      await this.device.sendText(
        `❌ Node "${targetIdentifier}" not found. Use 'nodes' to see available nodes.`, 
        packet.from
      );
    }
  }
}
