/**
 * Show Available Nodes Function
 * Displays the list of known nodes with usage instructions
 */

import { NodeInfo } from './types';

export function showAvailableNodes(knownNodes: Map<number, NodeInfo>, myNodeNum?: number): void {
  console.log("\n📡 Known Mesh Nodes:");
  console.log("===================");
  
  if (knownNodes.size === 0) {
    console.log("No nodes discovered yet");
    return;
  }

  const sortedNodes = Array.from(knownNodes.values()).sort((a, b) => a.num - b.num);
  
  sortedNodes.forEach(node => {
    const isThisDevice = myNodeNum && node.num === myNodeNum;
    const deviceIndicator = isThisDevice ? " (THIS DEVICE)" : "";
    const emoji = node.user?.shortName || "📱";
    
    console.log(`📱 ${node.num}: ${node.user?.longName || 'Unknown'} [${emoji}]${deviceIndicator}`);
  });

  console.log("\n💬 Usage:");
  console.log("   Send \"nodes\" to get this list");
  console.log("   Send \"@{nodeId} {message}\" to relay by ID");
  console.log("   Send \"@{nodeName} {message}\" to relay by name");
  console.log("   Example: \"@1111111111 Hello there!\"");
  console.log("   Example: \"@alice Hello there!\"");
  console.log("===================");
}
