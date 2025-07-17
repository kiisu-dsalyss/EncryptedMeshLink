/**
 * Show Available Nodes Function
 * Displays the list of known nodes with usage instructions and online status
 */

import { NodeInfo } from './types';

function isNodeOnline(node: NodeInfo): boolean {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return node.lastSeen > fiveMinutesAgo;
}

export function showAvailableNodes(knownNodes: Map<number, NodeInfo>, myNodeNum?: number): void {
  console.log("\n📡 Known Mesh Nodes:");
  console.log("===================");
  
  if (knownNodes.size === 0) {
    console.log("No nodes discovered yet");
    return;
  }

  // Sort nodes by online status first, then by node number
  const sortedNodes = Array.from(knownNodes.values())
    .map(node => ({
      ...node,
      isOnline: isNodeOnline(node)
    }))
    .sort((a, b) => {
      // Online nodes first
      if (a.isOnline !== b.isOnline) {
        return b.isOnline ? 1 : -1;
      }
      // Then by node number
      return a.num - b.num;
    });
  
  sortedNodes.forEach(node => {
    const isThisDevice = myNodeNum && node.num === myNodeNum;
    const deviceIndicator = isThisDevice ? " (THIS DEVICE)" : "";
    const statusIcon = node.isOnline ? "🟢" : "🔴";
    const longName = node.user?.longName || 'Unknown';
    const shortName = node.user?.shortName || "";
    
    let displayName = longName;
    if (shortName && shortName !== longName) {
      displayName += ` (${shortName})`;
    }
    
    console.log(`${statusIcon} [${node.num}] ${displayName}${deviceIndicator}`);
  });

  // Show separate online/offline counts
  const onlineCount = sortedNodes.filter(n => n.isOnline && n.num !== myNodeNum).length;
  const offlineCount = sortedNodes.filter(n => !n.isOnline && n.num !== myNodeNum).length;
  
  console.log(`\n📊 Status: ${onlineCount} online, ${offlineCount} offline`);

  console.log("\n💬 Usage:");
  console.log("   Send \"nodes\" to get this list");
  console.log("   Send \"@[ID] {message}\" to relay by ID (recommended)");
  console.log("   Send \"@{name} {message}\" to relay by name");
  console.log("   Example: \"@1111111111 Hello there!\"");
  console.log("   Example: \"@alice Hello there!\"");
  console.log("\n💡 Tip: Online nodes (🟢) are prioritized for name matching");
  console.log("===================");
}
