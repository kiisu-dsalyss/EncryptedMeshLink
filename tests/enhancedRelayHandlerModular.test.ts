/**
 * Enhanced Relay Handler (Modular) Tests
 * Tests for MIB-007: Enhanced Relay Handler Modular Implementation
 */

import { EnhancedRelayHandler } from '../src/enhancedRelayHandlerModular';
import { StationConfig } from '../src/config/types';
import { NodeInfo } from '../src/handlers/tryLocalRelay';

// Mock MeshDevice
const mockMeshDevice = {
  sendText: jest.fn().mockResolvedValue(true)
} as any;

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('EnhancedRelayHandler (Modular)', () => {
  let relayHandler: EnhancedRelayHandler;
  let mockConfig: StationConfig;
  let knownNodes: Map<number, NodeInfo>;

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

    relayHandler = new EnhancedRelayHandler(mockMeshDevice, knownNodes, mockConfig, 100);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(relayHandler).toBeDefined();
      expect(relayHandler.getBridgeStatus().active).toBe(false);
      expect(relayHandler.getBridgeStatus().remoteNodeCount).toBe(0);
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

      await relayHandler.initializeBridge();

      const status = relayHandler.getBridgeStatus();
      expect(status.active).toBe(true);
      expect(status.discoveryActive).toBe(true);
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

      await relayHandler.initializeBridge();
    });

    it('should relay to local node by number', async () => {
      const packet = { from: 200, to: 300 };
      
      await relayHandler.handleRelayMessage(packet, '101', 'Hello Alice');

      expect(mockMeshDevice.sendText).toHaveBeenCalledWith('Hello Alice', 101);
    });

    it('should relay to local node by name', async () => {
      const packet = { from: 200, to: 300 };
      
      await relayHandler.handleRelayMessage(packet, 'Bob Station', 'Hello Bob');

      expect(mockMeshDevice.sendText).toHaveBeenCalledWith('Hello Bob', 102);
    });

    it('should not relay to self', async () => {
      const packet = { from: 200, to: 100 }; // to: matches myNodeNum
      
      await relayHandler.handleRelayMessage(packet, '100', 'Hello Self');

      expect(mockMeshDevice.sendText).not.toHaveBeenCalled();
    });

    it('should handle unknown target gracefully', async () => {
      const packet = { from: 200, to: 300 };
      
      await relayHandler.handleRelayMessage(packet, 'Unknown', 'Hello Unknown');

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

      await relayHandler.initializeBridge();
      expect(relayHandler.getBridgeStatus().active).toBe(true);

      // Then stop
      await relayHandler.stopBridge();
      
      const status = relayHandler.getBridgeStatus();
      expect(status.active).toBe(false);
      expect(status.remoteNodeCount).toBe(0);
    });
  });

  describe('getRemoteNodes', () => {
    it('should return copy of remote nodes map', () => {
      const remoteNodes = relayHandler.getRemoteNodes();
      expect(remoteNodes).toBeInstanceOf(Map);
      expect(remoteNodes.size).toBe(0);
    });
  });
});
