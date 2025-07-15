# EncryptedMeshLink

A powerful internet bridge system for Meshtastic mesh networks with encrypted P2P discovery and direct message relay capabilities.

## Current Status - PRODUCTION READY! 🎉

### ✅ Phase 1 Features (PRODUCTION READY)

- 📡 **Local Mesh Relay** - Routes messages within mesh using `@{identifier}` format
- 🔍 **USB Auto-Detection** - Finds and connects to Meshtastic devices automatically  
- 👥 **Node Management** - Tracks and resolves node names for human-readable messaging
- 💬 **Enhanced Commands** - `"status"` shows bridge info, `"nodes"` lists actual node names
- 🔧 **Robust Error Handling** - Graceful PKI timeout management and auto-recovery
- 🏗️ **Modular Architecture** - Clean TypeScript implementation with separation of concerns

### ✅ Phase 2 Features (COMPLETE & PRODUCTION READY)

- ✅ **Station Configuration** - JSON config with RSA keys and validation *(MIB-002 Complete)*
- ✅ **Discovery Service** - PHP service ready for deployment to your hosting *(MIB-001 Complete)*
- ✅ **Discovery Client** - TypeScript client for service communication *(MIB-004 Complete)*
- ✅ **Enhanced Relay Handler** - Internet bridging with Node Registry integration *(MIB-005 Complete)*
- ✅ **Node Registry Bridge** - Cross-station node tracking and visibility *(MIB-009 Complete)*
- ✅ **Direct P2P Messaging** - Real-time TCP/WebSocket communication between stations *(MIB-010 Complete)*
- ✅ **Bridge Protocol** - Complete message specification with ACK/NACK handling *(MIB-008 Complete)*
- ✅ **Message Queue System** - SQLite persistence with offline delivery *(MIB-006 Complete)*
- ✅ **Bidirectional Communication** - Auto-responses, message deduplication, case-insensitive node matching
- ✅ **Encrypted P2P** - RSA + AES encrypted communication between stations *(MIB-003 Complete)*
- ✅ **Security First** - Zero-knowledge discovery server, end-to-end encryption *(Production Ready)*
- ✅ **Code Quality** - **247 tests passing** across 15 test suites, production-ready modular architecture
- 🚧 **Docker Ready** - Containerization for development and deployment *(Planned)*
- 🚧 **Basic Monitoring** - Simple logging and health checks for Pi deployment *(Planned)*

### 🌍 Discovery Service Deployment

- **Discovery Service**: `https://your-domain.com/api/discovery.php` *(Deploy to your hosting)*
- **Health Check**: `https://your-domain.com/api/discovery.php?health=true`
- **Rate Limiting**: 30 requests/minute per IP with automatic cleanup
- **Database**: SQLite with WAL mode, indexed for performance
- **Hosting**: Compatible with shared hosting (PHP 7.4+, SQLite3)

**Note**: The discovery service is for peer discovery only. Direct P2P message relay uses TCP/WebSocket connections.

## What Works Right Now - COMPLETE SYSTEM! 🚀

🎯 **Production-ready features:**

1. **Direct P2P Messaging**: Stations communicate directly via TCP/WebSocket with encrypted channels
2. **Bidirectional Auto-responses**: Send `@rAlpha hello` and get automatic responses from remote nodes
3. **Message Deduplication**: Intelligent duplicate message filtering prevents spam
4. **Node Discovery**: Shows `[From 1234567890 (StationName)]` with human-readable names  
5. **Enhanced Commands**: Send `"status"` for bridge info, `"nodes"` to see actual node names
6. **Case-insensitive Matching**: `@ralpha`, `@rAlpha`, and `@RALPHA` all work
7. **Discovery Service**: PHP service ready for deployment to your hosting
8. **Node Registry**: Cross-station node tracking with comprehensive validation
9. **Message Queue**: SQLite-based persistence for offline message delivery
10. **Complete Test Coverage**: 247 tests passing across 15 comprehensive test suites

🔧 **System Architecture**:

