/**
 * Health Check Function
 * Handles checking discovery service health
 */

import { StationConfig } from '../config/types';
import { HealthStatus } from './types';
import { makeRequest } from './request';

export async function checkHealth(config: StationConfig): Promise<HealthStatus> {
  const response = await makeRequest(config, 'GET', '?health=true');
  
  if (!response.success) {
    throw new Error(`Health check failed: ${response.error}`);
  }

  return response.data as HealthStatus;
}
