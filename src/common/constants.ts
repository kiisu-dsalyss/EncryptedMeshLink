/**
 * Common Constants
 * Shared constants used throughout the application
 */

/**
 * Valid baud rates for Meshtastic devices
 */
export const VALID_BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

/**
 * Network port ranges
 */
export const PORT_RANGES = {
  MIN_USER_PORT: 1024,
  MAX_PORT: 65535
} as const;

/**
 * Validation ranges
 */
export const VALIDATION_RANGES = {
  DISCOVERY_TIMEOUT: { min: 5, max: 300 },
  DISCOVERY_CHECK_INTERVAL: { min: 30, max: 3600 },
  P2P_MAX_CONNECTIONS: { min: 1, max: 100 },
  P2P_CONNECTION_TIMEOUT: { min: 5, max: 300 },
  STATION_ID_LENGTH: { min: 3, max: 20 },
  DISPLAY_NAME_LENGTH: { min: 1, max: 100 },
  DEFAULT_KEY_SIZE: { min: 1024, max: 4096 }
} as const;

/**
 * Regular expressions for validation
 */
export const VALIDATION_PATTERNS = {
  STATION_ID: /^[a-zA-Z0-9-]{3,20}$/,
  PUBLIC_KEY_PEM_START: '-----BEGIN PUBLIC KEY-----',
  PUBLIC_KEY_PEM_END: '-----END PUBLIC KEY-----',
  PRIVATE_KEY_PEM_START: '-----BEGIN PRIVATE KEY-----',
  PRIVATE_KEY_PEM_END: '-----END PRIVATE KEY-----'
} as const;

/**
 * Message ID patterns for crypto service
 */
export const MESSAGE_ID_PATTERN = /^[a-z0-9]+-[a-f0-9]{16}$/;
