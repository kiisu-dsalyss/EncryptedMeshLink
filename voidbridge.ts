import { MeshDevice } from "@meshtastic/core";
import { TransportNodeSerial } from "./src/transport";
import { NodeManager } from "./src/nodeManager";
import { RelayHandler } from "./src/relayHandler";
import { MessageParser } from "./src/messageParser";

async function main() {
  console.log("🔍 Looking for Meshtastic device...");
  
  try {
    // Create transport and device
    const transport = await TransportNodeSerial.create();
    const device = new MeshDevice(transport);
    let myNodeNum: number | undefined;
    // Create node manager and relay handler
    const nodeManager = new NodeManager();
    const knownNodes = nodeManager.getKnownNodes();
    let relayHandler: RelayHandler;

    console.log("🚀 Connected to device, setting up event listeners...");
    console.log("🌉 Initializing VoidBridge station...");

    // Set up all event listeners BEFORE configuring
    device.events.onMyNodeInfo.subscribe((nodeInfo) => {
      myNodeNum = nodeInfo.myNodeNum;
      console.log(`📱 Station node number: ${myNodeNum}`);
      
      // Initialize relay handler now that we have node info
      relayHandler = new RelayHandler(device, knownNodes, myNodeNum);
    });

    device.events.onDeviceStatus.subscribe((status) => {
      console.log(`📊 Device status changed: ${status}`);
      if (status === 7) { // DeviceConfigured
        console.log("✅ Device configured successfully!");
        
        // Show available nodes after configuration
        setTimeout(() => {
          nodeManager.showAvailableNodes(myNodeNum);
        }, 3000);
      }
    });

    // Listen for node info packets to build node list
    device.events.onNodeInfoPacket.subscribe((nodeInfo) => {
      nodeManager.addNode(nodeInfo);
    });

    // Listen for text messages and handle relay commands
    device.events.onMessagePacket.subscribe(async (packet) => {
      console.log(`📨 Received message from ${packet.from}: "${packet.data}"`);
      
      // Check if it's not from ourselves to avoid infinite loops
      if (myNodeNum && packet.from !== myNodeNum && relayHandler) {
        const parsedMessage = MessageParser.parseMessage(packet.data);
        
        switch (parsedMessage.type) {
          case 'relay':
            if (parsedMessage.targetIdentifier && parsedMessage.message) {
              await relayHandler.handleRelayMessage(packet, parsedMessage.targetIdentifier, parsedMessage.message);
            }
            break;
          case 'nodes':
            await relayHandler.handleNodesRequest(packet);
            break;
          case 'echo':
            await relayHandler.handleEchoMessage(packet);
            break;
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
    
    // Configure the device with timeout handling
    try {
      await device.configure();
      console.log("👂 Device configured, now listening for messages...");
    } catch (configError) {
      // Handle PKI timeout and other config errors gracefully
      if (configError && typeof configError === 'object' && 'error' in configError) {
        console.log(`⚠️ Configuration timeout (error ${configError.error}), but device is likely working. Continuing...`);
      } else {
        console.error("❌ Configuration failed:", configError);
        throw configError; // Re-throw if it's a real failure
      }
    }

    // Give some time for initial configuration
    setTimeout(() => {
      console.log("� VoidBridge station ready! Send a message to test bridging!");
    }, 2000);

    // Send a heartbeat every 30 seconds to keep connection alive
    setInterval(async () => {
      try {
        await device.heartbeat();
        console.log("💓 Heartbeat sent");
      } catch (error) {
        // Handle heartbeat timeouts gracefully
        if (error && typeof error === 'object' && 'error' in error) {
          console.log(`⚠️ Heartbeat timeout (error ${error.error}), connection likely still active`);
        } else {
          console.error("💔 Heartbeat failed:", error);
        }
      }
    }, 30000);

    // Keep the program running
    console.log("� VoidBridge station is running. Send a message to test bridging!");

  } catch (error) {
    // Handle different types of errors gracefully
    if (error && typeof error === 'object' && 'error' in error) {
      console.log(`⚠️ PKI/Config timeout error (${error.error}), but VoidBridge functionality should work. Restarting...`);
      // Don't exit, just log and let the process restart
      setTimeout(() => {
        console.log("🔄 Attempting to restart VoidBridge...");
        main().catch(console.error);
      }, 3000);
    } else {
      console.error("❌ Critical error starting VoidBridge:", error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n👋 Shutting down VoidBridge...");
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

export { TransportNodeSerial, main };
