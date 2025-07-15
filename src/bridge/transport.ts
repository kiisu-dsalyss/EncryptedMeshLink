/**
 * Bridge Transport Layer - MIB-008  
 * Handles sending and receiving bridge messages via discovery service relay
 * 
 * 🚨 ARCHITECTURE WARNING: This transport is DISABLED and should not be used!
 * Discovery service is ONLY for peer discovery, NOT message relay.
 * Use P2PTransport from MIB-010 instead.
 */

import { BridgeMessage, ErrorResponse, AckMessage, serializeBridgeMessage, deserializeBridgeMessage, createErrorResponse, ErrorCode } from './protocol';
import { P2PTransport, P2PTransportConfig } from '../p2p/transport';
import { CryptoService } from '../crypto/index';
import { DiscoveryClient } from '../discoveryClient';

export interface BridgeTransportConfig {
  discoveryServiceUrl: string;
  stationId: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface BridgeTransportStats {
  messagesSent: number;
  messagesReceived: number;
  sendErrors: number;
  receiveErrors: number;
  retryCount: number;
  lastActivity: number;
}

interface RelayResponse {
  success: boolean;
  error?: string;
}

interface MessagesResponse {
  success: boolean;
  error?: string;
  messages?: string[];
}

/**
 * Transport layer for bridge message communication
 */
export class BridgeTransport {
  private config: BridgeTransportConfig;
  private stats: BridgeTransportStats;
  private messageHandlers: Map<string, (message: BridgeMessage) => Promise<void>>;

  constructor(config: BridgeTransportConfig) {
    this.config = config;
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      sendErrors: 0,
      receiveErrors: 0,
      retryCount: 0,
      lastActivity: Date.now()
    };
    this.messageHandlers = new Map();
  }

  /**
   * Send a bridge message to another station
   */
  async sendMessage(message: BridgeMessage): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.sendMessageAttempt(message);
        this.stats.messagesSent++;
        this.stats.lastActivity = Date.now();
        return;
      } catch (error) {
        lastError = error as Error;
        this.stats.sendErrors++;
        
        if (attempt < this.config.retryAttempts) {
          this.stats.retryCount++;
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }
    
    throw new Error(`Failed to send message after ${this.config.retryAttempts + 1} attempts: ${lastError?.message}`);
  }

  /**
   * ARCHITECTURE WARNING: This method violates the design!
   * Discovery service is ONLY for peer discovery, NOT message relay.
   * This should establish direct P2P connection to target station.
   * TODO: Implement direct P2P in MIB-010
   */
  private async sendMessageAttempt(message: BridgeMessage): Promise<void> {
    // DISABLED: Discovery service should not be used for message relay
    console.warn('🚨 ARCHITECTURE ERROR: sendMessageAttempt() should not use discovery service!');
    console.warn('📡 Discovery service is ONLY for peer discovery, not message relay');
    console.warn('🎯 Should establish direct P2P connection to:', message.routing.toStation);
    console.warn('🔧 Direct P2P implementation needed in MIB-010');
    
    // Simulate success to prevent crashes during development
    this.stats.messagesSent++;
    this.stats.lastActivity = Date.now();
  }

  /**
   * ARCHITECTURE WARNING: This method violates the design!
   * Discovery service is ONLY for peer discovery, NOT message relay.
   * Messages should go P2P directly between stations.
   * TODO: Remove this and implement direct P2P in MIB-010
   */
  async pollMessages(): Promise<BridgeMessage[]> {
    // DISABLED: Discovery service should not be used for message polling
    console.warn('🚨 ARCHITECTURE ERROR: pollMessages() should not use discovery service!');
    console.warn('📡 Discovery service is ONLY for peer discovery, not message relay');
    console.warn('🔧 Direct P2P implementation needed in MIB-010');
    return []; // Return empty to prevent crashes
  }

  /**
   * Register a message handler for specific message types
   */
  onMessage(messageType: string, handler: (message: BridgeMessage) => Promise<void>): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Process received messages using registered handlers
   */
  async processMessages(messages: BridgeMessage[]): Promise<void> {
    for (const message of messages) {
      const handler = this.messageHandlers.get(message.payload.type);
      
      if (handler) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Error processing message ${message.messageId}:`, error);
          
          // Send error response if required
          if (message.delivery.requiresAck) {
            const errorResponse = createErrorResponse(
              ErrorCode.UNKNOWN_STATION,
              `Processing error: ${(error as Error).message}`,
              message.messageId,
              false
            );
            
            // TODO: Send error response back to sender
            console.log('Would send error response:', errorResponse);
          }
        }
      } else {
        console.warn(`No handler registered for message type: ${message.payload.type}`);
      }
    }
  }

  /**
   * Send an acknowledgment message
   */
  async sendAck(originalMessage: BridgeMessage, ack: AckMessage): Promise<void> {
    const ackMessage: BridgeMessage = {
      version: originalMessage.version,
      messageId: `ack-${ack.originalMessageId}`,
      timestamp: ack.timestamp,
      routing: {
        fromStation: originalMessage.routing.toStation,
        toStation: originalMessage.routing.fromStation,
        fromNode: originalMessage.routing.toNode,
        toNode: originalMessage.routing.fromNode,
        hops: []
      },
      payload: {
        type: 'ack' as any, // Using MessageType.ACK
        data: JSON.stringify(ack),
        encrypted: false
      },
      delivery: {
        priority: 2, // HIGH priority for acks
        ttl: 300,    // 5 minutes
        requiresAck: false,
        retryCount: 0,
        maxRetries: 1
      }
    };

    await this.sendMessage(ackMessage);
  }

  /**
   * Get transport statistics
   */
  getStats(): BridgeTransportStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      sendErrors: 0,
      receiveErrors: 0,
      retryCount: 0,
      lastActivity: Date.now()
    };
  }

  /**
   * Check if transport is healthy
   */
  isHealthy(): boolean {
    const timeSinceLastActivity = Date.now() - this.stats.lastActivity;
    const maxInactivity = 5 * 60 * 1000; // 5 minutes
    
    return timeSinceLastActivity < maxInactivity;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a bridge transport instance with default configuration
 * 
 * 🚨 DEPRECATED: Use createP2PBridgeTransport instead!
 */
export function createBridgeTransport(
  discoveryServiceUrl: string,
  stationId: string,
  options: Partial<BridgeTransportConfig> = {}
): BridgeTransport {
  console.warn('🚨 createBridgeTransport is DEPRECATED! Use createP2PBridgeTransport instead.');
  
  const config: BridgeTransportConfig = {
    discoveryServiceUrl,
    stationId,
    timeout: 10000,      // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000,    // 1 second base delay
    ...options
  };

  return new BridgeTransport(config);
}

/**
 * Create a P2P-based bridge transport (MIB-010)
 * This is the correct way to create bridge transport with direct P2P messaging
 */
export function createP2PBridgeTransport(
  stationId: string,
  crypto: CryptoService,
  discoveryClient?: DiscoveryClient,
  options: Partial<P2PTransportConfig> = {}
): P2PTransport {
  const config: P2PTransportConfig = {
    stationId,
    localPort: 8080,     // Default P2P port
    connectionTimeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    ...options
  };

  return new P2PTransport(config, crypto, discoveryClient);
}
