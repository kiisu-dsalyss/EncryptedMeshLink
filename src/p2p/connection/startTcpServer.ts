/**
 * Start TCP Server
 * MIB-007: P2P Connection Manager - TCP Server Function
 */

import * as net from 'net';
import { PeerInfo } from '../types';

/**
 * Start TCP server for incoming P2P connections
 */
export async function startTcpServer(
  port: number,
  onConnection: (socket: net.Socket) => void
): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.on('connection', onConnection);
    
    server.on('error', (err: Error) => {
      console.error(`❌ TCP server error on port ${port}:`, err);
      reject(err);
    });
    
    server.listen(port, () => {
      console.log(`🌐 TCP server listening on port ${port}`);
      resolve(server);
    });
  });
}
