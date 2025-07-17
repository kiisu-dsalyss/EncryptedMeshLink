import { NodeManager } from '../src/nodeManager';
import type { NodeInfo } from '../src/relayHandler/types';

describe('NodeManager', () => {
  let nodeManager: NodeManager;

  beforeEach(() => {
    nodeManager = new NodeManager();
    // Clear console mocks before each test
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with empty known nodes map', () => {
      const knownNodes = nodeManager.getKnownNodes();
      expect(knownNodes.size).toBe(0);
      expect(knownNodes).toBeInstanceOf(Map);
    });
  });

  describe('getKnownNodes', () => {
    test('returns the known nodes map', () => {
      const knownNodes = nodeManager.getKnownNodes();
      expect(knownNodes).toBeInstanceOf(Map);
    });

    test('returns same reference on multiple calls', () => {
      const knownNodes1 = nodeManager.getKnownNodes();
      const knownNodes2 = nodeManager.getKnownNodes();
      expect(knownNodes1).toBe(knownNodes2);
    });
  });

  describe('addNode', () => {
    test('adds a node with complete info', () => {
      const nodeInfo = {
        num: 123456789,
        user: {
          longName: 'Test Station',
          shortName: 'test'
        },
        position: { lat: 37.7749, lon: -122.4194 }
      };

      nodeManager.addNode(nodeInfo);
      const knownNodes = nodeManager.getKnownNodes();
      
      expect(knownNodes.size).toBe(1);
      expect(knownNodes.has(123456789)).toBe(true);
      
      const storedNode = knownNodes.get(123456789);
      expect(storedNode).toBeDefined();
      expect(storedNode!.num).toBe(123456789);
      expect(storedNode!.user?.longName).toBe('Test Station');
      expect(storedNode!.user?.shortName).toBe('test');
      expect(storedNode!.position).toEqual({ lat: 37.7749, lon: -122.4194 });
      expect(storedNode!.lastSeen).toBeInstanceOf(Date);
    });

    test('adds a node with minimal info', () => {
      const nodeInfo = {
        num: 987654321
      };

      nodeManager.addNode(nodeInfo);
      const knownNodes = nodeManager.getKnownNodes();
      
      expect(knownNodes.size).toBe(1);
      expect(knownNodes.has(987654321)).toBe(true);
      
      const storedNode = knownNodes.get(987654321);
      expect(storedNode!.num).toBe(987654321);
      expect(storedNode!.user).toBeUndefined();
      expect(storedNode!.position).toBeUndefined();
      expect(storedNode!.lastSeen).toBeInstanceOf(Date);
    });

    test('updates existing node info', () => {
      const initialNodeInfo = {
        num: 123456789,
        user: { longName: 'Old Name', shortName: 'old' }
      };

      const updatedNodeInfo = {
        num: 123456789,
        user: { longName: 'New Name', shortName: 'new' },
        position: { lat: 40.7128, lon: -74.0060 }
      };

      nodeManager.addNode(initialNodeInfo);
      nodeManager.addNode(updatedNodeInfo);
      
      const knownNodes = nodeManager.getKnownNodes();
      expect(knownNodes.size).toBe(1); // Still only one node
      
      const storedNode = knownNodes.get(123456789);
      expect(storedNode!.user?.longName).toBe('New Name');
      expect(storedNode!.user?.shortName).toBe('new');
      expect(storedNode!.position).toEqual({ lat: 40.7128, lon: -74.0060 });
      expect(storedNode!.lastSeen).toBeInstanceOf(Date);
    });

    test('adds multiple different nodes', () => {
      const node1 = { num: 111111111, user: { longName: 'Node 1' } };
      const node2 = { num: 222222222, user: { longName: 'Node 2' } };
      const node3 = { num: 333333333, user: { longName: 'Node 3' } };

      nodeManager.addNode(node1);
      nodeManager.addNode(node2);
      nodeManager.addNode(node3);

      const knownNodes = nodeManager.getKnownNodes();
      expect(knownNodes.size).toBe(3);
      expect(knownNodes.has(111111111)).toBe(true);
      expect(knownNodes.has(222222222)).toBe(true);
      expect(knownNodes.has(333333333)).toBe(true);
    });

    test('logs node discovery', () => {
      const nodeInfo = {
        num: 123456789,
        user: { longName: 'Test Station' }
      };

      nodeManager.addNode(nodeInfo);
      
      expect(console.log).toHaveBeenCalledWith(
        '📍 Node discovered: 123456789 Test Station'
      );
    });

    test('logs node discovery with Unknown for missing longName', () => {
      const nodeInfo = { num: 987654321 };

      nodeManager.addNode(nodeInfo);
      
      expect(console.log).toHaveBeenCalledWith(
        '📍 Node discovered: 987654321 Unknown'
      );
    });
  });

  describe('showAvailableNodes', () => {
    test('shows message when no nodes are available', () => {
      nodeManager.showAvailableNodes();
      
      expect(console.log).toHaveBeenCalledWith('\n📡 Known Mesh Nodes:');
      expect(console.log).toHaveBeenCalledWith('===================');
      expect(console.log).toHaveBeenCalledWith('No nodes discovered yet');
    });

    test('shows single node without myNodeNum', () => {
      const nodeInfo = {
        num: 123456789,
        user: { longName: 'Test Station', shortName: 'test' }
      };
      
      nodeManager.addNode(nodeInfo);
      nodeManager.showAvailableNodes();
      
      expect(console.log).toHaveBeenCalledWith('🟢 [123456789] Test Station (test)');
    });

    test('shows single node with THIS DEVICE indicator', () => {
      const nodeInfo = {
        num: 123456789,
        user: { longName: 'My Station', shortName: 'me' }
      };
      
      nodeManager.addNode(nodeInfo);
      nodeManager.showAvailableNodes(123456789);
      
      expect(console.log).toHaveBeenCalledWith('🟢 [123456789] My Station (me) (THIS DEVICE)');
    });

    test('shows multiple nodes sorted by online status then number', () => {
      const node1 = { 
        num: 333333333, 
        user: { longName: 'Node C', shortName: 'c' }
      };
      const node2 = { 
        num: 111111111, 
        user: { longName: 'Node A', shortName: 'a' }
      };
      const node3 = { 
        num: 222222222, 
        user: { longName: 'Node B', shortName: 'b' }
      };

      nodeManager.addNode(node1);
      nodeManager.addNode(node2);
      nodeManager.addNode(node3);
      
      // Manually set lastSeen to test online/offline status
      const knownNodes = nodeManager.getKnownNodes();
      const nodeC = knownNodes.get(333333333)!;
      const nodeA = knownNodes.get(111111111)!;
      const nodeB = knownNodes.get(222222222)!;
      
      nodeC.lastSeen = new Date(Date.now() - 1000); // Recent = online
      nodeA.lastSeen = new Date(Date.now() - 10 * 60 * 1000); // Old = offline  
      nodeB.lastSeen = new Date(Date.now() - 1000); // Recent = online
      
      nodeManager.showAvailableNodes();
      
      // Should be sorted by online status first, then number
      expect(console.log).toHaveBeenCalledWith('🟢 [222222222] Node B (b)');
      expect(console.log).toHaveBeenCalledWith('🟢 [333333333] Node C (c)');
      expect(console.log).toHaveBeenCalledWith('🔴 [111111111] Node A (a)');
    });

    test('handles nodes with missing user info', () => {
      const nodeInfo = { 
        num: 123456789
      };
      
      nodeManager.addNode(nodeInfo);
      nodeManager.showAvailableNodes();
      
      expect(console.log).toHaveBeenCalledWith('🟢 [123456789] Unknown');
    });

    test('handles nodes with missing shortName', () => {
      const nodeInfo = {
        num: 123456789,
        user: { longName: 'Test Station' }
      };
      
      nodeManager.addNode(nodeInfo);
      nodeManager.showAvailableNodes();
      
      expect(console.log).toHaveBeenCalledWith('🟢 [123456789] Test Station');
    });

    test('shows usage instructions', () => {
      const nodeInfo = { 
        num: 123456789, 
        user: { longName: 'Test' }
      };
      nodeManager.addNode(nodeInfo);
      nodeManager.showAvailableNodes();
      
      expect(console.log).toHaveBeenCalledWith('\n💬 Usage:');
      expect(console.log).toHaveBeenCalledWith('   Send "nodes" to get this list');
      expect(console.log).toHaveBeenCalledWith('   Send "@[ID] {message}" to relay by ID (recommended)');
      expect(console.log).toHaveBeenCalledWith('   Send "@{name} {message}" to relay by name');
      expect(console.log).toHaveBeenCalledWith('   Example: "@1111111111 Hello there!"');
      expect(console.log).toHaveBeenCalledWith('   Example: "@alice Hello there!"');
      expect(console.log).toHaveBeenCalledWith('\n💡 Tip: Online nodes (🟢) are prioritized for name matching');
      expect(console.log).toHaveBeenCalledWith('===================');
    });

    test('identifies correct device when myNodeNum matches', () => {
      const node1 = { 
        num: 111111111, 
        user: { longName: 'Other Station' }
      };
      const node2 = { 
        num: 222222222, 
        user: { longName: 'My Station' }
      };
      const node3 = { 
        num: 333333333, 
        user: { longName: 'Another Station' }
      };

      nodeManager.addNode(node1);
      nodeManager.addNode(node2);
      nodeManager.addNode(node3);
      
      // Manually set lastSeen to test online/offline status
      const knownNodes = nodeManager.getKnownNodes();
      knownNodes.get(111111111)!.lastSeen = new Date(Date.now() - 10 * 60 * 1000); // Old = offline
      knownNodes.get(222222222)!.lastSeen = new Date(); // Recent = online
      knownNodes.get(333333333)!.lastSeen = new Date(); // Recent = online
      
      nodeManager.showAvailableNodes(222222222);
      
      expect(console.log).toHaveBeenCalledWith('🟢 [222222222] My Station (THIS DEVICE)');
      expect(console.log).toHaveBeenCalledWith('🟢 [333333333] Another Station');
      expect(console.log).toHaveBeenCalledWith('🔴 [111111111] Other Station');
    });
  });
});
