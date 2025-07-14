import { RelayHandler, NodeInfo } from '../src/relayHandler';
import type { MeshDevice } from '@meshtastic/core';

// Mock MeshDevice
const mockDevice = {
  sendText: jest.fn(),
} as unknown as jest.Mocked<MeshDevice>;

describe('RelayHandler', () => {
  let knownNodes: Map<number, NodeInfo>;
  let relayHandler: RelayHandler;
  const myNodeNum = 123;

  beforeEach(() => {
    jest.clearAllMocks();
    
    knownNodes = new Map([
      [456, {
        num: 456,
        user: {
          longName: 'Alice Station',
          shortName: 'Alice',
        },
        lastSeen: new Date(),
      }],
      [789, {
        num: 789,
        user: {
          longName: 'Bob Mobile',
          shortName: 'Bob',
        },
        lastSeen: new Date(),
      }],
      [999, {
        num: 999,
        user: {
          longName: 'Charlie Base',
          shortName: 'Charlie',
        },
        lastSeen: new Date(),
      }],
    ]);

    relayHandler = new RelayHandler(mockDevice, knownNodes, myNodeNum);
  });

  describe('handleRelayMessage', () => {
    const mockPacket = { from: 456, to: myNodeNum };

    test('relays message to target by numeric ID', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(mockPacket, '789', 'Hello Bob!');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '[From 456 (Alice Station)]: Hello Bob!',
        789
      );
      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '✅ Message relayed to Bob Mobile',
        456
      );
    });

    test('relays message to target by long name', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(mockPacket, 'bob', 'Hello there!');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '[From 456 (Alice Station)]: Hello there!',
        789
      );
      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '✅ Message relayed to Bob Mobile',
        456
      );
    });

    test('relays message to target by short name', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(mockPacket, 'charlie', 'Test message');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '[From 456 (Alice Station)]: Test message',
        999
      );
      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '✅ Message relayed to Charlie Base',
        456
      );
    });

    test('uses fallback name when sender has no user info', async () => {
      const unknownPacket = { from: 555, to: myNodeNum };
      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(unknownPacket, '789', 'Anonymous message');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '[From 555 (Node-555)]: Anonymous message',
        789
      );
    });

    test('uses short name when long name unavailable', async () => {
      // Add node with only short name
      knownNodes.set(111, {
        num: 111,
        user: {
          shortName: 'Dave',
        },
        lastSeen: new Date(),
      });
      
      const davePacket = { from: 111, to: myNodeNum };
      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(davePacket, '789', 'Short name test');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '[From 111 (Dave)]: Short name test',
        789
      );
    });

    test('handles target not found by ID', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(mockPacket, '9999', 'Message to nowhere');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '❌ Node "9999" not found. Use \'nodes\' to see available nodes.',
        456
      );
      expect(mockDevice.sendText).toHaveBeenCalledTimes(1);
    });

    test('handles target not found by name', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(mockPacket, 'unknown', 'Message to nobody');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '❌ Node "unknown" not found. Use \'nodes\' to see available nodes.',
        456
      );
      expect(mockDevice.sendText).toHaveBeenCalledTimes(1);
    });

    test('handles case-insensitive name matching', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(mockPacket, 'alice', 'Case test');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '[From 456 (Alice Station)]: Case test',
        456
      );
    });

    test('finds first matching node when multiple partial matches', async () => {
      // Add another node with similar name
      knownNodes.set(777, {
        num: 777,
        user: {
          longName: 'Alice Mobile',
          shortName: 'Alice2',
        },
        lastSeen: new Date(),
      });

      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(mockPacket, 'alice', 'Ambiguous test');

      // Should match the first Alice (456)
      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '[From 456 (Alice Station)]: Ambiguous test',
        456
      );
    });

    test('handles relay failure', async () => {
      mockDevice.sendText.mockRejectedValueOnce(new Error('Network error'));

      await relayHandler.handleRelayMessage(mockPacket, '789', 'Failed message');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '❌ Failed to relay message to 789',
        456
      );
    });

    test('handles confirmation failure gracefully', async () => {
      mockDevice.sendText
        .mockResolvedValueOnce(undefined) // First call succeeds (relay)
        .mockRejectedValueOnce(new Error('Confirmation failed')); // Second call fails

      // Should not throw, just log error
      await expect(relayHandler.handleRelayMessage(mockPacket, '789', 'Test')).resolves.toBeUndefined();
    });

    test('uses target ID when no longName available for confirmation', async () => {
      // Add node without longName
      knownNodes.set(888, {
        num: 888,
        user: {
          shortName: 'Eve',
        },
        lastSeen: new Date(),
      });

      mockDevice.sendText.mockResolvedValue(undefined);

      await relayHandler.handleRelayMessage(mockPacket, '888', 'No long name test');

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        '✅ Message relayed to 888',
        456
      );
    });
  });

  describe('handleNodesRequest', () => {
    test('lists available nodes excluding own node', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);
      const mockPacket = { from: 777 }; // Use different sender ID

      await relayHandler.handleNodesRequest(mockPacket);

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        'Available nodes:\n456: Alice Station\n789: Bob Mobile\n999: Charlie Base\n\nSend: @{nodeId} {message} to relay',
        777
      );
    });

    test('shows message when no other nodes available', async () => {
      // Create handler with only own node
      const emptyNodes = new Map([[myNodeNum, {
        num: myNodeNum,
        user: { longName: 'My Node' },
        lastSeen: new Date(),
      }]]);
      
      const emptyHandler = new RelayHandler(mockDevice, emptyNodes, myNodeNum);
      mockDevice.sendText.mockResolvedValue(undefined);
      const mockPacket = { from: 456 };

      await emptyHandler.handleNodesRequest(mockPacket);

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        'No other nodes found in mesh network',
        456
      );
    });

    test('shows Unknown for nodes without user info', async () => {
      knownNodes.set(777, {
        num: 777,
        lastSeen: new Date(),
      });

      mockDevice.sendText.mockResolvedValue(undefined);
      const mockPacket = { from: 456 };

      await relayHandler.handleNodesRequest(mockPacket);

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        expect.stringContaining('777: Unknown'),
        456
      );
    });

    test('handles no myNodeNum set', async () => {
      const handlerWithoutMyNode = new RelayHandler(mockDevice, knownNodes);
      mockDevice.sendText.mockResolvedValue(undefined);
      const mockPacket = { from: 456 };

      await handlerWithoutMyNode.handleNodesRequest(mockPacket);

      // Should include all nodes since no myNodeNum to exclude
      expect(mockDevice.sendText).toHaveBeenCalledWith(
        expect.stringContaining('456: Alice Station'),
        456
      );
    });
  });

  describe('handleEchoMessage', () => {
    test('sends instructions instead of echo', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);
      const mockPacket = { from: 456 };

      await relayHandler.handleEchoMessage(mockPacket);

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        "🤖 Bot ready! Send 'nodes' to list devices or @{nodeId} {message} to relay.",
        456
      );
    });
  });

  describe('sendInstructions', () => {
    test('sends bot instructions successfully', async () => {
      mockDevice.sendText.mockResolvedValue(undefined);
      const mockPacket = { from: 456 };

      await relayHandler.sendInstructions(mockPacket);

      expect(mockDevice.sendText).toHaveBeenCalledWith(
        "🤖 Bot ready! Send 'nodes' to list devices or @{nodeId} {message} to relay.",
        456
      );
    });

    test('handles instruction sending failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDevice.sendText.mockRejectedValue(new Error('Send failed'));
      const mockPacket = { from: 456 };

      await relayHandler.sendInstructions(mockPacket);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to send instructions:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});
