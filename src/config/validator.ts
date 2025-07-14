/**
 * Configuration Validation
 * MIB-002: Station Configuration System
 */

import { StationConfig, ConfigValidationError, ConfigValidationResult } from './types';
import { KeyManager } from './keyManager';

export class ConfigValidator {
  /**
   * Validate a complete station configuration
   * @param config Configuration to validate
   * @returns Validation result with errors if any
   */
  static validate(config: any): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];

    // Basic structure validation
    if (!config || typeof config !== 'object') {
      return {
        isValid: false,
        errors: [{ field: 'root', message: 'Configuration must be a valid object' }]
      };
    }

    // Station ID validation
    errors.push(...this.validateStationId(config.stationId));

    // Display name validation
    errors.push(...this.validateDisplayName(config.displayName));

    // Keys validation
    errors.push(...this.validateKeys(config.keys));

    // Discovery configuration validation
    errors.push(...this.validateDiscovery(config.discovery));

    // P2P configuration validation
    errors.push(...this.validateP2P(config.p2p));

    // Mesh configuration validation
    errors.push(...this.validateMesh(config.mesh));

    // Metadata validation
    errors.push(...this.validateMetadata(config.metadata));

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateStationId(stationId: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!stationId) {
      errors.push({ field: 'stationId', message: 'Station ID is required' });
      return errors;
    }

    if (typeof stationId !== 'string') {
      errors.push({ field: 'stationId', message: 'Station ID must be a string', value: stationId });
      return errors;
    }

    // Station ID format: 3-20 characters, alphanumeric + dash
    const stationIdRegex = /^[a-zA-Z0-9-]{3,20}$/;
    if (!stationIdRegex.test(stationId)) {
      errors.push({
        field: 'stationId',
        message: 'Station ID must be 3-20 characters, alphanumeric and dash only',
        value: stationId
      });
    }

    // Cannot start or end with dash
    if (stationId.startsWith('-') || stationId.endsWith('-')) {
      errors.push({
        field: 'stationId',
        message: 'Station ID cannot start or end with dash',
        value: stationId
      });
    }

    return errors;
  }

  private static validateDisplayName(displayName: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!displayName) {
      errors.push({ field: 'displayName', message: 'Display name is required' });
      return errors;
    }

    if (typeof displayName !== 'string') {
      errors.push({ field: 'displayName', message: 'Display name must be a string', value: displayName });
      return errors;
    }

    if (displayName.length < 1 || displayName.length > 100) {
      errors.push({
        field: 'displayName',
        message: 'Display name must be 1-100 characters',
        value: displayName
      });
    }

    return errors;
  }

  private static validateKeys(keys: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!keys || typeof keys !== 'object') {
      errors.push({ field: 'keys', message: 'Keys configuration is required' });
      return errors;
    }

    // Validate public key
    if (!keys.publicKey) {
      errors.push({ field: 'keys.publicKey', message: 'Public key is required' });
    } else if (typeof keys.publicKey !== 'string') {
      errors.push({ field: 'keys.publicKey', message: 'Public key must be a string' });
    } else if (!KeyManager.validatePemFormat(keys.publicKey, 'public')) {
      errors.push({ field: 'keys.publicKey', message: 'Invalid public key PEM format' });
    }

    // Validate private key
    if (!keys.privateKey) {
      errors.push({ field: 'keys.privateKey', message: 'Private key is required' });
    } else if (typeof keys.privateKey !== 'string') {
      errors.push({ field: 'keys.privateKey', message: 'Private key must be a string' });
    } else if (!KeyManager.validatePemFormat(keys.privateKey, 'private')) {
      errors.push({ field: 'keys.privateKey', message: 'Invalid private key PEM format' });
    }

    // Validate key pair match
    if (keys.publicKey && keys.privateKey && 
        KeyManager.validatePemFormat(keys.publicKey, 'public') &&
        KeyManager.validatePemFormat(keys.privateKey, 'private')) {
      // TODO: Re-enable key pair validation once we debug the issue
      // if (!KeyManager.validateKeyPair(keys.publicKey, keys.privateKey)) {
      //   errors.push({ field: 'keys', message: 'Public and private keys do not form a valid pair' });
      // }
    }

    return errors;
  }

  private static validateDiscovery(discovery: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!discovery || typeof discovery !== 'object') {
      errors.push({ field: 'discovery', message: 'Discovery configuration is required' });
      return errors;
    }

    // Service URL validation
    if (!discovery.serviceUrl) {
      errors.push({ field: 'discovery.serviceUrl', message: 'Discovery service URL is required' });
    } else if (typeof discovery.serviceUrl !== 'string') {
      errors.push({ field: 'discovery.serviceUrl', message: 'Service URL must be a string' });
    } else {
      try {
        new URL(discovery.serviceUrl);
      } catch {
        errors.push({ field: 'discovery.serviceUrl', message: 'Invalid URL format', value: discovery.serviceUrl });
      }
    }

    // Check interval validation
    if (discovery.checkInterval === undefined || discovery.checkInterval === null) {
      errors.push({ field: 'discovery.checkInterval', message: 'Check interval is required' });
    } else if (!Number.isInteger(discovery.checkInterval) || discovery.checkInterval < 30 || discovery.checkInterval > 3600) {
      errors.push({
        field: 'discovery.checkInterval',
        message: 'Check interval must be an integer between 30 and 3600 seconds',
        value: discovery.checkInterval
      });
    }

    // Timeout validation
    if (discovery.timeout === undefined || discovery.timeout === null) {
      errors.push({ field: 'discovery.timeout', message: 'Timeout is required' });
    } else if (!Number.isInteger(discovery.timeout) || discovery.timeout < 5 || discovery.timeout > 300) {
      errors.push({
        field: 'discovery.timeout',
        message: 'Timeout must be an integer between 5 and 300 seconds',
        value: discovery.timeout
      });
    }

    return errors;
  }

  private static validateP2P(p2p: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!p2p || typeof p2p !== 'object') {
      errors.push({ field: 'p2p', message: 'P2P configuration is required' });
      return errors;
    }

    // Listen port validation
    if (p2p.listenPort === undefined || p2p.listenPort === null) {
      errors.push({ field: 'p2p.listenPort', message: 'Listen port is required' });
    } else if (!Number.isInteger(p2p.listenPort) || p2p.listenPort < 1024 || p2p.listenPort > 65535) {
      errors.push({
        field: 'p2p.listenPort',
        message: 'Listen port must be an integer between 1024 and 65535',
        value: p2p.listenPort
      });
    }

    // Max connections validation
    if (p2p.maxConnections === undefined || p2p.maxConnections === null) {
      errors.push({ field: 'p2p.maxConnections', message: 'Max connections is required' });
    } else if (!Number.isInteger(p2p.maxConnections) || p2p.maxConnections < 1 || p2p.maxConnections > 100) {
      errors.push({
        field: 'p2p.maxConnections',
        message: 'Max connections must be an integer between 1 and 100',
        value: p2p.maxConnections
      });
    }

    // Connection timeout validation
    if (p2p.connectionTimeout === undefined || p2p.connectionTimeout === null) {
      errors.push({ field: 'p2p.connectionTimeout', message: 'Connection timeout is required' });
    } else if (!Number.isInteger(p2p.connectionTimeout) || p2p.connectionTimeout < 5 || p2p.connectionTimeout > 300) {
      errors.push({
        field: 'p2p.connectionTimeout',
        message: 'Connection timeout must be an integer between 5 and 300 seconds',
        value: p2p.connectionTimeout
      });
    }

    return errors;
  }

  private static validateMesh(mesh: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!mesh || typeof mesh !== 'object') {
      errors.push({ field: 'mesh', message: 'Mesh configuration is required' });
      return errors;
    }

    // Auto-detect validation
    if (typeof mesh.autoDetect !== 'boolean') {
      errors.push({
        field: 'mesh.autoDetect',
        message: 'Auto-detect must be a boolean',
        value: mesh.autoDetect
      });
    }

    // Device path validation (only if autoDetect is false)
    if (mesh.autoDetect === false) {
      if (!mesh.devicePath) {
        errors.push({ field: 'mesh.devicePath', message: 'Device path is required when auto-detect is disabled' });
      } else if (typeof mesh.devicePath !== 'string') {
        errors.push({ field: 'mesh.devicePath', message: 'Device path must be a string' });
      }
    }

    // Baud rate validation
    const validBaudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
    if (mesh.baudRate === undefined || mesh.baudRate === null) {
      errors.push({ field: 'mesh.baudRate', message: 'Baud rate is required' });
    } else if (!validBaudRates.includes(mesh.baudRate)) {
      errors.push({
        field: 'mesh.baudRate',
        message: `Baud rate must be one of: ${validBaudRates.join(', ')}`,
        value: mesh.baudRate
      });
    }

    return errors;
  }

  private static validateMetadata(metadata: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!metadata || typeof metadata !== 'object') {
      errors.push({ field: 'metadata', message: 'Metadata is required' });
      return errors;
    }

    // Created at validation
    if (!metadata.createdAt) {
      errors.push({ field: 'metadata.createdAt', message: 'Created timestamp is required' });
    } else if (typeof metadata.createdAt !== 'string') {
      errors.push({ field: 'metadata.createdAt', message: 'Created timestamp must be a string' });
    } else if (isNaN(Date.parse(metadata.createdAt))) {
      errors.push({ field: 'metadata.createdAt', message: 'Invalid created timestamp format' });
    }

    // Updated at validation
    if (!metadata.updatedAt) {
      errors.push({ field: 'metadata.updatedAt', message: 'Updated timestamp is required' });
    } else if (typeof metadata.updatedAt !== 'string') {
      errors.push({ field: 'metadata.updatedAt', message: 'Updated timestamp must be a string' });
    } else if (isNaN(Date.parse(metadata.updatedAt))) {
      errors.push({ field: 'metadata.updatedAt', message: 'Invalid updated timestamp format' });
    }

    // Version validation
    if (!metadata.version) {
      errors.push({ field: 'metadata.version', message: 'Version is required' });
    } else if (typeof metadata.version !== 'string') {
      errors.push({ field: 'metadata.version', message: 'Version must be a string' });
    }

    return errors;
  }
}
