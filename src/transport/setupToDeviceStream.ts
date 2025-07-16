/**
 * Setup Device Stream
 * MIB-007: Transport Layer - Device Output Stream Setup Function
 */

import { Utils } from "@jsr/meshtastic__core";
import type { Types } from "@jsr/meshtastic__core";
import { SerialPort } from "serialport";

/**
 * Setup the writable stream to device
 */
export function setupToDeviceStream(port: SerialPort): WritableStream<Uint8Array> {
  const toDevice = Utils.toDeviceStream.writable;
  
  Utils.toDeviceStream.readable.pipeTo(new WritableStream<Uint8Array>({
    write: (chunk) => {
      return new Promise((resolve, reject) => {
        port.write(chunk, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  }));

  return toDevice;
}
