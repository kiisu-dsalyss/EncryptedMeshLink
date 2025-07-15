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
import { BridgeClient, createP2PBridgeClient } from './bridge/client';
import { CryptoService } from './crypto';
import { parseTargetIdentifier } from './common';

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
  nodeName?: string;
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
  private crypto: CryptoService;

  constructor(
    device: MeshDevice, 
    knownNodes: Map<number, NodeInfo>, 
    config: StationConfig,
    crypto: CryptoService,
    myNodeNum?: number
  ) {
    this.device = device;
    this.knownNodes = knownNodes;
    this.config = config;
    this.crypto = crypto;
    this.myNodeNum = myNodeNum;
  }

  /**
   * Initialize discovery client and start bridge services
   */
  async initializeBridge(): Promise<void> {
    console.log("🌉 Initializing EncryptedMeshLink bridge services...");
    
    try {
      this.discoveryClient = new DiscoveryClient(this.config);
      
      // Initialize Bridge Client with P2P transport
      this.bridgeClient = createP2PBridgeClient(
        this.config.stationId,
        this.crypto,
        this.discoveryClient,
        {
          pollingInterval: 30000,
          autoStart: false,
          localPort: 8080,
          connectionTimeout: 10000
        }
      );
      
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
      
      // Set up bridge client event handlers
      this.bridgeClient.on('nodeDiscovery', this.handleNodeDiscovery.bind(this));
      this.bridgeClient.on('message', this.handleBridgeMessage.bind(this));
      this.bridgeClient.on('userMessage', this.handleUserMessage.bind(this));
      
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
    
    let response = `📡 ${bridgeStatus}\n`;
    response += `🏠 Local: ${localCount} 🌍 Remote: ${remoteCount}\n`;
    
    if (this.discoveryClient) {
      const peers = this.discoveryClient.getKnownPeers();
      response += `🔗 Stations: ${peers.length}`;
      
      if (peers.length > 0) {
        peers.forEach(peer => {
          const nodeCount = Array.from(this.remoteNodes.values())
            .filter(rn => rn.stationId === peer.stationId).length;
          response += ` ${peer.stationId}(${nodeCount})`;
        });
      }
    }
    
    await this.sendTextMessage(packet.from, response);
  }

  /**
   * Handle list nodes request - shows all local and remote nodes
   */
  async handleListNodesRequest(packet: any): Promise<void> {
    console.log(`📋 Processing 'nodes' command from ${packet.from}`);
    
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
    
    // Remote nodes from P2P discovery
    if (this.remoteNodes.size > 0) {
      response += `\n🌍 Remote Nodes (${this.remoteNodes.size}):\n`;
      
      // Group by station
      const nodesByStation = new Map<string, any[]>();
      this.remoteNodes.forEach((remoteNode, nodeId) => {
        if (!nodesByStation.has(remoteNode.stationId)) {
          nodesByStation.set(remoteNode.stationId, []);
        }
        nodesByStation.get(remoteNode.stationId)!.push({
          nodeId: nodeId,
          nodeName: remoteNode.nodeName || `Node ${nodeId}`,
          stationId: remoteNode.stationId
        });
      });
      
      nodesByStation.forEach((nodes, stationId) => {
        response += `\n📍 Station: ${stationId}\n`;
        nodes.forEach(node => {
          response += `  • ${node.nodeName} - ID: ${node.nodeId}\n`;
        });
      });
    } else {
      response += `\n🌍 Remote Nodes: (None discovered)\n`;
    }
    
    response += `\n💬 Use "@{name}" or "@{id}" to send messages`;
    
    console.log(`📤 Sending nodes response (${response.length} chars) to ${packet.from}`);
    console.log(`📋 Response content:\n${response}`);
    
    // Always send compact format with actual node names (Meshtastic limit ~200 chars)
    let compactResponse = `📋 Nodes:\n`;
    
    // Local nodes - show actual names (prefer long names over emoji short names)
    const localNodes: string[] = [];
    this.knownNodes.forEach((nodeInfo, nodeId) => {
      // Always prefer longName over shortName to avoid emoji-only display
      const longName = nodeInfo.user?.longName;
      const shortName = nodeInfo.user?.shortName;
      
      // Use longName if it exists and is different from shortName (to avoid emoji-only names)
      let name;
      if (longName && longName !== shortName) {
        name = longName;
      } else if (longName) {
        name = longName;
      } else if (shortName) {
        name = shortName;
      } else {
        name = `${nodeId}`;
      }
      
      localNodes.push(name);
    });
    
    if (localNodes.length > 0) {
      compactResponse += `🏠 ${localNodes.join(', ')}\n`;
    } else {
      compactResponse += `🏠 (none)\n`;
    }
    
    // Remote nodes - show actual names from P2P discovery
    if (this.remoteNodes.size > 0) {
      const remoteNames: string[] = [];
      this.remoteNodes.forEach((remoteNode, nodeId) => {
        const name = remoteNode.nodeName || `Node ${nodeId}`;
        remoteNames.push(name);
      });
      compactResponse += `🌍 ${remoteNames.join(', ')}\n`;
    } else {
      compactResponse += `🌍 (none)\n`;
    }
    
    compactResponse += `💬 @{name} to message`;
    
    console.log(`📤 Sending compact response (${compactResponse.length} chars): ${compactResponse}`);
    await this.sendTextMessage(packet.from, compactResponse);
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

  /**
   * Handle instructions request - shows available commands
   */
  async handleInstructionsRequest(packet: any): Promise<void> {
    console.log(`📖 Processing 'instructions' command from ${packet.from}`);
    
    const response = `📖 Commands:
• nodes - list available nodes
• status - bridge/relay info
• @{name} {msg} - send message
• instructions - this help

Examples:
• @alice hello there
• @1234567890 test message`;
    
    console.log(`📤 Sending instructions to ${packet.from}`);
    await this.sendTextMessage(packet.from, response);
  }

  // Private methods

  private async tryLocalRelay(packet: any, targetIdentifier: string, message: string): Promise<boolean> {
    // Find target node by ID or name (existing logic)
    let targetNodeId: number | undefined;
    let targetNode: NodeInfo | undefined;
    
    // Parse target identifier
    const targetResult = parseTargetIdentifier(targetIdentifier);
    if (targetResult.isNumeric) {
      targetNodeId = targetResult.value as number;
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
    
    // Search remote nodes by ID or name
    let targetNodeId: number | undefined;
    let targetNode: RemoteNodeInfo | undefined;
    
    // Parse target identifier
    const targetResult = parseTargetIdentifier(targetIdentifier);
    if (targetResult.isNumeric) {
      const nodeId = targetResult.value as number;
      targetNode = this.remoteNodes.get(nodeId);
      if (targetNode) {
        targetNodeId = nodeId;
      }
    } else {
      // Search by name (case-insensitive with fuzzy matching)
      this.remoteNodes.forEach((node, nodeId) => {
        if (!targetNodeId) { // Only set if we haven't found one yet
          const nodeName = (node.nodeName || '').toLowerCase();
          const target = targetIdentifier.toLowerCase();
          
          // Try exact match first, then partial match
          if (nodeName === target || nodeName.includes(target)) {
            targetNodeId = nodeId;
            targetNode = node;
          }
        }
      });
    }
    
    if (targetNodeId && targetNode) {
      const senderName = this.getNodeName(packet.from);
      const targetName = targetNode.nodeName || `Node ${targetNodeId}`;
      
      console.log(`🌍 Remote relay: ${senderName} → ${targetName} (station: ${targetNode.stationId})`);
      
      // Send message via P2P bridge to the target station
      if (this.bridgeClient) {
        try {
          const relayMessage = `📨 From ${senderName}: ${message}`;
          
          // Send the message to the target node via its station
          await this.bridgeClient.sendUserMessage(
            targetNode.stationId,
            packet.from,
            targetNodeId,
            relayMessage
          );
          
          // Confirm to sender
          await this.sendTextMessage(packet.from, 
            `✅ Message relayed to ${targetName} (remote via ${targetNode.stationId})`);
          
          console.log(`📤 Remote relay sent: ${senderName} → ${targetName}: "${message}"`);
          return true;
        } catch (error) {
          console.error(`❌ Failed to send remote message to ${targetName}:`, error);
          await this.sendTextMessage(packet.from, 
            `❌ Failed to relay to ${targetName}: Bridge error`);
          return false;
        }
      } else {
        console.log("🔌 Bridge client not available");
        return false;
      }
    }
    
    // Fallback: Check if target looks like a station ID
    if (targetIdentifier.includes('-') && targetIdentifier.length >= 3) {
      const peers = this.discoveryClient.getKnownPeers();
      const targetStation = peers.find(p => p.stationId === targetIdentifier);
      
      if (targetStation) {
        console.log(`🌍 Queueing message for remote station: ${targetIdentifier}`);
        
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
      console.log(`📡 Attempting to send message to node ${targetNodeId}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
      await this.device.sendText(message, targetNodeId);
      console.log(`✅ Message sent successfully to node ${targetNodeId}`);
    } catch (error) {
      console.error(`❌ Failed to send message to ${targetNodeId}:`, error);
      console.error(`❌ Message that failed: "${message}"`);
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

  private async handlePeerDiscovered(peer: DiscoveredPeer): Promise<void> {
    console.log(`🆕 New bridge peer discovered: ${peer.stationId}`);
    
    try {
      // Decrypt the peer's contact info to get connection details
      if (!this.discoveryClient) {
        console.error('❌ Discovery client not available');
        return;
      }
      
      const contactInfo = await this.discoveryClient.decryptContactInfo(peer.encryptedContactInfo);
      console.log(`🔓 Decrypted contact info for ${peer.stationId}: ${contactInfo.ip}:${contactInfo.port}`);
      
      // Establish P2P connection via the bridge transport
      if (this.bridgeClient) {
        // Request node list from this peer
        console.log(`📋 Requesting node list from ${peer.stationId}...`);
        await this.requestNodeListFromPeer(peer.stationId);
        
        // Send our own node list to the peer
        console.log(`📤 Sending our node list to ${peer.stationId}...`);
        await this.sendNodeListToPeer(peer.stationId);
      }
    } catch (error) {
      console.error(`❌ Failed to handle peer discovery for ${peer.stationId}:`, error);
    }
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

  /**
   * Request node list from a peer station
   */
  private async requestNodeListFromPeer(stationId: string): Promise<void> {
    if (!this.bridgeClient) {
      console.error('❌ Bridge client not available for node list request');
      return;
    }

    try {
      // Send a system message requesting the node list
      await this.bridgeClient.sendSystemMessage(stationId, {
        type: 'NODE_LIST_REQUEST',
        requestId: `req_${Date.now()}`,
        timestamp: Date.now()
      });
      
      console.log(`📋 Node list request sent to ${stationId}`);
    } catch (error) {
      console.error(`❌ Failed to request node list from ${stationId}:`, error);
    }
  }

  /**
   * Send our node list to a peer station
   */
  private async sendNodeListToPeer(stationId: string): Promise<void> {
    if (!this.bridgeClient) {
      console.error('❌ Bridge client not available for sending node list');
      return;
    }

    try {
      // Get local nodes from the registry or fallback to known nodes
      let localNodes: any[] = [];
      
      if (this.nodeRegistry) {
        // Get nodes for our station from the registry
        localNodes = this.nodeRegistry.getNodesByStation(this.config.stationId);
      } else {
        // Fallback to using known mesh nodes
        localNodes = Array.from(this.knownNodes.entries()).map(([nodeId, node]) => ({
          nodeId: nodeId.toString(),
          nodeName: node.user?.longName || node.user?.shortName || `Node ${nodeId}`,
          stationId: this.config.stationId,
          lastSeen: Date.now(),
          isOnline: true,
          metadata: {
            meshNodeId: nodeId,
            nodeInfo: node
          }
        }));
      }

      // Format nodes for bridge discovery message
      const nodeData = localNodes.map((node: any) => {
        const targetResult = parseTargetIdentifier(node.nodeId);
        return {
          nodeId: targetResult.isNumeric ? (targetResult.value as number) : 0,
          name: node.nodeName || `Node ${node.nodeId}`,
          lastSeen: node.lastSeen || Date.now(),
          signal: node.metadata?.signal || 0
        };
      });

      await this.bridgeClient.broadcastNodeDiscovery(nodeData);
      console.log(`📤 Sent ${nodeData.length} nodes to ${stationId}`);
    } catch (error) {
      console.error(`❌ Failed to send node list to ${stationId}:`, error);
    }
  }

  /**
   * Handle incoming node discovery messages from bridge peers
   */
  private handleNodeDiscovery(nodeData: any): void {
    console.log(`🌉 Received node discovery from ${nodeData.stationId}: ${nodeData.nodes.length} nodes`);
    
    try {
      // Add remote nodes to our registry
      for (const node of nodeData.nodes) {
        const remoteNode = {
          nodeId: node.nodeId,
          nodeName: node.name,
          stationId: nodeData.stationId,
          lastSeen: node.lastSeen,
          signal: node.signal
        };
        
        // Add to remote nodes map
        this.remoteNodes.set(remoteNode.nodeId, remoteNode);
        console.log(`📋 Added remote node: ${remoteNode.nodeName} (${remoteNode.nodeId}) from ${remoteNode.stationId}`);
      }
      
      console.log(`✅ Successfully processed ${nodeData.nodes.length} remote nodes from ${nodeData.stationId}`);
    } catch (error) {
      console.error('❌ Failed to process node discovery:', error);
    }
  }

  /**
   * Handle incoming bridge messages
   */
  private handleBridgeMessage(message: any): void {
    console.log(`🌉 Received bridge message: ${message.payload.type}`);
    
    // Handle different types of bridge messages
    if (message.payload.type === 'SYSTEM') {
      try {
        const systemData = JSON.parse(message.payload.data);
        if (systemData.type === 'NODE_LIST_REQUEST') {
          console.log(`📋 Received node list request from ${message.routing.fromStation}`);
          // Send our node list in response
          this.sendNodeListToPeer(message.routing.fromStation);
        }
      } catch (error) {
        console.error('❌ Failed to parse system message:', error);
      }
    }
  }

  /**
   * Handle incoming user messages from remote stations
   */
  private async handleUserMessage({ fromStation, fromNode, toNode, message }: {
    fromStation: string;
    fromNode: number;
    toNode: number;
    message: string;
  }): Promise<void> {
    console.log(`📨 Received user message from ${fromStation}:${fromNode} → ${toNode}: "${message}"`);
    
    try {
      // Deliver the message to the local mesh network
      await this.device.sendText(message, toNode, true, 0);
      console.log(`✅ Message delivered to local node ${toNode}: "${message}"`);
    } catch (error) {
      console.error(`❌ Failed to deliver message to local node ${toNode}:`, error);
    }
  }
}
