import { Utils } from "@jsr/meshtastic__core";
import type { Types } from "@jsr/meshtastic__core";
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
    let controllerClosed = false;
    const nodeReadableStream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.port.on('data', (data: Buffer) => {
          try {
            if (!controllerClosed) {
              controller.enqueue(new Uint8Array(data));
            }
          } catch (error) {
            // Handle protobuf parsing errors gracefully
            console.warn('⚠️ Failed to process incoming data, skipping packet:', error instanceof Error ? error.message : 'Unknown error');
          }
        });

        this.port.on('error', (err) => {
          if (!controllerClosed) {
            console.error('🔌 Serial port error:', err);
            controller.error(err);
            controllerClosed = true;
          }
        });

        this.port.on('close', () => {
          if (!controllerClosed) {
            console.log('🔌 Serial port closed');
            controller.close();
            controllerClosed = true;
          }
        });
      },
    });

    // Add error handling transform before the fromDeviceStream
    const errorHandlingStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        try {
          controller.enqueue(chunk);
        } catch (error) {
          console.warn('⚠️ Dropping corrupted packet:', error instanceof Error ? error.message : 'Unknown error');
          // Drop the corrupted chunk, don't re-throw
        }
      }
    });

    this._fromDevice = nodeReadableStream
      .pipeThrough(errorHandlingStream)
      .pipeThrough(Utils.fromDeviceStream());
  }

  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  public async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove all listeners to prevent further events
      this.port.removeAllListeners('data');
      this.port.removeAllListeners('error');
      this.port.removeAllListeners('close');
      
      this.port.close((err) => {
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
}
