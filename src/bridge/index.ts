/**
 * Bridge Module - MIB-008
 * Main exports for the bridge message protocol implementation
 */

export * from './protocol.js';
export * from './transport.js';
export * from './client.js';

// Re-export key types and functions for convenience
export type {
  BridgeMessage,
  MessageType,
  MessagePriority,
  ErrorCode,
  ErrorResponse,
  AckMessage,
  NodeDiscoveryPayload,
  StationInfoPayload,
  ProtocolCapabilities
} from './protocol.js';

export type {
  BridgeTransportConfig,
  BridgeTransportStats
} from './transport.js';

export type {
  BridgeClientConfig,
  BridgeClientEvents
} from './client.js';

export {
  createBridgeMessage,
  createAckMessage,
  createErrorResponse,
  validateBridgeMessage,
  isMessageExpired,
  calculateRetryDelay,
  serializeBridgeMessage,
  deserializeBridgeMessage,
  PROTOCOL_VERSION
} from './protocol.js';

export {
  createBridgeTransport,
  BridgeTransport
} from './transport.js';

export {
  createBridgeClient,
  BridgeClient
} from './client.js';
