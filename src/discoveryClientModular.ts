/**
 * EncryptedMeshLink Discovery Client (Modular)
 * MIB-004: Discovery Client Implementation
 * 
 * TypeScript client for communicating with the PHP discovery service
 * Handles station registration, peer discovery, and heartbeat management
 */

import { StationConfig } from './config/types';
import { ContactInfo, DiscoveredPeer, DiscoveryResponse, HealthStatus } from './discovery/types';
import { registerStation, unregisterStation } from './discovery/registration';
import { discoverPeers as discoverPeersFunc, processPeerChanges } from './discovery/peers';
import { checkHealth } from './discovery/health';
import { decryptContactInfo } from './discovery/crypto';
import { startHeartbeat, startPeerDiscovery, stopTimer } from './discovery/timers';

export { ContactInfo, DiscoveredPeer, DiscoveryResponse, HealthStatus } from './discovery/types';

export class DiscoveryClient {
  private config: StationConfig;
  private isRegistered: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private discoveryInterval?: NodeJS.Timeout;
  private onPeerDiscovered?: (peer: DiscoveredPeer) => void;
  private onPeerLost?: (stationId: string) => void;
  private onError?: (error: Error) => void;
  private knownPeers: Map<string, DiscoveredPeer> = new Map();

  constructor(config: StationConfig) {
    this.config = config;
  }

  /**
   * Start the discovery client
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting discovery client for station ${this.config.stationId}`);
    
    try {
      // Register with discovery service
      const registered = await this.register();
      if (!registered) {
        throw new Error('Failed to register with discovery service');
      }

      // Start background tasks
      this.startHeartbeat();
      this.startPeerDiscovery();
      
      console.log(`✅ Discovery client started successfully`);
    } catch (error) {
      console.error(`❌ Failed to start discovery client:`, error);
      throw error;
    }
  }

  /**
   * Stop the discovery client
   */
  async stop(): Promise<void> {
    console.log(`🛑 Stopping discovery client...`);
    
    // Stop background tasks
    stopTimer(this.heartbeatInterval);
    stopTimer(this.discoveryInterval);
    
    // Unregister if we're registered
    if (this.isRegistered) {
      try {
        await this.unregister();
      } catch (error) {
        console.warn(`⚠️ Failed to unregister:`, error);
      }
    }
    
    this.isRegistered = false;
    this.knownPeers.clear();
    console.log(`✅ Discovery client stopped`);
  }

  /**
   * Register this station with the discovery service
   */
  async register(): Promise<boolean> {
    const success = await registerStation(this.config);
    this.isRegistered = success;
    return success;
  }

  /**
   * Unregister this station from the discovery service
   */
  async unregister(): Promise<boolean> {
    const success = await unregisterStation(this.config);
    if (success) {
      this.isRegistered = false;
    }
    return success;
  }

  /**
   * Discover active peers from the discovery service
   */
  async discoverPeers(): Promise<DiscoveredPeer[]> {
    const currentPeers = await discoverPeersFunc(this.config);
    
    // Process peer changes
    processPeerChanges(
      currentPeers, 
      this.knownPeers, 
      this.onPeerDiscovered, 
      this.onPeerLost
    );
    
    return currentPeers;
  }

  /**
   * Check health of the discovery service
   */
  async checkHealth(): Promise<HealthStatus> {
    return checkHealth(this.config);
  }

  /**
   * Decrypt contact info from a discovered peer
   */
  async decryptContactInfo(encryptedData: string): Promise<ContactInfo> {
    return decryptContactInfo(encryptedData, this.config);
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: {
    onPeerDiscovered?: (peer: DiscoveredPeer) => void;
    onPeerLost?: (stationId: string) => void;
    onError?: (error: Error) => void;
  }): void {
    this.onPeerDiscovered = handlers.onPeerDiscovered;
    this.onPeerLost = handlers.onPeerLost;
    this.onError = handlers.onError;
  }

  /**
   * Get list of currently known peers
   */
  getKnownPeers(): DiscoveredPeer[] {
    return Array.from(this.knownPeers.values());
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = startHeartbeat(
      this.config,
      () => this.isRegistered,
      this.handleError.bind(this)
    );
  }

  private startPeerDiscovery(): void {
    this.discoveryInterval = startPeerDiscovery(
      this.config,
      this.knownPeers,
      this.onPeerDiscovered,
      this.onPeerLost,
      this.handleError.bind(this)
    );
  }

  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    } else {
      console.error(`Discovery client error:`, error);
    }
  }
}
