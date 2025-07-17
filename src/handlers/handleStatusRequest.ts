import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './tryLocalRelay';
import { RemoteNodeInfo } from './peerEvents';
import { DiscoveryClientModular } from '../discovery/index';
import { sendMessage } from '../utils/messageSplitter';

/**
 * Handle status request from mesh network
 */
export async function handleStatusRequest(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  remoteNodes: Map<number, RemoteNodeInfo>,
  myNodeNum: number | undefined,
  discoveryClient: DiscoveryClientModular | undefined,
  packet: any
): Promise<void> {
  console.log("📊 Handling status request");
  
  try {
    const localNodeCount = knownNodes.size;
    const remoteNodeCount = remoteNodes.size;
    const totalNodes = localNodeCount + remoteNodeCount;
    
    // Get station connection count from discovery client
    const stationCount = discoveryClient ? discoveryClient.knownPeers.length : 0;
    
    // Create a concise status message with station connections
    const statusLines = [
      "🌉 Bridge: ✅ ACTIVE",
      "🔗 Stations: " + stationCount,
      "🏠 Local: " + localNodeCount,
      "🌐 Remote: " + remoteNodeCount,
      "📡 Total: " + totalNodes + " nodes"
    ]
    
    const statusMessage = statusLines.join('\n');
    
    if (packet.from && packet.from !== myNodeNum) {
      await sendMessage(device, statusMessage, packet.from);
      console.log(`📤 Sent concise status to node ${packet.from}`);
    }
    
  } catch (error) {
    console.error("❌ Failed to handle status request:", error);
    
    // Send error response if possible
    if (packet.from && packet.from !== myNodeNum) {
      try {
        await sendMessage(device, "❌ Status request failed", packet.from);
      } catch (sendError) {
        console.error("❌ Failed to send error response:", sendError);
      }
    }
  }
}