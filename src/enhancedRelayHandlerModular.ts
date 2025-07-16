/**
 * Enhanced Relay Handler with Discovery Integration (Modular)
 * MIB-007: Enhanced Relay Handler for Bridge Integration
 * 
 * Modular implementation following "one function per file" architecture
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { DiscoveryClient, DiscoveredPeer } from './discoveryClient';
import { StationConfig } from './config/types';
import { CryptoService } from './crypto/index';

// Import modular functions
import { initializeBridge } from './handlers/initializeBridge';
import { stopBridge } from './handlers/stopBridge';
import { registerLocalNodes } from './handlers/registerLocalNodes';
import { handleRelayMessage } from './handlers/handleRelayMessage';
import { handleStatusRequest } from './handlers/handleStatusRequest';
import { handleListNodesRequest } from './handlers/handleListNodesRequest';
import { handleInstructionsRequest } from './handlers/handleInstructionsRequest';
import { handleEchoMessage } from './handlers/handleEchoMessage';
import { handlePeerDiscovered, handlePeerLost, handleDiscoveryError } from './handlers/peerEvents';
import { NodeInfo } from './handlers/tryLocalRelay';
import { RemoteNodeInfo } from './handlers/tryRemoteRelay';

export class EnhancedRelayHandler {
  private device: MeshDevice;
  private knownNodes: Map<number, NodeInfo>;
  private remoteNodes: Map<number, RemoteNodeInfo> = new Map();
  private discoveryClient?: DiscoveryClient;
  private myNodeNum?: number;
  private config: StationConfig;
  private cryptoService: CryptoService;

  constructor(
    device: MeshDevice, 
    knownNodes: Map<number, NodeInfo>, 
    config: StationConfig,
    myNodeNum?: number
  ) {
    this.device = device;
    this.knownNodes = knownNodes;
    this.config = config;
    this.myNodeNum = myNodeNum;
    this.cryptoService = new CryptoService();
  }

  /**
   * Initialize discovery client and start bridge services
   */
  async initializeBridge(): Promise<void> {
    this.discoveryClient = await initializeBridge(
      this.config,
      (peer: DiscoveredPeer) => handlePeerDiscovered(this.remoteNodes, peer),
      (stationId: string) => handlePeerLost(this.remoteNodes, stationId),
      (error: Error) => handleDiscoveryError(error)
    );
  }

  /**
   * Stop bridge services
   */
  async stopBridge(): Promise<void> {
    await stopBridge(this.discoveryClient);
    this.discoveryClient = undefined;
    this.remoteNodes.clear();
  }

  /**
   * Register local nodes for relay handling
   */
  async registerLocalNodes(): Promise<void> {
    await registerLocalNodes(this.device, this.knownNodes, this.myNodeNum);
  }

  /**
   * Enhanced relay message handler with bridge support
   */
  async handleRelayMessage(packet: any, targetIdentifier: string, message: string): Promise<void> {
    await handleRelayMessage(
      this.device,
      this.knownNodes,
      this.remoteNodes,
      this.myNodeNum,
      this.discoveryClient,
      this.cryptoService,
      packet,
      targetIdentifier,
      message
    );
  }

  /**
   * Handle status request
   */
  async handleStatusRequest(packet: any): Promise<void> {
    await handleStatusRequest(
      this.device,
      this.knownNodes,
      this.remoteNodes,
      this.myNodeNum,
      packet
    );
  }

  /**
   * Handle list nodes request
   */
  async handleListNodesRequest(packet: any): Promise<void> {
    await handleListNodesRequest(
      this.device,
      this.knownNodes,
      this.remoteNodes,
      this.myNodeNum,
      packet
    );
  }

  /**
   * Handle instructions request
   */
  async handleInstructionsRequest(packet: any): Promise<void> {
    await handleInstructionsRequest(
      this.device,
      this.myNodeNum,
      packet
    );
  }

  /**
   * Handle echo message request
   */
  async handleEchoMessage(packet: any): Promise<void> {
    await handleEchoMessage(
      this.device,
      this.myNodeNum,
      packet
    );
  }

  /**
   * Get current remote nodes
   */
  getRemoteNodes(): Map<number, RemoteNodeInfo> {
    return new Map(this.remoteNodes);
  }

  /**
   * Get bridge status
   */
  getBridgeStatus(): { active: boolean; remoteNodeCount: number; discoveryActive: boolean } {
    return {
      active: !!this.discoveryClient,
      remoteNodeCount: this.remoteNodes.size,
      discoveryActive: !!this.discoveryClient
    };
  }
}

// Export types for use by other modules
export type { NodeInfo, RemoteNodeInfo };
