/**
 * Bridge Client - MIB-008
 * High-level interface for bridge message communication
 */

import { BridgeTransport, createBridgeTransport, BridgeTransportStats } from './transport.js';
import { 
  BridgeMessage, 
  MessageType, 
  MessagePriority, 
  createBridgeMessage, 
  createAckMessage,
  isMessageExpired,
  NodeDiscoveryPayload,
  StationInfoPayload
} from './protocol.js';
import { EventEmitter } from 'events';

export interface BridgeClientConfig {
  discoveryServiceUrl: string;
  stationId: string;
  pollingInterval: number;
  autoStart: boolean;
}

export interface BridgeClientEvents {
  'message': (message: BridgeMessage) => void;
  'userMessage': (fromNode: number, toNode: number, text: string, fromStation: string) => void;
  'nodeDiscovery': (nodes: NodeDiscoveryPayload) => void;
  'stationInfo': (info: StationInfoPayload) => void;
  'error': (error: Error) => void;
  'connected': () => void;
  'disconnected': () => void;
}

/**
 * High-level bridge client for inter-station communication
 */
export class BridgeClient extends EventEmitter {
  private config: BridgeClientConfig;
  private transport: BridgeTransport;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private myNodeNumber: number | null = null;

  constructor(config: BridgeClientConfig) {
    super();
    this.config = config;
    this.transport = createBridgeTransport(config.discoveryServiceUrl, config.stationId);
    
    this.setupMessageHandlers();
    
    if (config.autoStart) {
      this.start().catch(error => this.emit('error', error));
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
    this.startPolling();
    this.emit('connected');
    
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
    this.stopPolling();
    this.emit('disconnected');
    
    console.log(`🌉 Bridge client stopped for station: ${this.config.stationId}`);
  }

  /**
   * Send a user message to another station
   */
  async sendUserMessage(
    targetStation: string,
    fromNode: number,
    toNode: number,
    message: string,
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<void> {
    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      fromNode,
      toNode,
      MessageType.USER_MESSAGE,
      message,
      { priority }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Sent message to ${targetStation}: ${message.substring(0, 50)}...`);
  }

  /**
   * Send a command to another station
   */
  async sendCommand(
    targetStation: string,
    fromNode: number,
    toNode: number,
    command: string,
    priority: MessagePriority = MessagePriority.HIGH
  ): Promise<void> {
    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      fromNode,
      toNode,
      MessageType.COMMAND,
      command,
      { priority }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Sent command to ${targetStation}: ${command}`);
  }

  /**
   * Broadcast node discovery information
   */
  async broadcastNodeDiscovery(nodes: NodeDiscoveryPayload['nodes']): Promise<void> {
    const payload: NodeDiscoveryPayload = {
      nodes,
      stationId: this.config.stationId,
      timestamp: Date.now()
    };

    // For now, we'll send to all known peers (this would be enhanced with peer discovery)
    // TODO: Get actual peer list from discovery client
    console.log(`🌉 Broadcasting node discovery: ${nodes.length} nodes`);
  }

  /**
   * Send station information
   */
  async sendStationInfo(targetStation: string, stationInfo: Omit<StationInfoPayload, 'stationId'>): Promise<void> {
    const payload: StationInfoPayload = {
      ...stationInfo,
      stationId: this.config.stationId
    };

    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      0, // System message
      0, // System message
      MessageType.STATION_INFO,
      JSON.stringify(payload),
      { priority: MessagePriority.LOW }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Sent station info to ${targetStation}`);
  }

  /**
   * Send heartbeat to another station
   */
  async sendHeartbeat(targetStation: string): Promise<void> {
    const heartbeatData = {
      stationId: this.config.stationId,
      timestamp: Date.now(),
      status: 'healthy'
    };

    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      0, // System message
      0, // System message
      MessageType.HEARTBEAT,
      JSON.stringify(heartbeatData),
      { 
        priority: MessagePriority.LOW,
        ttl: 300, // 5 minutes
        requiresAck: false
      }
    );

    await this.transport.sendMessage(bridgeMessage);
  }

  /**
   * Send a system message (for internal bridge communication)
   */
  async sendSystemMessage(
    targetStation: string,
    payload: any,
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<void> {
    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      targetStation,
      0, // System message
      0, // System message
      MessageType.SYSTEM,
      JSON.stringify(payload),
      { priority }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Sent system message to ${targetStation}: ${payload.type}`);
  }

