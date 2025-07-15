/**
 * Discovery Crypto Functions
 * Handles encryption/decryption for discovery client
 */

import { StationConfig } from '../config/types';
import { ContactInfo } from './types';

export async function encryptContactInfo(contactInfo: ContactInfo, config: StationConfig): Promise<string> {
  // TODO: Implement AES encryption when MIB-003 (Cryptography) is complete
  // For now, just base64 encode the JSON
  const json = JSON.stringify(contactInfo);
  return Buffer.from(json).toString('base64');
}

export async function decryptContactInfo(encryptedData: string, config: StationConfig): Promise<ContactInfo> {
  // TODO: Implement AES decryption when MIB-003 (Cryptography) is complete
  // For now, return a placeholder
  const decoded = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
  return decoded;
}
