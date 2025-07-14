/**
 * Stop Discovery Bridge
 * MIB-007: Enhanced Relay Handler - Stop Bridge Function
 */

import { DiscoveryClient } from '../discoveryClient';

export async function stopBridge(discoveryClient?: DiscoveryClient): Promise<void> {
  console.log("🛑 Stopping bridge services...");
  
  if (discoveryClient) {
    await discoveryClient.stop();
  }
  
  console.log("✅ Bridge services stopped");
}
