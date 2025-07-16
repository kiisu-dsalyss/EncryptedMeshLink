/**
 * Handle Status Request
 * MIB-007: Enhanced Relay Handler - Status Request Handler
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './tryLocalRelay';
import { RemoteNodeInfo } from './tryRemoteRelay';

/**
 * Handle status request from mesh network
 */
export async function handleStatusRequest(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  remoteNodes: Map<number, RemoteNodeInfo>,
  myNodeNum: number | undefined,
  packet: any
): Promise<void> {
  console.log("📊 Handling status request");
  
  try {
    const localNodeCount = knownNodes.size;
    const remoteNodeCount = remoteNodes.size;
    const totalNodes = localNodeCount + remoteNodeCount;
    
    const statusMessage = `🔄 Relay Status: ${totalNodes} total nodes (${localNodeCount} local, ${remoteNodeCount} remote) | Bridge: Active`;
    
    if (packet.from && packet.from !== myNodeNum) {
      await device.sendText(statusMessage, packet.from);
      console.log(`📤 Sent status to node ${packet.from}: ${statusMessage}`);
    }
    
  } catch (error) {
    console.error("❌ Failed to handle status request:", error);
    
    // Send error response if possible
    if (packet.from && packet.from !== myNodeNum) {
      try {
        await device.sendText("❌ Status request failed", packet.from);
      } catch (sendError) {
        console.error("❌ Failed to send error response:", sendError);
      }
    }
  }
}
