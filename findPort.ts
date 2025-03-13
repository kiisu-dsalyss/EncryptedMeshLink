import { SerialPort } from "serialport";

export async function findPort(): Promise<string> {
    if (process.env.MESHTASTIC_PORT) {
        console.log(`Using configured port: ${process.env.MESHTASTIC_PORT}`);
        return process.env.MESHTASTIC_PORT;
    }

    const ports = await SerialPort.list();
    const meshtasticPort = ports.find(p =>
        p.path.includes("ttyACM") || p.path.includes("ttyUSB") || p.path.includes("usbmodem")
    );

    if (meshtasticPort) {
        console.log(`Auto-detected Meshtastic device on: ${meshtasticPort.path}`);
        return meshtasticPort.path;
    } else {
        throw new Error("No Meshtastic device found.");
    }
}
