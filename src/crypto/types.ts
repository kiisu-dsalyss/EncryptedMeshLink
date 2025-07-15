/**
 * Crypto Types
 * Type definitions for cryptographic operations
 */

export interface ContactInfo {
  stationId: string;
  ipAddress?: string;
  port?: number;
  publicKey: string;
  lastSeen: number;
  capabilities?: string[];
}

export interface EncryptedMessage {
  id: string;
  version: string;
  encryptedPayload: string;
  signature: string;
  timestamp: number;
  ttl: number;
}

export interface CryptoConfig {
  keyDerivationIterations?: number;
  aesKeyLength?: number;
  saltLength?: number;
  ivLength?: number;
}
