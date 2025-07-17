/**
 * Try Remote Relay
 * MIB-007: Enhanced Relay Handler - Remote Relay Function with Crypto Integration
 */

import { DiscoveryClientModular, DiscoveredPeer } from '../discovery/index';
import { CryptoService } from '../crypto/index';
import { parseTargetIdentifier } from '../common/parsers';
import { RemoteNodeInfo } from './peerEvents';
import { sendMessage } from '../utils/messageSplitter';

export async function tryRemoteRelay(
  discoveryClient: DiscoveryClientModular | undefined,
  remoteNodes: Map<number, RemoteNodeInfo>,
  cryptoService: CryptoService,
  targetIdentifier: string,
  message: string,
  fromNodeId: number,
  device?: any  // Add device parameter for sending auto-reply
): Promise<boolean> {
  if (!discoveryClient) {
    console.log(`❌ Discovery client not available for remote relay`);
    return false;
  }
  
  console.log(`🌐 Attempting remote relay to "${targetIdentifier}"`);
  
  // Step 1: Find target in remote nodes
  let targetRemoteNode: RemoteNodeInfo | undefined;
  
  const targetResult = parseTargetIdentifier(targetIdentifier);
  if (targetResult.isNumeric) {
    // Try to find by node ID
    targetRemoteNode = remoteNodes.get(targetResult.value as number);
  } else {
    // Try to find by shortName (like "r1aa", "r2aa", etc.) or displayName (like "r1Node", "r2Node", etc.)
    // Case-insensitive matching
    const targetLower = targetIdentifier.toLowerCase();
    for (const [nodeId, nodeInfo] of remoteNodes.entries()) {
      if (nodeInfo.shortName.toLowerCase() === targetLower || nodeInfo.displayName.toLowerCase() === targetLower) {
        targetRemoteNode = nodeInfo;
        break;
      }
    }
  }
  
  if (!targetRemoteNode) {
    console.log(`❌ Target "${targetIdentifier}" not found in remote nodes`);
    return false;
  }
  
  try {
    // Step 2: Discover active peers
    const peers = await discoveryClient.discoverPeers();
    const targetPeer = peers.find(peer => peer.stationId === targetRemoteNode!.stationId);
    
    if (!targetPeer) {
      console.log(`❌ Remote station "${targetRemoteNode.stationId}" not currently available`);
      return false;
    }
    
    // Step 3: Prepare encrypted message using crypto service
    const relayMessage = {
      type: 'relay',
      fromNodeId,
      targetNodeId: targetRemoteNode.nodeId,
      message,
      timestamp: Date.now()
    };
    
    // Step 4: Encrypt the relay message for P2P transmission
    const encryptedMessage = await cryptoService.encryptMessage(
      JSON.stringify(relayMessage),
      targetPeer.publicKey
    );
    
    console.log(`🔐 Encrypted relay message for station ${targetRemoteNode.stationId}`);
    
    // Step 5: Send to remote station via P2P (TODO: implement P2P transport)
    // For now, log what would be sent and simulate auto-reply
    console.log(`🚀 Would send encrypted message to ${targetPeer.stationId} at ${targetPeer.publicKey.substring(0, 20)}...`);
    console.log(`📊 Message size: ${encryptedMessage.length} bytes`);
    
    // TESTING: Simulate auto-reply from remote node
    setTimeout(async () => {
      console.log(`🤖 [AUTO-REPLY] Remote node ${targetRemoteNode!.displayName} (${targetRemoteNode!.shortName}) auto-replying...`);
      const autoReplyMessage = `🤖 Auto-reply from ${targetRemoteNode!.displayName}: "Received your message: '${message}'" - This is a test response!`;
      
      // Log the auto-reply for debugging
      console.log(`📥 [SIMULATED] ${autoReplyMessage}`);
      
      // Actually send the auto-reply back through the mesh device
      if (device) {
        try {
          await sendMessage(device, autoReplyMessage, fromNodeId);
          console.log(`📤 Auto-reply sent to mesh node ${fromNodeId}`);
        } catch (error) {
          console.error(`❌ Failed to send auto-reply:`, error);
        }
      }
    }, 2000); // 2 second delay to simulate network latency
    
    return true;
  } catch (error) {
    console.error(`❌ Remote relay failed:`, error);
    return false;
  }
}
