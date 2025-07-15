/**
 * P2P Transport Layer - MIB-010
 * Direct peer-to-peer message transport for bridge communication
 */

import { EventEmitter } from 'events';
import { P2PConnectionManager } from './connectionManager';
import { P2PConnectionConfig, PeerInfo, P2PMessage, P2PConnectionStats } from './types';
import { BridgeMessage, serializeBridgeMessage, deserializeBridgeMessage } from '../bridge/protocol';
import { CryptoService } from '../crypto';
import { DiscoveryClient } from '../discoveryClient';

export interface P2PTransportConfig {
  stationId: string;
  localPort: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface P2PTransportStats extends P2PConnectionStats {
  bridgeMessagesSent: number;
  bridgeMessagesReceived: number;
  sendErrors: number;
  receiveErrors: number;
  retryCount: number;
  lastActivity: number;
}

/**
 * P2P Transport for direct bridge message delivery
 */
export class P2PTransport extends EventEmitter {
  private config: P2PTransportConfig;
  private connectionManager: P2PConnectionManager;
  private crypto: CryptoService;
  private discoveryClient?: DiscoveryClient;
  private stats: P2PTransportStats;
  private messageHandlers: Map<string, (message: BridgeMessage) => Promise<void>>;
  private pendingConnections: Map<string, Promise<void>> = new Map();

  constructor(config: P2PTransportConfig, crypto: CryptoService, discoveryClient?: DiscoveryClient) {
    super();
    this.config = config;
    this.crypto = crypto;
    this.discoveryClient = discoveryClient;

    const connectionConfig: P2PConnectionConfig = {
      localPort: config.localPort,
      enableTcp: true,
      enableWebSocket: true,
      enableWebRTC: false, // TODO: Implement WebRTC
      connectionTimeout: config.connectionTimeout,
      keepAliveInterval: 30000, // 30 seconds
      maxRetries: config.retryAttempts,
      retryDelay: config.retryDelay
    };

    this.connectionManager = new P2PConnectionManager(connectionConfig, crypto);
    this.stats = {
      connectionsActive: 0,
      connectionsTotal: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      connectionErrors: 0,
      bridgeMessagesSent: 0,
      bridgeMessagesReceived: 0,
      sendErrors: 0,
      receiveErrors: 0,
      retryCount: 0,
      lastActivity: Date.now()
    };

    this.messageHandlers = new Map();
    this.setupConnectionManagerEvents();
  }

  /**
   * Start the P2P transport
   */
  async start(): Promise<void> {
    console.log('🚀 Starting P2P Transport...');
    
    try {
      await this.connectionManager.start();
      console.log('✅ P2P Transport started successfully');
    } catch (error) {
      console.error('❌ Failed to start P2P Transport:', error);
      throw error;
    }
  }

  /**
   * Stop the P2P transport
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping P2P Transport...');
    
    try {
      await this.connectionManager.stop();
      console.log('✅ P2P Transport stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping P2P Transport:', error);
      throw error;
    }
  }

  /**
   * Send a bridge message to another station via P2P
   */
  async sendMessage(message: BridgeMessage): Promise<void> {
    const targetStation = message.routing.toStation;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.sendMessageAttempt(message);
        this.stats.bridgeMessagesSent++;
        this.stats.lastActivity = Date.now();
        return;
      } catch (error) {
        lastError = error as Error;
        this.stats.sendErrors++;
        
        if (attempt < this.config.retryAttempts) {
          this.stats.retryCount++;
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          console.warn(`Retrying message to ${targetStation} in ${delay}ms (attempt ${attempt + 1})`);
          await this.delay(delay);
        }
      }
    }

