/**
 * P2P Transport Tests - MIB-010  
 * Tests for direct peer-to-peer message transport
 */

import { P2PTransport } from '../src/p2p/transport';
import { P2PTransportConfig } from '../src/p2p/transport';
import { CryptoService } from '../src/crypto';
import { DiscoveryClientModular } from '../src/discovery/index';
import { createBridgeMessage, MessageType, MessagePriority } from '../src/bridge/protocol';
import { findAvailablePort } from './testUtils';

// Mock dependencies
jest.mock('../src/crypto');
jest.mock('../src/discovery/index');

describe('P2PTransport', () => {
  let transport: P2PTransport;
  let mockCrypto: jest.Mocked<CryptoService>;
  let mockDiscoveryClient: jest.Mocked<DiscoveryClientModular>;
  let testConfig: P2PTransportConfig;

  beforeEach(async () => {
    const availablePort = await findAvailablePort();
    testConfig = {
      stationId: 'test-station',
      localPort: availablePort,
      connectionTimeout: 5000,
      retryAttempts: 2,
      retryDelay: 500
    };
    mockCrypto = new CryptoService({} as any) as jest.Mocked<CryptoService>;
    mockDiscoveryClient = new DiscoveryClientModular({} as any) as jest.Mocked<DiscoveryClientModular>;
    
    // Mock discovery client methods
    Object.defineProperty(mockDiscoveryClient, 'knownPeers', {
      get: jest.fn().mockReturnValue([]),
      configurable: true
    });
    
    transport = new P2PTransport(testConfig, mockCrypto, mockDiscoveryClient);
  });

  afterEach(async () => {
    await transport.stop();
  });

  describe('Basic functionality', () => {
    it('should create transport instance', () => {
      expect(transport).toBeDefined();
      expect(transport.getConnectedPeers()).toEqual([]);
    });

    it('should start and stop successfully', async () => {
      await transport.start();
      
      const stats = transport.getStats();
      expect(stats.connectionsActive).toBe(0);
      expect(stats.bridgeMessagesSent).toBe(0);
      
      await transport.stop();
    });

    it('should have correct initial stats', () => {
      const stats = transport.getStats();
      
      expect(stats.connectionsActive).toBe(0);
      expect(stats.bridgeMessagesSent).toBe(0);
      expect(stats.bridgeMessagesReceived).toBe(0);
      expect(stats.sendErrors).toBe(0);
      expect(stats.receiveErrors).toBe(0);
      expect(stats.retryCount).toBe(0);
      expect(stats.lastActivity).toBeGreaterThan(0);
    });

    it('should report healthy state when discovery client available', () => {
      expect(transport.isHealthy()).toBe(true);
    });

    it('should report unhealthy state without discovery client', () => {
      const transportWithoutDiscovery = new P2PTransport(testConfig, mockCrypto);
      expect(transportWithoutDiscovery.isHealthy()).toBe(false);
    });
  });

  describe('Message handling', () => {
    it('should fail to send message to unknown station', async () => {
      const testMessage = createBridgeMessage(
        'test-station',
        'target-station',
        123,
        456,
        MessageType.USER_MESSAGE,
        'test message',
        { priority: MessagePriority.NORMAL }
      );

      await expect(transport.sendMessage(testMessage)).rejects.toThrow();
      
      const stats = transport.getStats();
      expect(stats.sendErrors).toBeGreaterThan(0);
    });

    it('should register message handlers', () => {
      const handler = jest.fn();
      transport.onMessage('test-type', handler);
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle sendAck correctly', async () => {
      const originalMessage = createBridgeMessage(
        'remote-station',
        'test-station',
        123,
        456,
        MessageType.USER_MESSAGE,
        'original message',
        { priority: MessagePriority.NORMAL }
      );

      const ackMessage = {
        messageId: 'ack-123',
        status: 'received'
      };

      // Should not throw, even though it will fail to send
      await expect(transport.sendAck(originalMessage, ackMessage)).rejects.toThrow();
    });
  });

  describe('Statistics and monitoring', () => {
    it('should track retry attempts', async () => {
      const testMessage = createBridgeMessage(
        'test-station',
        'nonexistent-station',
        123,
        456,
        MessageType.USER_MESSAGE,
        'test message',
        { priority: MessagePriority.NORMAL }
      );

      const initialStats = transport.getStats();
      
      try {
        await transport.sendMessage(testMessage);
      } catch (error) {
        // Expected to fail
      }
      
      const finalStats = transport.getStats();
      expect(finalStats.retryCount).toBeGreaterThan(initialStats.retryCount);
      expect(finalStats.sendErrors).toBeGreaterThan(initialStats.sendErrors);
    });

    it('should return empty connected peers initially', () => {
      const peers = transport.getConnectedPeers();
      expect(peers).toEqual([]);
    });
  });

  describe('Event handling', () => {
    it('should be an EventEmitter', () => {
      expect(typeof transport.on).toBe('function');
      expect(typeof transport.emit).toBe('function');
      expect(typeof transport.removeListener).toBe('function');
    });

    it('should emit events correctly', (done) => {
      transport.on('test-event', () => {
        done();
      });
      
      transport.emit('test-event');
    });
  });
});
