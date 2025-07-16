/**
 * Crypto Module - Modular Implementation
 * One function per file architecture for cryptography operations
 */

import { CryptoConfig } from './types';
import { encryptContactInfo, decryptContactInfo } from './contactInfo';
import { encryptMessage, decryptMessage } from './messageEncryption';
import { createHMACSignature, verifyHMACSignature, createMessageHash, validateMessageFreshness } from './messageAuth';
import { deriveDiscoveryKey, generateRandomKey, generateMessageId } from './keyDerivation';

export class CryptoService {
  private config: Required<CryptoConfig>;

  constructor(config: CryptoConfig = {}) {
    this.config = {
      keyDerivationIterations: config.keyDerivationIterations || 100000,
      aesKeyLength: config.aesKeyLength || 32, // 256 bits
      saltLength: config.saltLength || 16,
      ivLength: config.ivLength || 16
    };
  }

  async encryptContactInfo(contactInfo: any, discoveryKey: string): Promise<string> {
    return encryptContactInfo(contactInfo, discoveryKey, this.config);
  }

  async decryptContactInfo(encryptedData: string, discoveryKey: string): Promise<any> {
    return decryptContactInfo(encryptedData, discoveryKey, this.config);
  }

  async encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
    return encryptMessage(message, recipientPublicKey, this.config);
  }

  async decryptMessage(encryptedPayload: string, privateKey: string): Promise<string> {
    return decryptMessage(encryptedPayload, privateKey, this.config);
  }

  async deriveDiscoveryKey(masterSecret: string, networkName: string): Promise<string> {
    return deriveDiscoveryKey(masterSecret, networkName, this.config);
  }

  generateRandomKey(length: number = 32): string {
    return generateRandomKey(length);
  }

  createHMACSignature(message: string, key: string): string {
    return createHMACSignature(message, key);
  }

  verifyHMACSignature(message: string, signature: string, key: string): boolean {
    return verifyHMACSignature(message, signature, key);
  }

  createMessageHash(message: string): string {
    return createMessageHash(message);
  }

  validateMessageFreshness(timestamp: number, maxAge: number = 5 * 60 * 1000): boolean {
    return validateMessageFreshness(timestamp, maxAge);
  }

  generateMessageId(): string {
    return generateMessageId();
  }
}

// Export the service instance
export const cryptoService = new CryptoService();

// Export types and individual functions
export * from './types';
export { encryptContactInfo, decryptContactInfo } from './contactInfo';
export { encryptMessage, decryptMessage } from './messageEncryption';
export { createHMACSignature, verifyHMACSignature, createMessageHash, validateMessageFreshness } from './messageAuth';
export { deriveDiscoveryKey, generateRandomKey, generateMessageId } from './keyDerivation';
