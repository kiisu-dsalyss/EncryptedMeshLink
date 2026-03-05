/**
 * Handle List Nodes Request
 * MIB-007: Enhanced Relay Handler - List Nodes Request Handler
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './tryLocalRelay';
import { RemoteNodeInfo } from './peerEvents';

/**
 * Handle list nodes request from mesh network
 */
export async function handleListNodesRequest(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  remoteNodes: Map<number, RemoteNodeInfo>,
  myNodeNum: number | undefined,
  packet: any
): Promise<void> {
  console.log("📋 Handling list nodes request");
  
  try {
    const nodeLines: string[] = [];
    
    // Add local nodes (compact format)
    if (knownNodes.size > 0) {
      const sortedLocal = Array.from(knownNodes.entries())
        .filter(([nodeNum]) => nodeNum !== myNodeNum && nodeNum !== packet.from) // Filter out self and requester
        .sort((a, b) => a[0] - b[0]);
      
      console.log(`   Local nodes after filter: ${sortedLocal.length}`);
      
      for (const [nodeNum, nodeInfo] of sortedLocal) {
        try {
          const longName = nodeInfo.user?.longName || `Node-${nodeNum}`;
          const shortName = nodeInfo.user?.shortName || "📱";
          const line = `📱 ${longName} | ${shortName} | ${nodeNum}`;
          nodeLines.push(line);
        } catch (localError) {
          console.warn(`   Error processing local node ${nodeNum}:`, localError instanceof Error ? localError.message : localError);
        }
      }
    }
    
    // Add remote nodes if any
    if (remoteNodes.size > 0) {
      const sortedRemote = Array.from(remoteNodes.entries()).sort((a, b) => a[0] - b[0]);
      
      console.log(`   Remote nodes: ${sortedRemote.length}`);
      
      for (const [nodeNum, nodeInfo] of sortedRemote) {
        try {
          const displayName = nodeInfo.displayName || `Remote-${nodeNum}`;
          const shortName = nodeInfo.shortName || "🌍";
          const line = `🌍 ${displayName} | ${shortName} | ${nodeNum}`;
          nodeLines.push(line);
        } catch (remoteError) {
          console.warn(`   Error processing remote node ${nodeNum}:`, remoteError instanceof Error ? remoteError.message : remoteError);
        }
      }
    }
    
    // Build node list messages with chunking for Meshtastic's 228-byte limit
    const maxChunkSize = 160; // Conservative limit for safety margin
    const messagesToSend: string[] = [];
    
    if (nodeLines.length === 0) {
      messagesToSend.push("📭 No nodes available");
    } else {
      // Get sample node ID for usage example
      const sampleNodeId = Array.from(knownNodes.keys()).find(id => id !== myNodeNum && id !== packet.from) 
        || Array.from(remoteNodes.keys())[0] 
        || '123456';
      
      // Build header and usage info
      const header = "📡 Nodes:\n";
      const usageInfo = `\n💬 Usage: @{id} msg`;
      
      // Chunk the node lines
      let currentChunk = header;
      
      for (let i = 0; i < nodeLines.length; i++) {
        const line = nodeLines[i];
        const testChunk = currentChunk + line + "\n";
        
        // If adding this line would exceed limit (and we have content), start new chunk
        if (testChunk.length > maxChunkSize && currentChunk !== header) {
          messagesToSend.push(currentChunk.trim());
          currentChunk = line + "\n";
        } else {
          currentChunk += line + "\n";
        }
      }
      
      // Add remaining nodes with usage info
      if (currentChunk !== header) {
        currentChunk += usageInfo;
        messagesToSend.push(currentChunk.trim());
      }
      
      console.log(`   Split ${nodeLines.length} nodes into ${messagesToSend.length} message(s)`);
    }
    
    if (packet.from && packet.from !== myNodeNum) {
      console.log(`   Sending ${messagesToSend.length} message(s) to ${packet.from}...`);
      
      // Send all messages with delay between them
      for (let i = 0; i < messagesToSend.length; i++) {
        try {
          await device.sendText(messagesToSend[i], packet.from);
          console.log(`   ✓ Sent message ${i + 1}/${messagesToSend.length} (${messagesToSend[i].length} bytes)`);
          
          // Delay between messages to avoid overwhelming the mesh
          if (i < messagesToSend.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (sendError) {
          console.error(`   ✗ Failed to send message ${i + 1}:`, sendError instanceof Error ? sendError.message : sendError);
          throw sendError; // Re-throw to trigger error handler
        }
      }
      
      console.log(`📤 Sent ${messagesToSend.length} node list message(s) to ${packet.from}`);
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to handle list nodes request:", errorMsg);
    console.error("   Stack:", error instanceof Error ? error.stack : "N/A");
    console.error("   knownNodes.size:", knownNodes.size);
    console.error("   remoteNodes.size:", remoteNodes.size);
    console.error("   packet.from:", packet.from);
    console.error("   myNodeNum:", myNodeNum);
    
    // Send error response if possible
    if (packet.from && packet.from !== myNodeNum) {
      try {
        await device.sendText("❌ Node list request failed", packet.from);
      } catch (sendError) {
        const sendErrorMsg = sendError instanceof Error ? sendError.message : String(sendError);
        console.error("❌ Failed to send error response:", sendErrorMsg);
      }
    }
  }
}
