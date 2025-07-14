import { NodeManager } from '../src/nodeManager';
import { MessageParser } from '../src/messageParser';

describe('VoidBridge Integration', () => {
  beforeEach(() => {
    // Mock console methods to avoid spam during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('message parsing integrates with known message patterns', () => {
    // Test all message parsing scenarios
    const echoResult = MessageParser.parseMessage('echo hello');
    expect(echoResult).toEqual({ type: 'echo' });

    const relayResult = MessageParser.parseMessage('@123 test message');
    expect(relayResult).toEqual({ 
      type: 'relay', 
      targetIdentifier: '123', 
      message: 'test message' 
    });

    const nodesResult = MessageParser.parseMessage('nodes');
    expect(nodesResult).toEqual({ type: 'nodes' });

    const unknownResult = MessageParser.parseMessage('random text');
    expect(unknownResult).toEqual({ type: 'echo' });
  });

  test('node management works with message parsing flow', () => {
    const nodeManager = new NodeManager();
    
    // Add some nodes
    nodeManager.addNode({
      num: 123,
      user: { longName: 'Test Node', shortName: 'Test' },
      position: null,
      lastSeen: new Date(),
    });

    nodeManager.addNode({
      num: 456,
      user: { longName: 'Another Node', shortName: 'Other' },
      position: null,
      lastSeen: new Date(),
    });

    // Check nodes were added
    const nodes = nodeManager.getKnownNodes();
    expect(nodes.size).toBe(2);
    expect(nodes.get(123)).toBeDefined();
    expect(nodes.get(456)).toBeDefined();

    // Test message parsing for these specific nodes
    const relayMessage = MessageParser.parseMessage('@123 Hello test!');
    expect(relayMessage.type).toBe('relay');
    expect(relayMessage.targetIdentifier).toBe('123');
    expect(relayMessage.message).toBe('Hello test!');

    // Show available nodes (returns void, logs to console)
    nodeManager.showAvailableNodes();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test Node'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Another Node'));
  });

  test('error handling works across all components', () => {
    // Test MessageParser with various inputs
    expect(() => MessageParser.parseMessage('')).not.toThrow();
    expect(() => MessageParser.parseMessage('   ')).not.toThrow();
    expect(() => MessageParser.parseMessage('@')).not.toThrow();
    expect(() => MessageParser.parseMessage('@123')).not.toThrow();

    // Test NodeManager with edge cases
    const nodeManager = new NodeManager();
    expect(() => nodeManager.getKnownNodes()).not.toThrow();
    expect(() => nodeManager.showAvailableNodes()).not.toThrow();
    
    nodeManager.showAvailableNodes();
    expect(console.log).toHaveBeenCalledWith('No nodes discovered yet');

    // Test adding invalid node data
    expect(() => nodeManager.addNode({
      num: 0,
      user: undefined,
      position: null,
      lastSeen: new Date(),
    })).not.toThrow();
  });

  test('modules handle typical usage patterns correctly', () => {
    const nodeManager = new NodeManager();
    
    // Simulate typical message flow
    const commands = [
      'nodes',
      '@alice hello there',
      'echo test',
      '@123 are you there?',
      'random message',
      '',
    ];

    // All should parse without error
    commands.forEach(cmd => {
      expect(() => MessageParser.parseMessage(cmd)).not.toThrow();
      const result = MessageParser.parseMessage(cmd);
      expect(result).toBeDefined();
      expect(result.type).toBeDefined();
    });

    // Add nodes and verify state
    for (let i = 1; i <= 5; i++) {
      nodeManager.addNode({
        num: i * 100,
        user: { longName: `Node ${i}`, shortName: `N${i}` },
        position: null,
        lastSeen: new Date(),
      });
    }

    expect(nodeManager.getKnownNodes().size).toBe(5);
    nodeManager.showAvailableNodes();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Node 1'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Node 5'));
  });
});
