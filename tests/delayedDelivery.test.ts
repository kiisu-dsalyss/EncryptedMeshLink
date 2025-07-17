/**
 * Delayed Delivery System Tests
 */

import { 
  createDefaultConfig, 
  sendMessage, 
  queueManager, 
  getDeliveryStats,
  getQueuedMessagesForNode,
  startDeliverySystem,
  stopDeliverySystem 
} from '../src/delayedDelivery';

describe('Delayed Delivery System', () => {
  beforeEach(() => {
    // Clear queue before each test
    queueManager.clear();
  });

  describe('createDefaultConfig', () => {
    test('should create default configuration', () => {
      const config = createDefaultConfig();
      
      expect(config.maxRetries).toBe(3);
      expect(config.retryInterval).toBe(30000);
      expect(config.maxQueueSize).toBe(1000);
      expect(config.deliveryTimeout).toBe(10000);
      expect(config.persistencePath).toBe('./data/delayed_messages.db');
    });
  });

  describe('sendMessage', () => {
    const mockIsNodeOnline = jest.fn();
    const mockDirectSend = jest.fn();

    beforeEach(() => {
      mockIsNodeOnline.mockReset();
      mockDirectSend.mockReset();
    });

    test('should send message directly when node is online', async () => {
      mockIsNodeOnline.mockReturnValue(true);
      mockDirectSend.mockResolvedValue(true);

      const result = await sendMessage(
        123456,
        'Test message',
        mockIsNodeOnline,
        mockDirectSend
      );

      expect(result.success).toBe(true);
      expect(result.queued).toBe(false);
      expect(mockDirectSend).toHaveBeenCalledWith(123456, 'Test message');
    });

    test('should queue message when node is offline', async () => {
      mockIsNodeOnline.mockReturnValue(false);

      const result = await sendMessage(
        123456,
        'Test message',
        mockIsNodeOnline,
        mockDirectSend
      );

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(mockDirectSend).not.toHaveBeenCalled();

      // Verify message was queued
      const queuedMessages = getQueuedMessagesForNode(123456);
      expect(queuedMessages).toHaveLength(1);
      expect(queuedMessages[0].message).toBe('Test message');
    });

    test('should queue message when direct send fails', async () => {
      mockIsNodeOnline.mockReturnValue(true);
      mockDirectSend.mockRejectedValue(new Error('Send failed'));

      const result = await sendMessage(
        123456,
        'Test message',
        mockIsNodeOnline,
        mockDirectSend
      );

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    test('should force queue when forceQueue option is true', async () => {
      mockIsNodeOnline.mockReturnValue(true);
      mockDirectSend.mockResolvedValue(true);

      const result = await sendMessage(
        123456,
        'Test message',
        mockIsNodeOnline,
        mockDirectSend,
        { forceQueue: true }
      );

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(mockDirectSend).not.toHaveBeenCalled();
    });
  });

  describe('queueManager', () => {
    test('should add and retrieve messages', () => {
      const message = {
        id: 'test-1',
        targetNodeId: 123456,
        message: 'Test message',
        priority: 1,
        queuedAt: Date.now(),
        retryCount: 0
      };

      queueManager.addMessage(message);

      const messages = queueManager.getMessagesForNode(123456);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    test('should sort messages by priority', () => {
      const lowPriority = {
        id: 'test-1',
        targetNodeId: 123456,
        message: 'Low priority',
        priority: 1,
        queuedAt: Date.now(),
        retryCount: 0
      };

      const highPriority = {
        id: 'test-2',
        targetNodeId: 123456,
        message: 'High priority',
        priority: 5,
        queuedAt: Date.now(),
        retryCount: 0
      };

      queueManager.addMessage(lowPriority);
      queueManager.addMessage(highPriority);

      const messages = queueManager.getMessagesForNode(123456);
      expect(messages[0].priority).toBe(5); // High priority first
      expect(messages[1].priority).toBe(1); // Low priority second
    });

    test('should remove messages', () => {
      const message = {
        id: 'test-1',
        targetNodeId: 123456,
        message: 'Test message',
        priority: 1,
        queuedAt: Date.now(),
        retryCount: 0
      };

      queueManager.addMessage(message);
      expect(queueManager.getMessagesForNode(123456)).toHaveLength(1);

      const removed = queueManager.removeMessage('test-1');
      expect(removed).toBe(true);
      expect(queueManager.getMessagesForNode(123456)).toHaveLength(0);
    });

    test('should mark messages as delivered', () => {
      const message = {
        id: 'test-1',
        targetNodeId: 123456,
        message: 'Test message',
        priority: 1,
        queuedAt: Date.now(),
        retryCount: 0
      };

      queueManager.addMessage(message);
      const marked = queueManager.markDelivered('test-1');
      
      expect(marked).toBe(true);
      expect(queueManager.getMessagesForNode(123456)).toHaveLength(0);
      
      const stats = queueManager.getStats();
      expect(stats.totalDelivered).toBe(1);
    });
  });

  describe('getDeliveryStats', () => {
    test('should return current statistics', () => {
      const stats = getDeliveryStats();
      
      expect(stats).toHaveProperty('totalQueued');
      expect(stats).toHaveProperty('totalDelivered');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('totalExpired');
      expect(stats).toHaveProperty('currentQueueSize');
      expect(stats).toHaveProperty('nodeQueues');
    });
  });

  describe('delivery system lifecycle', () => {
    const mockIsNodeOnline = jest.fn();
    const mockDirectSend = jest.fn();

    beforeEach(() => {
      mockIsNodeOnline.mockReset();
      mockDirectSend.mockReset();
      stopDeliverySystem(); // Ensure clean state
    });

    test('should start and stop delivery system', () => {
      const config = startDeliverySystem(mockIsNodeOnline, mockDirectSend);
      
      expect(config).toHaveProperty('maxRetries');
      expect(config).toHaveProperty('retryInterval');
      
      const stopped = stopDeliverySystem();
      expect(stopped).toBe(true);
    });

    test('should not start system twice', () => {
      const config1 = startDeliverySystem(mockIsNodeOnline, mockDirectSend);
      const config2 = startDeliverySystem(mockIsNodeOnline, mockDirectSend);
      
      expect(config1).toEqual(config2);
      
      stopDeliverySystem();
    });
  });
});