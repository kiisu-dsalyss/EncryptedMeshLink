/**
 * Handle List Nodes Request
 * MIB-007: Enhanced Relay Handler - List Nodes Request Handler
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './tryLocalRelay';
import { RemoteNodeInfo } from './tryRemoteRelay';

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
    const nodeList: string[] = [];
    
    // Add local nodes
    nodeList.push("🏠 Local Nodes:");
    for (const [nodeNum, nodeInfo] of knownNodes) {
      const name = nodeInfo.user?.longName || `Node-${nodeNum}`;
      nodeList.push(`  • ${name} (${nodeNum})`);
    }
    
    // Add remote nodes
    if (remoteNodes.size > 0) {
      nodeList.push("🌐 Remote Nodes:");
      for (const [nodeNum, nodeInfo] of remoteNodes) {
        nodeList.push(`  • Node-${nodeInfo.nodeId} (${nodeNum}) via ${nodeInfo.stationId}`);
      }
    }
    
    const message = nodeList.length > 1 ? nodeList.join('\n') : "📭 No nodes available for relay";
    
    if (packet.from && packet.from !== myNodeNum) {
      // Split long messages if needed (mesh networks have message size limits)
      const maxLength = 200;
      if (message.length <= maxLength) {
        await device.sendText(message, packet.from);
      } else {
        // Send in chunks
        const chunks = message.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [message];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = `(${i + 1}/${chunks.length}) ${chunks[i]}`;
          await device.sendText(chunk, packet.from);
          // Small delay between chunks
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`📤 Sent node list to ${packet.from} (${nodeList.length - 1} nodes)`);
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
