/**
 * Initialize Discovery Bridge
 * MIB-007: Enhanced Relay Handler - Initialize Bridge Function
 */

import { DiscoveryClientModular, DiscoveredPeer } from '../discovery/index';
import { StationConfig } from '../config/types';

export async function initializeBridge(
  config: StationConfig,
  onPeerDiscovered: (peer: DiscoveredPeer) => void,
  onPeerLost: (stationId: string) => void,
  onError: (error: Error) => void
): Promise<DiscoveryClientModular> {
  console.log("🌉 Initializing EncryptedMeshLink bridge services...");
  
  try {
    const discoveryClient = new DiscoveryClientModular(config);
    
    // Set up discovery event handlers
    discoveryClient.on('peerDiscovered', onPeerDiscovered);
    discoveryClient.on('peerLost', onPeerLost);
    discoveryClient.on('error', onError);
    
    // Start discovery client
    await discoveryClient.start();
    
    console.log("✅ Bridge services initialized successfully");
    return discoveryClient;
  } catch (error) {
    console.error("❌ Failed to initialize bridge services:", error);
    throw error;
  }
}
