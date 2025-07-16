/**
 * Handle Echo Message
 * MIB-007: Enhanced Relay Handler - Echo Message Handler
 */

import type { MeshDevice } from "@jsr/meshtastic__core";

/**
 * Handle echo message request from mesh network
 */
export async function handleEchoMessage(
  device: MeshDevice,
  myNodeNum: number | undefined,
  packet: any
): Promise<void> {
  console.log("🔔 Handling echo message request");
  
  try {
    const timestamp = new Date().toISOString();
    const echoResponse = `🔔 Echo response at ${timestamp} - Bridge is active and responding!`;
    
    if (packet.from && packet.from !== myNodeNum) {
      await device.sendText(echoResponse, packet.from);
      console.log(`📤 Sent echo response to node ${packet.from}`);
    }
    
  } catch (error) {
    console.error("❌ Failed to handle echo request:", error);
    
    // Send error response if possible
    if (packet.from && packet.from !== myNodeNum) {
      try {
        await device.sendText("❌ Echo request failed", packet.from);
      } catch (sendError) {
        console.error("❌ Failed to send error response:", sendError);
      }
    }
  }
}
