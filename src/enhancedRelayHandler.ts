/**
 * Enhanced Relay Handler with Discovery Integration
 * MIB-007: Enhanced Relay Handler for Bridge Integration
 * 
 * Extends the existing relay handler to support remote node routing via discovery
 */

import type { MeshDevice } from "@meshtastic/core";
import { DiscoveryClient, DiscoveredPeer } from './discoveryClient';
import { StationConfig } from './config/types';

export interface NodeInfo {
  num: number;
  user?: {
    longName?: string;
    shortName?: string;
  };
  position?: any;
  lastSeen: Date;
}

export interface RemoteNodeInfo {
  nodeId: number;
  stationId: string;
  lastSeen: Date;
}

export class EnhancedRelayHandler {
  private device: MeshDevice;
  private knownNodes: Map<number, NodeInfo>;
  private remoteNodes: Map<number, RemoteNodeInfo> = new Map();
  private discoveryClient?: DiscoveryClient;
  private myNodeNum?: number;
  private config: StationConfig;

  constructor(
    device: MeshDevice, 
    knownNodes: Map<number, NodeInfo>, 
    config: StationConfig,
    myNodeNum?: number
  ) {
    this.device = device;
    this.knownNodes = knownNodes;
    this.config = config;
    this.myNodeNum = myNodeNum;
  }

  /**
   * Initialize discovery client and start bridge services
   */
  async initializeBridge(): Promise<void> {
    console.log("🌉 Initializing EncryptedMeshLink bridge services...");
    
    try {
      this.discoveryClient = new DiscoveryClient(this.config);
      
      // Set up discovery event handlers
      this.discoveryClient.setEventHandlers({
        onPeerDiscovered: this.handlePeerDiscovered.bind(this),
        onPeerLost: this.handlePeerLost.bind(this),
        onError: this.handleDiscoveryError.bind(this)
      });
      
      // Start discovery client
      await this.discoveryClient.start();
      
      console.log("✅ Bridge services initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize bridge services:", error);
      throw error;
    }
  }

  /**
   * Stop bridge services
   */
  async stopBridge(): Promise<void> {
    console.log("🛑 Stopping bridge services...");
    
    if (this.discoveryClient) {
      await this.discoveryClient.stop();
      this.discoveryClient = undefined;
    }
    
    this.remoteNodes.clear();
    console.log("✅ Bridge services stopped");
  }

  /**
   * Enhanced relay message handler with bridge support
   */
  async handleRelayMessage(packet: any, targetIdentifier: string, message: string): Promise<void> {
    console.log(`🔄 Bridge relay request: Forward "${message}" to "${targetIdentifier}"`);
    
    // Step 1: Check local nodes first (existing behavior)
    const localResult = await this.tryLocalRelay(packet, targetIdentifier, message);
    if (localResult) {
      return; // Successfully relayed locally
    }
    
    // Step 2: Check remote nodes via bridge
    const remoteResult = await this.tryRemoteRelay(packet, targetIdentifier, message);
    if (remoteResult) {
      return; // Successfully queued for remote relay
    }
    
    // Step 3: No target found - inform sender
    await this.sendRelayFailure(packet, targetIdentifier, "Target not found in local or remote networks");
  }

  /**
   * Handle nodes request with bridge information
   */
  async handleNodesRequest(packet: any): Promise<void> {
    const localCount = this.knownNodes.size;
    const remoteCount = this.remoteNodes.size;
    const bridgeStatus = this.discoveryClient ? "🌉 BRIDGE ACTIVE" : "🔌 BRIDGE OFFLINE";
    
    let response = `📡 Network Status ${bridgeStatus}\n`;
    response += `🏠 Local nodes: ${localCount}\n`;
    response += `🌍 Remote nodes: ${remoteCount}\n`;
    
    if (this.discoveryClient) {
      const peers = this.discoveryClient.getKnownPeers();
      response += `🔗 Connected stations: ${peers.length}\n`;
      
      if (peers.length > 0) {
        response += `\n📍 Remote Stations:\n`;
        peers.forEach(peer => {
          const nodeCount = Array.from(this.remoteNodes.values())
            .filter(rn => rn.stationId === peer.stationId).length;
          response += `  • ${peer.stationId} (${nodeCount} nodes)\n`;
        });
      }
    }
    
    response += `\n💬 Use "@{identifier} message" for relay`;
    
    await this.sendTextMessage(packet.from, response);
  }

