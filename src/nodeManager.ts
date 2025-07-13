import type { NodeInfo } from "./relayHandler";

export class NodeManager {
  private knownNodes: Map<number, NodeInfo>;

  constructor() {
    this.knownNodes = new Map<number, NodeInfo>();
  }

  getKnownNodes(): Map<number, NodeInfo> {
    return this.knownNodes;
  }

  addNode(nodeInfo: any): void {
    this.knownNodes.set(nodeInfo.num, {
      num: nodeInfo.num,
      user: nodeInfo.user,
      position: nodeInfo.position,
      lastSeen: new Date()
    });
    console.log(`📍 Node discovered: ${nodeInfo.num} ${nodeInfo.user?.longName || 'Unknown'}`);
  }

  showAvailableNodes(myNodeNum?: number): void {
    console.log("\n📡 Known Mesh Nodes:");
    console.log("===================");
    
    if (this.knownNodes.size === 0) {
      console.log("No nodes discovered yet");
      return;
    }

    const sortedNodes = Array.from(this.knownNodes.values()).sort((a, b) => a.num - b.num);
    
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
    console.log("   Example: \"@3616546689 Hello there!\"");
    console.log("   Example: \"@fester Hello there!\"");
    console.log("===================\n");
  }
}
