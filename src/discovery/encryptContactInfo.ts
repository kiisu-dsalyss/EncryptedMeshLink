/**
 * Encrypt Contact Info
 * MIB-007: Discovery Client - Contact Info Encryption Function
 */

import { ContactInfo } from './types';

/**
 * Encrypt contact information for discovery server
 */
export async function encryptContactInfo(
  contactInfo: ContactInfo,
  getSharedDiscoveryKey: () => Promise<string>
): Promise<string> {
  try {
    const sharedKey = await getSharedDiscoveryKey();
    const crypto = await import('crypto');
    
    // Use AES-256-GCM for encryption
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(sharedKey, 'salt', 32);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(contactInfo), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, authTag, and encrypted data
    const result = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    };
    
    return Buffer.from(JSON.stringify(result)).toString('base64');
    
  } catch (error) {
    console.error('❌ Contact info encryption failed:', error);
    throw new Error('Failed to encrypt contact information');
  }
}
