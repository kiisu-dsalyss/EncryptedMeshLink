/**
 * Start WebSocket Server
 * MIB-007: P2P Connection Manager - WebSocket Server Function
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

/**
 * Start WebSocket server for incoming P2P connections
 */
export async function startWebSocketServer(
  port: number,
  onConnection: (ws: WebSocket, req: any) => void
): Promise<WebSocketServer> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    const wss = new WebSocketServer({ server });
    
    wss.on('connection', onConnection);
    
    wss.on('error', (err: Error) => {
      console.error(`❌ WebSocket server error on port ${port}:`, err);
      reject(err);
    });
    
    server.listen(port, () => {
      console.log(`🕸️ WebSocket server listening on port ${port}`);
      resolve(wss);
    });
  });
}
