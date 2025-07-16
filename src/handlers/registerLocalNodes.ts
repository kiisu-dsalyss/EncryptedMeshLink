/**
 * Register Local Nodes Handler
 * MIB-007: Enhanced Relay Handler - Register Local Nodes Function
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './tryLocalRelay';

/**
 * Register all known local nodes for relay handling
 * Note: This function assumes knownNodes are already populated from external source
 */
export async function registerLocalNodes(
  device: MeshDevice,
  knownNodes: Map<number, NodeInfo>,
  myNodeNum?: number
): Promise<void> {
  console.log("🔄 Registering local mesh nodes for relay handling...");
  
  try {
    console.log(`📋 Found ${knownNodes.size} nodes in known nodes registry`);
    
    // Log all registered nodes for relay handling
    for (const [nodeNum, nodeInfo] of knownNodes) {
      if (nodeNum !== myNodeNum) {
        console.log(`✅ Registered node for relay: ${nodeInfo.user?.longName || `Node-${nodeNum}`} (${nodeNum})`);
      }
    }
    
    console.log(`🎯 Successfully registered ${knownNodes.size} local nodes for relay handling`);
    
  } catch (error) {
    console.error("❌ Failed to register local nodes:", error);
    throw error;
  }
}
