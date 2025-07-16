/**
 * Transport Types
 * MIB-007: Transport Layer - Type Definitions
 */

import type { Types } from "@jsr/meshtastic__core";
import { SerialPort } from "serialport";

export interface TransportConfig {
  baudRate?: number;
  portPath?: string;
}

export interface SerialTransportInstance {
  port: SerialPort;
  toDevice: WritableStream<Uint8Array>;
  fromDevice: ReadableStream<Types.DeviceOutput>;
}
