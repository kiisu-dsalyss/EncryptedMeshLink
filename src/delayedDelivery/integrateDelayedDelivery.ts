import { MeshDevice } from "@jsr/meshtastic__core";
import { DelayedDeliveryConfig, SendMessageOptions } from './types';
import { startDeliverySystem } from './startDeliverySystem';
import { sendMessage } from './sendMessage';
import { NodeManager } from '../nodeManager';

/**
 * Integration function to set up delayed delivery with the existing mesh system
 */
export function integrateDelayedDelivery(
  device: MeshDevice,
  nodeManager: NodeManager,
  config?: Partial<DelayedDeliveryConfig>
) {
  // Function to check if a node is online
  const isNodeOnline = (nodeId: number): boolean => {
    // Check if node was seen recently (within last 5 minutes)
    const recentThreshold = Date.now() - (5 * 60 * 1000);
    const knownNodes = nodeManager.getKnownNodes();
    const node = knownNodes.get(nodeId);
    
    if (!node || !node.lastSeen) {
      return false;
    }
    
    return node.lastSeen.getTime() > recentThreshold;
  };

  // Function to send message directly via mesh device
  const directSend = async (nodeId: number, message: string): Promise<boolean> => {
    try {
      await device.sendText(message, undefined, false, nodeId);
      return true;
    } catch (error) {
      console.warn(`Failed to send message to node ${nodeId}:`, error);
      return false;
    }
  };

  // Start the delivery system
  const finalConfig = startDeliverySystem(isNodeOnline, directSend, config);

  // Return enhanced send function that uses delayed delivery
  return {
    config: finalConfig,
    
    /**
     * Send a message with automatic delayed delivery if node is offline
     */
    sendMessageWithDelayedDelivery: async (
      targetNodeId: number,
      message: string,
      options?: SendMessageOptions
    ) => {
      return sendMessage(targetNodeId, message, isNodeOnline, directSend, options);
    },

    /**
     * Check if a node is currently online
     */
    isNodeOnline,

    /**
     * Send message directly without delay (bypass delayed delivery)
     */
    sendDirectly: directSend
  };
}