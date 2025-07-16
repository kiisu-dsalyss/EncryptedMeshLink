/**
 * Enhanced Relay Handler (Modular) Tests
 * Tests for MIB-007: Enhanced Relay Handler Modular Implementation
 */

import { initializeBridge } from '../src/handlers/initializeBridge';
import { handleRelayMessage } from '../src/handlers/handleRelayMessage';
import { stopBridge } from '../src/handlers/stopBridge';
import { StationConfig } from '../src/config/types';
import { NodeInfo } from '../src/handlers/tryLocalRelay';
import { RemoteNodeInfo } from '../src/handlers/tryRemoteRelay';
import { DiscoveryClientModular } from '../src/discovery/index';
import { CryptoService } from '../src/crypto/index';

// Mock MeshDevice
const mockMeshDevice = {
  sendText: jest.fn().mockResolvedValue(true)
} as any;

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('EnhancedRelayHandler (Modular)', () => {
  let mockConfig: StationConfig;
  let knownNodes: Map<number, NodeInfo>;
  let remoteNodes: Map<number, RemoteNodeInfo>;
  let discoveryClient: DiscoveryClientModular | undefined;
  let cryptoService: CryptoService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      stationId: 'test-station-001',
      displayName: 'Test Station',
      keys: {
        publicKey: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----'
      },
      discovery: {
        serviceUrl: 'https://test.example.com/api/discovery.php',
        checkInterval: 30,
        timeout: 10
      },
      p2p: {
        listenPort: 4403,
        maxConnections: 10,
        connectionTimeout: 30
      },
      mesh: {
        autoDetect: true,
        baudRate: 115200
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    knownNodes = new Map([
      [101, {
        num: 101,
        user: { longName: 'Alice Station', shortName: 'Alice' },
        lastSeen: new Date()
      }],
      [102, {
        num: 102,
        user: { longName: 'Bob Station', shortName: 'Bob' },
        lastSeen: new Date()
      }]
    ]);

    remoteNodes = new Map();
    discoveryClient = undefined;
    cryptoService = new CryptoService();
  });

  describe('modular functions', () => {
    it('should have all required functions available', () => {
      expect(initializeBridge).toBeDefined();
      expect(handleRelayMessage).toBeDefined();
      expect(stopBridge).toBeDefined();
      expect(typeof initializeBridge).toBe('function');
      expect(typeof handleRelayMessage).toBe('function');
      expect(typeof stopBridge).toBe('function');
    });
  });

  describe('initializeBridge', () => {
    it('should initialize bridge services successfully', async () => {
      // Mock discovery service responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: { 
              status: 'healthy', 
              active_stations: 0,
              timestamp: Date.now(),
              version: '1.0.0',
              php_version: '8.4.10',
              sqlite_version: '3.45.1'
            } 
          })
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} })
        } as Response);

      const onPeerDiscovered = jest.fn();
      const onPeerLost = jest.fn();
      const onError = jest.fn();

      discoveryClient = await initializeBridge(
        mockConfig,
        onPeerDiscovered,
        onPeerLost,
        onError
      );

      expect(discoveryClient).toBeDefined();
      expect(discoveryClient).toBeInstanceOf(DiscoveryClientModular);
    });
  });

  describe('handleRelayMessage', () => {
    beforeEach(async () => {
      // Initialize bridge for relay tests
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: { 
              status: 'healthy', 
              active_stations: 0,
              timestamp: Date.now(),
              version: '1.0.0',
              php_version: '8.4.10',
              sqlite_version: '3.45.1'
            } 
          })
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} })
        } as Response);

      const onPeerDiscovered = jest.fn();
      const onPeerLost = jest.fn();
      const onError = jest.fn();

      discoveryClient = await initializeBridge(
        mockConfig,
        onPeerDiscovered,
        onPeerLost,
        onError
      );
    });

    it('should relay to local node by number', async () => {
      const packet = { from: 200, to: 300 };
      
      await handleRelayMessage(
        mockMeshDevice,
        knownNodes,
        remoteNodes,
        100, // myNodeNum
        discoveryClient,
        cryptoService,
        packet,
        '101',
        'Hello Alice'
      );

      expect(mockMeshDevice.sendText).toHaveBeenCalledWith('Hello Alice', 101);
    });

    it('should relay to local node by name', async () => {
      const packet = { from: 200, to: 300 };
      
      await handleRelayMessage(
        mockMeshDevice,
        knownNodes,
        remoteNodes,
        100, // myNodeNum
        discoveryClient,
        cryptoService,
        packet,
        'Bob Station',
        'Hello Bob'
      );

      expect(mockMeshDevice.sendText).toHaveBeenCalledWith('Hello Bob', 102);
    });

    it('should not relay to self', async () => {
      const packet = { from: 200, to: 100 }; // to: matches myNodeNum
      
      await handleRelayMessage(
        mockMeshDevice,
        knownNodes,
        remoteNodes,
        100, // myNodeNum
        discoveryClient,
        cryptoService,
        packet,
        '100',
        'Hello Self'
      );

      expect(mockMeshDevice.sendText).not.toHaveBeenCalled();
    });

    it('should handle unknown target gracefully', async () => {
      const packet = { from: 200, to: 300 };
      
      await handleRelayMessage(
        mockMeshDevice,
        knownNodes,
        remoteNodes,
        100, // myNodeNum
        discoveryClient,
        cryptoService,
        packet,
        'Unknown',
        'Hello Unknown'
      );

      expect(mockMeshDevice.sendText).not.toHaveBeenCalled();
    });
  });

  describe('stopBridge', () => {
    it('should stop bridge services', async () => {
      // First initialize
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: { 
              status: 'healthy', 
              active_stations: 0,
              timestamp: Date.now(),
              version: '1.0.0',
              php_version: '8.4.10',
              sqlite_version: '3.45.1'
            } 
          })
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} })
        } as Response);

      const onPeerDiscovered = jest.fn();
      const onPeerLost = jest.fn();
      const onError = jest.fn();

      discoveryClient = await initializeBridge(
        mockConfig,
        onPeerDiscovered,
        onPeerLost,
        onError
      );
      expect(discoveryClient).toBeDefined();

      // Then stop
      await stopBridge(discoveryClient);
      
      // Should complete without error
      expect(stopBridge).toBeDefined();
    });
  });

  describe('getRemoteNodes', () => {
    it('should work with remote nodes map', () => {
      // Test that we can work with the remote nodes map directly
      expect(remoteNodes).toBeInstanceOf(Map);
      expect(remoteNodes.size).toBe(0);
      
      // Add a node and verify
      remoteNodes.set(999, {
        nodeId: 999,
        stationId: 'remote-001',
        lastSeen: new Date()
      });
      expect(remoteNodes.size).toBe(1);
    });
  });
});
