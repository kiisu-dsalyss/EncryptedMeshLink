/**
 * Discovery Types
 * Type definitions for the discovery client system
 */

export interface ContactInfo {
  ip: string;
  port: number;
  publicKey: string;
  lastSeen: number;
}

export interface DiscoveredPeer {
  stationId: string;
  encryptedContactInfo: string;
  publicKey: string;
  lastSeen: number;
}

export interface DiscoveryResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp?: number;
}

export interface HealthStatus {
  status: string;
  timestamp: number;
  version: string;
  activeStations: number;
  phpVersion: string;
  sqliteVersion: string;
}
