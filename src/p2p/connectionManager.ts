/**
 * Pimport { import { 
  PeerInfo, 
  P2PConnectionConfig, 
  P2PConnectionStats, 
  P2PMessage, 
  P2PConnection, 
  P2PConnectionStatus,
  P2PConnectionManagerEvents,
  ConnectionAttemptStrategy
} from './types';
import { CryptoService } from '../crypto';, 
  P2PConnectionConfig, 
  P2PConnectionStats, 
  P2PMessage, 
  P2PConnection, 
  P2PConnectionStatus,
  P2PConnectionManagerEvents,
  ConnectionAttemptStrategy
} from './types';ion Manager - MIB-010
 * Manages direct peer-to-peer connections between stations
 */

import { EventEmitter } from 'events';
import * as net from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import { 
  PeerInfo, 
  P2PConnectionConfig, 
  P2PConnectionStats, 
  P2PMessage, 
  P2PConnection, 
  P2PConnectionStatus,
  P2PConnectionManagerEvents,
  ConnectionAttemptStrategy
} from './types.js';
import { CryptoService } from '../crypto';

interface ActiveConnection extends P2PConnection {
  socket: net.Socket | WebSocket;
  authenticated: boolean;
  lastPing: number;
}

/**
 * Manages direct P2P connections between stations
 */
export class P2PConnectionManager extends EventEmitter {
  private config: P2PConnectionConfig;
  private crypto: CryptoService;
  private connections: Map<string, ActiveConnection> = new Map();
  private tcpServer?: net.Server;
  private wsServer?: WebSocketServer;
  private stats: P2PConnectionStats;
  private keepAliveTimer?: ReturnType<typeof setInterval>;

  constructor(config: P2PConnectionConfig, crypto: CryptoService) {
    super();
    this.config = config;
    this.crypto = crypto;
    this.stats = {
      connectionsActive: 0,
      connectionsTotal: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      connectionErrors: 0,
      lastActivity: Date.now()
    };
  }

  /**
   * Start the P2P connection manager
   */
  async start(): Promise<void> {
    console.log('🔗 Starting P2P Connection Manager...');

    try {
      if (this.config.enableTcp) {
        await this.startTcpServer();
      }

      if (this.config.enableWebSocket) {
        await this.startWebSocketServer();
      }

      this.startKeepAlive();
      console.log(`✅ P2P Connection Manager started on port ${this.config.localPort}`);
    } catch (error) {
      console.error('❌ Failed to start P2P Connection Manager:', error);
      throw error;
    }
  }

  /**
   * Stop the P2P connection manager
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping P2P Connection Manager...');

    this.stopKeepAlive();
    
    // Close all connections
    for (const [peerId, connection] of this.connections) {
      await this.closeConnection(peerId, 'shutdown');
    }

    // Close servers
    if (this.tcpServer) {
      this.tcpServer.close();
      this.tcpServer = undefined;
    }

    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = undefined;
    }

    console.log('✅ P2P Connection Manager stopped');
  }

  /**
   * Connect to a peer
   */
  async connectToPeer(peer: PeerInfo, strategy: ConnectionAttemptStrategy = this.getDefaultStrategy()): Promise<P2PConnection> {
    const peerId = peer.stationId;
    
    // Check if already connected
    const existing = this.connections.get(peerId);
    if (existing && existing.status === P2PConnectionStatus.AUTHENTICATED) {
      return existing;
    }

    console.log(`🔗 Attempting to connect to peer ${peerId} at ${peer.host}:${peer.port}`);

    // Try connection strategies in order
    if (strategy.directConnection) {
      try {
        return await this.attemptDirectConnection(peer);
      } catch (error) {
        console.warn(`Direct connection to ${peerId} failed:`, error);
      }
    }

    // TODO: Implement NAT traversal
    if (strategy.natTraversal) {
      console.log(`🔧 NAT traversal for ${peerId} not yet implemented`);
    }

    // TODO: Implement WebRTC fallback
    if (strategy.webrtcFallback) {
      console.log(`🔧 WebRTC fallback for ${peerId} not yet implemented`);
    }

    throw new Error(`Failed to establish connection to peer ${peerId}`);
  }

