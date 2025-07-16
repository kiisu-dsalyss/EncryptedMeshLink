/**
 * Discover Peers
 * MIB-007: Discovery Client - Peer Discovery Function
 */

import { DiscoveryResponse, DiscoveredPeer } from './types';

/**
 * Discover available peers from discovery server
 */
export async function discoverPeers(
  makeRequest: (method: string, path: string, body?: any) => Promise<DiscoveryResponse>
): Promise<DiscoveredPeer[]> {
  try {
    const response = await makeRequest('GET', '?peers=true');
    
    if (response.success && response.data) {
      const rawPeers = response.data.peers || [];
      console.log(`🔍 Discovered ${rawPeers.length} peers`);
      
      // Transform snake_case to camelCase
      return rawPeers.map((peer: any) => ({
        stationId: peer.station_id,
        encryptedContactInfo: peer.encrypted_contact_info,
        publicKey: peer.public_key,
        lastSeen: peer.last_seen
      }));
    } else {
      console.log(`ℹ️ No peers discovered: ${response.error || 'Empty response'}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Peer discovery error:`, error);
    return [];
  }
}
