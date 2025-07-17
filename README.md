# EncryptedMeshLink

A powerful internet bridge system for Meshtastic mesh networks with encrypted P2P discovery and direct message relay capabilities.

## 🚀 Quick Start - One Command Setup

### Primary Installation (RECOMMENDED) 🌟

**Fast setup with pre-built Docker images - works on all platforms:**

```bash
curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/setup.sh | bash
```

This installer provides:

- ✅ **Fast Installation** - Downloads pre-built images (2-3 minutes vs 20+ minute builds!)
- ✅ **Auto-Detection** - Automatically detects Pi vs x86_64 and configures appropriately
- ✅ **Docker Management** - Installs Docker and Docker Compose if needed
- ✅ **Instant Start** - Application running immediately after install
- ✅ **Management Tools** - Built-in control script for status, logs, updates
- ✅ **Platform Optimized** - Pi gets memory limits, x86_64 gets full resources
- ✅ **No Build Time** - Uses pre-built images from GitHub Container Registry

**Perfect for all users - especially Pi users who don't want to wait 20 minutes for builds!**

### Manual Installation (Advanced Users)

**For users who want full control:**

```bash
cd ~
git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
cd EncryptedMeshLink

# For Raspberry Pi (prebuilt images):
docker-compose -f docker-compose.pi-prebuilt.yml up -d

# For x86_64 Linux:
docker-compose up -d
```

This manual approach:

- ✅ **No system modifications** - just clones repo and starts containers  
- ✅ **Works perfectly over SSH** - no interactive prompts
- ✅ **Full user control** - you manage everything
- ✅ **Simple and predictable** - standard Docker workflow

### Alternative: Pi Quick Install (Legacy)

⚠️ **Note: This method is slower and may have issues**

```bash
curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-install-pi.sh | bash
```

This legacy installer:
- ❌ **May build locally** on some configurations (20+ minutes)
- ❌ **Can get stuck** on system upgrade prompts via SSH
- ✅ **Has auto-updates** and advanced monitoring
- ❌ **Not recommended** unless you specifically need the auto-update features

**Use the primary setup.sh installer instead!**

**Basic setup without auto-updates:**

```bash
curl -fsSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/setup | bash
```

This basic installer provides:

- ✅ **Install Docker automatically** (if not present)
- ✅ **Download pre-built images** (2-3 minutes vs 20+ minute builds)
- ✅ **Configure everything** with working defaults
- ✅ **Generate unique RSA keys** for secure P2P communication
- ✅ **Start the service** immediately
- ✅ **Show logs and status** when complete

**Perfect for beta testing and development!**

## Current Status 🎉

### ✅ Core Features (Complete)

- 📡 **Local Mesh Relay** - Routes messages within mesh using `@{identifier}` format
- 🔍 **USB Auto-Detection** - Finds and connects to Meshtastic devices automatically  
- 👥 **Node Management** - Tracks and resolves node names for human-readable messaging
- 💬 **Enhanced Commands** - `"status"` shows bridge info, `"nodes"` lists actual node names
- 🔧 **Robust Error Handling** - Graceful PKI timeout management and auto-recovery
- 🏗️ **Modular Architecture** - Clean TypeScript implementation with separation of concerns

### ✅ Advanced Features (Complete)

- ✅ **Station Configuration** - JSON config with RSA keys and validation
- ✅ **Discovery Service** - PHP service ready for deployment to your hosting
- ✅ **Discovery Client** - TypeScript client for service communication
- ✅ **Enhanced Relay Handler** - Internet bridging with Node Registry integration
- ✅ **Node Registry Bridge** - Cross-station node tracking and visibility
- ✅ **Direct P2P Messaging** - Real-time TCP/WebSocket communication between stations
- ✅ **Bridge Protocol** - Complete message specification with ACK/NACK handling
- 🚧 **Message Queue System** - SQLite infrastructure complete, store-and-forward integration pending
- ✅ **Bidirectional Communication** - Auto-responses, message deduplication, case-insensitive node matching
- ✅ **Encrypted P2P** - RSA + AES encrypted communication between stations
- ✅ **Security First** - Zero-knowledge discovery server, end-to-end encryption
- ✅ **Docker Deployment** - One-command setup with pre-built images
- ✅ **Code Quality** - **247 tests passing** across 15 test suites, production-ready modular architecture

### 🌍 Discovery Service Deployment

- **Discovery Service**: `https://your-domain.com/api/discovery.php` *(Deploy to your hosting)*
- **Health Check**: `https://your-domain.com/api/discovery.php?health=true`
- **Rate Limiting**: 30 requests/minute per IP with automatic cleanup
- **Database**: SQLite with WAL mode, indexed for performance
- **Hosting**: Compatible with shared hosting (PHP 7.4+, SQLite3)

