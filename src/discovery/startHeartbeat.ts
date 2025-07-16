/**
 * Start Heartbeat
 * MIB-007: Discovery Client - Heartbeat Function
 */

import { DiscoveryResponse } from './types';

/**
 * Start heartbeat interval to maintain registration
 */
export function startHeartbeat(
  intervalMs: number,
  isActive: () => boolean,
  stationId: string,
  encryptedContactInfo: string,
  publicKey: string,
  makeRequest: (method: string, path: string, body?: any) => Promise<DiscoveryResponse>,
  handleError: (error: Error) => void
): NodeJS.Timeout {
  return setInterval(async () => {
    if (!isActive()) return;
    
    try {
      console.log(`💓 Sending heartbeat for station ${stationId}...`);
      
      const response = await makeRequest('POST', '', {
        station_id: stationId,
        encrypted_contact_info: encryptedContactInfo,
        public_key: publicKey
      });

      if (response.success) {
        console.log('💓 Heartbeat sent successfully');
      } else {
        console.warn(`⚠️ Heartbeat failed: ${response.error}`);
      }
    } catch (error) {
      console.error('💔 Heartbeat error:', error);
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }, intervalMs);
}
