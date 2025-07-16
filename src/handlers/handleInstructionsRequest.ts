/**
 * Handle Instructions Request
 * MIB-007: Enhanced Relay Handler - Instructions Request Handler
 */

import type { MeshDevice } from "@jsr/meshtastic__core";

/**
 * Handle instructions request from mesh network
 */
export async function handleInstructionsRequest(
  device: MeshDevice,
  myNodeNum: number | undefined,
  packet: any
): Promise<void> {
  console.log("📖 Handling instructions request");
  
  try {
    const instructions = [
      "🔄 EncryptedMeshLink Relay Commands:",
      "",
      "📡 Relay: @username message",
      "📊 Status: !status", 
      "📋 List nodes: !list",
      "📖 Help: !help",
      "🔔 Echo test: !echo",
      "",
      "💡 Use @nodename or @nodenum to send messages",
      "🔐 All bridge traffic is encrypted"
    ].join('\n');
    
    if (packet.from && packet.from !== myNodeNum) {
      // Split instructions if too long
      const maxLength = 200;
      if (instructions.length <= maxLength) {
        await device.sendText(instructions, packet.from);
      } else {
        // Send in chunks
        const chunks = instructions.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [instructions];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = `(${i + 1}/${chunks.length}) ${chunks[i]}`;
          await device.sendText(chunk, packet.from);
          // Small delay between chunks
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`📤 Sent instructions to node ${packet.from}`);
    }
    
  } catch (error) {
    console.error("❌ Failed to handle instructions request:", error);
    
    // Send error response if possible
    if (packet.from && packet.from !== myNodeNum) {
      try {
        await device.sendText("❌ Instructions request failed", packet.from);
      } catch (sendError) {
        console.error("❌ Failed to send error response:", sendError);
      }
    }
  }
}
