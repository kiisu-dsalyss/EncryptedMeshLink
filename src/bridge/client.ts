/**
 * Bridge Client - MIB-008 
 * High-level interface for bridge message communication via P2P (MIB-010)
 */

import { createP2PBridgeTransport } from './transport';
import { P2PTransport, P2PTransportStats } from '../p2p/transport';
import { CryptoService } from '../crypto/index';
import { DiscoveryClientModular } from '../discovery/index';
import { 
  BridgeMessage, 
  MessageType, 
  MessagePriority, 
  createBridgeMessage
} from './protocol';
import { EventEmitter } from 'events';

export interface BridgeClientConfig {
  stationId: string;
  pollingInterval: number;
  autoStart: boolean;
  discoveryServiceUrl?: string; // Legacy field for backward compatibility
  localPort?: number;
  connectionTimeout?: number;
}

export interface BridgeClientEvents {
  'message': (message: BridgeMessage) => void;
  'nodeDiscovered': (nodeId: string, nodeInfo: any) => void;
  'error': (error: Error) => void;
  'started': () => void;
  'stopped': () => void;
  'connected': (stationId: string) => void;
  'disconnected': (stationId: string) => void;
  'stats': (stats: P2PTransportStats) => void;
}

/**
 * Bridge client for P2P station communication
 */
export class BridgeClient extends EventEmitter {
  private transport: P2PTransport;
  private isRunning: boolean = false;
  private config: BridgeClientConfig;
  private crypto: CryptoService;

  constructor(config: BridgeClientConfig, crypto: CryptoService, discoveryClient?: DiscoveryClientModular) {
    super();
    this.config = config;
    this.crypto = crypto;

    // Create P2P transport
    this.transport = createP2PBridgeTransport(
      config.stationId, 
      crypto, 
      discoveryClient,
      {
        localPort: config.localPort || 8447,
        connectionTimeout: config.connectionTimeout || 10000
      }
    );

    // Setup message handlers
    this.setupMessageHandlers();

    if (config.autoStart) {
      this.start();
    }
  }

  /**
   * Start the bridge client
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Start the transport
    await this.transport.start();
    
    this.emit('started');
    console.log(`🌉 Bridge client started for station: ${this.config.stationId}`);
  }

  /**
   * Stop the bridge client
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Stop the transport
    await this.transport.stop();
    
    this.emit('stopped');
    console.log(`🌉 Bridge client stopped for station: ${this.config.stationId}`);
  }

  /**
   * Send a message to a specific station via bridge
   */
  async sendMessage(
    targetStation: string, 
    message: string, 
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<void> {
    // For now, use dummy node IDs - this will be enhanced later
    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      0, // fromNode placeholder
      0, // toNode placeholder  
      MessageType.USER_MESSAGE,
      message,
      { priority }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Sent message to ${targetStation}: ${message.substring(0, 50)}...`);
  }

  /**
   * Send a command to a specific station via bridge
   */
  async sendCommand(
    targetStation: string, 
    command: string, 
    priority: MessagePriority = MessagePriority.HIGH
  ): Promise<void> {
    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      0, // fromNode placeholder
      0, // toNode placeholder
      MessageType.COMMAND,
      command,
      { priority }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Sent command to ${targetStation}: ${command}`);
  }

  /**
   * Get transport statistics
   */
  getStats(): P2PTransportStats {
    return this.transport.getStats();
  }

  /**
   * Get connected peers
   */
  getConnectedPeers(): string[] {
    return this.transport.getConnectedPeers();
  }

  /**
   * Check if connected to a specific station
   */
  isConnectedTo(stationId: string): boolean {
    return this.transport.getConnectedPeers().includes(stationId);
  }

  /**
   * Broadcast message to all connected stations
   */
  async broadcastMessage(
    message: string, 
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<void> {
    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      'ALL',
      0, // fromNode placeholder
      0, // toNode placeholder
      MessageType.USER_MESSAGE,
      message,
      { priority }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Broadcasted message: ${message.substring(0, 50)}...`);
  }

  /**
   * Send node discovery request
   */
  async requestNodeDiscovery(targetStation: string): Promise<void> {
    const payload = {
      requestId: Math.random().toString(36).substring(2, 15),
      requestedRegion: 'global'
    };

    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      0, // fromNode placeholder
      0, // toNode placeholder
      MessageType.NODE_DISCOVERY,
      JSON.stringify(payload),
      { priority: MessagePriority.HIGH }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Requested node discovery from ${targetStation}`);
  }

