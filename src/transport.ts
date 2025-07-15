import { Utils } from "@meshtastic/core";
import type { Types } from "@meshtastic/core";
import { SerialPort } from "serialport";
import { findPortWithFallback } from "./hardware/deviceDetection";

// Custom Node.js Serial Transport based on the official web-serial transport
export class TransportNodeSerial implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private port: SerialPort;

  public static async create(baudRate?: number): Promise<TransportNodeSerial> {
    const portPath = await findPortWithFallback();
    if (!portPath) {
      throw new Error("No Meshtastic device found");
    }
    
    console.log(`🔌 Connecting to physical device: ${portPath}`);
    
    const port = new SerialPort({
      path: portPath,
      baudRate: baudRate || 115200,
    });

    return new TransportNodeSerial(port);
  }

  constructor(port: SerialPort) {
    this.port = port;

    // Use the official stream utilities for proper protocol handling
    this._toDevice = Utils.toDeviceStream.writable;
    Utils.toDeviceStream.readable.pipeTo(new WritableStream<Uint8Array>({
      write: (chunk) => {
        return new Promise((resolve, reject) => {
          this.port.write(chunk, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      },
    }));

    // Create a proper stream from the serial port and pipe through the transform
    const nodeReadableStream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.port.on('data', (data: Buffer) => {
          controller.enqueue(new Uint8Array(data));
        });

        this.port.on('error', (err) => {
          controller.error(err);
        });

        this.port.on('close', () => {
          controller.close();
        });
      },
    });

    this._fromDevice = nodeReadableStream.pipeThrough(Utils.fromDeviceStream());
  }

  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  public async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
