/**
 * Handle Relay Message Function
 * Handles forwarding messages to target nodes in the mesh network
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './types';
import { parseTargetIdentifier } from '../common';
import { findBestNodeMatch } from './nodeMatching';

export async function handleRelayMessage(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  packet: any,
  targetIdentifier: string,
  message: string
): Promise<void> {
  // Use enhanced node matching
  const matchResult = findBestNodeMatch(knownNodes, targetIdentifier);
  
  if (matchResult) {
    const { node, nodeId, matchScore, isOnline, matchType } = matchResult;
    
    // Only log detailed match info for fuzzy matches or warnings
    if (matchType === 'fuzzy_name' || (!isOnline && matchScore < 90)) {
      const onlineStatus = isOnline ? "🟢 ONLINE" : "🔴 OFFLINE";
      const matchDetails = `${matchScore}% match (${matchType})`;
      console.log(`📤 Best match: ${node.user?.longName || 'Unknown'} (${nodeId}) - ${onlineStatus} - ${matchDetails}`);
      
      if (!isOnline && matchScore < 90) {
        console.log(`⚠️  Warning: Target node is offline and match confidence is ${matchScore}%`);
      }
    }
    
    try {
      // Resolve sender name and include ID for app linking
      const senderNode = knownNodes.get(packet.from);
      const senderName = senderNode?.user?.longName || senderNode?.user?.shortName || `Node-${packet.from.toString().slice(-4)}`;
      
      // Put ID first for clickable links, then name for readability
      const relayMessage = `[From ${packet.from} (${senderName})]: ${message}`;
      await device.sendText(relayMessage, nodeId);
      
      // Enhanced confirmation with match details
      const targetName = node.user?.longName || node.user?.shortName || `Node-${nodeId}`;
      const statusIcon = isOnline ? "🟢" : "🔴";
      let confirmationMessage = `✅ Message relayed to ${targetName} (${nodeId}) ${statusIcon}`;
      
      // Add match details for fuzzy matches
      if (matchType === 'fuzzy_name' || matchScore < 90) {
        confirmationMessage += ` (${matchScore}% match)`;
      }
      
      await device.sendText(confirmationMessage, packet.from);
    } catch (error) {
      console.error("❌ Failed to relay message:", error);
      await device.sendText(`❌ Failed to relay message to ${targetIdentifier}`, packet.from);
    }
  } else {
    console.log(`❌ Target "${targetIdentifier}" not found in known nodes`);
    await device.sendText(`❌ Node "${targetIdentifier}" not found. Use 'nodes' to see available nodes.`, packet.from);
  }
}
