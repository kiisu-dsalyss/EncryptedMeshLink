/**
 * Bridge Message Protocol - MIB-008
 * Defines the message format and protocol for inter-station communication
 */

import { randomUUID } from 'crypto';

export const PROTOCOL_VERSION = '1.0.0';

/**
 * Core bridge message structure
 */
export interface BridgeMessage {
  // Protocol metadata
  version: string;
  messageId: string;
  timestamp: number;
  
  // Routing information
  routing: {
    fromStation: string;    // Source station ID
    toStation: string;      // Destination station ID
    fromNode: number;       // Original Meshtastic node
    toNode: number;         // Target Meshtastic node
    hops: string[];         // Station path (for future multi-hop)
  };
  
  // Message payload
  payload: {
    type: MessageType;
    data: string;           // The actual message content
    encrypted: boolean;     // Whether payload.data is encrypted
  };
  
  // Delivery metadata
  delivery: {
    priority: MessagePriority;
    ttl: number;            // Seconds until expiry
    requiresAck: boolean;   // Whether sender needs confirmation
    retryCount: number;     // Current retry attempt
    maxRetries: number;     // Maximum retry attempts
  };
}

/**
 * Message types for different communication purposes
 */
export enum MessageType {
  // User messages
  USER_MESSAGE = 'user_message',           // Regular mesh message
  COMMAND = 'command',                     // @instructions, @nodes, etc.
  
  // System messages
  SYSTEM = 'system',                       // Internal system messages
  HEARTBEAT = 'heartbeat',                 // Station health check
  NODE_DISCOVERY = 'node_discovery',       // Share discovered nodes
  STATION_INFO = 'station_info',           // Station capabilities
  
  // Protocol messages
  ACK = 'ack',                            // Delivery confirmation
  NACK = 'nack',                          // Delivery failure
  ERROR = 'error',                        // Protocol error
  
  // Queue management
  QUEUE_STATUS = 'queue_status',          // Queue health info
  DELIVERY_RECEIPT = 'delivery_receipt'    // Final delivery confirmation
}

/**
 * Message priority levels
 */
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  errorCode: ErrorCode;
  errorMessage: string;
  originalMessageId: string;
  retryAfter?: number;     // Seconds to wait before retry
  permanent: boolean;      // Whether this error is permanent
}

/**
 * Error codes for standardized error handling
 */
export enum ErrorCode {
  NODE_NOT_FOUND = 'node_not_found',
  STATION_OFFLINE = 'station_offline',
  MESSAGE_EXPIRED = 'message_expired',
  INVALID_FORMAT = 'invalid_format',
  ENCRYPTION_ERROR = 'encryption_error',
  RATE_LIMITED = 'rate_limited',
  QUEUE_FULL = 'queue_full',
  UNKNOWN_STATION = 'unknown_station',
  PROTOCOL_VERSION_MISMATCH = 'protocol_version_mismatch'
}

/**
 * Protocol capabilities for version negotiation
 */
export interface ProtocolCapabilities {
  version: string;
  supportedMessageTypes: MessageType[];
  maxMessageSize: number;
  compressionSupported: boolean;
  encryptionMethods: string[];
  features: string[];     // ['message-queue', 'node-registry', 'multi-hop']
}

/**
 * Compressed message wrapper (future feature)
 */
export interface CompressedMessage extends Omit<BridgeMessage, 'payload'> {
  payload: {
    type: MessageType;
    data: string;           // Compressed data
    encrypted: boolean;
    compressed: true;
    compressionMethod: 'gzip' | 'brotli';
    originalSize: number;
  };
}

/**
 * Acknowledgment message structure
 */
export interface AckMessage {
  originalMessageId: string;
  status: 'delivered' | 'queued' | 'failed';
  timestamp: number;
  queuePosition?: number;  // If queued
  estimatedDelivery?: number; // Unix timestamp
}

/**
 * Node discovery message payload
 */
export interface NodeDiscoveryPayload {
  nodes: Array<{
    nodeId: number;
    name: string;
    lastSeen: number;
    signal: number;
  }>;
  stationId: string;
  timestamp: number;
}

/**
 * Station info message payload
 */
