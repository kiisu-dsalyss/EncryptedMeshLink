import { SerialPort } from "serialport";

async function findPort(): Promise<string> {
    if (process.env.MESHTASTIC_PORT) {
        console.log(`Using configured port: ${process.env.MESHTASTIC_PORT}`);
        return process.env.MESHTASTIC_PORT;
    }

    const ports = await SerialPort.list();
    const meshtasticPort = ports.find((p: any) => p.path.includes("ttyACM") || p.path.includes("ttyUSB"));

    if (meshtasticPort) {
        console.log(`Auto-detected Meshtastic device on: ${meshtasticPort.path}`);
        return meshtasticPort.path;
    } else {
        throw new Error("No Meshtastic device found.");
    }
}

async function startListening() {
    try {
        const portPath = await findPort();
        const port = new SerialPort({ path: portPath, baudRate: 115200 });

        port.on("data", (data) => {
            console.log("Received:", data.toString());
        });

        port.on("error", (err) => {
            console.error("Serial Port Error:", err.message);
        });

        console.log(`Listening on ${portPath}...`);
    } catch (err) {
        console.error("Error:", err);
    }
}

startListening();

