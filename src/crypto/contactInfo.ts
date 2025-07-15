/**
 * Contact Info Encryption Functions
 * Handles encryption/decryption of contact information for discovery service
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { ContactInfo, CryptoConfig } from './types';

const scryptAsync = promisify(scrypt);

export async function encryptContactInfo(
  contactInfo: ContactInfo, 
  discoveryKey: string,
  config: Required<CryptoConfig>
): Promise<string> {
  try {
    const data = JSON.stringify(contactInfo);
    const salt = randomBytes(config.saltLength);
    const iv = randomBytes(config.ivLength);

    // Derive encryption key from discovery key using scrypt
    const key = await scryptAsync(discoveryKey, salt, config.aesKeyLength) as Buffer;

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

export async function decryptContactInfo(
  encryptedData: string, 
  discoveryKey: string,
  config: Required<CryptoConfig>
): Promise<ContactInfo> {
  try {
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, config.saltLength);
    const iv = combined.subarray(config.saltLength, config.saltLength + config.ivLength);
    const authTag = combined.subarray(
      config.saltLength + config.ivLength, 
      config.saltLength + config.ivLength + 16
    );
    const encrypted = combined.subarray(config.saltLength + config.ivLength + 16);

    // Derive decryption key
    const key = await scryptAsync(discoveryKey, salt, config.aesKeyLength) as Buffer;

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
