/**
 * Transport Node Serial - Modular Implementation
 * MIB-007: Transport Layer - Modular Serial Transport Class
 */

import type { Types } from "@jsr/meshtastic__core";
import { SerialPort } from "serialport";
import { createSerialPort } from "./createSerialPort";
import { setupToDeviceStream } from "./setupToDeviceStream";
import { setupFromDeviceStream } from "./setupFromDeviceStream";
import { disconnectSerialPort } from "./disconnectSerialPort";
import type { TransportConfig } from "./types";

// Custom Node.js Serial Transport based on the official web-serial transport
export class TransportNodeSerial implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private port: SerialPort;

  public static async create(baudRate?: number): Promise<TransportNodeSerial> {
    const config: TransportConfig = { baudRate };
    const port = await createSerialPort(config);
    return new TransportNodeSerial(port);
  }

  constructor(port: SerialPort) {
    this.port = port;
    this._toDevice = setupToDeviceStream(port);
    this._fromDevice = setupFromDeviceStream(port);
  }

  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  public async disconnect(): Promise<void> {
    return await disconnectSerialPort(this.port);
  }
}
