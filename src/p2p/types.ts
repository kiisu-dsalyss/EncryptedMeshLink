/**
 * P2P Types and Interfaces - MIB-010
 * Type definitions for direct peer-to-peer communication
 */

export interface PeerInfo {
  stationId: string;
  host: string;
  port: number;
  publicKey: string;
  lastSeen: number;
  connectionType: 'tcp' | 'websocket' | 'webrtc';
}

export interface P2PConnectionConfig {
  localPort: number;
  enableTcp: boolean;
  enableWebSocket: boolean;
  enableWebRTC: boolean;
  connectionTimeout: number;
  keepAliveInterval: number;
  maxRetries: number;
  retryDelay: number;
}

export interface P2PConnectionStats {
  connectionsActive: number;
  connectionsTotal: number;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  connectionErrors: number;
  lastActivity: number;
}

export interface P2PMessage {
  id: string;
  fromStation: string;
  toStation: string;
  payload: string; // Encrypted bridge message
  timestamp: number;
  signature: string;
}

export enum P2PConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error'
}

export interface P2PConnection {
  peerId: string;
  status: P2PConnectionStatus;
  connectionType: 'tcp' | 'websocket' | 'webrtc';
  lastActivity: number;
  retryCount: number;
  send(message: P2PMessage): Promise<void>;
  close(): Promise<void>;
}

export interface P2PConnectionManagerEvents {
  'peer-connected': (peerId: string, connection: P2PConnection) => void;
  'peer-disconnected': (peerId: string, reason: string) => void;
  'message-received': (message: P2PMessage, fromPeer: string) => void;
  'connection-error': (peerId: string, error: Error) => void;
  'authentication-failed': (peerId: string, reason: string) => void;
}

export interface NATTraversalConfig {
  stunServers: string[];
  turnServers: string[];
  enableUPnP: boolean;
  enableHolePunching: boolean;
  coordinationTimeout: number;
}

export interface ConnectionAttemptStrategy {
  directConnection: boolean;
  natTraversal: boolean;
  webrtcFallback: boolean;
  timeout: number;
}
