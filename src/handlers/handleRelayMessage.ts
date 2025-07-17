/**
 * Handle Relay Message
 * MIB-007: Enhanced Relay Handler - Main Relay Function
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { DiscoveryClientModular } from '../discovery/index';
import { CryptoService } from '../crypto/index';
import { tryLocalRelay, NodeInfo } from './tryLocalRelay';
import { tryRemoteRelay } from './tryRemoteRelay';
import { RemoteNodeInfo } from './peerEvents';
import { sendMessage } from '../utils/messageSplitter';

export async function handleRelayMessage(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  remoteNodes: Map<number, RemoteNodeInfo>,
  myNodeNum: number | undefined,
  discoveryClient: DiscoveryClientModular | undefined,
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
    packet.from,
    device  // Pass device for auto-reply functionality
  );
  
  if (remoteResult) {
    console.log(`✅ Bridge relay successful to remote target "${targetIdentifier}"`);
    
    // Send confirmation back to sender for remote relay
    try {
      const confirmationMessage = `✅ Message relayed to remote target "${targetIdentifier}"`;
      await sendMessage(device, confirmationMessage, packet.from);
      console.log(`📤 Remote relay confirmation sent to sender (${packet.from})`);
    } catch (error) {
      console.error(`❌ Failed to send remote relay confirmation:`, error);
    }
  } else {
    console.log(`❌ Bridge relay failed: Target "${targetIdentifier}" not found locally or remotely`);
    
    // Send failure message back to sender
    try {
      const failureMessage = `❌ Relay failed: Target "${targetIdentifier}" not found`;
      await sendMessage(device, failureMessage, packet.from);
      console.log(`📤 Failure notification sent to sender (${packet.from})`);
    } catch (error) {
      console.error(`❌ Failed to send error message to sender:`, error);
    }
  }
}
