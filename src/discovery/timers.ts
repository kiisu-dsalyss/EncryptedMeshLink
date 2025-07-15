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
        await registerStation(config); // Re-register to update last_seen
      }
    } catch (error) {
      onError?.(new Error(`Heartbeat failed: ${error}`));
    }
  }, intervalMs);

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
      const currentPeers = await discoverPeers(config);
      processPeerChanges(currentPeers, knownPeers, onPeerDiscovered, onPeerLost);
    } catch (error) {
      onError?.(new Error(`Peer discovery failed: ${error}`));
    }
  }, intervalMs);

  return timer;
}

export function stopTimer(timer?: NodeJS.Timeout): void {
  if (timer) {
    clearInterval(timer);
  }
}
