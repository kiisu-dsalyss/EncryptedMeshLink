/**
 * Handle Nodes Request Function
 * Handles requests for listing available nodes in the mesh network
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './types';
import { isNodeOnline } from './nodeMatching';

export async function handleNodesRequest(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  packet: any,
  myNodeNum?: number
): Promise<void> {
  // Filter out self and sort by online status then by name
  const otherNodes = Array.from(knownNodes.values())
    .filter(node => node.num !== myNodeNum)
    .map(node => ({
      ...node,
      isOnline: isNodeOnline(node)
    }))
    .sort((a, b) => {
      // Online nodes first
      if (a.isOnline !== b.isOnline) {
        return b.isOnline ? 1 : -1;
      }
      // Then by name
      const aName = a.user?.longName || a.user?.shortName || '';
      const bName = b.user?.longName || b.user?.shortName || '';
      return aName.localeCompare(bName);
    });

  if (otherNodes.length === 0) {
    await device.sendText("No other nodes found in mesh network", packet.from);
    return;
  }

  // Build enhanced node list with clear IDs and status
  const nodeLines = otherNodes.map(node => {
    const status = node.isOnline ? "🟢" : "🔴";
    const longName = node.user?.longName || 'Unknown';
    const shortName = node.user?.shortName || '';
    
    // Format: [ID] Name (short) Status
    let line = `[${node.num}] ${longName}`;
    if (shortName && shortName !== longName) {
      line += ` (${shortName})`;
    }
    line += ` ${status}`;
    
    return line;
  });

  // Split into chunks if too long for a single message
  const maxChunkLength = 200; // Conservative limit for Meshtastic messages
  const chunks: string[] = [];
  let currentChunk = "📡 Available Nodes:\n";
  
  for (const line of nodeLines) {
    const testChunk = currentChunk + line + "\n";
    if (testChunk.length > maxChunkLength && currentChunk.length > "📡 Available Nodes:\n".length) {
      chunks.push(currentChunk.trim());
      currentChunk = line + "\n";
    } else {
      currentChunk = testChunk;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Add usage instructions to the last chunk
  const lastChunkIndex = chunks.length - 1;
  chunks[lastChunkIndex] += `\n\n💬 Usage:\n@[ID] message\n@name message\nExample: @${otherNodes[0]?.num} hello`;

  // Send all chunks
  for (let i = 0; i < chunks.length; i++) {
    let message = chunks[i];
    if (chunks.length > 1) {
      message = `(${i + 1}/${chunks.length}) ${message}`;
    }
    await device.sendText(message, packet.from);
    
    // Small delay between chunks to avoid overwhelming the mesh
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
