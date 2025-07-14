/**
 * Cryptography Module for EncryptedMeshLink
 * MIB-003: Complete cryptography implementation for P2P message encryption
 */

import { 
  createCipheriv, 
  createDecipheriv, 
  createHash, 
  randomBytes, 
  publicEncrypt, 
  privateDecrypt,
  pbkdf2,
  scrypt
} from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);
const scryptAsync = promisify(scrypt);

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

  /**
   * Encrypt contact info for discovery service using AES-256-GCM
   * @param contactInfo Contact information to encrypt
   * @param discoveryKey Master key for discovery encryption
   * @returns Base64 encoded encrypted data
   */
  async encryptContactInfo(contactInfo: ContactInfo, discoveryKey: string): Promise<string> {
    try {
      const data = JSON.stringify(contactInfo);
      const salt = randomBytes(this.config.saltLength);
      const iv = randomBytes(this.config.ivLength);

      // Derive encryption key from discovery key using scrypt
      const key = await scryptAsync(discoveryKey, salt, this.config.aesKeyLength) as Buffer;

      // Create cipher with AES-256-GCM
      const cipher = createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine salt + iv + authTag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'base64')
      ]);

      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Contact info encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt contact info from discovery service
   * @param encryptedData Base64 encoded encrypted data
   * @param discoveryKey Master key for discovery encryption
   * @returns Decrypted contact information
   */
  async decryptContactInfo(encryptedData: string, discoveryKey: string): Promise<ContactInfo> {
    try {
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = combined.subarray(0, this.config.saltLength);
      const iv = combined.subarray(this.config.saltLength, this.config.saltLength + this.config.ivLength);
      const authTag = combined.subarray(
        this.config.saltLength + this.config.ivLength, 
        this.config.saltLength + this.config.ivLength + 16
      );
      const encrypted = combined.subarray(this.config.saltLength + this.config.ivLength + 16);

      // Derive decryption key
      const key = await scryptAsync(discoveryKey, salt, this.config.aesKeyLength) as Buffer;

      // Create decipher with AES-256-GCM
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as ContactInfo;
    } catch (error) {
      throw new Error(`Contact info decryption failed: ${error}`);
    }
  }

  /**
   * Encrypt a message for P2P communication using RSA + AES hybrid encryption
   * @param message Message to encrypt
   * @param recipientPublicKey Recipient's RSA public key in PEM format
   * @returns Encrypted message object
   */
  async encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
    try {
      // Generate random AES key and IV
      const aesKey = randomBytes(this.config.aesKeyLength);
      const iv = randomBytes(this.config.ivLength);

      // Encrypt message with AES-256-GCM
      const cipher = createCipheriv('aes-256-gcm', aesKey, iv);

      let encryptedMessage = cipher.update(message, 'utf8', 'base64');
      encryptedMessage += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      // Encrypt AES key with recipient's RSA public key
      const encryptedAESKey = publicEncrypt({
        key: recipientPublicKey,
        padding: 4 // RSA_PKCS1_OAEP_PADDING
      }, aesKey);

      // Combine all components
      const payload = {
        encryptedAESKey: encryptedAESKey.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        encryptedMessage: encryptedMessage
      };

      return JSON.stringify(payload);
    } catch (error) {
      throw new Error(`Message encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt a P2P message using RSA + AES hybrid decryption
   * @param encryptedPayload Encrypted message payload
   * @param privateKey Recipient's RSA private key in PEM format
   * @returns Decrypted message
   */
  async decryptMessage(encryptedPayload: string, privateKey: string): Promise<string> {
    try {
      const payload = JSON.parse(encryptedPayload);

      // Decrypt AES key with our RSA private key
      const aesKey = privateDecrypt({
        key: privateKey,
        padding: 4 // RSA_PKCS1_OAEP_PADDING
      }, Buffer.from(payload.encryptedAESKey, 'base64'));

      // Decrypt message with AES
      const decipher = createDecipheriv('aes-256-gcm', aesKey, Buffer.from(payload.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

      let decrypted = decipher.update(payload.encryptedMessage, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Message decryption failed: ${error}`);
    }
  }

  /**
   * Derive a discovery key from master secret and network name
   * @param masterSecret Master secret for key derivation
   * @param networkName Network identifier
   * @param iterations Number of PBKDF2 iterations
   * @returns Derived key as hex string
   */
  async deriveDiscoveryKey(
    masterSecret: string, 
    networkName: string, 
    iterations?: number
  ): Promise<string> {
    try {
      const salt = createHash('sha256').update(networkName).digest();
      const keyLength = 32; // 256 bits

      const derivedKey = await pbkdf2Async(
        masterSecret, 
        salt, 
        iterations || this.config.keyDerivationIterations, 
        keyLength, 
        'sha256'
      );

      return derivedKey.toString('hex');
    } catch (error) {
      throw new Error(`Discovery key derivation failed: ${error}`);
    }
  }

  /**
   * Generate a cryptographically secure random key
   * @param length Key length in bytes
   * @returns Random key as hex string
   */
  generateRandomKey(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Create HMAC signature for message authentication
   * @param message Message to sign
   * @param key HMAC key
   * @returns HMAC signature as hex string
   */
  createHMACSignature(message: string, key: string): string {
    return createHash('sha256')
      .update(message + key)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   * @param message Original message
   * @param signature HMAC signature to verify
   * @param key HMAC key
   * @returns true if signature is valid
   */
  verifyHMACSignature(message: string, signature: string, key: string): boolean {
    const expectedSignature = this.createHMACSignature(message, key);
    return signature === expectedSignature;
  }

  /**
   * Create message hash for integrity checking
   * @param message Message to hash
   * @returns SHA-256 hash as hex string
   */
  createMessageHash(message: string): string {
    return createHash('sha256').update(message).digest('hex');
  }

  /**
   * Validate message freshness using timestamp
   * @param timestamp Message timestamp in milliseconds
   * @param maxAge Maximum age in milliseconds (default: 5 minutes)
   * @returns true if message is fresh
   */
  validateMessageFreshness(timestamp: number, maxAge: number = 5 * 60 * 1000): boolean {
    const now = Date.now();
    const age = now - timestamp;
    return age >= 0 && age <= maxAge;
  }

  /**
   * Generate a unique message ID
   * @returns Unique message ID
   */
  generateMessageId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `${timestamp}-${random}`;
  }
}

// Export singleton instance for convenience
export const cryptoService = new CryptoService();

// Export types and interfaces
export default CryptoService;
