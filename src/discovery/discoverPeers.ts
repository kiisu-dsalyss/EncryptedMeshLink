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
    const response = await makeRequest('GET', '/api/discovery.php?peers=true');
    
    if (response.success && response.data) {
      const rawPeers = response.data.peers || [];
      console.log(`🔍 Discovered ${rawPeers.length} peers`);
      return rawPeers;
    } else {
      console.log(`ℹ️ No peers discovered: ${response.error || 'Empty response'}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Peer discovery error:`, error);
    return [];
  }
}
