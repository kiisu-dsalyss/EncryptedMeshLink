/**
 * Register Station
 * MIB-007: Discovery Client - Station Registration Function
 */

import { DiscoveryResponse, ContactInfo } from './types';

/**
 * Register station with discovery server
 */
export async function registerStation(
  stationId: string,
  contactInfo: ContactInfo,
  encryptedContactInfo: string,
  makeRequest: (method: string, path: string, body?: any) => Promise<DiscoveryResponse>
): Promise<boolean> {
  console.log(`📡 Registering station ${stationId} with discovery server...`);
  
  try {
    const response = await makeRequest('POST', '', {
      action: 'register',
      station_id: stationId,
      contact_info: encryptedContactInfo,
      last_seen: Math.floor(Date.now() / 1000)
    });

    if (response.success) {
      console.log(`✅ Station ${stationId} registered successfully`);
      console.log(`🌐 Public IP: ${contactInfo.ip}`);
      console.log(`🔌 Port: ${contactInfo.port}`);
      return true;
    } else {
      console.warn(`⚠️ Registration failed: ${response.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Registration error:`, error);
    return false;
  }
}
