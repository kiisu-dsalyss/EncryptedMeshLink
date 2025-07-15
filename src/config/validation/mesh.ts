/**
 * Mesh Configuration Validation
 * Validates mesh network hardware configuration
 */

import { ConfigValidationError } from './types';

export function validateMesh(mesh: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!mesh || typeof mesh !== 'object') {
    errors.push({ field: 'mesh', message: 'Mesh configuration is required' });
    return errors;
  }

  // Auto-detect validation
  if (typeof mesh.autoDetect !== 'boolean') {
    errors.push({
      field: 'mesh.autoDetect',
      message: 'Auto-detect must be a boolean'
    });
  }

  // Device path validation (only if autoDetect is false)
  if (mesh.autoDetect === false) {
    if (!mesh.devicePath) {
      errors.push({ field: 'mesh.devicePath', message: 'Device path is required when auto-detect is disabled' });
    } else if (typeof mesh.devicePath !== 'string') {
      errors.push({ field: 'mesh.devicePath', message: 'Device path must be a string' });
    }
  }

  // Baud rate validation
  const validBaudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
  if (mesh.baudRate === undefined || mesh.baudRate === null) {
    errors.push({ field: 'mesh.baudRate', message: 'Baud rate is required' });
  } else if (!validBaudRates.includes(mesh.baudRate)) {
    errors.push({
      field: 'mesh.baudRate',
      message: `Baud rate must be one of: ${validBaudRates.join(', ')}`
    });
  }

  return errors;
}
