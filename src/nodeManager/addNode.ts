/**
 * Add Node Function
 * Adds a new node to the known nodes map
 */

import { NodeInfo } from './types';

export function addNode(knownNodes: Map<number, NodeInfo>, nodeInfo: any): void {
  knownNodes.set(nodeInfo.num, {
    num: nodeInfo.num,
    user: nodeInfo.user,
    position: nodeInfo.position,
    lastSeen: new Date()
  });
  console.log(`📍 Node discovered: ${nodeInfo.num} ${nodeInfo.user?.longName || 'Unknown'}`);
}
