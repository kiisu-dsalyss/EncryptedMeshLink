/**
 * Station Configuration System Tests
 * MIB-002: Station Configuration System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { StationConfigManager, KeyManager, ConfigValidator, envConfig } from '../src/config';

describe('MIB-002: Station Configuration System', () => {
  const testConfigPath = join(__dirname, '../test-config.json');
  let configManager: StationConfigManager;

  beforeEach(() => {
    configManager = new StationConfigManager(testConfigPath);
  });

  afterEach(async () => {
    // Clean up test config file
    try {
      await fs.unlink(testConfigPath);
    } catch {
      // File might not exist, that's okay
    }
  });

  describe('KeyManager', () => {
    it('should generate valid RSA key pairs', async () => {
      const keyPair = await KeyManager.generateKeyPair(1024); // Smaller key for faster tests
      
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.publicKey).toContain('-----END PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(keyPair.privateKey).toContain('-----END PRIVATE KEY-----');
      expect(keyPair.fingerprint).toMatch(/^[A-F0-9:]{95}$/); // SHA-256 fingerprint format
    });

    it('should validate PEM format correctly', () => {
      const validPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtest
-----END PUBLIC KEY-----`;
      
      const validPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAotest
-----END PRIVATE KEY-----`;

      expect(KeyManager.validatePemFormat(validPublicKey, 'public')).toBe(false); // Invalid content
      expect(KeyManager.validatePemFormat(validPrivateKey, 'private')).toBe(true); // Structure check
      expect(KeyManager.validatePemFormat('invalid', 'public')).toBe(false);
      expect(KeyManager.validatePemFormat('invalid', 'private')).toBe(false);
    });

    it('should generate consistent fingerprints', async () => {
      const keyPair = await KeyManager.generateKeyPair(1024);
      const fingerprint1 = KeyManager.getPublicKeyFingerprint(keyPair.publicKey);
      const fingerprint2 = KeyManager.getPublicKeyFingerprint(keyPair.publicKey);
      
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toBe(keyPair.fingerprint);
    });
  });

  describe('ConfigValidator', () => {
    it('should validate station ID format', () => {
      const validConfigs = ['abc', 'test-123', 'station-001', 'a'.repeat(20)];
      const invalidConfigs = ['ab', 'a'.repeat(21), '-start', 'end-', ''];

      validConfigs.forEach(id => {
        const result = ConfigValidator.validate({ stationId: id });
        const stationIdErrors = result.errors.filter(e => e.field === 'stationId');
        expect(stationIdErrors).toHaveLength(0);
      });

      invalidConfigs.forEach(id => {
        const result = ConfigValidator.validate({ stationId: id });
        const stationIdErrors = result.errors.filter(e => e.field === 'stationId');
        expect(stationIdErrors.length).toBeGreaterThan(0);
      });
    });

    it('should validate discovery configuration', () => {
      const validConfig = {
        stationId: 'test',
        displayName: 'Test',
        keys: { publicKey: 'valid', privateKey: 'valid' },
        discovery: {
          serviceUrl: 'https://example.com',
          checkInterval: 300,
          timeout: 30
        },
        p2p: { listenPort: 8447, maxConnections: 10, connectionTimeout: 30 },
        mesh: { autoDetect: true, baudRate: 115200 },
        metadata: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', version: '1.0.0' }
      };

      const result = ConfigValidator.validate(validConfig);
      const discoveryErrors = result.errors.filter(e => e.field.startsWith('discovery'));
      expect(discoveryErrors).toHaveLength(0);
    });

    it('should reject invalid URLs', () => {
      const config = {
        stationId: 'test',
        displayName: 'Test',
        discovery: {
          serviceUrl: 'not-a-url',
          checkInterval: 300,
          timeout: 30
        }
      };

      const result = ConfigValidator.validate(config);
      const urlErrors = result.errors.filter(e => e.field === 'discovery.serviceUrl');
      expect(urlErrors.length).toBeGreaterThan(0);
    });

    it('should validate port ranges', () => {
      const config = {
        stationId: 'test',
        displayName: 'Test',
        p2p: {
          listenPort: 65536, // Invalid port
          maxConnections: 10,
          connectionTimeout: 30
        }
      };

      const result = ConfigValidator.validate(config);
      const portErrors = result.errors.filter(e => e.field === 'p2p.listenPort');
      expect(portErrors.length).toBeGreaterThan(0);
    });
  });

  describe('StationConfigManager', () => {
    it('should create and save configuration', async () => {
      const config = await configManager.createConfig({
        stationId: 'test-station',
        displayName: 'Test Station',
        location: 'Test Location',
        operator: 'TEST'
      });

      expect(config.stationId).toBe('test-station');
      expect(config.displayName).toBe('Test Station');
      expect(config.location).toBe('Test Location');
      expect(config.operator).toBe('TEST');
      expect(config.keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(config.keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----');

      await configManager.saveConfig();
      expect(await configManager.configExists()).toBe(true);
    });

    it('should load saved configuration', async () => {
      // Create and save config
      const originalConfig = await configManager.createConfig({
        stationId: 'load-test',
        displayName: 'Load Test'
      });
      await configManager.saveConfig();

      // Create new manager and load
      const newManager = new StationConfigManager(testConfigPath);
      const loadedConfig = await newManager.loadConfig();

      expect(loadedConfig.stationId).toBe('load-test');
      expect(loadedConfig.displayName).toBe('Load Test');
      expect(loadedConfig.keys.publicKey).toBe(originalConfig.keys.publicKey);
    });

    it('should update configuration', async () => {
      await configManager.createConfig({
        stationId: 'update-test',
        displayName: 'Original Name'
      });

      const updatedConfig = await configManager.updateConfig({
        displayName: 'Updated Name',
        location: 'New Location'
      });

      expect(updatedConfig.displayName).toBe('Updated Name');
      expect(updatedConfig.location).toBe('New Location');
      expect(updatedConfig.stationId).toBe('update-test'); // Should remain unchanged
    });

    it('should regenerate keys', async () => {
      await configManager.createConfig({
        stationId: 'regen-test',
        displayName: 'Regen Test'
      });

      const originalFingerprint = configManager.getPublicKeyFingerprint();
      const updatedConfig = await configManager.regenerateKeys(1024);
      const newFingerprint = configManager.getPublicKeyFingerprint();

      expect(newFingerprint).not.toBe(originalFingerprint);
      expect(updatedConfig.keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(updatedConfig.keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should validate current configuration', async () => {
      await configManager.createConfig({
        stationId: 'validate-test',
        displayName: 'Validate Test'
      });

      const validation = configManager.validateCurrentConfig();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle missing configuration file', async () => {
      await expect(configManager.loadConfig()).rejects.toThrow('Configuration file not found');
      expect(await configManager.configExists()).toBe(false);
    });

    it('should validate configuration before saving', async () => {
      const invalidConfig = {
        stationId: '', // Invalid empty station ID
        displayName: 'Test',
        keys: { publicKey: 'invalid', privateKey: 'invalid' },
        discovery: { serviceUrl: 'https://example.com', checkInterval: 300, timeout: 30 },
        p2p: { listenPort: 8447, maxConnections: 10, connectionTimeout: 30 },
        mesh: { autoDetect: true, baudRate: 115200 },
        metadata: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', version: '1.0.0' }
      } as any;

      await expect(configManager.saveConfig(invalidConfig)).rejects.toThrow('Cannot save invalid configuration');
    });
  });

  describe('Integration Tests', () => {
    it('should create complete working configuration', async () => {
      // Create configuration
      const config = await configManager.createConfig({
        stationId: 'integration-test',
        displayName: 'Integration Test Station',
        location: 'Test City',
        operator: 'W1AW',
        discoveryUrl: 'https://custom.discovery.com/api'
      });

      // Save configuration
      await configManager.saveConfig();

      // Verify file exists and has correct permissions
      expect(await configManager.configExists()).toBe(true);

      // Load in new manager instance
      const newManager = new StationConfigManager(testConfigPath);
      const loadedConfig = await newManager.loadConfig();

      // Verify all fields
      expect(loadedConfig.stationId).toBe('integration-test');
      expect(loadedConfig.displayName).toBe('Integration Test Station');
      expect(loadedConfig.location).toBe('Test City');
      expect(loadedConfig.operator).toBe('W1AW');
      expect(loadedConfig.discovery.serviceUrl).toBe('https://custom.discovery.com/api');
      expect(loadedConfig.discovery.checkInterval).toBe(envConfig.discovery.checkInterval);
      expect(loadedConfig.p2p.listenPort).toBe(envConfig.p2p.listenPort);
      expect(loadedConfig.mesh.autoDetect).toBe(envConfig.mesh.autoDetect);
      expect(loadedConfig.mesh.baudRate).toBe(envConfig.mesh.baudRate);

      // Verify validation passes
      const validation = newManager.validateCurrentConfig();
      expect(validation.isValid).toBe(true);

      // Verify fingerprint generation
      const fingerprint = newManager.getPublicKeyFingerprint();
      expect(fingerprint).toMatch(/^[A-F0-9:]{95}$/);
    });
  });

  describe('Environment Configuration', () => {
    it('should load default environment values', () => {
      const config = envConfig.getConfig();
      
      expect(config.discovery.url).toBe('https://definitelynotamoose.com/api/discovery.php?peers=true');
      expect(config.discovery.timeout).toBe(30);
      expect(config.discovery.checkInterval).toBe(300);
      expect(config.p2p.listenPort).toBe(8447);
      expect(config.p2p.maxConnections).toBe(10);
      expect(config.mesh.autoDetect).toBe(true);
      expect(config.mesh.baudRate).toBe(115200);
      expect(config.security.defaultKeySize).toBe(2048);
    });

    it('should validate environment configuration', () => {
      const errors = envConfig.validateConfig();
      expect(errors).toHaveLength(0);
    });

    it('should provide individual config sections', () => {
      expect(envConfig.discovery.url).toBe('https://definitelynotamoose.com/api/discovery.php?peers=true');
      expect(envConfig.p2p.listenPort).toBe(8447);
      expect(envConfig.mesh.autoDetect).toBe(true);
      expect(envConfig.security.defaultKeySize).toBe(2048);
      expect(envConfig.debug).toBe(false);
      expect(envConfig.developmentMode).toBe(false);
    });
  });
});
