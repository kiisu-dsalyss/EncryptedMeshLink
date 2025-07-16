/**
 * Node Manager - Modular Implementation
 * One function per file architecture for node management
 */

import { NodeInfo } from './types';
import { getKnownNodes } from './getKnownNodes';
import { addNode } from './addNode';
import { showAvailableNodes } from './showAvailableNodes';

export class NodeManager {
  private knownNodes: Map<number, NodeInfo>;

  constructor() {
    this.knownNodes = new Map<number, NodeInfo>();
  }

  getKnownNodes(): Map<number, NodeInfo> {
    return getKnownNodes(this.knownNodes);
  }

  addNode(nodeInfo: any): void {
    return addNode(this.knownNodes, nodeInfo);
  }

  showAvailableNodes(myNodeNum?: number): void {
    return showAvailableNodes(this.knownNodes, myNodeNum);
  }
}

// Export types and functions for direct use
export { NodeInfo } from './types';
export { getKnownNodes } from './getKnownNodes';
export { addNode } from './addNode';
export { showAvailableNodes } from './showAvailableNodes';
