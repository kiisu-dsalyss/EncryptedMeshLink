import type { MeshDevice } from "@meshtastic/core";

export interface NodeInfo {
  num: number;
  user?: {
    longName?: string;
    shortName?: string;
  };
  position?: any;
  lastSeen: Date;
}

export class RelayHandler {
  private device: MeshDevice;
  private knownNodes: Map<number, NodeInfo>;
  private myNodeNum?: number;

  constructor(device: MeshDevice, knownNodes: Map<number, NodeInfo>, myNodeNum?: number) {
    this.device = device;
    this.knownNodes = knownNodes;
    this.myNodeNum = myNodeNum;
  }

  async handleRelayMessage(packet: any, targetIdentifier: string, message: string): Promise<void> {
    console.log(`🔄 Relay request: Forward "${message}" to "${targetIdentifier}"`);
    
    // Find target node by ID or name
    let targetNodeId: number | undefined;
    let targetNode: NodeInfo | undefined;
    
    // Check if it's a numeric ID
    if (/^\d+$/.test(targetIdentifier)) {
      targetNodeId = parseInt(targetIdentifier);
      targetNode = this.knownNodes.get(targetNodeId);
    } else {
      // Search by name (longName or shortName)
      this.knownNodes.forEach((node, nodeId) => {
        if (!targetNodeId) { // Only set if we haven't found one yet
          const longName = node.user?.longName?.toLowerCase() || '';
          const shortName = node.user?.shortName?.toLowerCase() || '';
          
          if (longName.includes(targetIdentifier) || shortName.includes(targetIdentifier)) {
            targetNodeId = nodeId;
            targetNode = node;
          }
        }
      });
    }
    
    if (targetNodeId && targetNode) {
      console.log(`📤 Relaying to: ${targetNode.user?.longName || 'Unknown'} (${targetNodeId})`);
      
      try {
        // Resolve sender name
        const senderNode = this.knownNodes.get(packet.from);
        const senderName = senderNode?.user?.longName || senderNode?.user?.shortName || `Node-${packet.from.toString().slice(-4)}`;
        
        const relayMessage = `[From ${senderName}]: ${message}`;
        await this.device.sendText(relayMessage, targetNodeId);
        console.log("✅ Message relayed successfully");
        
        // Send confirmation back to sender
        await this.device.sendText(`✅ Message relayed to ${targetNode.user?.longName || targetNodeId}`, packet.from);
      } catch (error) {
        console.error("❌ Failed to relay message:", error);
        await this.device.sendText(`❌ Failed to relay message to ${targetIdentifier}`, packet.from);
      }
    } else {
      console.log(`❌ Target "${targetIdentifier}" not found in known nodes`);
      await this.device.sendText(`❌ Node "${targetIdentifier}" not found. Use 'nodes' to see available nodes.`, packet.from);
    }
  }

  async handleNodesRequest(packet: any): Promise<void> {
    // Send list of available nodes
    const nodeList = Array.from(this.knownNodes.values())
      .filter(node => node.num !== this.myNodeNum)
      .map(node => `${node.num}: ${node.user?.longName || 'Unknown'}`)
      .join('\n');
    
    const response = nodeList.length > 0 
      ? `Available nodes:\n${nodeList}\n\nSend: @{nodeId} {message} to relay`
      : "No other nodes found in mesh network";
    
    await this.device.sendText(response, packet.from);
  }

  async handleEchoMessage(packet: any): Promise<void> {
    // Send instructions instead of echo
    await this.sendInstructions(packet);
  }

  async sendInstructions(packet: any): Promise<void> {
    console.log(`📤 Sending instructions to ${packet.from}`);
    
    // Try a short message first to see if the issue is message length
    const shortInstructions = "🤖 Bot ready! Send 'nodes' to list devices or @{nodeId} {message} to relay.";
    
    try {
      await this.device.sendText(shortInstructions, packet.from);
      console.log("✅ Instructions sent successfully");
    } catch (error) {
      console.error("❌ Failed to send instructions:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
    }
  }
}
