/**
 * Node Registry Manager
 * Core logic for cross-station node tracking and synchronization
 */

import { EventEmitter } from 'events';
import { NodeRegistryStorage } from './storage';
import { BridgeClient } from '../bridge/client';
import { 
  NodeRegistryEntry, 
  NodeRegistryConfig, 
  NodeConflict,
  RegistrySyncMessage,
  NodeQueryMessage,
  NodeQueryResponse,
  NodeRegistryEvent,
  NodeRegistryEventType
} from './types';

export class NodeRegistryManager extends EventEmitter {
  private storage: NodeRegistryStorage;
  private bridgeClient: BridgeClient;
  private config: NodeRegistryConfig;
  private syncTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private isRunning = false;
  private localStationId: string;
  private registryVersion = 0;

  constructor(
    stationId: string,
    bridgeClient: BridgeClient,
    config: Partial<NodeRegistryConfig> = {},
    dbPath?: string
  ) {
    super();
    
    this.localStationId = stationId;
    this.bridgeClient = bridgeClient;
    this.storage = new NodeRegistryStorage(dbPath);
    
    // Default configuration
    this.config = {
      syncIntervalMs: 30000, // 30 seconds
      nodeTtlSeconds: 300, // 5 minutes
      maxNodesPerStation: 100,
      cleanupIntervalMs: 60000, // 1 minute
      conflictResolutionStrategy: 'latest',
      ...config
    };

    this.setupBridgeListeners();
  }