**Note**: The discovery service is for peer discovery only. Direct P2P message relay uses TCP/WebSocket connections.

## What Works Right Now - Complete System! 🚀

🎯 **Implemented features:**

1. **Direct P2P Messaging**: Stations communicate directly via TCP/WebSocket with encrypted channels
2. **Bidirectional Auto-responses**: Send `@rAlpha hello` and get automatic responses from remote nodes
3. **Message Deduplication**: Intelligent duplicate message filtering prevents spam
4. **Node Discovery**: Shows `[From 1234567890 (StationName)]` with human-readable names  
5. **Enhanced Commands**: Send `"status"` for bridge info, `"nodes"` to see actual node names
6. **Case-insensitive Matching**: `@ralpha`, `@rAlpha`, and `@RALPHA` all work
7. **Discovery Service**: PHP service ready for deployment to your hosting
8. **Node Registry**: Cross-station node tracking with comprehensive validation
9. **Message Queue Infrastructure**: SQLite-based system ready for store-and-forward messaging
10. **Complete Test Coverage**: 247 tests passing across 15 comprehensive test suites

🔧 **System Architecture**:

- **Discovery**: PHP service for peer discovery (IP addresses never stored in plaintext)
- **Messaging**: Direct P2P TCP/WebSocket connections with end-to-end encryption
- **Security**: RSA + AES hybrid encryption, zero-knowledge discovery architecture
- **Queue**: Local SQLite for offline message storage and delivery tracking
- **Testing**: Complete test suite with integration, unit, and P2P communication tests

## Requirements

- **For Users (Recommended)**: Linux system (Raspberry Pi OS, Ubuntu, etc.)
- **For Developers**: Node.js (v18 LTS or higher), TypeScript 5.8+
- Meshtastic device connected via USB
- PHP 7.4+ hosting (for discovery service)

## Installation & Setup

### Docker Deployment (Recommended)

#### What It Sets Up

```bash
~/encryptedmeshlink/           # Project directory
├── docker-compose.yml         # Service configuration
├── config/                    # Your station config (customize here)
├── data/                      # Message queue and state
└── logs/                      # Application logs
```

#### Managing Your Station

```bash
cd ~/encryptedmeshlink

# View live logs
docker-compose logs -f

# Check service status  
docker-compose ps

# Restart service
docker-compose restart

# Stop service
docker-compose down

# Update to latest version
docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest
docker-compose up -d
```

### Manual Docker Setup

If you prefer manual Docker setup:

```bash
# Pull the image
docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest

# Run with basic setup
docker run -d \
  --name eml-station \
  --restart unless-stopped \
  -p 8447:8447 -p 3000:3000 \
  --device /dev/ttyUSB0 \
  --privileged \
  -v ~/encryptedmeshlink/config:/app/config \
  -v ~/encryptedmeshlink/data:/app/data \
  ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest
```

### Development Setup

```bash
# Clone and install dependencies
git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
cd EncryptedMeshLink
npm install

# Start development environment with auto-restart
npm run dev:watch

# Single run for testing
npm run encryptedmeshlink
```

## Configuration Management

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

## Project Structure

