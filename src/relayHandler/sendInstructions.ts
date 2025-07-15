/**
 * Send Instructions Function
 * Sends bot usage instructions to users
 */

import type { MeshDevice } from "@meshtastic/core";
import { NodeInfo } from './types';

export async function sendInstructions(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  packet: any
): Promise<void> {
  console.log(`📤 Sending instructions to ${packet.from}`);
  
  // Try a short message first to see if the issue is message length
  const shortInstructions = "🤖 Bot ready! Send 'nodes' to list devices or @{nodeId} {message} to relay.";
  
  try {
    await device.sendText(shortInstructions, packet.from);
    console.log("✅ Instructions sent successfully");
  } catch (error) {
    console.error("❌ Failed to send instructions:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
  }
}
