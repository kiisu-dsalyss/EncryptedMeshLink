/**
 * Configuration Validation (Modular)
 * MIB-002: Station Configuration System
 */

import { StationConfig } from './types';
import { ConfigValidationError, ConfigValidationResult } from './validation/types';
import { validateStationId } from './validation/stationId';
import { validateDisplayName } from './validation/displayName';
import { validateKeys } from './validation/keys';
import { validateDiscovery } from './validation/discovery';
import { validateP2P } from './validation/p2p';
import { validateMesh } from './validation/mesh';
import { validateMetadata } from './validation/metadata';

export { ConfigValidationError, ConfigValidationResult } from './validation/types';

export class ConfigValidator {
  /**
   * Validate a complete station configuration
   * @param config Configuration to validate
   * @returns Validation result with errors if any
   */
  static validate(config: any): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];

    // Basic structure validation
    if (!config || typeof config !== 'object') {
      return {
        isValid: false,
        errors: [{ field: 'root', message: 'Configuration must be a valid object' }]
      };
    }

    // Station ID validation
    errors.push(...validateStationId(config.stationId));

    // Display name validation
    errors.push(...validateDisplayName(config.displayName));

    // Keys validation
    errors.push(...validateKeys(config.keys));

    // Discovery configuration validation
    errors.push(...validateDiscovery(config.discovery));

    // P2P configuration validation
    errors.push(...validateP2P(config.p2p));

    // Mesh configuration validation
    errors.push(...validateMesh(config.mesh));

    // Metadata validation
    errors.push(...validateMetadata(config.metadata));

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
