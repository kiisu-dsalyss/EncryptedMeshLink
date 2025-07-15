/**
 * P2P Configuration Validation
 * Validates peer-to-peer network configuration
 */

import { ConfigValidationError } from './types';

export function validateP2P(p2p: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!p2p || typeof p2p !== 'object') {
    errors.push({ field: 'p2p', message: 'P2P configuration is required' });
    return errors;
  }

  // Listen port validation
  if (p2p.listenPort === undefined || p2p.listenPort === null) {
    errors.push({ field: 'p2p.listenPort', message: 'Listen port is required' });
  } else if (!Number.isInteger(p2p.listenPort) || p2p.listenPort < 1024 || p2p.listenPort > 65535) {
    errors.push({
      field: 'p2p.listenPort',
      message: 'Listen port must be an integer between 1024 and 65535'
    });
  }

  // Max connections validation
  if (p2p.maxConnections === undefined || p2p.maxConnections === null) {
    errors.push({ field: 'p2p.maxConnections', message: 'Max connections is required' });
  } else if (!Number.isInteger(p2p.maxConnections) || p2p.maxConnections < 1 || p2p.maxConnections > 100) {
    errors.push({
      field: 'p2p.maxConnections',
      message: 'Max connections must be an integer between 1 and 100'
    });
  }

  // Connection timeout validation
  if (p2p.connectionTimeout === undefined || p2p.connectionTimeout === null) {
    errors.push({ field: 'p2p.connectionTimeout', message: 'Connection timeout is required' });
  } else if (!Number.isInteger(p2p.connectionTimeout) || p2p.connectionTimeout < 5 || p2p.connectionTimeout > 300) {
    errors.push({
      field: 'p2p.connectionTimeout',
      message: 'Connection timeout must be an integer between 5 and 300 seconds'
    });
  }

  return errors;
}
