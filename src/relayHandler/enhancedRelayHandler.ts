/**
 * Enhanced Relay Handler - Modular Implementation
 * Provides bridge management and relay operations using modular functions
 */

import type { MeshDevice } from "@jsr/meshtastic__core";
import { EventEmitter } from 'events';
import { NodeInfo } from '../handlers/tryLocalRelay';
import { StationConfig } from '../config/types';
import { DiscoveryClientModular } from '../discovery/index';
import { P2PConnectionManager } from '../p2p/connection/index';
import { MessageQueue } from '../messageQueue/index';
import { initializeBridge } from '../handlers/initializeBridge';
import { stopBridge } from '../handlers/stopBridge';
import { handleRelayMessage as handleRelayMessageModular } from '../handlers/handleRelayMessage';

export interface BridgeStatus {
  active: boolean;
  remoteNodeCount: number;
  discoveryActive: boolean;
  p2pActive: boolean;
  messageQueueSize: number;
}

export class EnhancedRelayHandler extends EventEmitter {
  private device: MeshDevice;
  private knownNodes: Map<number, NodeInfo>;
  private config: StationConfig;
  private myNodeNum: number;
  
  private discoveryClient?: DiscoveryClientModular;
  private p2pManager?: P2PConnectionManager;
  private messageQueue?: MessageQueue;
  private remoteNodes: Map<number, NodeInfo> = new Map();
  
  private bridgeActive = false;

  constructor(
    device: MeshDevice, 
    knownNodes: Map<number, NodeInfo>, 
    config: StationConfig, 
    myNodeNum: number
  ) {
    super();
    this.device = device;
    this.knownNodes = knownNodes;
    this.config = config;
    this.myNodeNum = myNodeNum;
  }

  async initializeBridge(): Promise<void> {
    try {
      // Use modular initialize bridge function
      await initializeBridge(
        this.device,
        this.knownNodes,
        this.config,
        this.myNodeNum
      );
      
      // Initialize discovery client
      this.discoveryClient = new DiscoveryClientModular(this.config.discovery);
      await this.discoveryClient.start();
      
      // Initialize P2P manager
      this.p2pManager = new P2PConnectionManager(this.config.p2p);
      await this.p2pManager.start();
      
      // Initialize message queue
      this.messageQueue = new MessageQueue();
      await this.messageQueue.start();
      
      this.bridgeActive = true;
      this.emit('bridgeInitialized');
    } catch (error) {
      this.emit('bridgeError', error);
      throw error;
    }
  }

  async stopBridge(): Promise<void> {
    try {
      // Use modular stop bridge function
      await stopBridge(this.discoveryClient);
      
      // Stop services
      if (this.discoveryClient) {
        await this.discoveryClient.stop();
        this.discoveryClient = undefined;
      }
      
      if (this.p2pManager) {
        await this.p2pManager.stop();
        this.p2pManager = undefined;
      }
      
      if (this.messageQueue) {
        await this.messageQueue.stop();
        this.messageQueue = undefined;
      }
      
      this.bridgeActive = false;
      this.remoteNodes.clear();
      this.emit('bridgeStopped');
    } catch (error) {
      this.emit('bridgeError', error);
      throw error;
    }
  }

  async handleRelayMessage(packet: any, targetIdentifier: string, message: string): Promise<void> {
    // Use modular relay message handler
    return handleRelayMessageModular(
      this.device,
      this.knownNodes,
      packet,
      targetIdentifier,
      message
    );
  }

  getBridgeStatus(): BridgeStatus {
    return {
      active: this.bridgeActive,
      remoteNodeCount: this.remoteNodes.size,
      discoveryActive: this.discoveryClient?.isActive() ?? false,
      p2pActive: this.p2pManager?.isActive() ?? false,
      messageQueueSize: this.messageQueue?.getQueueSize() ?? 0
    };
  }

  getRemoteNodes(): Map<number, NodeInfo> {
    return new Map(this.remoteNodes);
  }

  // Event handlers for remote node management
  private onRemoteNodeDiscovered(nodeInfo: NodeInfo): void {
    this.remoteNodes.set(nodeInfo.num, nodeInfo);
    this.emit('remoteNodeDiscovered', nodeInfo);
  }

  private onRemoteNodeLost(nodeNum: number): void {
    this.remoteNodes.delete(nodeNum);
    this.emit('remoteNodeLost', nodeNum);
  }
}
