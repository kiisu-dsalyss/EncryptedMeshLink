/**
 * RelayHandler Module - Modular Implementation
 * One function per file architecture for relay handling operations
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { NodeInfo } from './types';
import { handleRelayMessage } from './handleRelayMessage';
import { handleNodesRequest } from './handleNodesRequest';
import { handleEchoMessage } from './handleEchoMessage';
import { sendInstructions } from './sendInstructions';

export class RelayHandler {
  private device: MeshDevice;
  private knownNodes: Map<number, NodeInfo>;
  private myNodeNum?: number;

  constructor(device: MeshDevice, knownNodes: Map<number, NodeInfo>, myNodeNum?: number) {
    this.device = device;
    this.knownNodes = knownNodes;
    this.myNodeNum = myNodeNum;
  }

  async handleRelayMessage(packet: any, targetIdentifier: string, message: string): Promise<void> {
    return handleRelayMessage(this.device, this.knownNodes, packet, targetIdentifier, message);
  }

  async handleNodesRequest(packet: any): Promise<void> {
    return handleNodesRequest(this.device, this.knownNodes, packet, this.myNodeNum);
  }

  async handleEchoMessage(packet: any): Promise<void> {
    return handleEchoMessage(this.device, this.knownNodes, packet);
  }

  async sendInstructions(packet: any): Promise<void> {
    return sendInstructions(this.device, this.knownNodes, packet);
  }
}

// Export types and individual functions
export { NodeInfo } from './types';
export { handleRelayMessage } from './handleRelayMessage';
export { handleNodesRequest } from './handleNodesRequest';
export { handleEchoMessage } from './handleEchoMessage';
export { sendInstructions } from './sendInstructions';