```text
├── encryptedmeshlink.ts # ✅ Main EncryptedMeshLink application  
├── src/                 # ✅ Core application modules
│   ├── transport.ts     # ✅ Meshtastic device communication
│   ├── relayHandler.ts  # ✅ Message relay and processing
│   ├── nodeManager.ts   # ✅ Node tracking and management
│   ├── messageParser.ts # ✅ Command parsing and routing
│   ├── configCLI.ts     # ✅ Configuration CLI commands
│   ├── crypto.ts        # ✅ Cryptography module with P2P encryption
│   ├── discoveryClient.ts # ✅ Discovery service client
│   ├── enhancedRelayHandler.ts # ✅ Internet bridge handler
│   ├── messageQueue/    # ✅ SQLite message persistence system
│   │   ├── index.ts     # ✅ Main MessageQueue class
│   │   ├── database.ts  # ✅ SQLite database initialization
│   │   ├── enqueue.ts   # ✅ Message queuing operations
│   │   ├── dequeue.ts   # ✅ Message retrieval operations
│   │   ├── status.ts    # ✅ Message status management
│   │   ├── cleanup.ts   # ✅ Expired message cleanup
│   │   ├── stats.ts     # ✅ Queue statistics
│   │   ├── timer.ts     # ✅ Cleanup timer management
│   │   └── types.ts     # ✅ MessageQueue type definitions
│   ├── config/          # ✅ Station configuration system
│   │   ├── types.ts     # ✅ TypeScript interfaces and types
│   │   ├── manager.ts   # ✅ Configuration file management
│   │   ├── validator.ts # ✅ Configuration validation
│   │   ├── keyManager.ts # ✅ RSA key generation and management
│   │   ├── env.ts       # ✅ Environment variable management
│   │   └── index.ts     # ✅ Module exports
│   ├── bridge/          # ✅ Bridge protocol system
│   │   └── protocol.ts  # ✅ Message format and validation
│   ├── p2p/             # ✅ Direct P2P messaging system
│   │   ├── transport.ts # ✅ P2P transport layer
│   │   ├── connectionManager.ts # ✅ Connection management
│   │   ├── types.ts     # ✅ P2P type definitions
│   │   └── client.ts    # ✅ P2P bridge client
│   └── nodeRegistry/    # ✅ Node registry bridge
│       ├── bridge.ts    # ✅ Cross-station node tracking
│       └── types.ts     # ✅ Registry type definitions
├── findPort.ts          # ✅ USB device detection and scoring
├── discovery-service/   # ✅ Complete PHP discovery service
│   └── discovery.php    # ✅ Single-file PHP service with SQLite (ready for deployment)
├── tests/               # ✅ Comprehensive test suite (247 tests across 15 suites)
│   ├── *.test.ts        # ✅ TypeScript test files
│   └── setup.ts         # ✅ Test configuration
├── docker-entrypoint.sh # ✅ Docker container initialization
├── Dockerfile.pi        # ✅ Raspberry Pi optimized Docker image
├── package.json         # ✅ Dependencies and scripts
├── tsconfig.json        # ✅ TypeScript configuration
└── README.md           # 📖 This file
```

**Legend:** ✅ Complete | 📖 Documentation

## Dependencies

- `@meshtastic/core` - Official Meshtastic JavaScript core library
- `@meshtastic/protobufs` - Official Meshtastic protocol definitions
- `serialport` - Node.js serial port communication
- `typescript` + `tsx` - TypeScript support and modern development
- `dotenv` - Environment variable management for configuration
- `jest` - Testing framework with comprehensive test coverage
- `better-sqlite3` - SQLite database for message persistence
- `ws` - WebSocket server/client for P2P communication

## Raspberry Pi Management & Troubleshooting

### Pi-Specific Optimizations

The Pi installation includes hardware-specific optimizations:

- **Memory Management**: 1GB limit with 512MB reservation (vs 512MB default)
- **Discovery Timeouts**: 60-second timeout (vs 30s default) for stable connections
- **Health Checks**: 120-second intervals with enhanced retry logic
- **Resource Monitoring**: Built-in CPU and memory usage tracking
- **Heartbeat Analysis**: Real-time monitoring of discovery service connectivity

### Management Commands

After installation, use the management script for Pi operations:

```bash
# Check comprehensive status and health
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh health

# Monitor heartbeat status in real-time
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh heartbeat-monitor

# Restart with optimized settings
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh restart

# View live logs
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh logs --follow

# Check auto-update status
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh status
```

### Troubleshooting Heartbeat Issues

If experiencing periodic heartbeat failures:

1. **Check current health status**:
   ```bash
   sudo /opt/encryptedmeshlink/scripts/pi-manager.sh health
   ```

2. **Monitor failures in real-time**:
   ```bash
   sudo /opt/encryptedmeshlink/scripts/pi-manager.sh heartbeat-monitor
   ```

3. **Optimize configuration**:
   ```bash
   sudo /opt/encryptedmeshlink/scripts/pi-manager.sh optimize
   ```

For detailed troubleshooting, see:
- [PI-TROUBLESHOOTING.md](PI-TROUBLESHOOTING.md) - Complete diagnostic guide
- [PI-OPTIMIZATION-SUMMARY.md](PI-OPTIMIZATION-SUMMARY.md) - Performance improvements

## Development

### Code Quality

- **TypeScript-only codebase** - No JavaScript files in source
- **247 passing tests** - Comprehensive test coverage across 15 test suites
- **Modern tooling** - Uses `tsx` for fast TypeScript execution
- **Clean architecture** - Modular design with separation of concerns
- **Production ready** - Comprehensive error handling and validation

## License

[License details here]

## Contributing

[Contributing guidelines here]

## Support

For help and support:

- GitHub Issues: [Report bugs or request features](https://github.com/kiisu-dsalyss/EncryptedMeshLink/issues)
- Documentation: Check the README and code comments
- Discord/Community: [Community links if available]

---

**EncryptedMeshLink** - Bridging Meshtastic networks with encrypted P2P communication
