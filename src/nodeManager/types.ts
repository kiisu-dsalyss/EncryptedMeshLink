/**
 * Node Manager Types
 * Type definitions for node management operations
 */

export interface NodeInfo {
  num: number;
  user?: {
    longName?: string;
    shortName?: string;
  };
  position?: any;
  lastSeen: Date;
}

export interface NodeMatchResult {
  node: NodeInfo;
  nodeId: number;
  matchScore: number;
  isOnline: boolean;
  matchType: 'exact_id' | 'exact_name' | 'partial_name' | 'fuzzy_name';
}
