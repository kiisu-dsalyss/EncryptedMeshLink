/**
 * P2P Connection Manager Tests - MIB-010
 * Tests for direct peer-to-peer connection management
 */

import { P2PConnectionManager } from '../src/p2p/connectionManager';
import { P2PConnectionConfig, PeerInfo } from '../src/p2p/types';
import { CryptoService } from '../src/crypto';

// Mock the crypto service for testing
jest.mock('../src/crypto');

describe('P2PConnectionManager', () => {
  let connectionManager: P2PConnectionManager;
  let mockCrypto: jest.Mocked<CryptoService>;
  
  const testConfig: P2PConnectionConfig = {
    localPort: 0, // Use port 0 to let the system assign a free port
    enableTcp: true,
    enableWebSocket: false, // Disable WebSocket for simpler testing
    enableWebRTC: false,
    connectionTimeout: 5000,
    keepAliveInterval: 10000,
    maxRetries: 2,
    retryDelay: 1000
  };

  beforeEach(() => {
    mockCrypto = new CryptoService({} as any) as jest.Mocked<CryptoService>;
    connectionManager = new P2PConnectionManager(testConfig, mockCrypto);
  });

  afterEach(async () => {
    await connectionManager.stop();
  });

  describe('Basic functionality', () => {
    it('should create connection manager instance', () => {
      expect(connectionManager).toBeDefined();
      expect(connectionManager.getConnectedPeers()).toEqual([]);
    });

    it('should start and stop successfully', async () => {
      await connectionManager.start();
      
      const stats = connectionManager.getStats();
      expect(stats.connectionsActive).toBe(0);
      expect(stats.connectionsTotal).toBe(0);
      
      await connectionManager.stop();
    });

    it('should have empty stats initially', () => {
      const stats = connectionManager.getStats();
      
      expect(stats.connectionsActive).toBe(0);
      expect(stats.connectionsTotal).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.messagesReceived).toBe(0);
      expect(stats.connectionErrors).toBe(0);
    });

    it('should return empty connected peers list initially', () => {
      const peers = connectionManager.getConnectedPeers();
      expect(peers).toEqual([]);
    });
  });

  describe('Event emission', () => {
    it('should be an EventEmitter', () => {
      expect(typeof connectionManager.on).toBe('function');
      expect(typeof connectionManager.emit).toBe('function');
      expect(typeof connectionManager.removeListener).toBe('function');
    });

    it('should emit events correctly', (done) => {
      let eventCount = 0;
      const expectedEvents = ['test-event'];
      
      connectionManager.on('test-event', () => {
        eventCount++;
        if (eventCount === expectedEvents.length) {
          done();
        }
      });
      
      connectionManager.emit('test-event');
    });
  });

  describe('Connection attempts', () => {
    const testPeer: PeerInfo = {
      stationId: 'test-station',
      host: '127.0.0.1',
      port: 8082,
      publicKey: 'test-public-key',
      lastSeen: Date.now(),
      connectionType: 'tcp'
    };

    it('should handle connection failure gracefully', async () => {
      // Try to connect to non-existent peer
      await expect(connectionManager.connectToPeer(testPeer)).rejects.toThrow();
      
      const stats = connectionManager.getStats();
      expect(stats.connectionErrors).toBeGreaterThan(0);
    });

    it('should fail to send message to non-existent peer', async () => {
      const testMessage = {
        id: 'test-msg-1',
        fromStation: 'local-station',
        toStation: 'test-station',
        payload: 'test payload',
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      await expect(connectionManager.sendMessage('test-station', testMessage))
        .rejects.toThrow('No authenticated connection to peer test-station');
    });
  });

  describe('Statistics tracking', () => {
    it('should track connection attempts', async () => {
      const initialStats = connectionManager.getStats();
      
      const testPeer: PeerInfo = {
        stationId: 'test-station',
        host: '127.0.0.1',
        port: 8082,
        publicKey: 'test-public-key',
        lastSeen: Date.now(),
        connectionType: 'tcp'
      };
      
      try {
        await connectionManager.connectToPeer(testPeer);
      } catch (error) {
        // Expected to fail - we're testing stats tracking
      }
      
      const finalStats = connectionManager.getStats();
      expect(finalStats.connectionErrors).toBeGreaterThan(initialStats.connectionErrors);
    });
  });
});
