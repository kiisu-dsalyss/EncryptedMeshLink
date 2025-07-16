/**
 * P2P Connection Manager - Modular Implementation
 * MIB-007: P2P Connection Manager - Modular Class using Individual Functions
 */

import { EventEmitter } from 'events';
import * as net from 'net';
import { WebSocketServer } from 'ws';
import { PeerInfo, P2PConnectionConfig, P2PMessage, P2PConnection } from '../types';
import { startTcpServer } from './startTcpServer';
import { startWebSocketServer } from './startWebSocketServer';
import { connectViaTcp } from './connectViaTcp';
import { connectViaWebSocket } from './connectViaWebSocket';
import { handleConnectionClose } from './handleConnectionClose';
import { handleConnectionError } from './handleConnectionError';

export class P2PConnectionManager extends EventEmitter {
  private config: P2PConnectionConfig;
  private connections: Map<string, any> = new Map();
  private tcpServer?: net.Server;
  private wsServer?: WebSocketServer;
  private isRunning = false;

  constructor(config: P2PConnectionConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ P2P Connection Manager already running');
      return;
    }

    console.log('🚀 Starting P2P Connection Manager...');

    try {
      // Start TCP server if enabled
      if (this.config.enableTcp) {
        this.tcpServer = await startTcpServer(
          this.config.localPort,
          (socket) => this.handleIncomingTcpConnection(socket)
        );
      }

      // Start WebSocket server if enabled
      if (this.config.enableWebSocket) {
        this.wsServer = await startWebSocketServer(
          this.config.localPort + 1,
          (ws, req) => this.handleIncomingWebSocketConnection(ws, req)
        );
      }

      this.isRunning = true;
      console.log('✅ P2P Connection Manager started successfully');
    } catch (error) {
      console.error('❌ Failed to start P2P Connection Manager:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping P2P Connection Manager...');

    // Close all active connections
    for (const [peerId, connection] of this.connections) {
      try {
        await connection.close();
      } catch (error) {
        console.error(`❌ Error closing connection to ${peerId}:`, error);
      }
    }
    this.connections.clear();

    // Stop servers
    if (this.tcpServer) {
      this.tcpServer.close();
      this.tcpServer = undefined;
    }

    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = undefined;
    }

    this.isRunning = false;
    console.log('✅ P2P Connection Manager stopped');
  }

  async connectToPeer(peer: PeerInfo): Promise<P2PConnection> {
    if (this.connections.has(peer.stationId)) {
      console.log(`🔗 Already connected to ${peer.stationId}`);
      return this.connections.get(peer.stationId);
    }

    console.log(`🔗 Connecting to peer ${peer.stationId} via ${peer.connectionType}...`);

    try {
      let connection: P2PConnection;

      switch (peer.connectionType) {
        case 'tcp':
          connection = await connectViaTcp(peer);
          break;
        case 'websocket':
          connection = await connectViaWebSocket(peer);
          break;
        default:
          throw new Error(`Unsupported connection type: ${peer.connectionType}`);
      }

      this.connections.set(peer.stationId, connection);
      this.emit('peerConnected', peer);
      
      return connection;
    } catch (error) {
      handleConnectionError(peer.stationId, error instanceof Error ? error : new Error(String(error)), this);
      throw error;
    }
  }

  async sendMessage(peerId: string, message: P2PMessage): Promise<void> {
    const connection = this.connections.get(peerId);
    if (!connection) {
      throw new Error(`No connection to peer ${peerId}`);
    }

    try {
      await connection.send(message);
      console.log(`📤 Message sent to ${peerId}`);
    } catch (error) {
      handleConnectionError(peerId, error instanceof Error ? error : new Error(String(error)), this);
      throw error;
    }
  }

  private handleIncomingTcpConnection(socket: net.Socket): void {
    console.log(`🔗 Incoming TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);
    // Implementation for handling incoming TCP connections
  }

  private handleIncomingWebSocketConnection(ws: any, req: any): void {
    console.log(`🕸️ Incoming WebSocket connection from ${req.socket.remoteAddress}`);
    // Implementation for handling incoming WebSocket connections
  }

  getActiveConnections(): Map<string, any> {
    return new Map(this.connections);
  }

  isConnectedTo(peerId: string): boolean {
    return this.connections.has(peerId);
  }

  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys());
  }

  getStats(): any {
    return {
      connectionsActive: this.connections.size,
      connectionsTotal: this.connections.size,
      messagesSent: 0, // TODO: implement counter
      messagesReceived: 0, // TODO: implement counter
      bytesSent: 0, // TODO: implement counter
      bytesReceived: 0, // TODO: implement counter
      connectionErrors: 0, // TODO: implement counter
      lastActivity: Date.now()
    };
  }
}
