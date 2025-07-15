/**
 * Configuration CLI Commands
 * MIB-002: Station Configuration System
 */

import { StationConfigManager } from './config/manager';
import { parseIntSafe } from './common';

export class ConfigCLI {
  private configManager: StationConfigManager;

  constructor(configPath?: string) {
    this.configManager = new StationConfigManager(configPath);
  }

  /**
   * Initialize a new station configuration
   */
  async initConfig(options: {
    stationId: string;
    displayName: string;
    location?: string;
    operator?: string;
    discoveryUrl?: string;
    force?: boolean;
  }): Promise<void> {
    try {
      // Check if config already exists
      const exists = await this.configManager.configExists();
      if (exists && !options.force) {
        console.error('❌ Configuration already exists. Use --force to overwrite.');
        process.exit(1);
      }

      console.log('🔐 Generating RSA key pair...');
      const config = await this.configManager.createConfig(options);

      console.log('💾 Saving configuration...');
      await this.configManager.saveConfig(config);

      console.log('✅ Station configuration created successfully!');
      console.log(`📍 Station ID: ${config.stationId}`);
      console.log(`📝 Display Name: ${config.displayName}`);
      if (config.location) console.log(`🌍 Location: ${config.location}`);
      if (config.operator) console.log(`👤 Operator: ${config.operator}`);
      
      const fingerprint = this.configManager.getPublicKeyFingerprint();
      if (fingerprint) {
        console.log(`🔑 Key Fingerprint: ${fingerprint}`);
      }
      
      console.log(`🔗 Discovery Service: ${config.discovery.serviceUrl}`);
      console.log(`🚀 Ready for Phase 2 internet bridging!`);
    } catch (error) {
      console.error(`❌ Failed to initialize configuration: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Show current configuration
   */
  async showConfig(): Promise<void> {
    try {
      const config = await this.configManager.loadConfig();
      
      console.log('📋 EncryptedMeshLink Station Configuration');
      console.log('=====================================');
      console.log(`📍 Station ID: ${config.stationId}`);
      console.log(`📝 Display Name: ${config.displayName}`);
      if (config.location) console.log(`🌍 Location: ${config.location}`);
      if (config.operator) console.log(`👤 Operator: ${config.operator}`);
      
      console.log('\n🔐 Security');
      const fingerprint = this.configManager.getPublicKeyFingerprint();
      if (fingerprint) {
        console.log(`🔑 Key Fingerprint: ${fingerprint}`);
      }
      
      console.log('\n🔍 Discovery Service');
      console.log(`🔗 URL: ${config.discovery.serviceUrl}`);
      console.log(`⏱️  Check Interval: ${config.discovery.checkInterval}s`);
      console.log(`⏰ Timeout: ${config.discovery.timeout}s`);
      
      console.log('\n🌐 P2P Communication');
      console.log(`🚪 Listen Port: ${config.p2p.listenPort}`);
      console.log(`👥 Max Connections: ${config.p2p.maxConnections}`);
      console.log(`⏰ Connection Timeout: ${config.p2p.connectionTimeout}s`);
      
      console.log('\n📡 Mesh Network');
      console.log(`🔍 Auto-detect Device: ${config.mesh.autoDetect ? 'Yes' : 'No'}`);
      if (!config.mesh.autoDetect && config.mesh.devicePath) {
        console.log(`📂 Device Path: ${config.mesh.devicePath}`);
      }
      console.log(`📊 Baud Rate: ${config.mesh.baudRate}`);
      
      console.log('\n📊 Metadata');
      console.log(`📅 Created: ${new Date(config.metadata.createdAt).toLocaleString()}`);
      console.log(`📅 Updated: ${new Date(config.metadata.updatedAt).toLocaleString()}`);
      console.log(`🏷️  Version: ${config.metadata.version}`);
    } catch (error) {
      console.error(`❌ Failed to load configuration: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<void> {
    try {
      await this.configManager.loadConfig();
      const validation = this.configManager.validateCurrentConfig();
      
      if (validation.isValid) {
        console.log('✅ Configuration is valid!');
        const fingerprint = this.configManager.getPublicKeyFingerprint();
        if (fingerprint) {
          console.log(`🔑 Key Fingerprint: ${fingerprint}`);
        }
      } else {
        console.log('❌ Configuration validation failed:');
        validation.errors.forEach(error => {
          console.log(`   🔸 ${error.field}: ${error.message}${error.value ? ` (value: ${error.value})` : ''}`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Failed to validate configuration: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Regenerate RSA key pair
   */
  async regenerateKeys(keySize: number = 2048): Promise<void> {
    try {
      await this.configManager.loadConfig();
      
      console.log('🔐 Generating new RSA key pair...');
      const config = await this.configManager.regenerateKeys(keySize);
      
      console.log('💾 Saving updated configuration...');
      await this.configManager.saveConfig(config);
      
      console.log('✅ RSA key pair regenerated successfully!');
      const fingerprint = this.configManager.getPublicKeyFingerprint();
      if (fingerprint) {
        console.log(`🔑 New Key Fingerprint: ${fingerprint}`);
      }
      console.log('⚠️  Make sure to update discovery service with new public key!');
    } catch (error) {
      console.error(`❌ Failed to regenerate keys: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Update configuration field
   */
  async updateConfigField(field: string, value: string): Promise<void> {
    try {
      await this.configManager.loadConfig();
      
      // Parse the field path and update the config
      const fieldParts = field.split('.');
      const updates: any = {};
      
      let current = updates;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = {};
        current = current[fieldParts[i]];
      }
      
      // Parse value based on field type
      const finalField = fieldParts[fieldParts.length - 1];
      let parsedValue: any = value;
      
      // Handle numeric fields
      if (['checkInterval', 'timeout', 'listenPort', 'maxConnections', 'connectionTimeout', 'baudRate'].includes(finalField)) {
        parsedValue = parseIntSafe(value, 0);
        if (parsedValue === 0 && value !== '0') {
          throw new Error(`Invalid numeric value: ${value}`);
        }
      }
      
      // Handle boolean fields
      if (['autoDetect'].includes(finalField)) {
        if (value.toLowerCase() === 'true') {
          parsedValue = true;
        } else if (value.toLowerCase() === 'false') {
          parsedValue = false;
        } else {
          throw new Error(`Invalid boolean value: ${value} (use 'true' or 'false')`);
        }
      }
      
      current[finalField] = parsedValue;
      
      console.log(`🔧 Updating ${field} to: ${parsedValue}`);
      const config = await this.configManager.updateConfig(updates);
      
      console.log('💾 Saving updated configuration...');
      await this.configManager.saveConfig(config);
      
      console.log('✅ Configuration updated successfully!');
    } catch (error) {
      console.error(`❌ Failed to update configuration: ${error}`);
      process.exit(1);
    }
  }
}
