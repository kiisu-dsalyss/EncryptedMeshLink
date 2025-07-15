/**
 * Environment Configuration Manager
 * Manages environment variables and default settings
 */

import { config } from 'dotenv';
import { join } from 'path';
import { VALID_BAUD_RATES, VALIDATION_RANGES } from '../common/constants';
import { parseIntSafe, formatBaudRatesList } from '../common/parsers';

// Load environment variables
config();

export interface EnvironmentConfig {
  discovery: {
    url: string;
    timeout: number;
    checkInterval: number;
  };
  p2p: {
    listenPort: number;
    maxConnections: number;
    connectionTimeout: number;
  };
  mesh: {
    autoDetect: boolean;
    baudRate: number;
  };
  security: {
    defaultKeySize: number;
  };
  logging: {
    level: string;
    file: string;
  };
  debug: boolean;
  developmentMode: boolean;
}

class EnvConfig {
  private static instance: EnvConfig;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = {
      discovery: {
        url: process.env.ENCRYPTEDMESHLINK_DISCOVERY_URL || 'https://discovery.encryptedmeshlink.net/api',
        timeout: parseIntSafe(process.env.ENCRYPTEDMESHLINK_DISCOVERY_TIMEOUT, 30),
        checkInterval: parseIntSafe(process.env.ENCRYPTEDMESHLINK_DISCOVERY_CHECK_INTERVAL, 300)
      },
      p2p: {
        listenPort: parseIntSafe(process.env.ENCRYPTEDMESHLINK_P2P_LISTEN_PORT, 8447),
        maxConnections: parseIntSafe(process.env.ENCRYPTEDMESHLINK_P2P_MAX_CONNECTIONS, 10),
        connectionTimeout: parseIntSafe(process.env.ENCRYPTEDMESHLINK_P2P_CONNECTION_TIMEOUT, 30)
      },
      mesh: {
        autoDetect: (process.env.ENCRYPTEDMESHLINK_MESH_AUTO_DETECT || 'true').toLowerCase() === 'true',
        baudRate: parseIntSafe(process.env.ENCRYPTEDMESHLINK_MESH_BAUD_RATE, 115200)
      },
      security: {
        defaultKeySize: parseIntSafe(process.env.ENCRYPTEDMESHLINK_DEFAULT_KEY_SIZE, 2048)
      },
      logging: {
        level: process.env.ENCRYPTEDMESHLINK_LOG_LEVEL || 'info',
        file: process.env.ENCRYPTEDMESHLINK_LOG_FILE || './logs/encryptedmeshlink.log'
      },
      debug: (process.env.ENCRYPTEDMESHLINK_DEBUG || 'false').toLowerCase() === 'true',
      developmentMode: (process.env.ENCRYPTEDMESHLINK_DEVELOPMENT_MODE || 'false').toLowerCase() === 'true'
    };
  }

  public static getInstance(): EnvConfig {
    if (!EnvConfig.instance) {
      EnvConfig.instance = new EnvConfig();
    }
    return EnvConfig.instance;
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public get discovery() {
    return { ...this.config.discovery };
  }

  public get p2p() {
    return { ...this.config.p2p };
  }

  public get mesh() {
    return { ...this.config.mesh };
  }

  public get security() {
    return { ...this.config.security };
  }

  public get logging() {
    return { ...this.config.logging };
  }

  public get debug() {
    return this.config.debug;
  }

  public get developmentMode() {
    return this.config.developmentMode;
  }

  /**
   * Validate environment configuration
   * @returns Array of validation errors
   */
  public validateConfig(): string[] {
    const errors: string[] = [];

    // Validate discovery URL
    try {
      new URL(this.config.discovery.url);
    } catch {
      errors.push(`Invalid discovery URL: ${this.config.discovery.url}`);
    }

    // Validate timeouts
    if (this.config.discovery.timeout < 5 || this.config.discovery.timeout > 300) {
      errors.push(`Discovery timeout must be between 5 and 300 seconds: ${this.config.discovery.timeout}`);
    }

    if (this.config.discovery.checkInterval < 30 || this.config.discovery.checkInterval > 3600) {
      errors.push(`Discovery check interval must be between 30 and 3600 seconds: ${this.config.discovery.checkInterval}`);
    }

    // Validate P2P settings
    if (this.config.p2p.listenPort < 1024 || this.config.p2p.listenPort > 65535) {
      errors.push(`P2P listen port must be between 1024 and 65535: ${this.config.p2p.listenPort}`);
    }

    if (this.config.p2p.maxConnections < 1 || this.config.p2p.maxConnections > 100) {
      errors.push(`P2P max connections must be between 1 and 100: ${this.config.p2p.maxConnections}`);
    }

    if (this.config.p2p.connectionTimeout < 5 || this.config.p2p.connectionTimeout > 300) {
      errors.push(`P2P connection timeout must be between 5 and 300 seconds: ${this.config.p2p.connectionTimeout}`);
    }

    // Validate mesh settings
    const validBaudRates = VALID_BAUD_RATES;
    if (!validBaudRates.includes(this.config.mesh.baudRate)) {
      errors.push(`Invalid baud rate: ${this.config.mesh.baudRate}. Must be one of: ${formatBaudRatesList(validBaudRates)}`);
    }

    // Validate security settings
    const keyRange = VALIDATION_RANGES.DEFAULT_KEY_SIZE;
    if (this.config.security.defaultKeySize < keyRange.min || this.config.security.defaultKeySize > keyRange.max) {
      errors.push(`Default key size must be between ${keyRange.min} and ${keyRange.max}: ${this.config.security.defaultKeySize}`);
    }

    return errors;
  }
}

export const envConfig = EnvConfig.getInstance();
