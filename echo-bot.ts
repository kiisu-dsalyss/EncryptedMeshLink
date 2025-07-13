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
    const knownNodes = new Map<number, any>(); // Store known nodes

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
        
        // Show available nodes after configuration
        setTimeout(() => {
          showAvailableNodes(knownNodes, myNodeNum);
        }, 3000);
      }
    });

    // Listen for node info packets to build node list
    device.events.onNodeInfoPacket.subscribe((nodeInfo) => {
      knownNodes.set(nodeInfo.num, {
        num: nodeInfo.num,
        user: nodeInfo.user,
        position: nodeInfo.position,
        lastSeen: new Date()
      });
      console.log(`📍 Node discovered: ${nodeInfo.num} ${nodeInfo.user?.longName || 'Unknown'}`);
    });

    // Listen for text messages and handle relay commands
    device.events.onMessagePacket.subscribe(async (packet) => {
      console.log(`📨 Received message from ${packet.from}: "${packet.data}"`);
      
      // Check if it's not from ourselves to avoid infinite loops
      if (myNodeNum && packet.from !== myNodeNum) {
        // Check if this is a relay command (@{nodeId} message or @{nodeName} message)
        const relayMatch = packet.data.match(/^@(\w+)\s+(.+)$/i);
        
        if (relayMatch) {
          const targetIdentifier = relayMatch[1].toLowerCase();
          const message = relayMatch[2];
          
          console.log(`🔄 Relay request: Forward "${message}" to "${targetIdentifier}"`);
          
          // Find target node by ID or name
          let targetNodeId: number | undefined;
          let targetNode: any;
          
          // Check if it's a numeric ID
          if (/^\d+$/.test(targetIdentifier)) {
            targetNodeId = parseInt(targetIdentifier);
            targetNode = knownNodes.get(targetNodeId);
          } else {
            // Search by name (longName or shortName)
            knownNodes.forEach((node, nodeId) => {
              if (!targetNodeId) { // Only set if we haven't found one yet
                const longName = node.user?.longName?.toLowerCase() || '';
                const shortName = node.user?.shortName?.toLowerCase() || '';
                
                if (longName.includes(targetIdentifier) || shortName.includes(targetIdentifier)) {
                  targetNodeId = nodeId;
                  targetNode = node;
                }
              }
            });
          }
          
          if (targetNodeId && targetNode) {
            console.log(`📤 Relaying to: ${targetNode.user?.longName || 'Unknown'} (${targetNodeId})`);
            
            try {
              const relayMessage = `[From ${packet.from}]: ${message}`;
              await device.sendText(relayMessage, targetNodeId);
              console.log("✅ Message relayed successfully");
              
              // Send confirmation back to sender
              await device.sendText(`✅ Message relayed to ${targetNode.user?.longName || targetNodeId}`, packet.from);
            } catch (error) {
              console.error("❌ Failed to relay message:", error);
              await device.sendText(`❌ Failed to relay message to ${targetIdentifier}`, packet.from);
            }
          } else {
            console.log(`❌ Target "${targetIdentifier}" not found in known nodes`);
            await device.sendText(`❌ Node "${targetIdentifier}" not found. Use 'nodes' to see available nodes.`, packet.from);
          }
        } else if (packet.data.toLowerCase() === 'nodes') {
          // Send list of available nodes
          const nodeList = Array.from(knownNodes.values())
            .filter(node => node.num !== myNodeNum)
            .map(node => `${node.num}: ${node.user?.longName || 'Unknown'}`)
            .join('\n');
          
          const response = nodeList.length > 0 
            ? `Available nodes:\n${nodeList}\n\nSend: @{nodeId} {message} to relay`
            : "No other nodes found in mesh network";
          
          await device.sendText(response, packet.from);
        } else {
          // Regular echo functionality for non-relay messages
          const echoMessage = `Echo: ${packet.data}`;
          console.log(`📤 Echoing back: "${echoMessage}"`);
          
          try {
            await device.sendText(echoMessage, packet.from);
            console.log("✅ Echo sent successfully");
          } catch (error) {
            console.error("❌ Failed to send echo:", error);
          }
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

// Helper function to display available nodes
function showAvailableNodes(knownNodes: Map<number, any>, myNodeNum?: number) {
  console.log("\n📡 Known Mesh Nodes:");
  console.log("===================");
  
  if (knownNodes.size === 0) {
    console.log("No nodes discovered yet");
    return;
  }

  const sortedNodes = Array.from(knownNodes.values()).sort((a, b) => a.num - b.num);
  
  sortedNodes.forEach(node => {
    const isSelf = node.num === myNodeNum;
    const name = node.user?.longName || 'Unknown';
    const shortName = node.user?.shortName || '????';
    const selfIndicator = isSelf ? ' (THIS DEVICE)' : '';
    
    console.log(`📱 ${node.num}: ${name} [${shortName}]${selfIndicator}`);
  });
  
  console.log(`\n💬 Usage:`);
  console.log(`   Send "nodes" to get this list`);
  console.log(`   Send "@{nodeId} {message}" to relay by ID`);
  console.log(`   Send "@{nodeName} {message}" to relay by name`);
  console.log(`   Example: "@3616546689 Hello there!"`);
  console.log(`   Example: "@fester Hello there!"`);
  console.log("===================\n");
}
