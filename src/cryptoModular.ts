/**
 * Cryptography Module for EncryptedMeshLink (Modular)
 * MIB-003: Complete cryptography implementation for P2P message encryption
 */

import { ContactInfo, EncryptedMessage, CryptoConfig } from './crypto/types';
import { encryptContactInfo, decryptContactInfo } from './crypto/contactInfo';
import { encryptMessage, decryptMessage } from './crypto/messageEncryption';
import { deriveDiscoveryKey, generateRandomKey } from './crypto/keyDerivation';
import { 
  createHMACSignature, 
  verifyHMACSignature, 
  createMessageHash, 
  validateMessageFreshness 
} from './crypto/messageAuth';

export { ContactInfo, EncryptedMessage, CryptoConfig } from './crypto/types';

export class CryptoService {
  private config: Required<CryptoConfig>;

  constructor(config: CryptoConfig = {}) {
    this.config = {
      keyDerivationIterations: config.keyDerivationIterations || 100000,
      aesKeyLength: config.aesKeyLength || 32, // 256 bits
      saltLength: config.saltLength || 32,     // 256 bits
      ivLength: config.ivLength || 16         // 128 bits
    };
  }

  /**
   * Encrypt contact info for discovery service
   */
  async encryptContactInfo(contactInfo: ContactInfo, discoveryKey: string): Promise<string> {
    return encryptContactInfo(contactInfo, discoveryKey, this.config);
  }

  /**
   * Decrypt contact info from discovery service
   */
  async decryptContactInfo(encryptedData: string, discoveryKey: string): Promise<ContactInfo> {
    return decryptContactInfo(encryptedData, discoveryKey, this.config);
  }

  /**
   * Encrypt a message for P2P communication using RSA + AES hybrid encryption
   */
  async encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
    return encryptMessage(message, recipientPublicKey, this.config);
  }

  /**
   * Decrypt a P2P message using RSA + AES hybrid decryption
   */
  async decryptMessage(encryptedPayload: string, privateKey: string): Promise<string> {
    return decryptMessage(encryptedPayload, privateKey, this.config);
  }

  /**
   * Derive a discovery key from master secret and network name
   */
  async deriveDiscoveryKey(
    masterSecret: string, 
    networkName: string, 
    iterations?: number
  ): Promise<string> {
    return deriveDiscoveryKey(masterSecret, networkName, this.config, iterations);
  }

  /**
   * Generate a cryptographically secure random key
   */
  generateRandomKey(length: number = 32): string {
    return generateRandomKey(length);
  }

  /**
   * Create HMAC signature for message authentication
   */
  createHMACSignature(message: string, key: string): string {
    return createHMACSignature(message, key);
  }

  /**
   * Verify HMAC signature
   */
  verifyHMACSignature(message: string, signature: string, key: string): boolean {
    return verifyHMACSignature(message, signature, key);
  }

  /**
   * Create message hash for integrity checking
   */
  createMessageHash(message: string): string {
    return createMessageHash(message);
  }

  /**
   * Validate message freshness using timestamp
   */
  validateMessageFreshness(timestamp: number, maxAge: number = 5 * 60 * 1000): boolean {
    return validateMessageFreshness(timestamp, maxAge);
  }
}

export const cryptoService = new CryptoService();