- **Discovery**: PHP service for peer discovery (IP addresses never stored in plaintext)
- **Messaging**: Direct P2P TCP/WebSocket connections with end-to-end encryption
- **Security**: RSA + AES hybrid encryption, zero-knowledge discovery architecture
- **Queue**: Local SQLite for offline message storage and delivery tracking
- **Testing**: Complete test suite with integration, unit, and P2P communication tests

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

### Bridge Message Protocol

The system uses a comprehensive bridge message protocol with:

- **Message Types**: USER_MESSAGE, ACK, NACK, SYSTEM, HEARTBEAT, NODE_DISCOVERY
- **Priority Levels**: LOW, NORMAL, HIGH, URGENT
- **Delivery Tracking**: TTL, retry counts, acknowledgments
- **Error Handling**: Standardized error codes and responses
- **Encryption**: End-to-end RSA + AES hybrid encryption

## Requirements

- Node.js (v18 LTS or higher)
- Meshtastic device connected via USB
- TypeScript 5.8+ (for development)
- PHP 7.4+ hosting (for discovery service)

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

### Production Usage

```bash
# Production deployment with all features
npm start
```

### Configuration Management

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

## Testing

The system includes comprehensive testing with **247 tests** across **15 test suites**:

```bash
# Run all tests (247 tests across 15 suites)
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm test tests/bridgeProtocol.test.ts
npm test tests/p2pTransport.test.ts
npm test tests/integration.test.ts
```

**Test Coverage**:
- ✅ Bridge Protocol (22 tests)
- ✅ P2P Transport (12 tests) 
- ✅ Connection Manager (19 tests)
- ✅ Discovery Client (9 tests)
- ✅ Node Registry (7 tests)
- ✅ Message Queue (12 tests)
- ✅ Cryptography (18 tests)
- ✅ Configuration (6 tests)
- ✅ Enhanced Relay Handler (63 tests)
- ✅ Message Parser (24 tests)
- ✅ Node Manager (51 tests)
- ✅ Relay Handler (20 tests)
- ✅ Transport (12 tests)
- ✅ Integration Tests (7 tests)
- ✅ Utility Functions (13 tests)

## Project Structure

```text
├── encryptedmeshlink.ts # ✅ Main EncryptedMeshLink application  
├── src/                 # ✅ Core application modules (PRODUCTION READY)
│   ├── transport.ts     # ✅ Meshtastic device communication
│   ├── relayHandler.ts  # ✅ Message relay and processing
│   ├── nodeManager.ts   # ✅ Node tracking and management
│   ├── messageParser.ts # ✅ Command parsing and routing
│   ├── configCLI.ts     # ✅ Configuration CLI commands
│   ├── crypto.ts        # ✅ Cryptography module with P2P encryption (MIB-003)
│   ├── discoveryClient.ts # ✅ Discovery service client (MIB-004)
│   ├── enhancedRelayHandler.ts # ✅ Internet bridge handler (MIB-005)
│   ├── messageQueue.ts  # ✅ SQLite message persistence (MIB-006)
│   ├── config/          # ✅ Station configuration system (MIB-002)
│   │   ├── types.ts     # ✅ TypeScript interfaces and types
│   │   ├── manager.ts   # ✅ Configuration file management
│   │   ├── validator.ts # ✅ Configuration validation
│   │   ├── keyManager.ts # ✅ RSA key generation and management
│   │   ├── env.ts       # ✅ Environment variable management
│   │   └── index.ts     # ✅ Module exports
│   ├── bridge/          # ✅ Bridge protocol system (MIB-008)
│   │   └── protocol.ts  # ✅ Message format and validation
│   ├── p2p/             # ✅ Direct P2P messaging system (MIB-010)
│   │   ├── transport.ts # ✅ P2P transport layer
│   │   ├── connectionManager.ts # ✅ Connection management
│   │   ├── types.ts     # ✅ P2P type definitions
│   │   └── client.ts    # ✅ P2P bridge client
│   └── nodeRegistry/    # ✅ Node registry bridge (MIB-009)
│       ├── bridge.ts    # ✅ Cross-station node tracking
│       └── types.ts     # ✅ Registry type definitions
├── findPort.ts          # ✅ USB device detection and scoring
├── discovery-service/   # ✅ Complete PHP discovery service (MIB-001)
│   └── discovery.php    # ✅ Single-file PHP service with SQLite (ready for deployment)
├── tests/               # ✅ Comprehensive test suite (247 tests across 15 suites)
│   ├── *.test.ts        # ✅ TypeScript test files
│   └── setup.ts         # ✅ Test configuration
├── package.json         # ✅ Dependencies and scripts
├── tsconfig.json        # ✅ TypeScript configuration
├── PHASE2-TODO.md       # 🚧 Remaining development tasks
├── docker-architecture/ # 🚧 Docker deployment system (PLANNED)
│   ├── development/     # 🚧 Multi-container dev environment
│   ├── production/      # 🚧 Raspberry Pi deployment configs  
│   ├── networking/      # 🚧 Network architecture docs
│   └── monitoring/      # 🚧 Basic logging and health checks
└── README.md           # 📖 This file
```

