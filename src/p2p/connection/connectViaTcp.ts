/**
 * Connect Via TCP
 * MIB-007: P2P Connection Manager - TCP Connection Function
 */

import * as net from 'net';
import { PeerInfo, P2PConnection, P2PConnectionStatus, P2PMessage } from '../types';

/**
 * Establish TCP connection to a peer
 */
export async function connectViaTcp(peer: PeerInfo): Promise<P2PConnection> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`TCP connection timeout to ${peer.host}:${peer.port}`));
    }, 10000);

    socket.connect(peer.port, peer.host, () => {
      clearTimeout(timeout);
      console.log(`🔗 TCP connected to ${peer.stationId} at ${peer.host}:${peer.port}`);
      resolve({
        peerId: peer.stationId,
        status: P2PConnectionStatus.CONNECTED,
        connectionType: 'tcp',
        lastActivity: Date.now(),
        retryCount: 0,
        send: async (message: P2PMessage) => {
          return new Promise((resolve, reject) => {
            socket.write(JSON.stringify(message), (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        },
        close: async () => {
          socket.end();
        }
      });
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
