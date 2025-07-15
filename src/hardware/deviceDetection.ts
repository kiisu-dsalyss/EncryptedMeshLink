import { SerialPort } from "serialport";

interface ScoredPort {
    port: any;
    score: number;
    reasons: string[];
}

export async function findPortWithFallback(): Promise<string> {
    console.log("🔍 Scanning for physical Meshtastic devices...");
    
    const ports = await SerialPort.list();
    
    if (ports.length === 0) {
        throw new Error("No serial ports found on this system. Please connect a Meshtastic device.");
    }

    console.log(`Found ${ports.length} serial port(s), analyzing...`);
    
    // Score each port based on likelihood of being a Meshtastic device
    const scoredPorts: ScoredPort[] = ports.map(port => {
        let score = 0;
        const reasons: string[] = [];

        // Check manufacturer (highest priority)
        if (port.manufacturer?.toLowerCase().includes("espressif")) {
            score += 100;
            reasons.push("ESP32/Espressif manufacturer");
        }
        if (port.manufacturer?.toLowerCase().includes("silicon labs")) {
            score += 80;
            reasons.push("Silicon Labs USB-to-serial chip");
        }
        if (port.manufacturer?.toLowerCase().includes("ftdi")) {
            score += 70;
            reasons.push("FTDI USB-to-serial chip");
        }

        // Check port naming patterns
        if (port.path.includes("ttyACM")) {
            score += 60;
            reasons.push("Linux ACM device pattern");
        }
        if (port.path.includes("ttyUSB")) {
            score += 50;
            reasons.push("Linux USB serial pattern");
        }
        if (port.path.includes("usbmodem")) {
            score += 40;
            reasons.push("macOS USB modem pattern");
        }
        if (port.path.includes("usbserial")) {
            score += 30;
            reasons.push("USB serial pattern");
        }

        // Check vendor/product IDs for known Meshtastic hardware
        if (port.vendorId === "10c4" && port.productId === "ea60") {
            score += 90;
            reasons.push("CP2102 USB-to-UART Bridge (common in Meshtastic)");
        }
        if (port.vendorId === "1a86") {
            score += 60;
            reasons.push("CH340 USB-to-serial (sometimes used)");
        }
        if (port.vendorId === "0403") {
            score += 50;
            reasons.push("FTDI vendor ID");
        }

        // Bonus for having a serial number (more likely to be a real device)
        if (port.serialNumber && port.serialNumber !== "undefined") {
            score += 10;
            reasons.push("Has serial number");
        }

        return { port, score, reasons };
    });

    // Sort by score (highest first)
    scoredPorts.sort((a, b) => b.score - a.score);

    // Show analysis for all ports
    console.log("\n📊 Physical Port Analysis:");
    console.log("===========================");
    scoredPorts.forEach((scored, index) => {
        const { port, score, reasons } = scored;
        console.log(`${index + 1}. ${port.path} (Score: ${score})`);
        console.log(`   Manufacturer: ${port.manufacturer || 'Unknown'}`);
        if (port.vendorId) console.log(`   Vendor/Product: ${port.vendorId}:${port.productId}`);
        if (reasons.length > 0) {
            console.log(`   Reasons: ${reasons.join(', ')}`);
        }
        console.log("");
    });

    // Check if we have a clear winner
    const bestPort = scoredPorts[0];
    if (bestPort.score === 0) {
        throw new Error("No likely Meshtastic devices found. Please check your device connection and ensure it's powered on.");
    }

    // If there's a clear winner (score > 50), use it
    if (bestPort.score >= 50) {
        console.log(`✅ Auto-selected physical device: ${bestPort.port.path}`);
        console.log(`   Confidence: ${bestPort.score >= 100 ? 'Very High' : bestPort.score >= 80 ? 'High' : 'Medium'}`);
        console.log(`   Reasons: ${bestPort.reasons.join(', ')}`);
        return bestPort.port.path;
    }

    // If no clear winner, show options and pick the best one anyway
    console.log(`⚠️ No high-confidence physical match found. Using best guess: ${bestPort.port.path}`);
    console.log("   If this doesn't work, please ensure your Meshtastic device is properly connected");
    
    return bestPort.port.path;
}

// Backward compatibility
export const findPort = findPortWithFallback;
