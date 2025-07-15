/**
 * Node Manager - Main Export
 * Direct imports to avoid module resolution issues
 */

import { NodeInfo } from './nodeManager/types';
import { getKnownNodes } from './nodeManager/getKnownNodes';
import { addNode } from './nodeManager/addNode';
import { showAvailableNodes } from './nodeManager/showAvailableNodes';

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
export { NodeInfo, getKnownNodes, addNode, showAvailableNodes };
