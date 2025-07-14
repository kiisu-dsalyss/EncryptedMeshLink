/**
 * EncryptedMeshLink Discovery Client
 * MIB-004: Discovery Client Implementation
 * 
 * TypeScript client for communicating with the PHP discovery service
 * Handles station registration, peer discovery, and heartbeat management
 */

import { StationConfig } from './config/types';

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
    // Validate required configuration
    if (!config.discovery?.serviceUrl) {
      throw new Error('Discovery service URL is required');
    }
    
    if (!config.stationId) {
      throw new Error('Station ID is required');
    }
    
    if (!config.keys?.publicKey) {
      throw new Error('Public key is required');
    }
    
    this.config = config;
  }

  /**
   * Start the discovery client - register and begin heartbeat/discovery cycles
   */
  async start(): Promise<void> {
    console.log(`🌍 Starting EncryptedMeshLink Discovery Client for station: ${this.config.stationId}`);
    
    try {
      // Test discovery service health
      const health = await this.checkHealth();
      console.log(`🏥 Discovery service healthy - ${health.activeStations} active stations`);
      
      // Register this station
      await this.register();
      
      // Start periodic tasks
      this.startHeartbeat();
      this.startPeerDiscovery();
      
      console.log(`✅ Discovery client started successfully`);
    } catch (error) {
      console.error(`❌ Failed to start discovery client:`, error);
      this.handleError(new Error(`Discovery client startup failed: ${error}`));
      throw error;
    }
  }

  /**
   * Stop the discovery client and unregister
   */
  async stop(): Promise<void> {
    console.log(`🛑 Stopping EncryptedMeshLink Discovery Client...`);
    
    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }
    
    // Unregister from discovery service
    if (this.isRegistered) {
      try {
        await this.unregister();
      } catch (error) {
        console.warn(`⚠️ Failed to unregister cleanly:`, error);
      }
    }
    
    this.knownPeers.clear();
    console.log(`✅ Discovery client stopped`);
  }

  /**
   * Register this station with the discovery service
   */
  async register(): Promise<boolean> {
    try {
      const contactInfo: ContactInfo = {
        ip: await this.getPublicIP(),
        port: this.config.p2p.listenPort,
        publicKey: this.config.keys.publicKey,
        lastSeen: Date.now()
      };

      const encryptedContactInfo = await this.encryptContactInfo(contactInfo);
      
      const payload = {
        station_id: this.config.stationId,
        encrypted_contact_info: encryptedContactInfo,
        public_key: this.config.keys.publicKey
      };

      const response = await this.makeRequest('POST', '', payload);
      
      if (response.success) {
        this.isRegistered = true;
        console.log(`📝 Station registered successfully`);
        return true;
      } else {
        console.error(`Registration failed: ${response.error}`);
        return false;
      }
    } catch (error) {
      console.error(`Registration error:`, error);
      return false;
    }
  }

  /**
   * Unregister this station from the discovery service
   */
  async unregister(): Promise<boolean> {
    const response = await this.makeRequest('DELETE', `?station_id=${this.config.stationId}`);
    
    if (response.success) {
      this.isRegistered = false;
      console.log(`📤 Station unregistered successfully`);
      return true;
    } else {
      throw new Error(`Unregistration failed: ${response.error}`);
    }
  }

  /**
   * Discover active peers from the discovery service
   */
  async discoverPeers(): Promise<DiscoveredPeer[]> {
    try {
      const response = await this.makeRequest('GET', '?peers=true');
      
      if (!response.success) {
        console.error(`Peer discovery failed: ${response.error}`);
        return [];
      }

      const peers: DiscoveredPeer[] = response.data.peers || [];
      
      // Filter out ourselves
      const remotePeers = peers.filter(peer => peer.stationId !== this.config.stationId);
      
      // Process peer changes
      this.processPeerChanges(remotePeers);
      
      return remotePeers;
    } catch (error) {
      console.error(`Peer discovery error:`, error);
      return [];
    }
  }

  /**
   * Check discovery service health
   */
  async checkHealth(): Promise<HealthStatus> {
    const response = await this.makeRequest('GET', '?health=true');
    
    if (!response.success) {
      throw new Error(`Health check failed: ${response.error}`);
    }

    return {
      status: response.data.status,
      timestamp: response.data.timestamp,
      version: response.data.version,
      activeStations: response.data.active_stations,
      phpVersion: response.data.php_version,
      sqliteVersion: response.data.sqlite_version
    };
  }

  /**
   * Decrypt contact info from a discovered peer
   */
  async decryptContactInfo(encryptedData: string): Promise<ContactInfo> {
    // TODO: Implement AES decryption when MIB-003 (Cryptography) is complete
    // For now, return a placeholder
    const decoded = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
    return decoded;
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

  // Private methods

  private async encryptContactInfo(contactInfo: ContactInfo): Promise<string> {
    // TODO: Implement AES encryption when MIB-003 (Cryptography) is complete
    // For now, just base64 encode the JSON
    const json = JSON.stringify(contactInfo);
    return Buffer.from(json).toString('base64');
  }

  private async getPublicIP(): Promise<string> {
    try {
      // Try multiple IP detection services
      const services = [
        'https://api.ipify.org?format=json',
        'https://ipinfo.io/json',
        'https://httpbin.org/ip'
      ];

      for (const service of services) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(service, { 
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          const data = await response.json();
          
          // Handle different response formats
          const ip = data.ip || data.origin || data.query;
          if (ip && this.isValidIP(ip)) {
            return ip;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to get IP from ${service}:`, error);
          continue;
        }
      }
      
      throw new Error('All IP detection services failed');
    } catch (error) {
      console.warn(`⚠️ Could not determine public IP, using localhost`);
      return '127.0.0.1';
    }
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private async makeRequest(method: string, path: string, body?: any): Promise<DiscoveryResponse> {
    const url = `${this.config.discovery.serviceUrl}${path}`;
    const timeout = this.config.discovery.timeout * 1000;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `EncryptedMeshLink/1.0.0 (Station: ${this.config.stationId})`
      },
      signal: AbortSignal.timeout(timeout)
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
      }
      
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.discovery.timeout}s`);
      }
      throw error;
    }
  }

  private startHeartbeat(): void {
    const intervalMs = this.config.discovery.checkInterval * 1000;
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.isRegistered) {
          console.log(`💓 Sending heartbeat...`);
          await this.register(); // Re-register to update last_seen
        }
      } catch (error) {
        console.warn(`⚠️ Heartbeat failed:`, error);
        this.handleError(new Error(`Heartbeat failed: ${error}`));
      }
    }, intervalMs);

    console.log(`💓 Heartbeat started (${this.config.discovery.checkInterval}s interval)`);
  }

  private startPeerDiscovery(): void {
    const intervalMs = this.config.discovery.checkInterval * 1000;
    
    this.discoveryInterval = setInterval(async () => {
      try {
        console.log(`🔍 Discovering peers...`);
        await this.discoverPeers();
      } catch (error) {
        console.warn(`⚠️ Peer discovery failed:`, error);
        this.handleError(new Error(`Peer discovery failed: ${error}`));
      }
    }, intervalMs);

    console.log(`🔍 Peer discovery started (${this.config.discovery.checkInterval}s interval)`);
  }

  private processPeerChanges(currentPeers: DiscoveredPeer[]): void {
    const currentPeerIds = new Set(currentPeers.map(p => p.stationId));
    const knownPeerIds = new Set(this.knownPeers.keys());

    // Find new peers
    for (const peer of currentPeers) {
      if (!this.knownPeers.has(peer.stationId)) {
        console.log(`🆕 New peer discovered: ${peer.stationId}`);
        this.knownPeers.set(peer.stationId, peer);
        
        if (this.onPeerDiscovered) {
          this.onPeerDiscovered(peer);
        }
      } else {
        // Update existing peer
        this.knownPeers.set(peer.stationId, peer);
      }
    }

    // Find lost peers
    for (const knownPeerId of Array.from(knownPeerIds)) {
      if (!currentPeerIds.has(knownPeerId)) {
        console.log(`👋 Peer lost: ${knownPeerId}`);
        this.knownPeers.delete(knownPeerId);
        
        if (this.onPeerLost) {
          this.onPeerLost(knownPeerId);
        }
      }
    }
  }

  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    }
  }
}
