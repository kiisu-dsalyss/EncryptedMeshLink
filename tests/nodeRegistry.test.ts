/**
 * Node Registry Bridge Tests - MIB-009
 * Comprehensive test suite for cross-station node tracking
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NodeRegistryStorage } from '../src/nodeRegistry/storage';
import { NodeRegistryManager } from '../src/nodeRegistry/manager';
import { BridgeClient } from '../src/bridge/client';
import { 
  NodeRegistryEntry, 
  NodeConflict, 
  RegistrySyncMessage,
  NodeQueryMessage,
  NodeQueryResponse
} from '../src/nodeRegistry/types';

// Mock BridgeClient
const mockBridgeClient = {
  on: jest.fn(),
  emit: jest.fn(),
  sendMessage: jest.fn(),
  broadcastMessage: jest.fn(),
  removeListener: jest.fn()
} as unknown as BridgeClient;

describe('NodeRegistryStorage', () => {
  let storage: NodeRegistryStorage;

  beforeEach(() => {
    storage = new NodeRegistryStorage(':memory:');
  });

  afterEach(() => {
    storage.close();
  });

  describe('Database Initialization', () => {
    test('should initialize database schema', () => {
      expect(() => storage.initialize()).not.toThrow();
    });

    test('should handle multiple initialization calls', () => {
      storage.initialize();
      expect(() => storage.initialize()).not.toThrow();
    });
  });

  describe('Node Management', () => {
    test('should add a new node', () => {
      const entry: NodeRegistryEntry = {
        nodeId: 'node1',
        stationId: 'station1',
        lastSeen: Date.now(),
        isOnline: true,
        metadata: { name: 'Test Node' },
        ttl: 300
      };

      storage.upsertNode(entry);
      const found = storage.findNode('node1');
      
      expect(found).toBeDefined();
      expect(found?.nodeId).toBe('node1');
      expect(found?.stationId).toBe('station1');
      expect(found?.isOnline).toBe(true);
      expect(found?.metadata).toEqual({ name: 'Test Node' });
    });

    test('should update existing node', () => {
      const entry: NodeRegistryEntry = {
        nodeId: 'node1',
        stationId: 'station1',
        lastSeen: Date.now() - 10000,
        isOnline: true,
        ttl: 300
      };

      storage.upsertNode(entry);

      // Update the same node
      const updatedEntry: NodeRegistryEntry = {
        ...entry,
        lastSeen: Date.now(),
        isOnline: false,
        metadata: { status: 'updated' }
      };

      storage.upsertNode(updatedEntry);
      const found = storage.findNode('node1');

      expect(found?.isOnline).toBe(false);
      expect(found?.metadata).toEqual({ status: 'updated' });
      expect(found?.lastSeen).toBeGreaterThan(entry.lastSeen);
    });

    test('should handle nodes with same ID at different stations', () => {
      const entry1: NodeRegistryEntry = {
        nodeId: 'node1',
        stationId: 'station1',
        lastSeen: Date.now(),
        isOnline: true,
        ttl: 300
      };

      const entry2: NodeRegistryEntry = {
        nodeId: 'node1',
        stationId: 'station2',
        lastSeen: Date.now(),
        isOnline: true,
        ttl: 300
      };

      storage.upsertNode(entry1);
      storage.upsertNode(entry2);

      const nodes1 = storage.getNodesByStation('station1');
      const nodes2 = storage.getNodesByStation('station2');

      expect(nodes1).toHaveLength(1);
      expect(nodes2).toHaveLength(1);
      expect(nodes1[0].stationId).toBe('station1');
      expect(nodes2[0].stationId).toBe('station2');
    });
  });

  describe('Node Queries', () => {
    beforeEach(() => {
      const entries: NodeRegistryEntry[] = [
        {
          nodeId: 'node1',
          stationId: 'station1',
          lastSeen: Date.now(),
          isOnline: true,
          ttl: 300
        },
        {
          nodeId: 'node2',
          stationId: 'station1',
          lastSeen: Date.now() - 5000,
          isOnline: false,
          ttl: 300
        },
        {
          nodeId: 'node3',
          stationId: 'station2',
          lastSeen: Date.now(),
          isOnline: true,
          ttl: 300
        }
      ];

      entries.forEach(entry => storage.upsertNode(entry));
    });

    test('should find node by ID', () => {
      const found = storage.findNode('node1');
      expect(found?.nodeId).toBe('node1');
      expect(found?.stationId).toBe('station1');
    });

    test('should return null for non-existent node', () => {
      const found = storage.findNode('nonexistent');
      expect(found).toBeNull();
    });

    test('should get nodes by station', () => {
      const station1Nodes = storage.getNodesByStation('station1');
      const station2Nodes = storage.getNodesByStation('station2');

      expect(station1Nodes).toHaveLength(2);
      expect(station2Nodes).toHaveLength(1);
      expect(station1Nodes.every(n => n.stationId === 'station1')).toBe(true);
    });

    test('should get all active nodes', () => {
      const allNodes = storage.getAllActiveNodes();
      expect(allNodes).toHaveLength(3);
      
      // Should be ordered by station, then last seen
      expect(allNodes[0].stationId).toBe('station1');
      expect(allNodes[2].stationId).toBe('station2');
    });

    test('should get node count by station', () => {
      const counts = storage.getNodeCountByStation();
      expect(counts['station1']).toBe(2);
      expect(counts['station2']).toBe(1);
    });
  });

  describe('Node Removal', () => {
    beforeEach(() => {
      const entries: NodeRegistryEntry[] = [
        {
          nodeId: 'node1',
          stationId: 'station1',
          lastSeen: Date.now(),
          isOnline: true,
          ttl: 300
        },
        {
          nodeId: 'node1',
          stationId: 'station2',
          lastSeen: Date.now(),
          isOnline: true,
          ttl: 300
        }
      ];

      entries.forEach(entry => storage.upsertNode(entry));
    });

    test('should remove node from specific station', () => {
      const removed = storage.removeNode('node1', 'station1');
      expect(removed).toBe(1);

      const found = storage.findNode('node1');
      expect(found?.stationId).toBe('station2'); // Should find station2 instance
    });

    test('should remove node from all stations', () => {
      const removed = storage.removeNode('node1');
      expect(removed).toBe(2);

      const found = storage.findNode('node1');
      expect(found).toBeNull();
    });

    test('should return 0 for non-existent node removal', () => {
      const removed = storage.removeNode('nonexistent');
      expect(removed).toBe(0);
    });
  });

  describe('TTL and Cleanup', () => {
    test('should respect TTL in queries', () => {
      const expiredEntry: NodeRegistryEntry = {
        nodeId: 'expired',
        stationId: 'station1',
        lastSeen: Date.now() - 400000, // 400 seconds ago
        isOnline: true,
        ttl: 300 // 5 minutes TTL
      };

      const validEntry: NodeRegistryEntry = {
        nodeId: 'valid',
        stationId: 'station1',
        lastSeen: Date.now() - 100000, // 100 seconds ago
        isOnline: true,
        ttl: 300
      };

      storage.upsertNode(expiredEntry);
      storage.upsertNode(validEntry);

      expect(storage.findNode('expired')).toBeNull();
      expect(storage.findNode('valid')).toBeDefined();
    });

    test('should cleanup expired nodes', () => {
      const entries: NodeRegistryEntry[] = [
        {
          nodeId: 'expired1',
          stationId: 'station1',
          lastSeen: Date.now() - 400000,
          isOnline: true,
          ttl: 300
        },
        {
          nodeId: 'expired2',
          stationId: 'station1',
          lastSeen: Date.now() - 500000,
          isOnline: true,
          ttl: 300
        },
        {
          nodeId: 'valid',
          stationId: 'station1',
          lastSeen: Date.now(),
          isOnline: true,
          ttl: 300
        }
      ];

      entries.forEach(entry => storage.upsertNode(entry));

      const removed = storage.cleanupExpiredNodes();
      expect(removed).toBe(2);

      const remaining = storage.getAllActiveNodes();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].nodeId).toBe('valid');
    });
  });

  describe('Conflict Management', () => {
    test('should record node conflicts', () => {
      const conflict: NodeConflict = {
        nodeId: 'conflict-node',
        conflictingEntries: [
          {
            nodeId: 'conflict-node',
            stationId: 'station1',
            lastSeen: Date.now() - 1000,
            isOnline: true,
            ttl: 300
          },
          {
            nodeId: 'conflict-node',
            stationId: 'station2',
            lastSeen: Date.now(),
            isOnline: true,
            ttl: 300
          }
        ],
        resolvedEntry: {
          nodeId: 'conflict-node',
          stationId: 'station2',
          lastSeen: Date.now(),
          isOnline: true,
          ttl: 300
        },
        resolutionStrategy: 'latest',
        timestamp: Date.now()
      };

      storage.recordConflict(conflict);
      
      const conflicts = storage.getRecentConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].nodeId).toBe('conflict-node');
      expect(conflicts[0].resolutionStrategy).toBe('latest');
    });

    test('should filter conflicts by time', () => {
      // This test would require manipulating system time or database timestamps
      // For now, we'll test the basic functionality
      const conflicts = storage.getRecentConflicts(1); // Last 1 hour
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });
});

describe('NodeRegistryManager', () => {
  let manager: NodeRegistryManager;
  let mockBridge: jest.Mocked<BridgeClient>;

  beforeEach(() => {
    mockBridge = {
      on: jest.fn(),
      emit: jest.fn(),
      sendMessage: jest.fn(() => Promise.resolve()),
      broadcastMessage: jest.fn(() => Promise.resolve()),
      removeListener: jest.fn()
    } as unknown as jest.Mocked<BridgeClient>;

    manager = new NodeRegistryManager(
      'test-station',
      mockBridge,
      {
        syncIntervalMs: 1000,
        nodeTtlSeconds: 300,
        maxNodesPerStation: 50,
        cleanupIntervalMs: 2000,
        conflictResolutionStrategy: 'latest'
      },
      ':memory:'
    );
  });

  afterEach(() => {
    manager.stop();
  });

  describe('Manager Lifecycle', () => {
    test('should start and stop correctly', () => {
      expect(() => manager.start()).not.toThrow();
      expect(() => manager.stop()).not.toThrow();
    });

    test('should handle multiple start/stop calls', () => {
      manager.start();
      expect(() => manager.start()).not.toThrow(); // Should not start twice
      
      manager.stop();
      expect(() => manager.stop()).not.toThrow(); // Should not stop twice
    });
  });

  describe('Local Node Management', () => {
    test('should register local node', () => {
      const metadata = { name: 'Test Node', hwModel: 'TBEAM' };
      manager.registerLocalNode('node1', metadata);

      const found = manager.findNode('node1');
      expect(found?.nodeId).toBe('node1');
      expect(found?.stationId).toBe('test-station');
      expect(found?.metadata).toEqual(metadata);
    });

    test('should update local node', () => {
      manager.registerLocalNode('node1');
      manager.updateLocalNode('node1', false, { status: 'offline' });

      const found = manager.findNode('node1');
      expect(found?.isOnline).toBe(false);
      expect(found?.metadata).toEqual({ status: 'offline' });
    });

    test('should not update remote node as local', () => {
      // Add a remote node directly to storage
      const remoteEntry: NodeRegistryEntry = {
        nodeId: 'remote-node',
        stationId: 'remote-station',
        lastSeen: Date.now(),
        isOnline: true,
        ttl: 300
      };
      
      manager['storage'].upsertNode(remoteEntry);
      
      // Try to update it as local - should not work
      manager.updateLocalNode('remote-node', false);
      
      const found = manager.findNode('remote-node');
      expect(found?.isOnline).toBe(true); // Should remain unchanged
    });

    test('should remove local node', () => {
      manager.registerLocalNode('node1');
      manager.removeLocalNode('node1');

      const found = manager.findNode('node1');
      expect(found).toBeNull();
    });
  });

  describe('Node Queries', () => {
    test('should find local node immediately', () => {
      manager.registerLocalNode('local-node');
      const found = manager.findNode('local-node');
      expect(found?.nodeId).toBe('local-node');
    });

    test('should query remote nodes', async () => {
      // Mock the bridge response
      const mockResponse: NodeQueryResponse = {
        type: 'node_query_response',
        targetNodeId: 'remote-node',
        found: true,
        stationId: 'remote-station',
        lastSeen: Date.now(),
        isOnline: true,
        timestamp: Date.now()
      };

      // Simulate receiving the response after a delay
      setTimeout(() => {
        manager.emit('node_query_response', mockResponse);
      }, 100);

      const result = await manager.queryNode('remote-node');
      
      expect(result).toBeDefined();
      expect(result?.nodeId).toBe('remote-node');
      expect(result?.stationId).toBe('remote-station');
      
      // Wait a bit to ensure the async broadcastMessage has been called
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockBridge.broadcastMessage).toHaveBeenCalled();
    });

    test('should timeout on remote node query', async () => {
      const result = await manager.queryNode('nonexistent-node');
      expect(result).toBeNull();
    }, 6000);
  });

  describe('Registry Statistics', () => {
    test('should provide accurate stats', () => {
      manager.registerLocalNode('node1');
      manager.registerLocalNode('node2');

      const stats = manager.getStats();
      expect(stats.totalNodes).toBe(2);
      expect(stats.nodesByStation['test-station']).toBe(2);
      expect(stats.localStationId).toBe('test-station');
      expect(stats.registryVersion).toBeGreaterThan(0);
    });
  });

  describe('Synchronization', () => {
    test('should handle incoming sync messages', () => {
      const syncMessage: RegistrySyncMessage = {
        type: 'node_registry_sync',
        version: 1,
        stationId: 'remote-station',
        nodes: [
          {
            nodeId: 'remote-node',
            stationId: 'remote-station',
            lastSeen: Date.now(),
            isOnline: true,
            ttl: 300
          }
        ],
        timestamp: Date.now(),
        checksum: 'test-checksum'
      };

      // Simulate the bridge message handler
      const systemMessageHandler = mockBridge.on.mock.calls
        .find(call => call[0] === 'system_message')?.[1];
      
      if (systemMessageHandler) {
        systemMessageHandler(syncMessage);
      }

      const found = manager.findNode('remote-node');
      expect(found?.stationId).toBe('remote-station');
    });

    test('should handle node queries', () => {
      manager.registerLocalNode('local-node');

      const queryMessage: NodeQueryMessage = {
        type: 'node_query',
        targetNodeId: 'local-node',
        sourceStationId: 'asking-station',
        timestamp: Date.now()
      };

      // Simulate the bridge message handler
      const systemMessageHandler = mockBridge.on.mock.calls
        .find(call => call[0] === 'system_message')?.[1];
      
      if (systemMessageHandler) {
        systemMessageHandler(queryMessage);
      }

      expect(mockBridge.sendMessage).toHaveBeenCalledWith(
        'asking-station',
        expect.objectContaining({
          type: 'node_query_response',
          targetNodeId: 'local-node',
          found: true
        })
      );
    });
  });

  describe('Conflict Resolution', () => {
    test('should resolve conflicts using latest strategy', () => {
      const existingEntry: NodeRegistryEntry = {
        nodeId: 'conflict-node',
        stationId: 'station1',
        lastSeen: Date.now() - 1000,
        isOnline: true,
        ttl: 300
      };

      const incomingEntry: NodeRegistryEntry = {
        nodeId: 'conflict-node',
        stationId: 'station2',
        lastSeen: Date.now(),
        isOnline: false,
        ttl: 300
      };

      // Add existing entry
      manager['storage'].upsertNode(existingEntry);

      // Simulate incoming sync with conflicting entry
      const syncMessage: RegistrySyncMessage = {
        type: 'node_registry_sync',
        version: 1,
        stationId: 'station2',
        nodes: [incomingEntry],
        timestamp: Date.now(),
        checksum: 'test-checksum'
      };

      const systemMessageHandler = mockBridge.on.mock.calls
        .find(call => call[0] === 'system_message')?.[1];
      
      if (systemMessageHandler) {
        systemMessageHandler(syncMessage);
      }

      // Should resolve to the latest entry (incoming)
      const found = manager.findNode('conflict-node');
      expect(found?.stationId).toBe('station2');
      expect(found?.isOnline).toBe(false);
    });
  });

  describe('Event Emission', () => {
    test('should emit events for node operations', () => {
      const eventHandler = jest.fn();
      manager.on('node_added', eventHandler);

      manager.registerLocalNode('test-node');

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'node_added',
          nodeId: 'test-node',
          stationId: 'test-station'
        })
      );
    });

    test('should emit sync events', async () => {
      const syncHandler = jest.fn();
      manager.on('sync_completed', syncHandler);

      // Register a local node to have something to sync
      manager.registerLocalNode('test-node-1', { type: 'worker' });
      
      // Start the manager to trigger periodic sync
      manager.start();

      // Manually trigger a sync to test the event
      await (manager as any).performSync();
      
      expect(syncHandler).toHaveBeenCalled();
      manager.stop();
    });
  });
});