  /**
   * Broadcast a system message to all known stations
   */
  async broadcastSystemMessage(
    payload: any,
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<void> {
    // For now, broadcast to a placeholder "ALL" target
    // TODO: Implement actual peer discovery and broadcast to known stations
    const bridgeMessage = createBridgeMessage(
      this.config.stationId,
      'ALL', // Broadcast target
      0, // System message
      0, // System message
      MessageType.SYSTEM,
      JSON.stringify(payload),
      { priority }
    );

    await this.transport.sendMessage(bridgeMessage);
    console.log(`🌉 Broadcast system message: ${payload.type}`);
  }

  /**
   * Get bridge transport statistics
   */
  getStats(): BridgeTransportStats {
    return this.transport.getStats();
  }

  /**
   * Check if bridge is healthy
   */
  isHealthy(): boolean {
    return this.isRunning && this.transport.isHealthy();
  }

  /**
   * Set the local node number for this station
   */
  setNodeNumber(nodeNumber: number): void {
    this.myNodeNumber = nodeNumber;
  }

  /**
   * Setup message handlers for different message types
   */
  private setupMessageHandlers(): void {
    this.transport.onMessage(MessageType.USER_MESSAGE, async (message) => {
      this.emit('message', message);
      this.emit('userMessage', 
        message.routing.fromNode, 
        message.routing.toNode, 
        message.payload.data,
        message.routing.fromStation
      );
      
      // Send ack if required
      if (message.delivery.requiresAck) {
        const ack = createAckMessage(message.messageId, 'delivered');
        await this.transport.sendAck(message, ack);
      }
    });

    this.transport.onMessage(MessageType.COMMAND, async (message) => {
      this.emit('message', message);
      console.log(`🌉 Received command from ${message.routing.fromStation}: ${message.payload.data}`);
      
      // Send ack if required
      if (message.delivery.requiresAck) {
        const ack = createAckMessage(message.messageId, 'delivered');
        await this.transport.sendAck(message, ack);
      }
    });

    this.transport.onMessage(MessageType.NODE_DISCOVERY, async (message) => {
      try {
        const nodeData = JSON.parse(message.payload.data) as NodeDiscoveryPayload;
        this.emit('nodeDiscovery', nodeData);
        console.log(`🌉 Received node discovery from ${message.routing.fromStation}: ${nodeData.nodes.length} nodes`);
      } catch (error) {
        console.error('Failed to parse node discovery data:', error);
      }
    });

    this.transport.onMessage(MessageType.STATION_INFO, async (message) => {
      try {
        const stationInfo = JSON.parse(message.payload.data) as StationInfoPayload;
        this.emit('stationInfo', stationInfo);
        console.log(`🌉 Received station info from ${message.routing.fromStation}: ${stationInfo.displayName}`);
      } catch (error) {
        console.error('Failed to parse station info data:', error);
      }
    });

    this.transport.onMessage(MessageType.HEARTBEAT, async (message) => {
      console.log(`💓 Heartbeat from ${message.routing.fromStation}`);
    });

    this.transport.onMessage(MessageType.ACK, async (message) => {
      console.log(`✅ Acknowledgment received for message: ${message.payload.data}`);
    });

    this.transport.onMessage(MessageType.ERROR, async (message) => {
      console.error(`❌ Error from ${message.routing.fromStation}: ${message.payload.data}`);
      this.emit('error', new Error(message.payload.data));
    });
  }

  /**
   * Start polling for messages
   */
  private startPolling(): void {
    this.pollingTimer = setInterval(async () => {
      try {
        const messages = await this.transport.pollMessages();
        
        if (messages.length > 0) {
          console.log(`🌉 Received ${messages.length} bridge messages`);
          
          // Filter out expired messages
          const validMessages = messages.filter(msg => !isMessageExpired(msg));
          
          if (validMessages.length !== messages.length) {
            console.warn(`🌉 Filtered out ${messages.length - validMessages.length} expired messages`);
          }
          
          await this.transport.processMessages(validMessages);
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
        this.emit('error', error as Error);
      }
    }, this.config.pollingInterval);
  }

  /**
   * Stop polling for messages
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}

/**
 * Create a bridge client with default configuration
 */
export function createBridgeClient(
  discoveryServiceUrl: string,
  stationId: string,
  options: Partial<BridgeClientConfig> = {}
): BridgeClient {
  const config: BridgeClientConfig = {
    discoveryServiceUrl,
    stationId,
    pollingInterval: 5000, // 5 seconds
    autoStart: false,
    ...options
  };

  return new BridgeClient(config);
}
