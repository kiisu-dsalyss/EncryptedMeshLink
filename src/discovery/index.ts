/**
 * Discovery Client - Modular Implementation
 * MIB-007: Discovery Client - Modular Class using Individual Functions
 */

import { EventEmitter } from 'events';
import { StationConfig } from '../config/types';
import { ContactInfo, DiscoveredPeer, HealthStatus, DiscoveryResponse } from './types';
import { registerStation } from './registerStation';
import { discoverPeers } from './discoverPeers';
import { startHeartbeat } from './startHeartbeat';
import { encryptContactInfo } from './encryptContactInfo';

// Re-export types
export { ContactInfo, DiscoveredPeer, HealthStatus, DiscoveryResponse };

export class DiscoveryClientModular extends EventEmitter {
  private config: StationConfig;
  private heartbeatTimer?: NodeJS.Timeout;
  private discoveryTimer?: NodeJS.Timeout;
  private isActive = false;
  private lastKnownPeers: DiscoveredPeer[] = [];

  constructor(config: StationConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      console.log('⚠️ Discovery client already active');
      return;
    }

    console.log('🔍 Starting discovery client...');
    this.isActive = true;

    try {
      // Register with discovery server
      await this.register();

      // Start heartbeat
      this.heartbeatTimer = startHeartbeat(
        30000, // 30 seconds
        () => this.isActive,
        this.config.stationId,
        this.makeRequest.bind(this),
        this.handleError.bind(this)
      );

      // Start peer discovery
      this.startPeerDiscovery();

      console.log('✅ Discovery client started successfully');
    } catch (error) {
      this.isActive = false;
      console.error('❌ Failed to start discovery client:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) return;

    console.log('🛑 Stopping discovery client...');
    this.isActive = false;

    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = undefined;
    }

    // Unregister from discovery server
    try {
      await this.unregister();
    } catch (error) {
      console.error('⚠️ Error during unregistration:', error);
    }

    console.log('✅ Discovery client stopped');
  }

  async register(): Promise<boolean> {
    const contactInfo: ContactInfo = {
      ip: await this.getPublicIP(),
      port: 8080, // Default port
      publicKey: this.config.keys.publicKey,
      lastSeen: Math.floor(Date.now() / 1000)
    };

    const encryptedContactInfo = await encryptContactInfo(
      contactInfo,
      this.getSharedDiscoveryKey.bind(this)
    );

    return await registerStation(
      this.config.stationId,
      contactInfo,
      encryptedContactInfo,
      this.makeRequest.bind(this)
    );
  }

  async unregister(): Promise<boolean> {
    try {
      const response = await this.makeRequest('POST', '/api/discovery.php', {
        action: 'unregister',
        station_id: this.config.stationId
      });

      if (response.success) {
        console.log(`✅ Station ${this.config.stationId} unregistered successfully`);
        return true;
      } else {
        console.warn(`⚠️ Unregistration failed: ${response.error}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Unregistration error:`, error);
      return false;
    }
  }

  async discoverPeers(): Promise<DiscoveredPeer[]> {
    return await discoverPeers(this.makeRequest.bind(this));
  }

  private startPeerDiscovery(): void {
    this.discoveryTimer = setInterval(async () => {
      if (!this.isActive) return;

      try {
        const currentPeers = await this.discoverPeers();
        this.processPeerChanges(currentPeers);
        this.lastKnownPeers = currentPeers;
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    }, 60000); // 1 minute
  }

  private processPeerChanges(currentPeers: DiscoveredPeer[]): void {
    const currentPeerIds = new Set(currentPeers.map(p => p.stationId));
    const lastPeerIds = new Set(this.lastKnownPeers.map(p => p.stationId));

    // Find new peers
    for (const peer of currentPeers) {
      if (!lastPeerIds.has(peer.stationId)) {
        console.log(`🆕 New peer discovered: ${peer.stationId}`);
        this.emit('peerDiscovered', peer);
      }
    }

    // Find lost peers
    for (const peer of this.lastKnownPeers) {
      if (!currentPeerIds.has(peer.stationId)) {
        console.log(`📭 Peer lost: ${peer.stationId}`);
        this.emit('peerLost', peer.stationId);
      }
    }
  }

  private async getPublicIP(): Promise<string> {
    // Simple public IP detection
    return '127.0.0.1'; // Placeholder
  }

  private async makeRequest(method: string, path: string, body?: any): Promise<DiscoveryResponse> {
    // HTTP request implementation
    return { success: true }; // Placeholder
  }

  private async getSharedDiscoveryKey(): Promise<string> {
    return 'shared-discovery-key'; // Placeholder
  }

  private handleError(error: Error): void {
    console.error('🔍 Discovery error:', error);
    this.emit('error', error);
  }

  // Compatibility methods for existing interface
  get isRegistered(): boolean {
    return this.isActive;
  }

  get knownPeers(): DiscoveredPeer[] {
    return this.lastKnownPeers;
  }

  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await this.makeRequest('GET', '/api/health.php');
      return {
        status: response.data?.status || 'unknown',
        timestamp: response.data?.timestamp || Date.now(),
        version: response.data?.version || '1.0.0',
        activeStations: response.data?.active_stations || 0,
        phpVersion: response.data?.php_version || 'unknown',
        sqliteVersion: response.data?.sqlite_version || 'unknown'
      };
    } catch (error) {
      throw new Error(`Health check failed: ${error}`);
    }
  }

  async decryptContactInfo(encryptedData: string): Promise<ContactInfo> {
    // Placeholder implementation
    return {
      ip: '127.0.0.1',
      port: 8080,
      publicKey: 'placeholder',
      lastSeen: Date.now()
    };
  }
}
