/**
 * Handle Peer Discovery Events
 * MIB-007: Enhanced Relay Handler - Peer Event Handlers
 */

import { DiscoveredPeer } from '../discovery/index';

export interface RemoteNodeInfo {
  nodeId: number;
  stationId: string;
  lastSeen: Date;
  displayName: string;
  shortName: string;
}

// Counter for generating sequential remote node names
let remoteNodeCounter = 1;

export function handlePeerDiscovered(
  remoteNodes: Map<number, RemoteNodeInfo>,
  peer: DiscoveredPeer
): void {
  console.log(`🆕 Bridge discovered new peer: ${peer.stationId}`);
  
  // Generate a friendly remote node ID and name
  const remoteNodeId = 5000 + remoteNodeCounter; // Start remote nodes at 5000+ to avoid conflicts
  const displayName = `r${remoteNodeCounter}Node`;
  const shortName = `r${remoteNodeCounter}aa`;
  
  const remoteNodeInfo: RemoteNodeInfo = {
    nodeId: remoteNodeId,
    stationId: peer.stationId,
    lastSeen: new Date(peer.lastSeen),
    displayName: displayName,
    shortName: shortName
  };
  
  remoteNodes.set(remoteNodeId, remoteNodeInfo);
  console.log(`📝 Added remote node ${remoteNodeId} (${displayName}) from station ${peer.stationId}`);
  
  remoteNodeCounter++;
}

export function handlePeerLost(
  remoteNodes: Map<number, RemoteNodeInfo>,
  stationId: string
): void {
  console.log(`❌ Bridge lost peer: ${stationId}`);
  
  // Remove all remote nodes from this station
  for (const [nodeId, remoteNode] of remoteNodes.entries()) {
    if (remoteNode.stationId === stationId) {
      remoteNodes.delete(nodeId);
      console.log(`🗑️ Removed remote node ${nodeId} from station ${stationId}`);
    }
  }
}

export function handleDiscoveryError(error: Error): void {
  console.error(`⚠️ Bridge discovery error:`, error);
  // Could implement retry logic or fallback behaviors here
}
