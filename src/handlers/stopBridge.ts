/**
 * Stop Discovery Bridge
 * MIB-007: Enhanced Relay Handler - Stop Bridge Function
 */

import { DiscoveryClientModular } from '../discovery/index';

export async function stopBridge(discoveryClient?: DiscoveryClientModular): Promise<void> {
  console.log("🛑 Stopping bridge services...");
  
  if (discoveryClient) {
    await discoveryClient.stop();
  }
  
  console.log("✅ Bridge services stopped");
}
