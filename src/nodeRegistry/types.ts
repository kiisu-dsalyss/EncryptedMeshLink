/**
 * Node Registry Bridge - Type Definitions
 * Defines types for cross-station node tracking and registry management
 */

export interface NodeInfo {
  nodeId: string;
  stationId: string;
  lastSeen: number;
  isOnline: boolean;
  capabilities?: string[];
  shortName?: string;
  longName?: string;
  hwModel?: string;
}

export interface StationNodeMap {
  stationId: string;
  nodes: NodeInfo[];
  lastUpdated: number;
  version: number;
}

export interface NodeRegistryEntry {
  nodeId: string;
  stationId: string;
  lastSeen: number;
  isOnline: boolean;
  metadata?: Record<string, any>;
  ttl: number; // Time to live in seconds
}

export interface RegistrySyncMessage {
  type: 'node_registry_sync';
  version: number;
  stationId: string;
  nodes: NodeRegistryEntry[];
  timestamp: number;
  checksum: string;
}

export interface NodeQueryMessage {
  type: 'node_query';
  targetNodeId: string;
  sourceStationId: string;
  timestamp: number;
}

export interface NodeQueryResponse {
  type: 'node_query_response';
  targetNodeId: string;
  found: boolean;
  stationId?: string;
  lastSeen?: number;
  isOnline?: boolean;
  timestamp: number;
}

export interface NodeRegistryConfig {
  syncIntervalMs: number;
  nodeTtlSeconds: number;
  maxNodesPerStation: number;
  cleanupIntervalMs: number;
  conflictResolutionStrategy: 'latest' | 'station_priority' | 'first_seen';
}

export interface NodeConflict {
  nodeId: string;
  conflictingEntries: NodeRegistryEntry[];
  resolvedEntry?: NodeRegistryEntry;
  resolutionStrategy: string;
  timestamp: number;
}

export type NodeRegistryEventType = 
  | 'node_added'
  | 'node_updated' 
  | 'node_removed'
  | 'node_conflict'
  | 'sync_completed'
  | 'sync_failed';

export interface NodeRegistryEvent {
  type: NodeRegistryEventType;
  nodeId?: string;
  stationId?: string;
  data?: any;
  timestamp: number;
}
