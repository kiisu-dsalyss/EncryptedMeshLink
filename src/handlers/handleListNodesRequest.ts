/**
 * Handle List Nodes Request
 * MIB-007: Enhanced Relay Handler - List Nodes Request Handler
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './tryLocalRelay';
import { RemoteNodeInfo } from './peerEvents';

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
  console.log("📋 Handling list nodes request");
  
  try {
    const nodeLines: string[] = [];
    
    // Add local nodes (compact format)
    if (knownNodes.size > 0) {
      const sortedLocal = Array.from(knownNodes.entries())
        .filter(([nodeNum]) => nodeNum !== myNodeNum && nodeNum !== packet.from) // Filter out self and requester
        .sort((a, b) => a[0] - b[0]);
      
      for (const [nodeNum, nodeInfo] of sortedLocal) {
        const longName = nodeInfo.user?.longName || `Node-${nodeNum}`;
        const shortName = nodeInfo.user?.shortName || "📱";
        nodeLines.push(`📱 ${longName} | ${shortName} | ${nodeNum}`);
      }
    }
    
    // Add remote nodes if any
    if (remoteNodes.size > 0) {
      const sortedRemote = Array.from(remoteNodes.entries()).sort((a, b) => a[0] - b[0]);
      
      for (const [nodeNum, nodeInfo] of sortedRemote) {
        nodeLines.push(`🌍 ${nodeInfo.displayName} | ${nodeInfo.shortName} | ${nodeNum}`);
      }
    }
    
    // Create a single compact message
    let message: string;
    if (nodeLines.length === 0) {
      message = "📭 No nodes available";
    } else {
      // Get a sample node ID for the example
      const sampleNodeId = Array.from(knownNodes.keys()).find(id => id !== myNodeNum && id !== packet.from) 
        || Array.from(remoteNodes.keys())[0] 
        || '123456';
      
      message = `📡 Nodes (${nodeLines.length}):\n${nodeLines.join('\n')}\n\n💬 Usage: @{nodeId} message\nExample: @${sampleNodeId} hello`;
    }
    
    if (packet.from && packet.from !== myNodeNum) {
      await device.sendText(message, packet.from);
      console.log(`📤 Sent compact node list to ${packet.from} (${knownNodes.size + remoteNodes.size} total nodes)`);
    }
    
  } catch (error) {
    console.error("❌ Failed to handle list nodes request:", error);
    
    // Send error response if possible
    if (packet.from && packet.from !== myNodeNum) {
      try {
        await device.sendText("❌ Node list request failed", packet.from);
      } catch (sendError) {
        console.error("❌ Failed to send error response:", sendError);
      }
    }
  }
}
