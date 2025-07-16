/**
 * Create Serial Transport
 * MIB-007: Transport Layer - Serial Transport Creation Function
 */

import { SerialPort } from "serialport";
import { findPortWithFallback } from "../hardware/deviceDetection";
import type { TransportConfig } from "./types";

/**
 * Create a new SerialPort instance for Meshtastic device communication
 */
export async function createSerialPort(config?: TransportConfig): Promise<SerialPort> {
  const portPath = config?.portPath || await findPortWithFallback();
  if (!portPath) {
    throw new Error("No Meshtastic device found");
  }
  
  console.log(`🔌 Connecting to physical device: ${portPath}`);
  
  const port = new SerialPort({
    path: portPath,
    baudRate: config?.baudRate || 115200,
  });

  return port;
}
