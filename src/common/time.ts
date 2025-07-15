/**
 * Common Time Utilities
 * Standardized functions for time-related operations
 */

/**
 * Get current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Get current timestamp as a base36 string (compact representation)
 */
export function getTimestampBase36(): string {
  return Date.now().toString(36);
}

/**
 * Create a Date object from timestamp or current time
 */
export function createDate(timestamp?: number): Date {
  return timestamp ? new Date(timestamp) : new Date();
}

/**
 * Format a date/timestamp for display
 */
export function formatDateTime(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Generate a unique request ID with timestamp
 */
export function generateRequestId(prefix: string = 'req'): string {
  return `${prefix}_${getTimestampBase36()}`;
}

/**
 * Check if a timestamp is within a given time window (in milliseconds)
 */
export function isWithinTimeWindow(timestamp: number, windowMs: number): boolean {
  return (getCurrentTimestamp() - timestamp) <= windowMs;
}
