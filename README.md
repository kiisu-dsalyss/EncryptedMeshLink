# EncryptedMeshLink

A powerful internet bridge system for Meshtastic mesh networks with encrypted P2P discovery and message relay capabilities.

## Current Status

### ✅ Phase 1 Features (WORKING NOW)

- 📡 **Local Mesh Relay** - Routes messages within mesh using `@{identifier}` format
- 🔍 **USB Auto-Detection** - Finds and connects to Meshtastic devices automatically  
- 👥 **Node Management** - Tracks and resolves node names for human-readable messaging
- 💬 **Command Processing** - Handles `@instructions`, `@nodes`, and `@echo` commands
- 🔧 **Robust Error Handling** - Graceful PKI timeout management and auto-recovery
- 🏗️ **Modular Architecture** - Clean TypeScript implementation with separation of concerns

### ✅ Phase 2 Features (LIVE & WORKING)

- ✅ **Station Configuration** - JSON config with RSA keys and validation *(MIB-002 Complete)*
- ✅ **Discovery Service** - PHP service ready for deployment to your hosting *(MIB-001 Complete)*
- ✅ **Discovery Client** - TypeScript client for service communication *(MIB-004 Complete)*
- ✅ **Enhanced Relay Handler** - Internet bridging with enhanced message routing *(MIB-005 Complete)*
- 🔐 **Encrypted P2P** - RSA + AES encrypted communication between stations *(Complete)*
- 🛡️ **Security First** - Zero-knowledge discovery server, end-to-end encryption *(Ready for deployment)*
- 🐳 **Docker Ready** - Containerization for development and deployment *(Planned)*
- 📊 **Basic Monitoring** - Simple logging and health checks for Pi deployment *(Planned)*

### 🌍 Discovery Service Deployment

- **Discovery Service**: `https://your-domain.com/api/discovery.php` *(Deploy to your hosting)*
- **Health Check**: `https://your-domain.com/api/discovery.php?health=true`
- **Rate Limiting**: 30 requests/minute per IP with automatic cleanup
- **Database**: SQLite with WAL mode, indexed for performance
- **Hosting**: Compatible with shared hosting (PHP 7.4+, SQLite3)

## API Reference

### Discovery Service Endpoints

**POST** `/discovery.php` - Register station

```json
{
  "station_id": "my-station-001",
  "encrypted_contact_info": "AES_ENCRYPTED_DATA",
  "public_key": "-----BEGIN PUBLIC KEY-----..."
}
```

**GET** `/discovery.php?peers=true` - Get active peers

```json
{
  "success": true,
  "data": {
    "peers": [...],
    "count": 5,
    "timestamp": 1642123456
  }
}
```

**DELETE** `/discovery.php?station_id=my-station-001` - Unregister station

**GET** `/discovery.php?health=true` - Health check

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "active_stations": 12,
    "php_version": "8.4.10",
    "sqlite_version": "3.45.1"
  }
}
```

## Requirements

- Node.js (v18 LTS or higher)
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
6. **Discovery Service Ready**: PHP service ready for deployment to your hosting
7. **Internet Bridge Ready**: Enhanced relay handler with discovery client integration
8. **Heartbeat System**: Automatic station registration and peer discovery

🔧 **Current limitations:**

- Message queue system needed for offline delivery
- Docker deployment configuration pending

## What's Coming Next

🚀 **Internet bridging completion** (see `PHASE2-TODO.md` for full roadmap):

- ✅ **MIB-001 Discovery Service (PHP)** - Complete encrypted peer discovery service ready for deployment
- ✅ **MIB-002 Station Configuration System** - JSON config, RSA key management, CLI commands
- ✅ **MIB-004 Discovery Client** - TypeScript client for peer discovery and registration
- ✅ **MIB-005 Enhanced Relay Handler** - Internet bridge routing with discovery integration
- ✅ **MIB-003 Cryptography Module** - AES encryption and secure message handling
- 🚧 **MIB-006 Message Queue System** - SQLite message persistence for offline delivery
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
│   ├── crypto.ts        # ✅ Cryptography module with P2P encryption (MIB-003)
│   ├── discoveryClient.ts # ✅ Discovery service client (MIB-004)
│   ├── enhancedRelayHandler.ts # ✅ Internet bridge handler (MIB-005)
│   └── config/          # ✅ Station configuration system (MIB-002)
│       ├── types.ts     # ✅ TypeScript interfaces and types
│       ├── manager.ts   # ✅ Configuration file management
│       ├── validator.ts # ✅ Configuration validation
│       ├── keyManager.ts # ✅ RSA key generation and management
│       ├── env.ts       # ✅ Environment variable management
│       └── index.ts     # ✅ Module exports
├── findPort.ts          # ✅ USB device detection and scoring
├── discovery-service/   # ✅ Complete PHP discovery service (MIB-001)
│   └── discovery.php    # ✅ Single-file PHP service with SQLite (ready for deployment)
├── tests/               # ✅ Comprehensive test suite (132 tests)
│   ├── *.test.ts        # ✅ TypeScript-only test files
│   └── setup.ts         # ✅ Test configuration
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
- `jest` - Testing framework with 132 comprehensive tests

## Development

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

- **TypeScript-only codebase** - No JavaScript files in source
- **132 passing tests** - Comprehensive test coverage including cryptography module
- **Modern tooling** - Uses `tsx` for fast TypeScript execution
- **Clean architecture** - Modular design with separation of concerns

## Example Output

```text
🔍 Looking for Meshtastic device...
✅ Auto-selected: /dev/tty.usbmodem21101
🚀 Connected to device, setting up event listeners...
🌉 Initializing EncryptedMeshLink station...
📱 Station node number: 2345678901
🌍 Starting EncryptedMeshLink Discovery Client for station: my-station-001
🏥 Discovery service healthy - 2 active stations
📝 Station registered successfully
💓 Heartbeat started (300s interval)
🔍 Peer discovery started (300s interval)
✅ Discovery client started successfully
✅ Bridge services initialized successfully
🌉 Internet bridge services started successfully

📍 Node discovered: 1111111111 HomeBase
📍 Node discovered: 2222222222 MobileUnit
📍 Node discovered: 3333333333 RemoteRepeater

📨 Received message from 1234567890: "@base hello from mobile"
🔍 Looking up target: base
✅ Found target station: base-station-001  
🌉 Routing message via internet bridge...
🔐 Message encrypted and forwarded to discovery service
📬 Message delivered successfully
```

## License

ISC
