/**
 * Setup From Device Stream
 * MIB-007: Transport Layer - Device Input Stream Setup Function
 */

import { Utils } from "@jsr/meshtastic__core";
import type { Types } from "@jsr/meshtastic__core";
import { SerialPort } from "serialport";

/**
 * Setup the readable stream from device with error handling
 */
export function setupFromDeviceStream(port: SerialPort): ReadableStream<Types.DeviceOutput> {
  // Create a proper stream from the serial port and pipe through the transform
  let controllerClosed = false;
  const nodeReadableStream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      port.on('data', (data: Buffer) => {
        try {
          if (!controllerClosed) {
            controller.enqueue(new Uint8Array(data));
          }
        } catch (error) {
          // Handle protobuf parsing errors gracefully
          console.warn('⚠️ Failed to process incoming data, skipping packet:', error instanceof Error ? error.message : 'Unknown error');
        }
      });

      port.on('error', (err) => {
        if (!controllerClosed) {
          console.error('🔌 Serial port error:', err);
          controller.error(err);
          controllerClosed = true;
        }
      });

      port.on('close', () => {
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

  return nodeReadableStream
    .pipeThrough(errorHandlingStream)
    .pipeThrough(Utils.fromDeviceStream());
}
