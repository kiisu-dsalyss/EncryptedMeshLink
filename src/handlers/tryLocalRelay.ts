/**
 * Try Local Relay
 * MIB-007: Enhanced Relay Handler - Local Relay Function
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { parseTargetIdentifier } from '../common/parsers';

export interface NodeInfo {
  num: number;
  user?: {
    longName?: string;
    shortName?: string;
  };
  position?: any;
  lastSeen: Date;
}

export async function tryLocalRelay(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  myNodeNum: number | undefined,
  packet: any,
  targetIdentifier: string,
  message: string
): Promise<boolean> {
  console.log(`📡 Attempting local relay to "${targetIdentifier}"`);
  
  // Try to find target in known local nodes
  let targetNode: NodeInfo | undefined;
  
  // Search by node number (if targetIdentifier is numeric)
  const targetInfo = parseTargetIdentifier(targetIdentifier);
  if (targetInfo.isNumeric) {
    const targetNum = targetInfo.value as number;
    
    // Check if we're trying to send to ourselves
    if (myNodeNum && targetNum === myNodeNum) {
      console.log(`⚠️ Cannot relay to self (node ${myNodeNum})`);
      return true; // Don't relay messages to ourselves
    }
    
    targetNode = knownNodes.get(targetNum);
  } else {
    // Search by name (case-insensitive)
    const targetIdentifierLower = targetIdentifier.toLowerCase();
    for (const [nodeNum, nodeInfo] of knownNodes.entries()) {
      const longName = nodeInfo.user?.longName?.toLowerCase();
      const shortName = nodeInfo.user?.shortName?.toLowerCase();
      
      if (longName === targetIdentifierLower || shortName === targetIdentifierLower) {
        // Check if we're trying to send to ourselves
        if (myNodeNum && nodeNum === myNodeNum) {
          console.log(`⚠️ Cannot relay to self (node ${myNodeNum})`);
          return true; // Don't relay messages to ourselves
        }
        
        targetNode = nodeInfo;
        break;
      }
    }
  }
  
  if (targetNode) {
    console.log(`✅ Found local target: ${targetNode.user?.longName || 'Unknown'} (${targetNode.num})`);
    
    try {
      // Get sender's name for attribution
      const senderNode = knownNodes.get(packet.from);
      const senderName = senderNode?.user?.longName || senderNode?.user?.shortName || `Node ${packet.from}`;
      
      // Format the relayed message with attribution
      const relayedMessage = `📩 From ${senderName}: ${message}`;
      
      // Send the message to the local node
      await device.sendText(relayedMessage, targetNode.num);
      console.log(`📨 Local relay successful to node ${targetNode.num}`);
      
      // Send confirmation back to the sender
      const targetName = targetNode.user?.longName || targetNode.user?.shortName || `Node ${targetNode.num}`;
      const confirmationMessage = `✅ Message relayed to ${targetName}`;
      await device.sendText(confirmationMessage, packet.from);
      console.log(`📤 Confirmation sent to sender (${packet.from})`);
      
      return true;
    } catch (error) {
      console.error(`❌ Local relay failed:`, error);
      return false;
    }
  }
  
  console.log(`❌ Target "${targetIdentifier}" not found in local nodes`);
  return false;
}
