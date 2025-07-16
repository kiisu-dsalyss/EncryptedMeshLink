/**
 * Enhanced Relay Handler with Discovery Integration
 * MIB-007: Enhanced Relay Handler for Bridge Integration
 * 
 * Extends the existing relay handler to support remote node routing via discovery
 */

import type { MeshDevice } from "@meshtastic/core";
import { DiscoveryClient, DiscoveredPeer } from './discoveryClient';
import { StationConfig } from './config/types';
import { NodeRegistryManager } from './nodeRegistry/manager';
import { BridgeClient } from './bridge/client';

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
  private nodeRegistry?: NodeRegistryManager;
  private bridgeClient?: BridgeClient;
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
      
      // Initialize Bridge Client
      this.bridgeClient = new BridgeClient({
        discoveryServiceUrl: this.config.discovery.serviceUrl,
        stationId: this.config.stationId,
        pollingInterval: 30000,
        autoStart: false
      });
      
      // Initialize Node Registry
      this.nodeRegistry = new NodeRegistryManager(
        this.config.stationId,
        this.bridgeClient,
        {
          syncIntervalMs: 30000,
          nodeTtlSeconds: 300,
          maxNodesPerStation: 100,
          cleanupIntervalMs: 60000,
          conflictResolutionStrategy: 'latest'
        }
      );
      
      // Set up discovery event handlers
      this.discoveryClient.setEventHandlers({
        onPeerDiscovered: this.handlePeerDiscovered.bind(this),
        onPeerLost: this.handlePeerLost.bind(this),
        onError: this.handleDiscoveryError.bind(this)
      });
      
      // Start services
      await this.discoveryClient.start();
      this.bridgeClient.start();
      this.nodeRegistry.start();
      
      // Register local nodes with the registry
      await this.registerLocalNodes();
      
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
    
    if (this.nodeRegistry) {
      this.nodeRegistry.stop();
      this.nodeRegistry = undefined;
    }
    
    if (this.bridgeClient) {
      this.bridgeClient.stop();
      this.bridgeClient = undefined;
    }
    
    if (this.discoveryClient) {
      await this.discoveryClient.stop();
      this.discoveryClient = undefined;
    }
    
    this.remoteNodes.clear();
    console.log("✅ Bridge services stopped");
  }

  /**
   * Register local nodes with the node registry
   */
  async registerLocalNodes(): Promise<void> {
    if (!this.nodeRegistry) return;
    
    this.knownNodes.forEach((nodeInfo, nodeId) => {
      const metadata = {
        longName: nodeInfo.user?.longName,
        shortName: nodeInfo.user?.shortName,
        lastSeen: nodeInfo.lastSeen.toISOString(),
        position: nodeInfo.position
      };
      
      this.nodeRegistry!.registerLocalNode(nodeId.toString(), metadata);
      console.log(`📋 Registered local node: ${nodeInfo.user?.longName || nodeInfo.user?.shortName || nodeId} (${nodeId})`);
    });
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
   * Handle status request with bridge information
   */
  async handleStatusRequest(packet: any): Promise<void> {
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
    response += `\n📋 Use "nodes" to list all available nodes`;
    
    await this.sendTextMessage(packet.from, response);
  }

  /**
   * Handle list nodes request - shows all local and remote nodes
   */
  async handleListNodesRequest(packet: any): Promise<void> {
    let response = `📋 Available Nodes:\n\n`;
    
    // Local nodes
    response += `🏠 Local Nodes (${this.knownNodes.size}):\n`;
    if (this.knownNodes.size > 0) {
      this.knownNodes.forEach((nodeInfo, nodeId) => {
        const name = nodeInfo.user?.longName || nodeInfo.user?.shortName || `Node ${nodeId}`;
        const shortName = nodeInfo.user?.shortName ? ` (${nodeInfo.user.shortName})` : '';
        response += `  • ${name}${shortName} - ID: ${nodeId}\n`;
      });
    } else {
      response += `  (No local nodes detected)\n`;
    }
    
    // Remote nodes from registry
    if (this.nodeRegistry) {
      const allRemoteNodes = this.nodeRegistry.getNodesByStation()
        .filter(node => node.stationId !== this.config.stationId);
      
      if (allRemoteNodes.length > 0) {
        response += `\n🌍 Remote Nodes (${allRemoteNodes.length}):\n`;
        
        // Group by station
        const nodesByStation = new Map<string, typeof allRemoteNodes>();
        allRemoteNodes.forEach(node => {
          if (!nodesByStation.has(node.stationId)) {
            nodesByStation.set(node.stationId, []);
          }
          nodesByStation.get(node.stationId)!.push(node);
        });
        
        nodesByStation.forEach((nodes, stationId) => {
          response += `\n📍 Station: ${stationId}\n`;
          nodes.forEach(node => {
            const metadata = node.metadata as any;
            const name = metadata?.longName || metadata?.shortName || `Node ${node.nodeId}`;
            const shortName = metadata?.shortName ? ` (${metadata.shortName})` : '';
            response += `  • ${name}${shortName} - ID: ${node.nodeId}\n`;
          });
        });
      } else {
        response += `\n🌍 Remote Nodes: (None discovered)\n`;
      }
    } else {
      response += `\n🌍 Remote Nodes: (Registry not available)\n`;
    }
    
    response += `\n💬 Use "@{name}" or "@{id}" to send messages`;
    
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
