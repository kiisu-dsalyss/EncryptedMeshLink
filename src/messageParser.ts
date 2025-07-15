export interface ParsedMessage {
  type: 'relay' | 'nodes' | 'status' | 'echo' | 'instructions';
  targetIdentifier?: string;
  message?: string;
}

export class MessageParser {
  static parseMessage(messageData: string): ParsedMessage {
    // Check if this is a relay command (@{nodeId} message or @{nodeName} message)
    const relayMatch = messageData.match(/^@(\w+)\s+(.+)$/i);
    
    if (relayMatch) {
      return {
        type: 'relay',
        targetIdentifier: relayMatch[1].toLowerCase(),
        message: relayMatch[2]
      };
    }
    
    // Check if it's an instructions request
    const trimmedLower = messageData.trim().toLowerCase();
    if (trimmedLower === 'instructions' || trimmedLower === 'help') {
      return {
        type: 'instructions'
      };
    }
    
    // Check if it's a status request
    if (trimmedLower === 'status') {
      return {
        type: 'status'
      };
    }
    
    // Check if it's a list nodes request
    if (trimmedLower === 'nodes' || trimmedLower === 'list nodes') {
      return {
        type: 'nodes'
      };
    }
    
    // Default to echo
    return {
      type: 'echo'
    };
  }
}
