/**
 * Bridge Transport Layer - MIB-008
 * Handles sending and receiving bridge messages via discovery service relay
 */

import { BridgeMessage, ErrorResponse, AckMessage, serializeBridgeMessage, deserializeBridgeMessage, createErrorResponse, ErrorCode } from './protocol.js';

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
   * Single attempt to send a message
   */
  private async sendMessageAttempt(message: BridgeMessage): Promise<void> {
    const serializedMessage = serializeBridgeMessage(message);
    
    const response = await fetch(`${this.config.discoveryServiceUrl}?relay=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Station-ID': this.config.stationId
      },
      body: JSON.stringify({
        targetStation: message.routing.toStation,
        message: serializedMessage
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json() as RelayResponse;
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown relay error');
    }
  }

  /**
   * Poll for incoming messages
   */
  async pollMessages(): Promise<BridgeMessage[]> {
    try {
      const response = await fetch(`${this.config.discoveryServiceUrl}?messages=${this.config.stationId}`, {
        method: 'GET',
        headers: {
          'X-Station-ID': this.config.stationId
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json() as MessagesResponse;
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown polling error');
      }

      const messages: BridgeMessage[] = [];
      
      for (const messageData of result.messages || []) {
        try {
          const message = deserializeBridgeMessage(messageData);
          messages.push(message);
          this.stats.messagesReceived++;
        } catch (error) {
          console.error('Failed to deserialize bridge message:', error);
          this.stats.receiveErrors++;
        }
      }

      if (messages.length > 0) {
        this.stats.lastActivity = Date.now();
      }

      return messages;
    } catch (error) {
      this.stats.receiveErrors++;
      throw error;
    }
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
 */
export function createBridgeTransport(
  discoveryServiceUrl: string,
  stationId: string,
  options: Partial<BridgeTransportConfig> = {}
): BridgeTransport {
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
