import { MessageParser, ParsedMessage } from '../src/messageParser';

describe('MessageParser', () => {
  describe('parseMessage', () => {
    describe('relay messages', () => {
      test('parses simple relay message with target and content', () => {
        const result = MessageParser.parseMessage('@base hello world');
        
        expect(result).toEqual({
          type: 'relay',
          targetIdentifier: 'base',
          message: 'hello world'
        });
      });

      test('parses relay message with numeric target', () => {
        const result = MessageParser.parseMessage('@123456789 test message');
        
        expect(result).toEqual({
          type: 'relay',
          targetIdentifier: '123456789',
          message: 'test message'
        });
      });

      test('parses relay message with mixed case target', () => {
        const result = MessageParser.parseMessage('@BaseStation this is a test');
        
        expect(result).toEqual({
          type: 'relay',
          targetIdentifier: 'basestation',
          message: 'this is a test'
        });
      });

      test('parses relay message with underscore in target', () => {
        const result = MessageParser.parseMessage('@mobile_van urgent message');
        
        expect(result).toEqual({
          type: 'relay',
          targetIdentifier: 'mobile_van',
          message: 'urgent message'
        });
      });

      test('parses relay message with multi-word content', () => {
        const result = MessageParser.parseMessage('@station Hello from the mobile unit, please respond');
        
        expect(result).toEqual({
          type: 'relay',
          targetIdentifier: 'station',
          message: 'Hello from the mobile unit, please respond'
        });
      });

      test('handles relay message with extra spaces', () => {
        const result = MessageParser.parseMessage('@base    hello with spaces   ');
        
        expect(result).toEqual({
          type: 'relay',
          targetIdentifier: 'base',
          message: 'hello with spaces   '
        });
      });
    });

    describe('nodes command', () => {
      test('parses "nodes" command exactly', () => {
        const result = MessageParser.parseMessage('nodes');
        
        expect(result).toEqual({
          type: 'nodes'
        });
      });

      test('parses "NODES" command (uppercase)', () => {
        const result = MessageParser.parseMessage('NODES');
        
        expect(result).toEqual({
          type: 'nodes'
        });
      });

      test('parses "Nodes" command (mixed case)', () => {
        const result = MessageParser.parseMessage('Nodes');
        
        expect(result).toEqual({
          type: 'nodes'
        });
      });
    });

    describe('instructions command', () => {
      test('parses "instructions" command exactly', () => {
        const result = MessageParser.parseMessage('instructions');
        
        expect(result).toEqual({
          type: 'instructions'
        });
      });

      test('parses "INSTRUCTIONS" command (uppercase)', () => {
        const result = MessageParser.parseMessage('INSTRUCTIONS');
        
        expect(result).toEqual({
          type: 'instructions'
        });
      });

      test('parses "Instructions" command (mixed case)', () => {
        const result = MessageParser.parseMessage('Instructions');
        
        expect(result).toEqual({
          type: 'instructions'
        });
      });

      test('parses "help" command as instructions', () => {
        const result = MessageParser.parseMessage('help');
        
        expect(result).toEqual({
          type: 'instructions'
        });
      });

      test('parses "HELP" command as instructions', () => {
        const result = MessageParser.parseMessage('HELP');
        
        expect(result).toEqual({
          type: 'instructions'
        });
      });

      test('handles instructions with trailing whitespace', () => {
        const result = MessageParser.parseMessage('instructions   ');
        
        expect(result).toEqual({
          type: 'instructions'
        });
      });
    });

    describe('echo messages (default)', () => {
      test('treats plain text as echo', () => {
        const result = MessageParser.parseMessage('hello world');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });

      test('treats empty string as echo', () => {
        const result = MessageParser.parseMessage('');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });

      test('treats @ without proper format as echo', () => {
        const result = MessageParser.parseMessage('@');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });

      test('treats @ with no message as echo', () => {
        const result = MessageParser.parseMessage('@base');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });

      test('treats @ with special characters as echo', () => {
        const result = MessageParser.parseMessage('@base-station hello');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });

      test('treats unknown commands as echo', () => {
        const result = MessageParser.parseMessage('unknown');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });
    });

    describe('edge cases', () => {
      test('handles whitespace-only message', () => {
        const result = MessageParser.parseMessage('   ');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });

      test('handles message with only @ symbol', () => {
        const result = MessageParser.parseMessage('@');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });

      test('handles message starting with @ but invalid format', () => {
        const result = MessageParser.parseMessage('@ invalid format');
        
        expect(result).toEqual({
          type: 'echo'
        });
      });

      test('handles very long messages', () => {
        const longMessage = 'a'.repeat(1000);
        const result = MessageParser.parseMessage(`@base ${longMessage}`);
        
        expect(result).toEqual({
          type: 'relay',
          targetIdentifier: 'base',
          message: longMessage
        });
      });
    });
  });
});