  /**
   * Handle echo message (existing functionality)
   */
  async handleEchoMessage(packet: any): Promise<void> {
    const senderName = this.getNodeName(packet.from);
    const bridgeStatus = this.discoveryClient ? " 🌉" : "";
    const response = `🔊 Echo from ${senderName}${bridgeStatus}: "${packet.data}"`;
    
    await this.sendTextMessage(packet.from, response);
  }

  // Private methods

  private async tryLocalRelay(packet: any, targetIdentifier: string, message: string): Promise<boolean> {
    // Find target node by ID or name (existing logic)
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
          
          if (longName.includes(targetIdentifier.toLowerCase()) || 
              shortName.includes(targetIdentifier.toLowerCase())) {
            targetNodeId = nodeId;
            targetNode = node;
          }
        }
      });
    }
    
    if (targetNodeId && targetNode) {
      const senderName = this.getNodeName(packet.from);
      const targetName = this.getNodeName(targetNodeId);
      const relayMessage = `📨 From ${senderName}: ${message}`;
      
      console.log(`🏠 Local relay: ${senderName} → ${targetName}`);
      await this.sendTextMessage(targetNodeId, relayMessage);
      
      // Confirm to sender
      await this.sendTextMessage(packet.from, `✅ Message relayed to ${targetName} (local)`);
      return true;
    }
    
    return false;
  }

  private async tryRemoteRelay(packet: any, targetIdentifier: string, message: string): Promise<boolean> {
    if (!this.discoveryClient) {
      console.log("🔌 Bridge offline - cannot attempt remote relay");
      return false;
    }
    
    // TODO: Implement remote node lookup across stations
    // This will require building a distributed node registry (MIB-009)
    
    // For now, just check if target looks like a station ID
    if (targetIdentifier.includes('-') && targetIdentifier.length >= 3) {
      const peers = this.discoveryClient.getKnownPeers();
      const targetStation = peers.find(p => p.stationId === targetIdentifier);
      
      if (targetStation) {
        console.log(`🌍 Queueing message for remote station: ${targetIdentifier}`);
        
        // TODO: Implement message queuing and P2P delivery (MIB-006)
        const senderName = this.getNodeName(packet.from);
        
        // For now, just acknowledge that we'll try to deliver
        await this.sendTextMessage(packet.from, 
          `🌉 Message queued for remote station "${targetIdentifier}" - delivery pending`);
        
        console.log(`📤 Remote relay queued: ${senderName} → ${targetIdentifier}: "${message}"`);
        return true;
      }
    }
    
    return false;
  }

  private async sendRelayFailure(packet: any, targetIdentifier: string, reason: string): Promise<void> {
    const response = `❌ Relay failed to "${targetIdentifier}": ${reason}`;
    await this.sendTextMessage(packet.from, response);
  }

  private async sendTextMessage(targetNodeId: number, message: string): Promise<void> {
    try {
      await this.device.sendText(message, targetNodeId);
    } catch (error) {
      console.error(`❌ Failed to send message to ${targetNodeId}:`, error);
    }
  }

  private getNodeName(nodeId: number): string {
    const node = this.knownNodes.get(nodeId);
    const longName = node?.user?.longName;
    const shortName = node?.user?.shortName;
    
    if (longName) {
      return `${nodeId} (${longName})`;
    } else if (shortName) {
      return `${nodeId} (${shortName})`;
    } else {
      return nodeId.toString();
    }
  }

  private handlePeerDiscovered(peer: DiscoveredPeer): void {
    console.log(`🆕 New bridge peer discovered: ${peer.stationId}`);
    
    // TODO: Request node list from this peer when MIB-009 is implemented
    // For now, just log the discovery
  }

  private handlePeerLost(stationId: string): void {
    console.log(`👋 Bridge peer lost: ${stationId}`);
    
    // Remove any remote nodes from this station
    const removedNodes: number[] = [];
    this.remoteNodes.forEach((remoteNode, nodeId) => {
      if (remoteNode.stationId === stationId) {
        this.remoteNodes.delete(nodeId);
        removedNodes.push(nodeId);
      }
    });
    
    if (removedNodes.length > 0) {
      console.log(`🗑️ Removed ${removedNodes.length} remote nodes from lost station ${stationId}`);
    }
  }

  private handleDiscoveryError(error: Error): void {
    console.error(`❌ Discovery error:`, error.message);
    
    // TODO: Implement error recovery strategies
    // For now, just log the error
  }
}
