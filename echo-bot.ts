import { MeshDevice, Utils } from "@meshtastic/core";
import * as Protobuf from "@meshtastic/protobufs";
import type { Types } from "@meshtastic/core";
import { SerialPort } from "serialport";
import { findPort } from "./findPort";

// Custom Node.js Serial Transport based on the official web-serial transport
class TransportNodeSerial implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private port: SerialPort;

  public static async create(baudRate?: number): Promise<TransportNodeSerial> {
    const portPath = await findPort();
    if (!portPath) {
      throw new Error("No Meshtastic device found");
    }
    
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

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.port.close(() => resolve());
    });
  }
}

async function main() {
  console.log("🔍 Looking for Meshtastic device...");
  
  try {
    // Create transport and device
    const transport = await TransportNodeSerial.create();
    const device = new MeshDevice(transport);
    let myNodeNum: number | undefined;

    console.log("🚀 Connected to device, setting up event listeners...");

    // Set up all event listeners BEFORE configuring
    device.events.onMyNodeInfo.subscribe((nodeInfo) => {
      myNodeNum = nodeInfo.myNodeNum;
      console.log(`📱 My node number: ${myNodeNum}`);
    });

    device.events.onDeviceStatus.subscribe((status) => {
      console.log(`📊 Device status changed: ${status}`);
      if (status === 7) { // DeviceConfigured
        console.log("✅ Device configured successfully!");
      }
    });

    // Listen for text messages and echo them back
    device.events.onMessagePacket.subscribe(async (packet) => {
      console.log(`📨 Received message from ${packet.from}: "${packet.data}"`);
      
      // Check if it's not from ourselves to avoid infinite loops
      if (myNodeNum && packet.from !== myNodeNum) {
        const echoMessage = `Echo: ${packet.data}`;
        console.log(`📤 Echoing back: "${echoMessage}"`);
        
        try {
          await device.sendText(echoMessage, packet.from);
          console.log("✅ Echo sent successfully");
        } catch (error) {
          console.error("❌ Failed to send echo:", error);
        }
      } else {
        console.log("🔄 Skipping echo (message from self or no node info yet)");
      }
    });

    // Debug: Listen to ALL mesh packets
    device.events.onMeshPacket.subscribe((packet) => {
      console.log(`🔍 DEBUG: Received mesh packet from ${packet.from} to ${packet.to}`);
    });

    console.log("⚙️ Starting device configuration...");
    
    // Configure the device
    await device.configure();

    console.log("👂 Device configured, now listening for messages...");

    // Give some time for initial configuration
    setTimeout(() => {
      console.log("🎯 Echo bot is ready! Send a message to test!");
    }, 2000);

    // Send a heartbeat every 30 seconds to keep connection alive
    setInterval(async () => {
      try {
        await device.heartbeat();
        console.log("💓 Heartbeat sent");
      } catch (error) {
        console.error("💔 Heartbeat failed:", error);
      }
    }, 30000);

    // Keep the program running
    console.log("🎯 Echo bot is running. Send a message to test!");
    
    // Send a heartbeat every 30 seconds to keep connection alive
    setInterval(async () => {
      try {
        await device.heartbeat();
        console.log("💓 Heartbeat sent");
      } catch (error) {
        console.error("💔 Heartbeat failed:", error);
      }
    }, 30000);

  } catch (error) {
    console.error("❌ Error starting echo bot:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n👋 Shutting down echo bot...");
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

export { TransportNodeSerial, main };
