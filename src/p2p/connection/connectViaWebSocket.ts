/**
 * Connect Via WebSocket
 * MIB-007: P2P Connection Manager - WebSocket Connection Function
 */

import { WebSocket } from 'ws';
import { PeerInfo, P2PConnection, P2PConnectionStatus, P2PMessage } from '../types';

/**
 * Establish WebSocket connection to a peer
 */
export async function connectViaWebSocket(peer: PeerInfo): Promise<P2PConnection> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${peer.host}:${peer.port}`);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`WebSocket connection timeout to ${peer.host}:${peer.port}`));
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`🕸️ WebSocket connected to ${peer.stationId} at ${peer.host}:${peer.port}`);
      resolve({
        peerId: peer.stationId,
        status: P2PConnectionStatus.CONNECTED,
        connectionType: 'websocket',
        lastActivity: Date.now(),
        retryCount: 0,
        send: async (message: P2PMessage) => {
          return new Promise((resolve, reject) => {
            ws.send(JSON.stringify(message), (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        },
        close: async () => {
          ws.close();
        }
      });
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
