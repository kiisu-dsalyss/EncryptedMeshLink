/**
 * Handle Peer Discovery Events
 * MIB-007: Enhanced Relay Handler - Peer Event Handlers
 */

import { DiscoveredPeer } from '../discoveryClient';
import { extractNumericId } from '../common';

export interface RemoteNodeInfo {
  nodeId: number;
  stationId: string;
  lastSeen: Date;
}

export function handlePeerDiscovered(
  remoteNodes: Map<number, RemoteNodeInfo>,
  peer: DiscoveredPeer
): void {
  console.log(`🆕 Bridge discovered new peer: ${peer.stationId}`);
  
  // TODO: Parse encrypted contact info to extract remote node info
  // For now, create a placeholder remote node entry
  const remoteNodeId = extractNumericId(peer.stationId);
  
  const remoteNodeInfo: RemoteNodeInfo = {
    nodeId: remoteNodeId,
    stationId: peer.stationId,
    lastSeen: new Date(peer.lastSeen)
  };
  
  remoteNodes.set(remoteNodeId, remoteNodeInfo);
  console.log(`📝 Added remote node ${remoteNodeId} from station ${peer.stationId}`);
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