  /**
   * Send a message to a peer
   */
  async sendMessage(peerId: string, message: P2PMessage): Promise<void> {
    const connection = this.connections.get(peerId);
    if (!connection || connection.status !== P2PConnectionStatus.AUTHENTICATED) {
      throw new Error(`No authenticated connection to peer ${peerId}`);
    }

    try {
      await connection.send(message);
      this.stats.messagesSent++;
      this.stats.bytesSent += JSON.stringify(message).length;
      this.stats.lastActivity = Date.now();
    } catch (error) {
      console.error(`Failed to send message to ${peerId}:`, error);
      this.stats.connectionErrors++;
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): P2PConnectionStats {
    this.stats.connectionsActive = this.connections.size;
    return { ...this.stats };
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys()).filter(peerId => {
      const conn = this.connections.get(peerId);
      return conn?.status === P2PConnectionStatus.AUTHENTICATED;
    });
  }

  // Private methods

  private async startTcpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer();
      
      this.tcpServer.on('connection', (socket) => {
        this.handleIncomingTcpConnection(socket);
      });

      this.tcpServer.on('error', (error) => {
        console.error('TCP server error:', error);
        this.stats.connectionErrors++;
        reject(error);
      });

      this.tcpServer.listen(this.config.localPort, () => {
        console.log(`📡 TCP server listening on port ${this.config.localPort}`);
        resolve();
      });
    });
  }

  private async startWebSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wsServer = new WebSocketServer({ 
        port: this.config.localPort + 1,
        clientTracking: true
      });

      this.wsServer.on('connection', (ws: WebSocket, req: any) => {
        this.handleIncomingWebSocketConnection(ws, req);
      });

      this.wsServer.on('error', (error: Error) => {
        console.error('WebSocket server error:', error);
        this.stats.connectionErrors++;
        reject(error);
      });

      this.wsServer.on('listening', () => {
        console.log(`📡 WebSocket server listening on port ${this.config.localPort + 1}`);
        resolve();
      });
    });
  }

  private async attemptDirectConnection(peer: PeerInfo): Promise<P2PConnection> {
    if (peer.connectionType === 'tcp') {
      return this.connectViaTcp(peer);
    } else if (peer.connectionType === 'websocket') {
      return this.connectViaWebSocket(peer);
    } else {
      throw new Error(`Unsupported connection type: ${peer.connectionType}`);
    }
  }

  private async connectViaTcp(peer: PeerInfo): Promise<P2PConnection> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`TCP connection timeout to ${peer.host}:${peer.port}`));
      }, this.config.connectionTimeout);

      socket.connect(peer.port, peer.host, () => {
        clearTimeout(timeout);
        const connection = this.createConnection(peer.stationId, socket, 'tcp');
        this.authenticateConnection(connection, peer)
          .then(() => resolve(connection))
          .catch(reject);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async connectViaWebSocket(peer: PeerInfo): Promise<P2PConnection> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${peer.host}:${peer.port + 1}`;
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`WebSocket connection timeout to ${wsUrl}`));
      }, this.config.connectionTimeout);

      ws.on('open', () => {
        clearTimeout(timeout);
        const connection = this.createConnection(peer.stationId, ws, 'websocket');
        this.authenticateConnection(connection, peer)
          .then(() => resolve(connection))
          .catch(reject);
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private createConnection(peerId: string, socket: net.Socket | WebSocket, type: 'tcp' | 'websocket'): ActiveConnection {
    const connection: ActiveConnection = {
      peerId,
      status: P2PConnectionStatus.CONNECTED,
      connectionType: type,
      lastActivity: Date.now(),
      retryCount: 0,
      socket,
      authenticated: false,
      lastPing: Date.now(),
      
      async send(message: P2PMessage): Promise<void> {
        const data = JSON.stringify(message);
        if (socket instanceof WebSocket) {
          socket.send(data);
        } else {
          socket.write(data + '\n');
        }
      },
      
      async close(): Promise<void> {
        if (socket instanceof WebSocket) {
          socket.close();
        } else {
          socket.end();
        }
      }
    };

    this.setupConnectionHandlers(connection);
    this.connections.set(peerId, connection);
    this.stats.connectionsTotal++;
    
    return connection;
  }

  private setupConnectionHandlers(connection: ActiveConnection): void {
    const { socket, peerId } = connection;

    if (socket instanceof WebSocket) {
      socket.on('message', (data: any) => {
        this.handleMessage(connection, data.toString());
      });
      
      socket.on('close', () => {
        this.handleConnectionClose(peerId, 'websocket closed');
      });
      
      socket.on('error', (error: Error) => {
        this.handleConnectionError(peerId, error);
      });
    } else {
      let buffer = '';
      
      socket.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            this.handleMessage(connection, line.trim());
          }
        }
      });
      
      socket.on('close', () => {
        this.handleConnectionClose(peerId, 'tcp socket closed');
      });
      
      socket.on('error', (error: Error) => {
        this.handleConnectionError(peerId, error);
      });
    }
  }

  private async authenticateConnection(connection: ActiveConnection, peer: PeerInfo): Promise<void> {
    // TODO: Implement proper authentication handshake
    // For now, mark as authenticated after basic connection
    connection.authenticated = true;
    connection.status = P2PConnectionStatus.AUTHENTICATED;
    
    console.log(`✅ Authenticated connection to peer ${peer.stationId}`);
    this.emit('peer-connected', peer.stationId, connection);
  }

  private handleIncomingTcpConnection(socket: net.Socket): void {
    console.log(`📥 Incoming TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);
    // TODO: Implement incoming connection authentication
  }

  private handleIncomingWebSocketConnection(ws: WebSocket, req: any): void {
    console.log(`📥 Incoming WebSocket connection from ${req.socket.remoteAddress}`);
    // TODO: Implement incoming connection authentication
  }

  private handleMessage(connection: ActiveConnection, data: string): void {
    try {
      const message: P2PMessage = JSON.parse(data);
      connection.lastActivity = Date.now();
      this.stats.messagesReceived++;
      this.stats.bytesReceived += data.length;
      this.stats.lastActivity = Date.now();
      
      this.emit('message-received', message, connection.peerId);
    } catch (error) {
      console.error(`Invalid message from ${connection.peerId}:`, error);
    }
  }

  private handleConnectionClose(peerId: string, reason: string): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      this.connections.delete(peerId);
      console.log(`🔌 Connection to ${peerId} closed: ${reason}`);
      this.emit('peer-disconnected', peerId, reason);
    }
  }

  private handleConnectionError(peerId: string, error: Error): void {
    console.error(`❌ Connection error with ${peerId}:`, error);
    this.stats.connectionErrors++;
    this.emit('connection-error', peerId, error);
    this.closeConnection(peerId, error.message);
  }

  private async closeConnection(peerId: string, reason: string): Promise<void> {
    const connection = this.connections.get(peerId);
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(`Error closing connection to ${peerId}:`, error);
      }
      this.connections.delete(peerId);
      this.emit('peer-disconnected', peerId, reason);
    }
  }

  private startKeepAlive(): void {
    this.keepAliveTimer = setInterval(() => {
      this.performKeepAlive();
    }, this.config.keepAliveInterval);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = undefined;
    }
  }

  private performKeepAlive(): void {
    const now = Date.now();
    const timeout = this.config.keepAliveInterval * 3; // 3 missed pings = timeout

    for (const [peerId, connection] of this.connections) {
      if (now - connection.lastActivity > timeout) {
        console.warn(`⏱️ Connection to ${peerId} timed out`);
        this.closeConnection(peerId, 'timeout');
      }
    }
  }

  private getDefaultStrategy(): ConnectionAttemptStrategy {
    return {
      directConnection: true,
      natTraversal: false, // TODO: Implement
      webrtcFallback: false, // TODO: Implement  
      timeout: this.config.connectionTimeout
    };
  }
}
