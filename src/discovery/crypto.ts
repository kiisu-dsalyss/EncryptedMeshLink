/**
 * Discovery Crypto Functions
 * Handles encryption/decryption for discovery client
 */

import { StationConfig } from '../config/types';
import { ContactInfo } from './types';

export async function encryptContactInfo(contactInfo: ContactInfo, config: StationConfig): Promise<string> {
  // Convert discovery ContactInfo to crypto ContactInfo format
  const cryptoContactInfo = {
    stationId: config.stationId,
    ipAddress: contactInfo.ip,
    port: contactInfo.port,
    publicKey: contactInfo.publicKey,
    lastSeen: contactInfo.lastSeen
  };
  
  const { cryptoService } = await import('../cryptoModular');
  const discoveryKey = config.keys.privateKey; // Use actual discovery key
  return cryptoService.encryptContactInfo(cryptoContactInfo, discoveryKey);
}

export async function decryptContactInfo(encryptedData: string, config: StationConfig): Promise<ContactInfo> {
  const { cryptoService } = await import('../cryptoModular');
  const discoveryKey = config.keys.privateKey; // Use actual discovery key
  const decrypted = await cryptoService.decryptContactInfo(encryptedData, discoveryKey);
  
  // Convert crypto ContactInfo back to discovery ContactInfo format
  return {
    ip: decrypted.ipAddress || '',
    port: decrypted.port || 0,
    publicKey: decrypted.publicKey,
    lastSeen: decrypted.lastSeen
  };
}
