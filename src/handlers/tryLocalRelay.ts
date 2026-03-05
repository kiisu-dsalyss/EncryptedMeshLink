/**
 * Try Local Relay
 * MIB-007: Enhanced Relay Handler - Local Relay Function
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { parseTargetIdentifier } from '../common/parsers';

export interface NodeInfo {
  num: number;
  user?: {
    longName?: string;
    shortName?: string;
  };
  position?: any;
  lastSeen: Date;
}

export async function tryLocalRelay(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  myNodeNum: number | undefined,
  packet: any,
  targetIdentifier: string,
  message: string
): Promise<boolean> {
  console.log(`📡 Attempting local relay to "${targetIdentifier}"`);
  
  // Try to find target in known local nodes
  let targetNode: NodeInfo | undefined;
  
  // Parse target identifier to determine what we're matching against
  const targetInfo = parseTargetIdentifier(targetIdentifier);
  const targetLower = targetIdentifier.toLowerCase().trim();
  
  if (targetInfo.isNumeric) {
    // Direct numeric match (node ID)
    const targetNum = targetInfo.value as number;
    
    // Check if we're trying to send to ourselves
    if (myNodeNum && targetNum === myNodeNum) {
      console.log(`⚠️ Cannot relay to self (node ${myNodeNum})`);
      return true; // Don't relay messages to ourselves
    }
    
    // Try exact match first
    targetNode = knownNodes.get(targetNum);
    
    // If no exact match, try prefix matching (e.g., "464" matches "464130339")
    if (!targetNode) {
      const targetStr = targetNum.toString();
      const candidates: { node: NodeInfo; score: number }[] = [];
      
      for (const [nodeNum, nodeInfo] of knownNodes.entries()) {
        const nodeIdStr = nodeNum.toString();
        
        // Skip self
        if (myNodeNum && nodeNum === myNodeNum) {
          continue;
        }
        
        // Check if node ID starts with target prefix
        if (nodeIdStr.startsWith(targetStr)) {
          // Prefer longer prefix matches (more specific)
          const score = targetStr.length * 100 + nodeNum;
          candidates.push({ node: nodeInfo, score });
        }
      }
      
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score); // Sort by score descending
        targetNode = candidates[0].node;
        console.log(`✅ Found local target by node ID prefix: ${targetNode.user?.longName || 'Unknown'} (#${targetNode.num})`);
      }
    } else {
      console.log(`✅ Found local target by exact node ID: ${targetNode.user?.longName || 'Unknown'} (#${targetNode.num})`);
    }
  } else {
    // Try to find best match by name (long name, short name, or partial match)
    const candidates: { node: NodeInfo; score: number }[] = [];
    
    console.log(`   Searching for "${targetLower}" in ${knownNodes.size} local nodes...`);
    
    for (const [nodeNum, nodeInfo] of knownNodes.entries()) {
      const longName = nodeInfo.user?.longName?.toLowerCase() || '';
      const shortName = nodeInfo.user?.shortName?.toLowerCase() || '';
      const nodeIdStr = nodeNum.toString();
      
      // Skip self
      if (myNodeNum && nodeNum === myNodeNum) {
        continue;
      }
      
      let score = 0;
      
      // Exact match on long name (highest priority)
      if (longName === targetLower) {
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
      // Partial match at start of long name
      else if (longName.startsWith(targetLower)) {
        score = 500;
      }
      // Partial match at start of short name
      else if (shortName.startsWith(targetLower)) {
        score = 450;
      }
      // Partial match anywhere in long name
      else if (longName.includes(targetLower)) {
        score = 300;
      }
      // Partial match anywhere in short name
      else if (shortName.includes(targetLower)) {
        score = 250;
      }
      
      if (score > 0) {
        console.log(`   ✓ Node ${nodeNum} (${nodeInfo.user?.longName || 'Unknown'}): score ${score}`);
        candidates.push({ node: nodeInfo, score });
      }
    }
    
    // Use the best matching candidate
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score); // Sort by score descending
      targetNode = candidates[0].node;
      
      const matchType = 
        targetNode.user?.longName?.toLowerCase() === targetLower ? 'long name' :
        targetNode.user?.shortName?.toLowerCase() === targetLower ? 'short name' :
        'partial match';
      
      console.log(`✅ Found local target by ${matchType}: ${targetNode.user?.longName || targetNode.user?.shortName || 'Unknown'} (#${targetNode.num})`);
    } else {
      console.log(`   No matching nodes found`);
    }
  }
  
  if (targetNode) {
    try {
      // Get sender's name for attribution
      const senderNode = knownNodes.get(packet.from);
      const senderName = senderNode?.user?.longName || senderNode?.user?.shortName || `Node ${packet.from}`;
      
      // Format the relayed message with attribution
      const relayedMessage = `📩 From ${senderName}: ${message}`;
      
      // Send the message to the local node
      await device.sendText(relayedMessage, targetNode.num);
      console.log(`📨 Local relay successful to node ${targetNode.num}`);
      
      // Send confirmation back to the sender
      const targetName = targetNode.user?.longName || targetNode.user?.shortName || `Node ${targetNode.num}`;
      const confirmationMessage = `✅ Message relayed to ${targetName}`;
      await device.sendText(confirmationMessage, packet.from);
      console.log(`📤 Confirmation sent to sender (${packet.from})`);
      
      return true;
    } catch (error) {
      console.error(`❌ Local relay failed:`, error);
      return false;
    }
  }
  
  console.log(`❌ Target "${targetIdentifier}" not found in local nodes`);
  return false;
}
