/**
 * Delayed Delivery Tests
 * Tests for the modular delayed message delivery system
 */

import { sendMessage } from '../src/delayedDelivery/sendMessage';
import { processQueuedMessages } from '../src/delayedDelivery/processQueuedMessages';
import { createDefaultConfig } from '../src/delayedDelivery/createDefaultConfig';
import { NodeInfo } from '../src/relayHandler/types';
import { MessagePriority } from '../src/messageQueue/types';

// Mock dependencies
const mockDevice = {
  sendText: jest.fn()
};

const mockMessageQueue = {
  enqueue: jest.fn(),
  getNextMessages: jest.fn(),
  markProcessing: jest.fn(),
  markDelivered: jest.fn(),
  markFailed: jest.fn(),
  getStats: jest.fn()
};

// Mock node matching
jest.mock('../src/relayHandler/nodeMatching', () => ({
  isNodeOnline: jest.fn()
}));

import { isNodeOnline } from '../src/relayHandler/nodeMatching';

describe('Delayed Message Delivery', () => {
  let knownNodes: Map<number, NodeInfo>;
  let config: ReturnType<typeof createDefaultConfig>;

  beforeEach(() => {
    knownNodes = new Map();
    config = createDefaultConfig();
    jest.clearAllMocks();
  });

  describe('createDefaultConfig', () => {
    test('creates default configuration', () => {
      const defaultConfig = createDefaultConfig();
      
      expect(defaultConfig.maxQueueTime).toBe(24);
      expect(defaultConfig.deliveryRetryInterval).toBe(30);
      expect(defaultConfig.maxDeliveryAttempts).toBe(10);
    });

    test('allows config overrides', () => {
      const customConfig = createDefaultConfig({
        maxQueueTime: 48,
        deliveryRetryInterval: 60
      });
      
      expect(customConfig.maxQueueTime).toBe(48);
      expect(customConfig.deliveryRetryInterval).toBe(60);
      expect(customConfig.maxDeliveryAttempts).toBe(10); // Default preserved
    });
  });

  describe('sendMessage', () => {
    test('delivers immediately to online node', async () => {
      const targetNode: NodeInfo = {
        num: 123456789,
        user: { longName: 'Test Node', shortName: 'test' },
        lastSeen: new Date()
      };
      
      knownNodes.set(123456789, targetNode);
      (isNodeOnline as jest.Mock).mockReturnValue(true);
      (mockDevice.sendText as jest.Mock).mockResolvedValue(true);

      const result = await sendMessage(
        mockDevice as any,
        knownNodes,
        mockMessageQueue as any,
        config,
        111111111,
        123456789,
        'Hello Test',
        MessagePriority.NORMAL
      );

      expect(result.delivered).toBe(true);
      expect(result.queued).toBe(false);
      expect(result.reason).toContain('Delivered immediately');
      expect(mockDevice.sendText).toHaveBeenCalledWith('Hello Test', 123456789);
      expect(mockMessageQueue.enqueue).not.toHaveBeenCalled();
    });

    test('queues message for offline node', async () => {
      const targetNode: NodeInfo = {
        num: 123456789,
        user: { longName: 'Test Node', shortName: 'test' },
        lastSeen: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      };
      
      knownNodes.set(123456789, targetNode);
      (isNodeOnline as jest.Mock).mockReturnValue(false);
      (mockMessageQueue.enqueue as jest.Mock).mockResolvedValue('msg-123-456');

      const result = await sendMessage(
        mockDevice as any,
        knownNodes,
        mockMessageQueue as any,
        config,
        111111111,
        123456789,
        'Hello Offline',
        MessagePriority.NORMAL
      );

      expect(result.delivered).toBe(false);
      expect(result.queued).toBe(true);
      expect(result.reason).toContain('offline - message queued');
      expect(mockMessageQueue.enqueue).toHaveBeenCalledWith(
        111111111,
        123456789,
        'Hello Offline',
        {
          priority: MessagePriority.NORMAL,
          ttl: 24 * 3600, // 24 hours in seconds
          maxAttempts: 10
        }
      );
    });

    test('handles unknown target node', async () => {
      const result = await sendMessage(
        mockDevice as any,
        knownNodes,
        mockMessageQueue as any,
        config,
        111111111,
        999999999, // Unknown node
        'Hello Unknown',
        MessagePriority.NORMAL
      );

      expect(result.delivered).toBe(false);
      expect(result.queued).toBe(false);
      expect(result.reason).toContain('Target node 999999999 not found');
    });

    test('queues on delivery failure for online node', async () => {
      const targetNode: NodeInfo = {
        num: 123456789,
        user: { longName: 'Test Node', shortName: 'test' },
        lastSeen: new Date()
      };
      
      knownNodes.set(123456789, targetNode);
      (isNodeOnline as jest.Mock).mockReturnValue(true);
      (mockDevice.sendText as jest.Mock).mockRejectedValue(new Error('Send failed'));
      (mockMessageQueue.enqueue as jest.Mock).mockResolvedValue('msg-123-456');

      const result = await sendMessage(
        mockDevice as any,
        knownNodes,
        mockMessageQueue as any,
        config,
        111111111,
        123456789,
        'Hello Failed',
        MessagePriority.NORMAL
      );

      expect(result.delivered).toBe(false);
      expect(result.queued).toBe(true);
      expect(mockDevice.sendText).toHaveBeenCalledWith('Hello Failed', 123456789);
      expect(mockMessageQueue.enqueue).toHaveBeenCalled();
    });
  });

  describe('processQueuedMessages', () => {
    test('processes empty queue gracefully', async () => {
      (mockMessageQueue.getNextMessages as jest.Mock).mockReturnValue([]);

      await processQueuedMessages(
        mockDevice as any,
        knownNodes,
        mockMessageQueue as any,
        config
      );

      expect(mockMessageQueue.getNextMessages).toHaveBeenCalledWith(50);
      expect(mockDevice.sendText).not.toHaveBeenCalled();
    });

    test('delivers queued messages to online nodes', async () => {
      const targetNode: NodeInfo = {
        num: 123456789,
        user: { longName: 'Test Node', shortName: 'test' },
        lastSeen: new Date()
      };
      
      knownNodes.set(123456789, targetNode);
      (isNodeOnline as jest.Mock).mockReturnValue(true);
      (mockDevice.sendText as jest.Mock).mockResolvedValue(true);

      const queuedMessage = {
        id: 'msg-123',
        fromNode: 111111111,
        toNode: 123456789,
        message: 'Queued Hello',
        maxAttempts: 10
      };

      (mockMessageQueue.getNextMessages as jest.Mock).mockReturnValue([queuedMessage]);

      await processQueuedMessages(
        mockDevice as any,
        knownNodes,
        mockMessageQueue as any,
        config
      );

      expect(mockMessageQueue.markProcessing).toHaveBeenCalledWith('msg-123');
      expect(mockDevice.sendText).toHaveBeenCalledWith('📬 [Delayed] Queued Hello', 123456789);
      expect(mockMessageQueue.markDelivered).toHaveBeenCalledWith('msg-123');
    });

    test('skips offline nodes', async () => {
      const targetNode: NodeInfo = {
        num: 123456789,
        user: { longName: 'Test Node', shortName: 'test' },
        lastSeen: new Date(Date.now() - 10 * 60 * 1000)
      };
      
      knownNodes.set(123456789, targetNode);
      (isNodeOnline as jest.Mock).mockReturnValue(false);

      const queuedMessage = {
        id: 'msg-123',
        fromNode: 111111111,
        toNode: 123456789,
        message: 'Queued Hello',
        maxAttempts: 10
      };

      (mockMessageQueue.getNextMessages as jest.Mock).mockReturnValue([queuedMessage]);

      await processQueuedMessages(
        mockDevice as any,
        knownNodes,
        mockMessageQueue as any,
        config
      );

      expect(mockMessageQueue.markProcessing).not.toHaveBeenCalled();
      expect(mockDevice.sendText).not.toHaveBeenCalled();
    });

    test('marks unknown nodes as failed', async () => {
      const queuedMessage = {
        id: 'msg-123',
        fromNode: 111111111,
        toNode: 999999999, // Unknown node
        message: 'Queued Hello',
        maxAttempts: 10
      };

      (mockMessageQueue.getNextMessages as jest.Mock).mockReturnValue([queuedMessage]);

      await processQueuedMessages(
        mockDevice as any,
        knownNodes,
        mockMessageQueue as any,
        config
      );

      expect(mockMessageQueue.markFailed).toHaveBeenCalledWith(
        'msg-123',
        'Target node no longer known'
      );
    });
  });
});