    throw new Error(`Failed to send message to ${targetStation} after ${this.config.retryAttempts + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Register a message handler for specific message types
   */
  onMessage(messageType: string, handler: (message: BridgeMessage) => Promise<void>): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Get transport statistics
   */
  getStats(): P2PTransportStats {
    const connStats = this.connectionManager.getStats();
    return {
      ...connStats,
      bridgeMessagesSent: this.stats.bridgeMessagesSent,
      bridgeMessagesReceived: this.stats.bridgeMessagesReceived,
      sendErrors: this.stats.sendErrors,
      receiveErrors: this.stats.receiveErrors,
      retryCount: this.stats.retryCount,
      lastActivity: this.stats.lastActivity
    };
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers(): string[] {
    return this.connectionManager.getConnectedPeers();
  }

  /**
   * Check if transport is healthy (has active connections or can establish them)
   */
  isHealthy(): boolean {
    const connectedPeers = this.connectionManager.getConnectedPeers();
    return connectedPeers.length > 0 || this.discoveryClient !== undefined;
  }

  /**
   * Send an ACK message for a received bridge message
   */
  async sendAck(originalMessage: BridgeMessage, ackMessage: any): Promise<void> {
    // Create ACK as a bridge message and send via normal sendMessage
    const ackBridgeMessage = {
      ...ackMessage,
      routing: {
        fromStation: this.config.stationId,
        toStation: originalMessage.routing.fromStation,
        messageId: ackMessage.messageId || 'ack-' + Date.now()
      }
    } as BridgeMessage;

    await this.sendMessage(ackBridgeMessage);
  }

  // Private methods

  private async sendMessageAttempt(message: BridgeMessage): Promise<void> {
    const targetStation = message.routing.toStation;

    // Ensure we have a connection to the target station
    await this.ensureConnection(targetStation);

    // Serialize the bridge message
    const serializedMessage = serializeBridgeMessage(message);
    
    // Create P2P message with encryption
    const p2pMessage: P2PMessage = {
      id: message.messageId,
      fromStation: this.config.stationId,
      toStation: targetStation,
      payload: serializedMessage, // TODO: Add encryption here
      timestamp: Date.now(),
      signature: '' // TODO: Add message signing
    };

    // Send via connection manager
    await this.connectionManager.sendMessage(targetStation, p2pMessage);
    
    console.log(`📤 Sent bridge message ${message.messageId} to ${targetStation}`);
  }

  private async ensureConnection(targetStation: string): Promise<void> {
    // Check if already connected
    const connectedPeers = this.connectionManager.getConnectedPeers();
    if (connectedPeers.includes(targetStation)) {
      return;
    }

    // Check if connection is in progress
    const existingPromise = this.pendingConnections.get(targetStation);
    if (existingPromise) {
      await existingPromise;
      return;
    }

    // Start new connection
    const connectionPromise = this.establishConnection(targetStation);
    this.pendingConnections.set(targetStation, connectionPromise);
    
    try {
      await connectionPromise;
    } finally {
      this.pendingConnections.delete(targetStation);
    }
  }

  private async establishConnection(targetStation: string): Promise<void> {
    console.log(`🔗 Establishing connection to ${targetStation}...`);

    // Get peer info from discovery client
    const peerInfo = await this.getPeerInfo(targetStation);
    if (!peerInfo) {
      throw new Error(`Cannot find peer info for station ${targetStation}`);
    }

    // Connect via connection manager
    await this.connectionManager.connectToPeer(peerInfo);
    console.log(`✅ Connected to ${targetStation}`);
  }

  private async getPeerInfo(targetStation: string): Promise<PeerInfo | null> {
    if (!this.discoveryClient) {
      console.warn('No discovery client available for peer lookup');
      return null;
    }

    try {
      // Get current peers from discovery service
      const peers = this.discoveryClient.getKnownPeers();
      
      for (const peer of peers) {
        if (peer.stationId === targetStation) {
          // TODO: Decrypt the contact info to get actual host/port
          // For now, we'll need to add a method to decrypt contact info
          console.warn(`🔧 Contact info decryption not yet implemented for ${targetStation}`);
          
          // Placeholder - in real implementation, decrypt peer.encryptedContactInfo
          return {
            stationId: peer.stationId,
            host: '127.0.0.1', // Placeholder
            port: 8080, // Placeholder  
            publicKey: peer.publicKey,
            lastSeen: peer.lastSeen,
            connectionType: 'tcp' // Default to TCP for now
          };
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to get peer info for ${targetStation}:`, error);
      return null;
    }
  }

  private setupConnectionManagerEvents(): void {
    this.connectionManager.on('peer-connected', (peerId: string) => {
      console.log(`🔗 P2P peer connected: ${peerId}`);
    });

    this.connectionManager.on('peer-disconnected', (peerId: string, reason: string) => {
      console.log(`🔌 P2P peer disconnected: ${peerId} (${reason})`);
    });

    this.connectionManager.on('message-received', (p2pMessage: P2PMessage, fromPeer: string) => {
      this.handleReceivedMessage(p2pMessage, fromPeer);
    });

    this.connectionManager.on('connection-error', (peerId: string, error: Error) => {
      console.error(`❌ P2P connection error with ${peerId}:`, error);
      this.stats.connectionErrors++;
    });
  }

  private async handleReceivedMessage(p2pMessage: P2PMessage, fromPeer: string): Promise<void> {
    try {
      // TODO: Verify signature and decrypt payload
      const serializedMessage = p2pMessage.payload;
      const bridgeMessage = deserializeBridgeMessage(serializedMessage);

      this.stats.bridgeMessagesReceived++;
      this.stats.lastActivity = Date.now();

      console.log(`📥 Received bridge message ${bridgeMessage.messageId} from ${fromPeer}`);

      // Route to appropriate handler
      const handler = this.messageHandlers.get(bridgeMessage.payload.type);
      if (handler) {
        await handler(bridgeMessage);
      } else {
        console.warn(`No handler for message type: ${bridgeMessage.payload.type}`);
      }

    } catch (error) {
      console.error(`Failed to process message from ${fromPeer}:`, error);
      this.stats.receiveErrors++;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
