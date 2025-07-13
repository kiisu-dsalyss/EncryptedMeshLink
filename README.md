# Meshtastic Echo Bot

A Node.js echo bot for Meshtastic mesh networks using the official JavaScript library.

## Features

- 🔍 **Auto-detects** Meshtastic devices via USB serial
- 📡 **Connects** using the official Meshtastic JavaScript library
- 💬 **Echoes** incoming text messages back to sender
- 🛡️ **Loop prevention** - won't echo its own messages
- 💓 **Heartbeat** management to keep connection alive
- 🏗️ **Clean architecture** with proper TypeScript types

## Requirements

- Node.js (v16 or higher)
- Meshtastic device connected via USB
- TypeScript (for development)

## Installation

```bash
npm install
```

## Usage

### Development Mode (with auto-restart)

```bash
npm run dev:watch
```

### Run Once

```bash
npm run dev
# or
npm run echo-bot
```

### Production Build

```bash
npm run build
npm start
```

## How It Works

1. **Device Detection**: Scans for Meshtastic devices and scores them based on manufacturer and USB patterns
2. **Connection**: Creates a custom Node.js serial transport compatible with the official library
3. **Configuration**: Uses the official Meshtastic protocol to configure the device
4. **Echo Logic**: Listens for incoming text messages and responds with "Echo: [message]"
5. **Smart Filtering**: Prevents infinite loops by ignoring its own messages

## Project Structure

```text
├── echo-bot.ts          # Main echo bot application
├── findPort.ts          # USB device detection and scoring
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Dependencies

- `@meshtastic/core` - Official Meshtastic JavaScript core library
- `@meshtastic/protobufs` - Official Meshtastic protocol definitions
- `serialport` - Node.js serial port communication
- `typescript` + `ts-node` - TypeScript support

## Example Output

```text
🔍 Looking for Meshtastic device...
✅ Auto-selected: /dev/tty.usbmodem21101
🚀 Connected to device, setting up event listeners...
📱 My node number: 3616546689
✅ Device configured successfully!
📨 Received message from 667571852: "hello"
📤 Echoing back: "Echo: hello"
✅ Echo sent successfully
```

## License

ISC
