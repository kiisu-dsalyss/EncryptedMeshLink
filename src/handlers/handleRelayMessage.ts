/**
 * Handle Relay Message
 * MIB-007: Enhanced Relay Handler - Main Relay Function
 */

import type { MeshDevice } from "@meshtastic/core";
import { DiscoveryClient } from '../discoveryClient';
import { CryptoService } from '../crypto/index';
import { tryLocalRelay, NodeInfo } from './tryLocalRelay';
import { tryRemoteRelay, RemoteNodeInfo } from './tryRemoteRelay';

export async function handleRelayMessage(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  remoteNodes: Map<number, RemoteNodeInfo>,
  myNodeNum: number | undefined,
  discoveryClient: DiscoveryClient | undefined,
  cryptoService: CryptoService,
  packet: any,
  targetIdentifier: string,
  message: string
): Promise<void> {
  console.log(`🔄 Bridge relay request: Forward "${message}" to "${targetIdentifier}"`);
  
  // Step 1: Check local nodes first (existing behavior)
  const localResult = await tryLocalRelay(
    device,
    knownNodes,
    myNodeNum,
    packet,
    targetIdentifier,
    message
  );
  
  if (localResult) {
    return; // Successfully relayed locally
  }
  
  // Step 2: Try remote relay via bridge
  const remoteResult = await tryRemoteRelay(
    discoveryClient,
    remoteNodes,
    cryptoService,
    targetIdentifier,
    message,
    packet.from
  );
  
  if (remoteResult) {
    console.log(`✅ Bridge relay successful to remote target "${targetIdentifier}"`);
  } else {
    console.log(`❌ Bridge relay failed: Target "${targetIdentifier}" not found locally or remotely`);
  }
}
