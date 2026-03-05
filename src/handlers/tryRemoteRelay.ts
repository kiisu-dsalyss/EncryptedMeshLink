/**
 * Try Remote Relay
 * MIB-007: Enhanced Relay Handler - Remote Relay Function with Crypto Integration
 */

import { DiscoveryClientModular, DiscoveredPeer } from '../discovery/index';
import { CryptoService } from '../crypto/index';
import { parseTargetIdentifier } from '../common/parsers';
import { RemoteNodeInfo } from './peerEvents';

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
  
  // Step 1: Find target in remote nodes with best-match logic
  let targetRemoteNode: RemoteNodeInfo | undefined;
  
  const targetResult = parseTargetIdentifier(targetIdentifier);
  const targetLower = targetIdentifier.toLowerCase().trim();
  
  if (targetResult.isNumeric) {
    // Direct numeric match (node ID)
    const targetNum = targetResult.value as number;
    
    // Try exact match first
    targetRemoteNode = remoteNodes.get(targetNum);
    
    // If no exact match, try prefix matching (e.g., "464" matches "464130339")
    if (!targetRemoteNode) {
      const targetStr = targetNum.toString();
      const candidates: { node: RemoteNodeInfo; score: number }[] = [];
      
      for (const [nodeId, nodeInfo] of remoteNodes.entries()) {
        const nodeIdStr = nodeId.toString();
        
        // Check if node ID starts with target prefix
        if (nodeIdStr.startsWith(targetStr)) {
          // Prefer longer prefix matches (more specific)
          const score = targetStr.length * 100 + nodeId;
          candidates.push({ node: nodeInfo, score });
        }
      }
      
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score); // Sort by score descending
        targetRemoteNode = candidates[0].node;
        console.log(`✅ Found remote target by node ID prefix: ${targetRemoteNode.displayName} (#${targetRemoteNode.nodeId})`);
      }
    } else {
      console.log(`✅ Found remote target by exact node ID: ${targetRemoteNode.displayName} (#${targetNum})`);
    }
  } else {
    // Try to find best match by name (display name, short name, or partial match)
    const candidates: { node: RemoteNodeInfo; score: number }[] = [];
    
    for (const [nodeId, nodeInfo] of remoteNodes.entries()) {
      const displayName = nodeInfo.displayName?.toLowerCase() || '';
      const shortName = nodeInfo.shortName?.toLowerCase() || '';
      const nodeIdStr = nodeId.toString();
      
      let score = 0;
      
      // Exact match on display name (highest priority)
      if (displayName === targetLower) {
        score = 1000;
      }
      // Exact match on short name
      else if (shortName === targetLower) {
        score = 900;
      }
      // Exact match on node ID (as string)
      else if (nodeIdStr === targetLower) {
        score = 950;
      }
      // Partial match at start of display name
      else if (displayName.startsWith(targetLower)) {
        score = 500;
      }
      // Partial match at start of short name
      else if (shortName.startsWith(targetLower)) {
        score = 450;
      }
      // Partial match anywhere in display name
      else if (displayName.includes(targetLower)) {
        score = 300;
      }
      // Partial match anywhere in short name
      else if (shortName.includes(targetLower)) {
        score = 250;
      }
      
      if (score > 0) {
        candidates.push({ node: nodeInfo, score });
      }
    }
    
    // Use the best matching candidate
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score); // Sort by score descending
      targetRemoteNode = candidates[0].node;
      
      const matchType = 
        targetRemoteNode.displayName?.toLowerCase() === targetLower ? 'display name' :
        targetRemoteNode.shortName?.toLowerCase() === targetLower ? 'short name' :
        'partial match';
      
      console.log(`✅ Found remote target by ${matchType}: ${targetRemoteNode.displayName} (#${targetRemoteNode.nodeId})`);
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
          await device.sendText(autoReplyMessage, fromNodeId);
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