  /**
   * Start the node registry manager
   */
  public start(): void {
    if (this.isRunning) return;

    this.storage.initialize();
    this.isRunning = true;

    // Start periodic sync
    this.syncTimer = setInterval(() => {
      this.performSync().catch(error => {
        this.emitEvent('sync_failed', undefined, undefined, { error: error.message });
      });
    }, this.config.syncIntervalMs);

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredNodes();
    }, this.config.cleanupIntervalMs);

    console.log('Node Registry Manager started');
  }

  /**
   * Stop the node registry manager
   */
  public stop(): void {
    if (!this.isRunning) return;

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.isRunning = false;
    console.log('Node Registry Manager stopped');
  }

  /**
   * Register a local node
   */
  public registerLocalNode(
    nodeId: string, 
    metadata?: Record<string, any>
  ): void {
    const entry: NodeRegistryEntry = {
      nodeId,
      stationId: this.localStationId,
      lastSeen: Date.now(),
      isOnline: true,
      metadata,
      ttl: this.config.nodeTtlSeconds
    };

    this.storage.upsertNode(entry);
    this.registryVersion++;
    this.emitEvent('node_added', nodeId, this.localStationId, entry);
  }

  /**
   * Update a local node's status
   */
  public updateLocalNode(
    nodeId: string, 
    isOnline: boolean = true,
    metadata?: Record<string, any>
  ): void {
    const existing = this.storage.findNode(nodeId);
    if (!existing || existing.stationId !== this.localStationId) {
      return; // Only update local nodes
    }

    const entry: NodeRegistryEntry = {
      ...existing,
      lastSeen: Date.now(),
      isOnline,
      metadata: metadata || existing.metadata,
      ttl: this.config.nodeTtlSeconds
    };

    this.storage.upsertNode(entry);
    this.registryVersion++;
    this.emitEvent('node_updated', nodeId, this.localStationId, entry);
  }

  /**
   * Remove a local node
   */
  public removeLocalNode(nodeId: string): void {
    const removed = this.storage.removeNode(nodeId, this.localStationId);
    if (removed > 0) {
      this.registryVersion++;
      this.emitEvent('node_removed', nodeId, this.localStationId);
    }
  }

  /**
   * Find a node across all stations
   */
  public findNode(nodeId: string): NodeRegistryEntry | null {
    return this.storage.findNode(nodeId);
  }

  /**
   * Query for a node via bridge network
   */
  public async queryNode(nodeId: string): Promise<NodeRegistryEntry | null> {
    // First check local registry
    const localResult = this.findNode(nodeId);
    if (localResult) {
      return localResult;
    }

    // Query remote stations
    const queryMessage: NodeQueryMessage = {
      type: 'node_query',
      targetNodeId: nodeId,
      sourceStationId: this.localStationId,
      timestamp: Date.now()
    };

    try {
      await this.bridgeClient.broadcastMessage(JSON.stringify(queryMessage));
      
      // Wait for response (simplified - in real implementation would use promise/callback)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 5000);
        
        const handler = (response: NodeQueryResponse) => {
          if (response.targetNodeId === nodeId) {
            clearTimeout(timeout);
            this.removeListener('node_query_response', handler);
            
            if (response.found && response.stationId) {
              resolve({
                nodeId,
                stationId: response.stationId,
                lastSeen: response.lastSeen || Date.now(),
                isOnline: response.isOnline || false,
                ttl: this.config.nodeTtlSeconds
              });
            } else {
              resolve(null);
            }
          }
        };
        
        this.on('node_query_response', handler);
      });
    } catch (error) {
      console.error('Node query failed:', error);
      return null;
    }
  }

  /**
   * Get all nodes by station
   */
  public getNodesByStation(stationId?: string): NodeRegistryEntry[] {
    if (stationId) {
      return this.storage.getNodesByStation(stationId);
    }
    return this.storage.getAllActiveNodes();
  }

  /**
   * Get registry statistics
   */
  public getStats() {
    const nodesByStation = this.storage.getNodeCountByStation();
    const totalNodes = Object.values(nodesByStation).reduce((sum, count) => sum + count, 0);
    
    return {
      totalNodes,
      nodesByStation,
      registryVersion: this.registryVersion,
      localStationId: this.localStationId,
      isRunning: this.isRunning
    };
  }

  /**
   * Perform registry synchronization with other stations
   */
  private async performSync(): Promise<void> {
    const localNodes = this.storage.getNodesByStation(this.localStationId);
    
    const syncMessage: RegistrySyncMessage = {
      type: 'node_registry_sync',
      version: this.registryVersion,
      stationId: this.localStationId,
      nodes: localNodes,
      timestamp: Date.now(),
      checksum: this.calculateChecksum(localNodes)
    };

    await this.bridgeClient.broadcastMessage(JSON.stringify(syncMessage));
    this.emitEvent('sync_completed', undefined, this.localStationId, { 
      nodeCount: localNodes.length 
    });
  }

  /**
   * Handle incoming registry sync messages
   */
  private handleRegistrySync(message: RegistrySyncMessage): void {
    if (message.stationId === this.localStationId) {
      return; // Ignore our own sync messages
    }

    let conflictsDetected = 0;
    
    for (const remoteNode of message.nodes) {
      const existingNode = this.storage.findNode(remoteNode.nodeId);
      
      if (existingNode && existingNode.stationId !== remoteNode.stationId) {
        // Conflict detected - same node ID at different stations
        const conflict = this.resolveNodeConflict(existingNode, remoteNode);
        this.storage.recordConflict(conflict);
        conflictsDetected++;
        
        if (conflict.resolvedEntry) {
          this.storage.upsertNode(conflict.resolvedEntry);
        }
        
        this.emitEvent('node_conflict', remoteNode.nodeId, undefined, conflict);
      } else {
        // No conflict, update the registry
        this.storage.upsertNode(remoteNode);
        
        if (!existingNode) {
          this.emitEvent('node_added', remoteNode.nodeId, remoteNode.stationId, remoteNode);
        } else {
          this.emitEvent('node_updated', remoteNode.nodeId, remoteNode.stationId, remoteNode);
        }
      }
    }

    console.log(`Processed sync from ${message.stationId}: ${message.nodes.length} nodes, ${conflictsDetected} conflicts`);
  }

  /**
   * Handle incoming node queries
   */
  private handleNodeQuery(message: NodeQueryMessage): void {
    const node = this.storage.findNode(message.targetNodeId);
    
    const response: NodeQueryResponse = {
      type: 'node_query_response',
      targetNodeId: message.targetNodeId,
      found: !!node,
      stationId: node?.stationId,
      lastSeen: node?.lastSeen,
      isOnline: node?.isOnline,
      timestamp: Date.now()
    };

    // Send response back via bridge
    this.bridgeClient.sendMessage(message.sourceStationId, JSON.stringify(response)).catch((error: any) => {
      console.error('Failed to send node query response:', error);
    });
  }

  /**
   * Resolve conflicts between node entries
   */
  private resolveNodeConflict(
    existing: NodeRegistryEntry, 
    incoming: NodeRegistryEntry
  ): NodeConflict {
    const conflict: NodeConflict = {
      nodeId: existing.nodeId,
      conflictingEntries: [existing, incoming],
      resolutionStrategy: this.config.conflictResolutionStrategy,
      timestamp: Date.now()
    };

    switch (this.config.conflictResolutionStrategy) {
      case 'latest':
        conflict.resolvedEntry = existing.lastSeen > incoming.lastSeen ? existing : incoming;
        break;
      case 'station_priority':
        // Prefer local station entries
        conflict.resolvedEntry = existing.stationId === this.localStationId ? existing : incoming;
        break;
      case 'first_seen':
        conflict.resolvedEntry = existing.lastSeen < incoming.lastSeen ? existing : incoming;
        break;
      default:
        conflict.resolvedEntry = existing; // Default to keeping existing
    }

    return conflict;
  }

  /**
   * Clean up expired nodes
   */
  private cleanupExpiredNodes(): void {
    const removed = this.storage.cleanupExpiredNodes();
    if (removed > 0) {
      console.log(`Cleaned up ${removed} expired nodes`);
    }
  }

  /**
   * Calculate checksum for node list
   */
  private calculateChecksum(nodes: NodeRegistryEntry[]): string {
    const crypto = require('crypto');
    const data = nodes.map(n => `${n.nodeId}:${n.stationId}:${n.lastSeen}`).join('|');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Setup bridge client listeners
   */
  private setupBridgeListeners(): void {
    this.bridgeClient.on('system_message', (message: any) => {
      try {
        switch (message.type) {
          case 'node_registry_sync':
            this.handleRegistrySync(message as RegistrySyncMessage);
            break;
          case 'node_query':
            this.handleNodeQuery(message as NodeQueryMessage);
            break;
          case 'node_query_response':
            this.emit('node_query_response', message as NodeQueryResponse);
            break;
        }
      } catch (error) {
        console.error('Error handling bridge message:', error);
      }
    });
  }

  /**
   * Emit a registry event
   */
  private emitEvent(
    type: NodeRegistryEventType, 
    nodeId?: string, 
    stationId?: string, 
    data?: any
  ): void {
    const event: NodeRegistryEvent = {
      type,
      nodeId,
      stationId,
      data,
      timestamp: Date.now()
    };
    
    this.emit(type, event);
    this.emit('registry_event', event);
  }
}
