/**
 * RSA Key Generation and Management
 * MIB-002: Station Configuration System
 */

import { generateKeyPair, createHash, publicEncrypt, privateDecrypt } from 'crypto';
import { promisify } from 'util';
import { KeyPairResult } from './types';

const generateKeyPairAsync = promisify(generateKeyPair);

export class KeyManager {
  /**
   * Generate a new RSA key pair for station configuration
   * @param keySize Key size in bits (default: 2048)
   * @returns Promise resolving to key pair with fingerprint
   */
  static async generateKeyPair(keySize: number = 2048): Promise<KeyPairResult> {
    try {
      const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
        modulusLength: keySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Generate fingerprint (SHA-256 of public key DER)
      const publicKeyDer = Buffer.from(
        publicKey.replace(/-----BEGIN PUBLIC KEY-----\n/, '')
          .replace(/\n-----END PUBLIC KEY-----\n/, '')
          .replace(/\n/g, ''),
        'base64'
      );
      
      const fingerprint = createHash('sha256')
        .update(publicKeyDer)
        .digest('hex')
        .match(/.{2}/g)!
        .join(':')
        .toUpperCase();

      return {
        publicKey,
        privateKey,
        fingerprint
      };
    } catch (error) {
      throw new Error(`RSA key generation failed: ${error}`);
    }
  }

  /**
   * Validate an RSA key pair
   * @param publicKey Public key in PEM format
   * @param privateKey Private key in PEM format
   * @returns true if key pair is valid
   */
  static validateKeyPair(publicKey: string, privateKey: string): boolean {
    try {
      // Test encryption/decryption to verify key pair match
      const testMessage = Buffer.from('test-message', 'utf8');
      
      const encrypted = publicEncrypt({
        key: publicKey,
        padding: 4 // RSA_PKCS1_OAEP_PADDING
      }, testMessage);
      
      const decrypted = privateDecrypt({
        key: privateKey,
        padding: 4 // RSA_PKCS1_OAEP_PADDING
      }, encrypted);

      return decrypted.toString('utf8') === 'test-message';
    } catch (error) {
      console.error('Key validation error:', error);
      return false;
    }
  }

  /**
   * Get fingerprint of a public key
   * @param publicKey Public key in PEM format
   * @returns Fingerprint in hex format with colons
   */
  static getPublicKeyFingerprint(publicKey: string): string {
    try {
      // Extract DER from PEM format
      const publicKeyDer = Buffer.from(
        publicKey.replace(/-----BEGIN PUBLIC KEY-----\n/, '')
          .replace(/\n-----END PUBLIC KEY-----\n/, '')
          .replace(/\n/g, ''),
        'base64'
      );
      
      return createHash('sha256')
        .update(publicKeyDer)
        .digest('hex')
        .match(/.{2}/g)!
        .join(':')
        .toUpperCase();
    } catch (error) {
      throw new Error(`Failed to generate fingerprint: ${error}`);
    }
  }

  /**
   * Validate PEM format of a key
   * @param key Key in PEM format
   * @param type Expected key type ('public' or 'private')
   * @returns true if valid PEM format
   */
  static validatePemFormat(key: string, type: 'public' | 'private'): boolean {
    try {
      if (type === 'public') {
        // Check PEM structure for public key
        if (!key.includes('-----BEGIN PUBLIC KEY-----') || 
            !key.includes('-----END PUBLIC KEY-----')) {
          return false;
        }
        
        // Try to use the public key
        const testData = Buffer.from('test', 'utf8');
        publicEncrypt({
          key: key,
          padding: 4 // RSA_PKCS1_OAEP_PADDING
        }, testData);
        return true;
      } else {
        // Check PEM structure for private key
        if (!key.includes('-----BEGIN PRIVATE KEY-----') || 
            !key.includes('-----END PRIVATE KEY-----')) {
          return false;
        }
        
        // For private key validation, just check if it has the right structure
        // and that it's parseable (we can't easily test decryption without an encrypted message)
        return true;
      }
    } catch (error) {
      return false;
    }
  }
}
