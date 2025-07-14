/**
 * Station Configuration Manager
 * MIB-002: Station Configuration System
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { StationConfig, DEFAULT_CONFIG_PATH, CONFIG_VERSION, ConfigValidationResult } from './types';
import { KeyManager } from './keyManager';
import { ConfigValidator } from './validator';
import { envConfig } from './env';

export class StationConfigManager {
  private configPath: string;
  private config: StationConfig | null = null;

  constructor(configPath: string = DEFAULT_CONFIG_PATH) {
    this.configPath = configPath;
  }

  /**
   * Create a new station configuration
   * @param options Configuration parameters
   * @returns Promise resolving to the created configuration
   */
  async createConfig(options: {
    stationId: string;
    displayName: string;
    location?: string;
    operator?: string;
    discoveryUrl?: string;
    keySize?: number;
  }): Promise<StationConfig> {
    // Generate RSA key pair
    const keyPair = await KeyManager.generateKeyPair(options.keySize || envConfig.security.defaultKeySize);

    // Create configuration object
    const config: StationConfig = {
      stationId: options.stationId,
      displayName: options.displayName,
      location: options.location,
      operator: options.operator,
      keys: {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      },
      discovery: {
        serviceUrl: options.discoveryUrl || envConfig.discovery.url,
        checkInterval: envConfig.discovery.checkInterval,
        timeout: envConfig.discovery.timeout
      },
      p2p: {
        listenPort: envConfig.p2p.listenPort,
        maxConnections: envConfig.p2p.maxConnections,
        connectionTimeout: envConfig.p2p.connectionTimeout
      },
      mesh: {
        autoDetect: envConfig.mesh.autoDetect,
        baudRate: envConfig.mesh.baudRate
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: CONFIG_VERSION
      }
    };

    // Validate the configuration
    const validation = ConfigValidator.validate(config);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.config = config;
    return config;
  }

  /**
   * Load configuration from file
   * @returns Promise resolving to loaded configuration
   */
  async loadConfig(): Promise<StationConfig> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);
      
      // Validate configuration
      const validation = ConfigValidator.validate(parsedConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
      }

      this.config = parsedConfig as StationConfig;
      return this.config;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  /**
   * Save configuration to file
   * @param config Configuration to save (optional, uses current config if not provided)
   * @returns Promise resolving when save is complete
   */
  async saveConfig(config?: StationConfig): Promise<void> {
    const configToSave = config || this.config;
    if (!configToSave) {
      throw new Error('No configuration to save');
    }

    // Update metadata
    configToSave.metadata.updatedAt = new Date().toISOString();

    // Validate before saving
    const validation = ConfigValidator.validate(configToSave);
    if (!validation.isValid) {
      throw new Error(`Cannot save invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      // Ensure directory exists
      await fs.mkdir(dirname(this.configPath), { recursive: true });
      
      // Write configuration file
      await fs.writeFile(this.configPath, JSON.stringify(configToSave, null, 2), 'utf-8');
      
      this.config = configToSave;
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Update configuration fields
   * @param updates Partial configuration updates
   * @returns Promise resolving to updated configuration
   */
  async updateConfig(updates: Partial<StationConfig>): Promise<StationConfig> {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }

    // Deep merge updates
    const updatedConfig: StationConfig = {
      ...this.config,
      ...updates,
      keys: { ...this.config.keys, ...updates.keys },
      discovery: { ...this.config.discovery, ...updates.discovery },
      p2p: { ...this.config.p2p, ...updates.p2p },
      mesh: { ...this.config.mesh, ...updates.mesh },
      metadata: { 
        ...this.config.metadata, 
        ...updates.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    // Validate updated configuration
    const validation = ConfigValidator.validate(updatedConfig);
    if (!validation.isValid) {
      throw new Error(`Updated configuration is invalid: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.config = updatedConfig;
    return updatedConfig;
  }

  /**
   * Regenerate RSA key pair
   * @param keySize Key size in bits (default: 2048)
   * @returns Promise resolving to updated configuration
   */
  async regenerateKeys(keySize: number = 2048): Promise<StationConfig> {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }

    const keyPair = await KeyManager.generateKeyPair(keySize);
    
    return this.updateConfig({
      keys: {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      }
    });
  }

  /**
   * Validate current configuration
   * @returns Validation result
   */
  validateCurrentConfig(): ConfigValidationResult {
    if (!this.config) {
      return {
        isValid: false,
        errors: [{ field: 'root', message: 'No configuration loaded' }]
      };
    }

    return ConfigValidator.validate(this.config);
  }

  /**
   * Get current configuration (readonly)
   * @returns Current configuration or null if not loaded
   */
  getConfig(): Readonly<StationConfig> | null {
    return this.config ? { ...this.config } : null;
  }

  /**
   * Check if configuration file exists
   * @returns Promise resolving to true if file exists
   */
  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the public key fingerprint for display
   * @returns Fingerprint string or null if no config loaded
   */
  getPublicKeyFingerprint(): string | null {
    if (!this.config?.keys.publicKey) {
      return null;
    }

    try {
      return KeyManager.getPublicKeyFingerprint(this.config.keys.publicKey);
    } catch {
      return null;
    }
  }
}
