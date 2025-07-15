/**
 * Bridge Protocol Tests - MIB-008
 */

import { 
  createBridgeMessage, 
  createAckMessage, 
  createErrorResponse,
  validateBridgeMessage,
  isMessageExpired,
  calculateRetryDelay,
  serializeBridgeMessage,
  deserializeBridgeMessage,
  MessageType,
  MessagePriority,
  ErrorCode
} from '../src/bridge/protocol';

describe('Bridge Protocol', () => {
  describe('Message Creation', () => {
    test('should create a valid bridge message', () => {
      const message = createBridgeMessage(
        'station-1',
        'station-2',
        1234567890,
        9876543210,
        MessageType.USER_MESSAGE,
        'Hello from station 1!'
      );

      expect(message.version).toBe('1.0.0');
      expect(message.messageId).toBeDefined();
      expect(message.timestamp).toBeGreaterThan(0);
      expect(message.routing.fromStation).toBe('station-1');
      expect(message.routing.toStation).toBe('station-2');
      expect(message.routing.fromNode).toBe(1234567890);
      expect(message.routing.toNode).toBe(9876543210);
      expect(message.payload.type).toBe(MessageType.USER_MESSAGE);
      expect(message.payload.data).toBe('Hello from station 1!');
      expect(message.payload.encrypted).toBe(false);
      expect(message.delivery.priority).toBe(MessagePriority.NORMAL);
      expect(message.delivery.requiresAck).toBe(true);
    });

    test('should create message with custom delivery options', () => {
      const message = createBridgeMessage(
        'station-1',
        'station-2',
        1234567890,
        9876543210,
        MessageType.COMMAND,
        '@nodes',
        {
          priority: MessagePriority.HIGH,
          ttl: 300,
          requiresAck: false,
          maxRetries: 1
        }
      );

      expect(message.delivery.priority).toBe(MessagePriority.HIGH);
      expect(message.delivery.ttl).toBe(300);
      expect(message.delivery.requiresAck).toBe(false);
      expect(message.delivery.maxRetries).toBe(1);
    });
  });

  describe('Acknowledgment Messages', () => {
    test('should create acknowledgment message', () => {
      const ack = createAckMessage('test-message-id', 'delivered');

      expect(ack.originalMessageId).toBe('test-message-id');
      expect(ack.status).toBe('delivered');
      expect(ack.timestamp).toBeGreaterThan(0);
    });

    test('should create acknowledgment with queue info', () => {
      const ack = createAckMessage('test-message-id', 'queued', 5, Date.now() + 60000);

      expect(ack.status).toBe('queued');
      expect(ack.queuePosition).toBe(5);
      expect(ack.estimatedDelivery).toBeGreaterThan(Date.now());
    });
  });

  describe('Error Responses', () => {
    test('should create error response', () => {
      const error = createErrorResponse(
        ErrorCode.NODE_NOT_FOUND,
        'Target node not found',
        'test-message-id',
        true
      );

      expect(error.errorCode).toBe(ErrorCode.NODE_NOT_FOUND);
      expect(error.errorMessage).toBe('Target node not found');
      expect(error.originalMessageId).toBe('test-message-id');
      expect(error.permanent).toBe(true);
    });

    test('should create error response with retry after', () => {
      const error = createErrorResponse(
        ErrorCode.RATE_LIMITED,
        'Rate limit exceeded',
        'test-message-id',
        false,
        60
      );

      expect(error.retryAfter).toBe(60);
      expect(error.permanent).toBe(false);
    });
  });

  describe('Message Validation', () => {
    test('should validate correct bridge message', () => {
      const message = createBridgeMessage(
        'station-1',
        'station-2',
        1234567890,
        9876543210,
        MessageType.USER_MESSAGE,
        'Test message'
      );

      expect(validateBridgeMessage(message)).toBe(true);
    });

    test('should reject invalid message - missing fields', () => {
      const invalidMessage = {
        version: '1.0.0',
        messageId: 'test-id'
        // Missing required fields
      };

      expect(validateBridgeMessage(invalidMessage)).toBe(false);
    });

    test('should reject invalid message - wrong message type', () => {
      const message = createBridgeMessage(
        'station-1',
        'station-2',
        1234567890,
        9876543210,
        MessageType.USER_MESSAGE,
        'Test message'
      );

      // Corrupt the message type
      (message.payload as any).type = 'invalid_type';

      expect(validateBridgeMessage(message)).toBe(false);
    });

    test('should reject invalid message - wrong priority', () => {
      const message = createBridgeMessage(
        'station-1',
        'station-2',
        1234567890,
        9876543210,
        MessageType.USER_MESSAGE,
        'Test message'
      );

      // Corrupt the priority
      (message.delivery as any).priority = 999;

      expect(validateBridgeMessage(message)).toBe(false);
    });
  });

  describe('Message Expiration', () => {
    test('should detect non-expired message', () => {
      const message = createBridgeMessage(
        'station-1',
        'station-2',
        1234567890,
        9876543210,
        MessageType.USER_MESSAGE,
        'Test message',
        { ttl: 3600 } // 1 hour
      );

      expect(isMessageExpired(message)).toBe(false);
    });

    test('should detect expired message', () => {
      const message = createBridgeMessage(
        'station-1',
        'station-2',
        1234567890,
        9876543210,
        MessageType.USER_MESSAGE,
        'Test message',
        { ttl: 1 } // 1 second
      );

      // Manually set timestamp to past
      message.timestamp = Date.now() - 2000; // 2 seconds ago

      expect(isMessageExpired(message)).toBe(true);
    });
  });

  describe('Retry Delay Calculation', () => {
    test('should calculate exponential backoff', () => {
      expect(calculateRetryDelay(0)).toBe(1000);  // 1 second
      expect(calculateRetryDelay(1)).toBe(2000);  // 2 seconds
      expect(calculateRetryDelay(2)).toBe(4000);  // 4 seconds
      expect(calculateRetryDelay(3)).toBe(8000);  // 8 seconds
    });

    test('should cap at maximum delay', () => {
      expect(calculateRetryDelay(10)).toBe(30000); // Capped at 30 seconds
    });

    test('should use custom base delay', () => {
      expect(calculateRetryDelay(0, 500)).toBe(500);   // 0.5 seconds
      expect(calculateRetryDelay(1, 500)).toBe(1000);  // 1 second
      expect(calculateRetryDelay(2, 500)).toBe(2000);  // 2 seconds
    });
  });

  describe('Serialization', () => {
    test('should serialize and deserialize message', () => {
      const originalMessage = createBridgeMessage(
        'station-1',
        'station-2',
        1234567890,
        9876543210,
        MessageType.USER_MESSAGE,
        'Test message'
      );

      const serialized = serializeBridgeMessage(originalMessage);
      const deserialized = deserializeBridgeMessage(serialized);

      expect(deserialized).toEqual(originalMessage);
    });

    test('should throw error on invalid JSON', () => {
      expect(() => {
        deserializeBridgeMessage('invalid json');
      }).toThrow();
    });

    test('should throw error on invalid message format', () => {
      const invalidMessage = JSON.stringify({ invalid: 'message' });
      
      expect(() => {
        deserializeBridgeMessage(invalidMessage);
      }).toThrow('Invalid bridge message format');
    });
  });

  describe('Message Types', () => {
    test('should handle all message types', () => {
      const messageTypes = Object.values(MessageType);
      
      messageTypes.forEach(type => {
        const message = createBridgeMessage(
          'station-1',
          'station-2',
          1234567890,
          9876543210,
          type,
          'Test data'
        );
        
        expect(validateBridgeMessage(message)).toBe(true);
        expect(message.payload.type).toBe(type);
      });
    });
  });

  describe('Priority Levels', () => {
    test('should handle all priority levels', () => {
      const priorities = Object.values(MessagePriority).filter(p => typeof p === 'number');
      
      priorities.forEach(priority => {
        const message = createBridgeMessage(
          'station-1',
          'station-2',
          1234567890,
          9876543210,
          MessageType.USER_MESSAGE,
          'Test data',
          { priority: priority as MessagePriority }
        );
        
        expect(validateBridgeMessage(message)).toBe(true);
        expect(message.delivery.priority).toBe(priority);
      });
    });
  });
});
