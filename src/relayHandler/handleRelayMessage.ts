/**
 * Handle Relay Message Function
 * Handles forwarding messages to target nodes in the mesh network
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './types';
import { parseTargetIdentifier } from '../common';

export async function handleRelayMessage(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  packet: any,
  targetIdentifier: string,
  message: string
): Promise<void> {
  console.log(`🔄 Relay request: Forward "${message}" to "${targetIdentifier}"`);
  
  // Find target node by ID or name
  let targetNodeId: number | undefined;
  let targetNode: NodeInfo | undefined;
  
  // Parse target identifier
  const targetResult = parseTargetIdentifier(targetIdentifier);
  if (targetResult.isNumeric) {
    targetNodeId = targetResult.value as number;
    targetNode = knownNodes.get(targetNodeId);
  } else {
    // Search by name (longName or shortName)
    knownNodes.forEach((node, nodeId) => {
      if (!targetNodeId) { // Only set if we haven't found one yet
        const longName = node.user?.longName?.toLowerCase() || '';
        const shortName = node.user?.shortName?.toLowerCase() || '';
        
        if (longName.includes(targetIdentifier) || shortName.includes(targetIdentifier)) {
          targetNodeId = nodeId;
          targetNode = node;
        }
      }
    });
  }
  
  if (targetNodeId && targetNode) {
    console.log(`📤 Relaying to: ${targetNode.user?.longName || 'Unknown'} (${targetNodeId})`);
    
    try {
      // Resolve sender name and include ID for app linking
      const senderNode = knownNodes.get(packet.from);
      const senderName = senderNode?.user?.longName || senderNode?.user?.shortName || `Node-${packet.from.toString().slice(-4)}`;
      
      // Put ID first for clickable links, then name for readability
      const relayMessage = `[From ${packet.from} (${senderName})]: ${message}`;
      await device.sendText(relayMessage, targetNodeId);
      console.log("✅ Message relayed successfully");
      
      // Send confirmation back to sender
      await device.sendText(`✅ Message relayed to ${targetNode.user?.longName || targetNodeId}`, packet.from);
    } catch (error) {
      console.error("❌ Failed to relay message:", error);
      await device.sendText(`❌ Failed to relay message to ${targetIdentifier}`, packet.from);
    }
  } else {
    console.log(`❌ Target "${targetIdentifier}" not found in known nodes`);
    await device.sendText(`❌ Node "${targetIdentifier}" not found. Use 'nodes' to see available nodes.`, packet.from);
  }
}
