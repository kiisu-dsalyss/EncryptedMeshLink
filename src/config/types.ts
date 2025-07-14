/**
 * Station Configuration System Types
 * MIB-002: Station Configuration System
 */

export interface StationConfig {
  /** Unique identifier for this station (3-20 alphanumeric+dash) */
  stationId: string;
  
  /** Human-readable display name for the station */
  displayName: string;
  
  /** Geographic location identifier (optional) */
  location?: string;
  
  /** Station operator contact information (optional) */
  operator?: string;
  
  /** RSA key pair for secure communications */
  keys: {
    /** RSA public key in PEM format */
    publicKey: string;
    /** RSA private key in PEM format */
    privateKey: string;
  };
  
  /** Discovery service configuration */
  discovery: {
    /** Discovery service endpoint URL */
    serviceUrl: string;
    /** How often to check for peers (seconds) */
    checkInterval: number;
    /** Connection timeout (seconds) */
    timeout: number;
  };
  
  /** P2P communication settings */
  p2p: {
    /** Port for incoming P2P connections */
    listenPort: number;
    /** Maximum number of concurrent peer connections */
    maxConnections: number;
    /** Connection timeout (seconds) */
    connectionTimeout: number;
  };
  
  /** Mesh network interface settings */
  mesh: {
    /** Auto-detect USB device (true) or specify path */
    autoDetect: boolean;
    /** Specific device path if autoDetect is false */
    devicePath?: string;
    /** Baud rate for serial communication */
    baudRate: number;
  };
  
  /** Configuration metadata */
  metadata: {
    /** When this config was created */
    createdAt: string;
    /** Last time config was modified */
    updatedAt: string;
    /** Configuration schema version */
    version: string;
  };
}

export interface ConfigValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
}

export interface KeyPairResult {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}

export const DEFAULT_CONFIG_PATH = './encryptedmeshlink-config.json';
export const CONFIG_VERSION = '1.0.0';
