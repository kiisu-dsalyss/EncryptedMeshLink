/**
 * Handle List Nodes Request
 * MIB-007: Enhanced Relay Handler - List Nodes Request Handler
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './tryLocalRelay';
import { RemoteNodeInfo } from './peerEvents';
import { sendMessage } from '../utils/messageSplitter';

/**
 * Handle list nodes request from mesh network
 */
export async function handleListNodesRequest(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  remoteNodes: Map<number, RemoteNodeInfo>,
  myNodeNum: number | undefined,
  packet: any
): Promise<void> {
  console.log(`📋 Handling list nodes request from ${packet.from}, knownNodes: ${knownNodes.size}, remoteNodes: ${remoteNodes.size}`);
  
  try {
    // Node line template function
    function formatNodeLine(longName: string, shortName: string, nodeNum: number): string {
      const nodeIdStr = `id:0${nodeNum}`;
      return `📱 ${longName} | ${shortName} | ${nodeIdStr}`;
    }

    // Create verbose node list
    const nodeLines: string[] = [];
    // Add local nodes (using template)
    if (knownNodes.size > 0) {
      const sortedLocal = Array.from(knownNodes.entries())
        .filter(([nodeNum]) => nodeNum !== myNodeNum && nodeNum !== packet.from)
        .sort((a, b) => a[0] - b[0]);
      for (const [nodeNum, nodeInfo] of sortedLocal) {
        const longName = nodeInfo.user?.longName || `Node-${nodeNum}`;
        const shortName = nodeInfo.user?.shortName || "?";
        nodeLines.push(formatNodeLine(longName, shortName, nodeNum));
      }
    }
    // Add remote nodes (using template)
    if (remoteNodes.size > 0) {
      const sortedRemote = Array.from(remoteNodes.entries()).sort((a, b) => a[0] - b[0]);
      for (const [nodeNum, nodeInfo] of sortedRemote) {
        const longName = nodeInfo.displayName || `Remote-${nodeNum}`;
        const shortName = nodeInfo.shortName || "?";
        nodeLines.push(formatNodeLine(longName, shortName, nodeNum));
      }
    }
    // Create message
    let message: string;
    if (nodeLines.length === 0) {
      message = "📭 No nodes available";
    } else {
      message = nodeLines.join('\n');
    }
    
    // Use the utility to send message (automatically handles splitting)
    if (packet.from && packet.from !== myNodeNum) {
      await sendMessage(device, message, packet.from);
      console.log(`✅ Sent node list to ${packet.from} (${nodeLines.length} total nodes)`);
    } else {
      console.log(`📋 DEBUG: Skipping send - packet.from: ${packet.from}, myNodeNum: ${myNodeNum}`);
    }
    
  } catch (error) {
    console.error("❌ Failed to handle list nodes request:", error);
    
    // Send error response if possible
    if (packet.from && packet.from !== myNodeNum) {
      try {
        await sendMessage(device, "❌ Node list request failed", packet.from);
      } catch (sendError) {
        console.error("❌ Failed to send error response:", sendError);
      }
    }
  }
}
