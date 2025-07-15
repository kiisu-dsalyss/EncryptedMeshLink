/**
 * Try Local Relay
 * MIB-007: Enhanced Relay Handler - Local Relay Function
 */

import type { MeshDevice } from "@meshtastic/core";
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
  
  // Check if we're trying to send to ourselves
  if (myNodeNum && packet.to === myNodeNum) {
    console.log(`⚠️ Ignoring self-sent message from node ${packet.from}`);
    return true; // Don't relay messages to ourselves
  }
  
  // Try to find target in known local nodes
  let targetNode: NodeInfo | undefined;
  
  // Search by node number (if targetIdentifier is numeric)
  const targetInfo = parseTargetIdentifier(targetIdentifier);
  if (targetInfo.isNumeric) {
    const targetNum = targetInfo.value as number;
    targetNode = knownNodes.get(targetNum);
  } else {
    // Search by name
    for (const [nodeNum, nodeInfo] of knownNodes.entries()) {
      if (nodeInfo.user?.longName === targetIdentifier || 
          nodeInfo.user?.shortName === targetIdentifier) {
        targetNode = nodeInfo;
        break;
      }
    }
  }
  
  if (targetNode) {
    console.log(`✅ Found local target: ${targetNode.user?.longName || 'Unknown'} (${targetNode.num})`);
    
    try {
      // Send the message to the local node
      await device.sendText(message, targetNode.num);
      console.log(`📨 Local relay successful to node ${targetNode.num}`);
      return true;
    } catch (error) {
      console.error(`❌ Local relay failed:`, error);
      return false;
    }
  }
  
  console.log(`❌ Target "${targetIdentifier}" not found in local nodes`);
  return false;
}
