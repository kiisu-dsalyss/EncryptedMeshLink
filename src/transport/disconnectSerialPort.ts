/**
 * Disconnect Serial Port
 * MIB-007: Transport Layer - Serial Port Disconnection Function
 */

import { SerialPort } from "serialport";

/**
 * Safely disconnect and cleanup serial port
 */
export async function disconnectSerialPort(port: SerialPort): Promise<void> {
  return new Promise((resolve, reject) => {
    // Remove all listeners to prevent further events
    port.removeAllListeners('data');
    port.removeAllListeners('error');
    port.removeAllListeners('close');
    
    port.close((err) => {
      if (err) {
        console.error('🔌 Error closing serial port:', err);
        reject(err);
      } else {
        console.log('🔌 Serial port disconnected successfully');
        resolve();
      }
    });
  });
}
