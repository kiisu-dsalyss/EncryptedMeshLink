import "dotenv/config";
import { SerialPort } from "serialport";
import { findPort } from "./findPort";
import { sendMessage } from "./messageHandler";

async function startListening() {
    try {
        const portPath = await findPort();
        const port = new SerialPort({ path: portPath, baudRate: 115200 });

        let buffer = "";

        port.on("data", (data) => {
            buffer += data.toString();

            while (buffer.includes("Received text msg") && buffer.includes("msg=")) {
                const lines = buffer.split("\n");
                buffer = ""; // Reset buffer

                let message = { from: "", to: "", id: "", msg: "" };

                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (cleanLine.includes("from=")) message.from = cleanLine.match(/from=(0x[0-9a-fA-F]+)/)?.[1] || "";
                    if (cleanLine.includes("to=")) message.to = cleanLine.match(/to=(0x[0-9a-fA-F]+)/)?.[1] || "";
                    if (cleanLine.includes("id=")) message.id = cleanLine.match(/id=(0x[0-9a-fA-F]+)/)?.[1] || "";
                    if (cleanLine.includes("msg=")) message.msg = cleanLine.split("msg=")[1].trim();
                }

                if (message.from && message.to && message.id && message.msg) {
                    console.log(JSON.stringify(message, null, 2));

                    // Echo the message back to the sender
                    sendMessage(port, message.from, `Echo: ${message.msg}`);
                }
            }
        });

        port.on("error", (err) => console.error("Serial Port Error:", err.message));

        console.log(`Listening for messages on ${portPath}...`);
    } catch (err) {
        console.error("Error:", err);
    }
}

startListening();