export interface StationInfoPayload {
  stationId: string;
  displayName: string;
  location?: string;
  operator?: string;
  capabilities: ProtocolCapabilities;
  nodeCount: number;
  queueStatus: {
    pending: number;
    processing: number;
    failed: number;
  };
}

/**
 * Create a new bridge message with defaults
 */
export function createBridgeMessage(
  fromStation: string,
  toStation: string,
  fromNode: number,
  toNode: number,
  messageType: MessageType,
  data: string,
  options: Partial<BridgeMessage['delivery']> = {}
): BridgeMessage {
  const messageId = randomUUID();
  console.log(`🔧 DEBUG: createBridgeMessage generated messageId: ${messageId}`);
  
  return {
    version: PROTOCOL_VERSION,
    messageId: messageId,
    timestamp: Date.now(),
    
    routing: {
      fromStation,
      toStation,
      fromNode,
      toNode,
      hops: []
    },
    
    payload: {
      type: messageType,
      data,
      encrypted: false
    },
    
    delivery: {
      priority: MessagePriority.NORMAL,
      ttl: 3600, // 1 hour default
      requiresAck: true,
      retryCount: 0,
      maxRetries: 3,
      ...options
    }
  };
}

/**
 * Create an acknowledgment message
 */
export function createAckMessage(
  originalMessageId: string,
  status: AckMessage['status'],
  queuePosition?: number,
  estimatedDelivery?: number
): AckMessage {
  return {
    originalMessageId,
    status,
    timestamp: Date.now(),
    queuePosition,
    estimatedDelivery
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  errorCode: ErrorCode,
  errorMessage: string,
  originalMessageId: string,
  permanent: boolean = false,
  retryAfter?: number
): ErrorResponse {
  return {
    errorCode,
    errorMessage,
    originalMessageId,
    permanent,
    retryAfter
  };
}

/**
 * Validate bridge message format
 */
export function validateBridgeMessage(message: any): message is BridgeMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  // Check required fields
  const requiredFields = ['version', 'messageId', 'timestamp', 'routing', 'payload', 'delivery'];
  if (!requiredFields.every(field => field in message)) {
    return false;
  }

  // Check routing structure
  const routingFields = ['fromStation', 'toStation', 'fromNode', 'toNode', 'hops'];
  if (!routingFields.every(field => field in message.routing)) {
    return false;
  }

  // Check payload structure
  const payloadFields = ['type', 'data', 'encrypted'];
  if (!payloadFields.every(field => field in message.payload)) {
    return false;
  }

  // Check delivery structure
  const deliveryFields = ['priority', 'ttl', 'requiresAck', 'retryCount', 'maxRetries'];
  if (!deliveryFields.every(field => field in message.delivery)) {
    return false;
  }

  // Validate enums
  if (!Object.values(MessageType).includes(message.payload.type)) {
    return false;
  }

  if (!Object.values(MessagePriority).includes(message.delivery.priority)) {
    return false;
  }

  return true;
}

/**
 * Check if message has expired
 */
export function isMessageExpired(message: BridgeMessage): boolean {
  const expiryTime = message.timestamp + (message.delivery.ttl * 1000);
  return Date.now() > expiryTime;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Max 30 seconds
}

/**
 * Serialize bridge message to JSON string
 */
export function serializeBridgeMessage(message: BridgeMessage): string {
  return JSON.stringify(message);
}

/**
 * Deserialize JSON string to bridge message
 */
export function deserializeBridgeMessage(json: string): BridgeMessage {
  const parsed = JSON.parse(json);
  
  if (!validateBridgeMessage(parsed)) {
    console.error('🚫 Bridge message validation failed:');
    console.error('   Raw JSON:', json.substring(0, 200));
    console.error('   Parsed object:', JSON.stringify(parsed, null, 2));
    console.error('   MessageId:', parsed.messageId);
    console.error('   Version:', parsed.version);
    console.error('   Routing:', parsed.routing);
    console.error('   Payload:', parsed.payload);
    console.error('   Delivery:', parsed.delivery);
    throw new Error('Invalid bridge message format');
  }
  
  return parsed;
}
