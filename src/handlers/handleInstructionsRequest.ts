/**
 * Handle Instructions Request
 * MIB-007: Enhanced Relay Handler - Instructions Request Handler
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { sendMessage } from '../utils/messageSplitter';

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
    // Create concise instructions that fit in one message
    const instructions = [
      "📖 Commands:",
      "@{name} {msg} - Relay message",
      "status - Bridge status",
      "nodes - List nodes", 
      "instructions or help - This menu",
      "echo - Test",
      "Example: @alice Hello!"
    ].join('\n');
    
    if (packet.from && packet.from !== myNodeNum) {
      await sendMessage(device, instructions, packet.from);
      console.log(`📤 Sent concise instructions to node ${packet.from}`);
    }
    
  } catch (error) {
    console.error("❌ Failed to handle instructions request:", error);
    
    // Send error response if possible
    if (packet.from && packet.from !== myNodeNum) {
      try {
        await sendMessage(device, "❌ Instructions request failed", packet.from);
      } catch (sendError) {
        console.error("❌ Failed to send error response:", sendError);
      }
    }
  }
}