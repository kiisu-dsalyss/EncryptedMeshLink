/**
 * Message Splitter Utility
 * Handles splitting long messages to fit within Meshtastic size limits
 */

/**
 * Meshtastic message size limit (~228 bytes, using 200 to be safe)
 */
export const MAX_MESSAGE_SIZE = 200;

/**
 * Split a message into chunks that fit within Meshtastic size limits
 */
export function splitMessage(message: string, maxSize: number = MAX_MESSAGE_SIZE): string[] {
  if (message.length <= maxSize) {
    return [message];
  }
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Try to split by comma first to keep logical units together
  const parts = message.includes(', ') ? message.split(', ') : message.split(' ');
  const separator = message.includes(', ') ? ', ' : ' ';
  
  for (const part of parts) {
    const testChunk = currentChunk ? `${currentChunk}${separator}${part}` : part;
    
    if (testChunk.length <= maxSize) {
      currentChunk = testChunk;
    } else {
      // Current chunk is full, start a new one
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = part;
      
      // If a single part is too long, we have to truncate it
      if (currentChunk.length > maxSize) {
        currentChunk = currentChunk.substring(0, maxSize - 3) + '...';
      }
    }
  }
  
  // Add the last chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Send a message through a MeshDevice, automatically splitting if needed
 */
export async function sendMessage(
  device: any,
  message: string,
  to: number,
  delayBetweenChunks: number = 500
): Promise<void> {
  const chunks = splitMessage(message);
  
  if (chunks.length === 1) {
    // Single message, send as-is
    console.log(`📤 Sending message to ${to}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    await device.sendText(message, to);
  } else {
    // Multiple chunks, add indexing and send with delays
    console.log(`📤 Sending ${chunks.length} message chunks to ${to}`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkWithIndex = `[${i + 1}/${chunks.length}] ${chunk}`;
      
      console.log(`📤 Sending chunk ${i + 1}/${chunks.length}: "${chunkWithIndex.substring(0, 50)}..."`);
      await device.sendText(chunkWithIndex, to);
      
      // Delay between chunks to avoid overwhelming the network
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
      }
    }
    
    console.log(`✅ Sent complete message to ${to} (${chunks.length} chunks)`);
  }
}