  /**
   * Send station info request
   */
  async requestStationInfo(targetStation: string): Promise<void> {
    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      0, // fromNode placeholder
      0, // toNode placeholder
      MessageType.STATION_INFO,
      '',
      { priority: MessagePriority.NORMAL }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Requested station info from ${targetStation}`);
  }

  /**
   * Get transport statistics
   */
  getTransportStats(): P2PTransportStats {
    return this.transport.getStats();
  }

  /**
   * Handle incoming messages
   */
  private setupMessageHandlers(): void {
    this.transport.on('message', (message: BridgeMessage) => {
      console.log(`🌉 Received ${message.payload.type} from ${message.routing.fromStation}: ${message.payload.data.substring(0, 50)}...`);
      
      // Handle different message types
      switch (message.payload.type) {
        case MessageType.USER_MESSAGE:
          this.emit('message', message);
          break;
          
        case MessageType.COMMAND:
          this.emit('message', message);
          break;
          
        case MessageType.NODE_DISCOVERY:
          this.handleNodeDiscovery(message);
          break;
          
        case MessageType.STATION_INFO:
          this.handleStationInfo(message);
          break;
          
        case MessageType.ACK:
          console.log(`✅ Received ACK from ${message.routing.fromStation}`);
          break;
          
        default:
          console.warn(`❓ Unknown message type: ${message.payload.type}`);
      }
    });

    this.transport.on('error', (error: Error) => {
      console.error('🚨 Bridge transport error:', error);
      this.emit('error', error);
    });

    this.transport.on('connected', (stationId: string) => {
      console.log(`🔗 Connected to station: ${stationId}`);
      this.emit('connected', stationId);
    });

    this.transport.on('disconnected', (stationId: string) => {
      console.log(`🔌 Disconnected from station: ${stationId}`);
      this.emit('disconnected', stationId);
    });
  }

  /**
   * Handle node discovery messages
   */
  private handleNodeDiscovery(message: BridgeMessage): void {
    try {
      const payload = JSON.parse(message.payload.data);
      console.log(`📡 Node discovery from ${message.routing.fromStation}:`, payload);
      this.emit('nodeDiscovered', message.routing.fromStation, payload);
    } catch (error) {
      console.error('❌ Failed to parse node discovery payload:', error);
    }
  }

  /**
   * Handle station info messages
   */
  private handleStationInfo(message: BridgeMessage): void {
    try {
      const payload = JSON.parse(message.payload.data);
      console.log(`📊 Station info from ${message.routing.fromStation}:`, payload);
      this.emit('message', message);
    } catch (error) {
      console.error('❌ Failed to parse station info payload:', error);
    }
  }
}

/**
 * Create a bridge client with default configuration
 * 
 * 🚨 DEPRECATED: Use createP2PBridgeClient instead!
 */
export function createBridgeClient(
  discoveryServiceUrl: string,
  stationId: string,
  crypto: CryptoService,
  discoveryClient?: DiscoveryClientModular,
  options: Partial<BridgeClientConfig> = {}
): BridgeClient {
  console.warn('🚨 createBridgeClient is DEPRECATED! Use createP2PBridgeClient instead.');
  
  const config: BridgeClientConfig = {
    stationId,
    pollingInterval: 5000, // 5 seconds
    autoStart: false,
    discoveryServiceUrl, // Legacy field
    ...options
  };

  return new BridgeClient(config, crypto, discoveryClient);
}

/**
 * Create a P2P-based bridge client (MIB-010)
 * This is the correct way to create bridge client with direct P2P messaging
 */
export function createP2PBridgeClient(
  stationId: string,
  crypto: CryptoService,
  discoveryClient?: DiscoveryClientModular,
  options: Partial<BridgeClientConfig> = {}
): BridgeClient {
  const config: BridgeClientConfig = {
    stationId,
    pollingInterval: 5000, // 5 seconds for peer discovery
    autoStart: false,
    localPort: 8447,
    connectionTimeout: 10000,
    ...options
  };

  return new BridgeClient(config, crypto, discoveryClient);
}
