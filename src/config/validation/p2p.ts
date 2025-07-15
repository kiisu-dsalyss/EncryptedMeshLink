/**
 * P2P Configuration Validation
 * Validates peer-to-peer network configuration
 */

import { ConfigValidationError } from './types';
import { validatePort, validateP2PMaxConnections, validateP2PConnectionTimeout } from '../../common/validation';

export function validateP2P(p2p: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!p2p || typeof p2p !== 'object') {
    errors.push({ field: 'p2p', message: 'P2P configuration is required' });
    return errors;
  }

  // Listen port validation
  if (p2p.listenPort === undefined || p2p.listenPort === null) {
    errors.push({ field: 'p2p.listenPort', message: 'Listen port is required' });
  } else {
    const portValidation = validatePort(p2p.listenPort, 'Listen port');
    if (!portValidation.isValid) {
      errors.push({
        field: 'p2p.listenPort',
        message: portValidation.error!
      });
    }
  }

  // Max connections validation
  if (p2p.maxConnections === undefined || p2p.maxConnections === null) {
    errors.push({ field: 'p2p.maxConnections', message: 'Max connections is required' });
  } else {
    const connectionsValidation = validateP2PMaxConnections(p2p.maxConnections);
    if (!connectionsValidation.isValid) {
      errors.push({
        field: 'p2p.maxConnections',
        message: connectionsValidation.error!
      });
    }
  }

  // Connection timeout validation
  if (p2p.connectionTimeout === undefined || p2p.connectionTimeout === null) {
    errors.push({ field: 'p2p.connectionTimeout', message: 'Connection timeout is required' });
  } else {
    const timeoutValidation = validateP2PConnectionTimeout(p2p.connectionTimeout);
    if (!timeoutValidation.isValid) {
      errors.push({
        field: 'p2p.connectionTimeout',
        message: timeoutValidation.error!
      });
    }
  }

  return errors;
}
