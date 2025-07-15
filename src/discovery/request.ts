/**
 * HTTP Request Function
 * Handles making requests to the discovery service
 */

import { StationConfig } from '../config/types';
import { DiscoveryResponse } from './types';

export async function makeRequest(
  config: StationConfig,
  method: string,
  path: string,
  body?: any
): Promise<DiscoveryResponse> {
  const url = `${config.discovery.serviceUrl}${path}`;
  const timeout = config.discovery.timeout * 1000;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `EncryptedMeshLink/1.0.0 (Station: ${config.stationId})`
    },
    signal: AbortSignal.timeout(timeout)
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
    }
    
    return data as DiscoveryResponse;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${config.discovery.timeout}s`);
    }
    throw error;
  }
}
