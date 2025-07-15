/**
 * Station Registration Functions
 * Handles registering and unregistering stations with the discovery service
 */

import { StationConfig } from '../config/types';
import { ContactInfo } from './types';
import { makeRequest } from './request';
import { getPublicIP } from './ipDetection';
import { encryptContactInfo } from '../crypto/contactInfo';

export async function registerStation(config: StationConfig): Promise<boolean> {
  try {
    const contactInfo: ContactInfo = {
      ip: await getPublicIP(),
      port: config.p2p.listenPort,
      publicKey: config.keys.publicKey,
      lastSeen: Date.now()
    };

    const encryptedContactInfo = await encryptContactInfo(contactInfo, config);
    
    const payload = {
      station_id: config.stationId,
      encrypted_contact_info: encryptedContactInfo,
      public_key: config.keys.publicKey
    };

    const response = await makeRequest(config, 'POST', '', payload);
    
    if (response.success) {
      return true;
    } else {
      throw new Error(`Registration failed: ${response.error}`);
    }
  } catch (error) {
    throw new Error(`Registration error: ${error}`);
  }
}

export async function unregisterStation(config: StationConfig): Promise<boolean> {
  const response = await makeRequest(config, 'DELETE', `?station_id=${config.stationId}`);
  
  if (response.success) {
    return true;
  } else {
    throw new Error(`Unregistration failed: ${response.error}`);
  }
}
