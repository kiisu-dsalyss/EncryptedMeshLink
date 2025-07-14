# EncryptedMeshLink

A powerful internet bridge system for Meshtastic mesh networks with encrypted P2P discovery and message relay capabilities.

## Current Status

### ✅ Phase 1 Features (WORKING NOW)

- 📡 **Local Message Relay** - Routes messages within mesh using `@{identifier}` format
- 🔍 **USB Auto-Detection** - Finds and connects to Meshtastic devices automatically  
- 👥 **Node Management** - Tracks and resolves node names for human-readable messaging
- 💬 **Command Processing** - Handles `@instructions`, `@nodes`, and `@echo` commands
- 🔧 **Robust Error Handling** - Graceful PKI timeout management and auto-recovery
- 🏗️ **Modular Architecture** - Clean TypeScript implementation with separation of concerns

### 🚧 Phase 2 Features (MIB-002 READY)

- ✅ **Station Configuration** - JSON config with RSA keys and validation *(MIB-002 Complete)*
- 🌉 **Internet Bridge** - Connects distant Meshtastic networks via internet *(Phase 2)*
- 🔐 **Encrypted P2P** - RSA + AES encrypted communication between stations *(Phase 2)*
- 🔍 **Auto-discovery** - Encrypted peer discovery via PHP service *(Phase 2)*
- 🛡️ **Security First** - Zero-knowledge discovery server, end-to-end encryption *(Phase 2)*
- 🐳 **Docker Ready** - Containerization for development and deployment *(Phase 2)*
- 📊 **Basic Monitoring** - Simple logging and health checks for Pi deployment *(Phase 2)*

## Requirements

- Node.js (v24 LTS or higher)
- Meshtastic device connected via USB
- Docker & Docker Compose (for development)
- TypeScript 5.8+ (for development)

## Installation

```bash
npm install
```

## Usage

### Quick Start (Development)

```bash
# Install dependencies
npm install

# Start development environment with auto-restart
npm run dev:watch

# Single run for testing
npm run encryptedmeshlink
```

### Production Usage (Phase 2 - Not Yet Available)

Docker deployment and Pi configurations are planned for Phase 2:

```bash
# Future: Docker development environment (not yet implemented)
docker-compose -f docker-architecture/development/docker-compose.dev.yml up -d

# Future: Production on Raspberry Pi (not yet implemented)  
./docker-architecture/production/deploy.sh pi@your-pi.local station-id-001
```

### Configuration Management (Phase 2)

```bash
# Initialize new station configuration
npm run encryptedmeshlink -- config init --station-id=my-station-001 --display-name="My Station" --location="City, State" --operator="N0CALL"

# Show current configuration
npm run encryptedmeshlink -- config show

# Validate configuration
npm run encryptedmeshlink -- config validate

# Regenerate RSA keys
npm run encryptedmeshlink -- config regen-keys

# Update configuration values
npm run encryptedmeshlink -- config set displayName "New Station Name"
npm run encryptedmeshlink -- config set discovery.serviceUrl "https://custom.discovery.com/api"
```

### Direct Usage (Current)

```bash
# Development mode with TypeScript
npm run dev

# Development with auto-restart on changes
npm run dev:watch

# Single execution
npm run encryptedmeshlink
```

### Build for Production (Phase 1 Ready)

```bash
npm run build
npm start
```

## What Works Right Now

🎯 **Ready to use features:**

1. **Message Relay**: Send `@base hello from mobile` to route messages to the "base" station
2. **Node Discovery**: Shows `[From 1234567890 (StationName)]` with human-readable names  
3. **Help System**: Send `@instructions` to get available commands
4. **Node List**: Send `@nodes` to see all discovered stations
5. **Echo Test**: Send `@echo test message` to verify the system is working

🔧 **Current limitations:**

- Only works within a single mesh network (no internet bridging yet)
- Requires USB-connected Meshtastic device
- Manual station setup (no auto-discovery between distant networks)

## What's Coming in Phase 2

🚀 **Internet bridging features** (see `PHASE2-TODO.md` for full roadmap):

- ✅ **MIB-002 Station Configuration System** - JSON config, RSA key management, CLI commands
- 🚧 **MIB-003 Discovery Service Client** - Encrypted peer discovery and registration
- 🚧 **MIB-004 P2P Communication Module** - Direct encrypted communication between stations
- 🚧 **MIB-005 Cryptography Module** - AES encryption and secure message handling
- 🚧 **MIB-006 Message Bridge Handler** - Route messages between mesh and internet
- 🚧 **MIB-007 Docker Deployment** - Container setup for Raspberry Pi deployment

## Project Structure

```text
├── encryptedmeshlink.ts # ✅ Main EncryptedMeshLink application  
├── src/                 # ✅ Core application modules (WORKING)
│   ├── transport.ts     # ✅ Meshtastic device communication
│   ├── relayHandler.ts  # ✅ Message relay and processing
│   ├── nodeManager.ts   # ✅ Node tracking and management
│   ├── messageParser.ts # ✅ Command parsing and routing
│   ├── configCLI.ts     # ✅ Configuration CLI commands
│   └── config/          # ✅ Station configuration system (MIB-002)
│       ├── types.ts     # ✅ TypeScript interfaces and types
│       ├── manager.ts   # ✅ Configuration file management
│       ├── validator.ts # ✅ Configuration validation
│       ├── keyManager.ts # ✅ RSA key generation and management
│       ├── env.ts       # ✅ Environment variable management
│       └── index.ts     # ✅ Module exports
├── findPort.ts          # ✅ USB device detection and scoring
├── package.json         # ✅ Dependencies and scripts
├── tsconfig.json        # ✅ TypeScript configuration
├── PHASE2-TODO.md       # 🚧 Internet bridge feature roadmap (16 tickets)
├── docker-architecture/ # 🚧 Docker deployment system (PLANNED)
│   ├── development/     # 🚧 Multi-container dev environment
│   ├── production/      # 🚧 Raspberry Pi deployment configs  
│   ├── networking/      # 🚧 Network architecture docs
│   └── monitoring/      # 🚧 Basic logging and health checks
└── README.md           # 📖 This file
```

**Legend:** ✅ Working | 🚧 Planned | 📖 Documentation

## Dependencies

- `@meshtastic/core` - Official Meshtastic JavaScript core library
- `@meshtastic/protobufs` - Official Meshtastic protocol definitions
- `serialport` - Node.js serial port communication
- `typescript` + `tsx` - TypeScript support and modern development
- `dotenv` - Environment variable management for configuration
- `jest` - Testing framework with 109 comprehensive tests

## Example Output

```text
🔍 Looking for Meshtastic device...
✅ Auto-selected: /dev/tty.usbmodem21101
🚀 Connected to device, setting up event listeners...
🌉 EncryptedMeshLink station initialized: mobile-van-001
🔐 Generated RSA keypair for secure communications
🌐 Connecting to discovery service...
📡 Station ready for mesh-to-internet bridging!

📨 Received message from 1234567890: "@base hello from mobile"
� Looking up target: base
✅ Found target station: base-station-001  
🌉 Routing message via internet bridge...
🔐 Message encrypted and forwarded to discovery service
📬 Message delivered successfully
```

## License

ISC
