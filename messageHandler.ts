import { SerialPort } from "serialport";

export function sendMessage(port: SerialPort, to: string, message: string) {
    // Extract clean hex node ID (remove "0x" prefix and add "!")
    const cleanNodeId = to.startsWith("0x") ? `!${to.slice(2)}` : `!${to}`;

    const command = `meshtastic --sendtext "${message}" --dest ${cleanNodeId} --priority 5 --portnum 1\n`;
    
    console.log(`🔄 Attempting to send: ${command.trim()}`); // Debug log before sending
    
    port.write(command, (err) => {
        if (err) {
            console.error("Error sending message:", err.message);
        } else {
            console.log(`📡 Echoed message back to ${cleanNodeId}: "${message}"`);
        }
    });
}