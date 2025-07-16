/**
 * Handle Nodes Request Function
 * Handles requests for listing available nodes in the mesh network
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './types';

export async function handleNodesRequest(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  packet: any,
  myNodeNum?: number
): Promise<void> {
  // Send list of available nodes
  const nodeList = Array.from(knownNodes.values())
    .filter(node => node.num !== myNodeNum)
    .map(node => `${node.num}: ${node.user?.longName || 'Unknown'}`)
    .join('\n');
  
  const response = nodeList.length > 0 
    ? `Available nodes:\n${nodeList}\n\nSend: @{nodeId} {message} to relay`
    : "No other nodes found in mesh network";
  
  await device.sendText(response, packet.from);
}
