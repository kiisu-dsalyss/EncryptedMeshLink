/**
 * Discovery Timer Functions
 * Handles heartbeat and discovery interval timers
 */

import { StationConfig } from '../config/types';
import { registerStation } from './registration';
import { discoverPeers, processPeerChanges } from './peers';
import { DiscoveredPeer } from './types';

export function startHeartbeat(
  config: StationConfig,
  isRegistered: () => boolean,
  onError?: (error: Error) => void
): NodeJS.Timeout {
  const intervalMs = config.discovery.checkInterval * 1000;
  
  const timer = setInterval(async () => {
    try {
      if (isRegistered()) {
        console.log(`💓 Sending heartbeat...`);
        await registerStation(config); // Re-register to update last_seen
      }
    } catch (error) {
      console.warn(`⚠️ Heartbeat failed:`, error);
      onError?.(new Error(`Heartbeat failed: ${error}`));
    }
  }, intervalMs);

  console.log(`💓 Heartbeat started (${config.discovery.checkInterval}s interval)`);
  return timer;
}

export function startPeerDiscovery(
  config: StationConfig,
  knownPeers: Map<string, DiscoveredPeer>,
  onPeerDiscovered?: (peer: DiscoveredPeer) => void,
  onPeerLost?: (stationId: string) => void,
  onError?: (error: Error) => void
): NodeJS.Timeout {
  const intervalMs = config.discovery.checkInterval * 1000;
  
  const timer = setInterval(async () => {
    try {
      console.log(`🔍 Discovering peers...`);
      const currentPeers = await discoverPeers(config);
      processPeerChanges(currentPeers, knownPeers, onPeerDiscovered, onPeerLost);
    } catch (error) {
      console.warn(`⚠️ Peer discovery failed:`, error);
      onError?.(new Error(`Peer discovery failed: ${error}`));
    }
  }, intervalMs);

  console.log(`🔍 Peer discovery started (${config.discovery.checkInterval}s interval)`);
  return timer;
}

export function stopTimer(timer?: NodeJS.Timeout): void {
  if (timer) {
    clearInterval(timer);
  }
}