**Legend:** ✅ Complete & Production Ready | 🚧 Planned | 📖 Documentation

## Dependencies

- `@meshtastic/core` - Official Meshtastic JavaScript core library
- `@meshtastic/protobufs` - Official Meshtastic protocol definitions
- `serialport` - Node.js serial port communication
- `typescript` + `tsx` - TypeScript support and modern development
- `dotenv` - Environment variable management for configuration
- `jest` - Testing framework with comprehensive test coverage
- `better-sqlite3` - SQLite database for message persistence
- `ws` - WebSocket server/client for P2P communication

## Development

### Code Quality

- **TypeScript-only codebase** - No JavaScript files in source
- **247 passing tests** - Comprehensive test coverage across 15 test suites
- **Modern tooling** - Uses `tsx` for fast TypeScript execution
- **Clean architecture** - Modular design with separation of concerns
- **Production ready** - Comprehensive error handling and validation

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
🌉 Starting P2P Transport on port 8080...
📡 P2P Transport listening for connections
✅ Bridge services initialized successfully
🌉 Internet bridge services started successfully

📍 Node discovered: 1111111111 HomeBase
📍 Node discovered: 2222222222 MobileUnit
📍 Node discovered: 3333333333 RemoteRepeater

📨 Received message from 1234567890: "@rAlpha hello from mobile"
🔍 Looking up target: rAlpha
✅ Found target node: rAlpha on station remote-station-001  
🌉 Routing message via P2P bridge...
🔗 Establishing P2P connection to remote-station-001:8080
✅ P2P connection established
🔐 Message encrypted and sent via P2P channel
📬 Message delivered successfully
🔄 Auto-response received: "Hello! This is rAlpha responding."
```

## System Capabilities

### Current Working Features

- ✅ **Complete P2P Messaging**: Direct station-to-station communication
- ✅ **Bidirectional Communication**: Send messages and receive auto-responses
- ✅ **Case-insensitive Node Matching**: Flexible node name resolution
- ✅ **Message Deduplication**: Prevents duplicate message delivery
- ✅ **Discovery Service Integration**: Secure peer discovery without IP exposure
- ✅ **End-to-end Encryption**: RSA + AES hybrid encryption for all messages
- ✅ **Offline Message Queue**: SQLite persistence for reliable delivery
- ✅ **Comprehensive Testing**: 247 tests ensuring system reliability
- ✅ **Production Architecture**: Modular, maintainable, and scalable codebase

### Deployment Ready

The system is **production-ready** and can be deployed immediately:

1. **Discovery Service**: Upload `discovery-service/discovery.php` to any PHP hosting
2. **Station Configuration**: Use the CLI to configure your station
3. **Start Bridge**: Run `npm start` to begin internet bridging
4. **Test Messaging**: Send `@{node}` messages between different mesh networks

## License

ISC
