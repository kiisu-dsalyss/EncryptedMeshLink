/**
 * Peer Discovery Functions
 * Handles discovering and managing peers
 */

import { StationConfig } from '../config/types';
import { DiscoveredPeer } from './types';
import { makeRequest } from './request';

export async function discoverPeers(config: StationConfig): Promise<DiscoveredPeer[]> {
  try {
    const response = await makeRequest(config, 'GET', '?peers=true');
    
    if (!response.success) {
      throw new Error(`Peer discovery failed: ${response.error}`);
    }

    const peers: DiscoveredPeer[] = response.data.peers || [];
    
    // Filter out ourselves
    const remotePeers = peers.filter(peer => peer.stationId !== config.stationId);
    
    return remotePeers;
  } catch (error) {
    throw new Error(`Peer discovery error: ${error}`);
  }
}

export function processPeerChanges(
  currentPeers: DiscoveredPeer[],
  knownPeers: Map<string, DiscoveredPeer>,
  onPeerDiscovered?: (peer: DiscoveredPeer) => void,
  onPeerLost?: (stationId: string) => void
): void {
  // Track current peer IDs
  const currentPeerIds = new Set(currentPeers.map(p => p.stationId));
  const knownPeerIds = new Set(knownPeers.keys());

  // Find new peers
  const newPeers = currentPeers.filter(peer => !knownPeers.has(peer.stationId));
  
  // Find lost peers
  const lostPeerIds = Array.from(knownPeerIds).filter(id => !currentPeerIds.has(id));

  // Update known peers map
  for (const peer of currentPeers) {
    knownPeers.set(peer.stationId, peer);
  }

  for (const lostId of lostPeerIds) {
    knownPeers.delete(lostId);
  }

  // Notify about new peers
  for (const peer of newPeers) {
    onPeerDiscovered?.(peer);
  }

  // Notify about lost peers
  for (const lostId of lostPeerIds) {
    onPeerLost?.(lostId);
  }
}
