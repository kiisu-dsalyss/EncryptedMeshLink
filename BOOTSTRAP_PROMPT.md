# VoidBridge Project Bootstrap Prompt

Copy and paste this prompt when opening the VoidBridge project in a new VS Code session to get GitHub Copilot up to speed instantly.

---

## Project Context Prompt

```
You are working on VoidBridge, a sophisticated internet bridge system for Meshtastic mesh networks. This project enables distant Meshtastic stations to communicate via encrypted P2P connections over the internet.

## Current Project Status

### Phase 1 (COMPLETED ✅)
- **Working modular echo/relay system** with TypeScript
- **Clean architecture** with separate modules:
  - `voidbridge.ts` - Main application entry point
  - `src/transport.ts` - Meshtastic USB device communication
  - `src/relayHandler.ts` - Message processing with @{identifier} routing
  - `src/nodeManager.ts` - Node tracking and name resolution  
  - `src/messageParser.ts` - Command parsing and validation
- **Message relay functionality** - "@base hello" routes to base station
- **Node name resolution** - Shows "[From 1234567890 (StationName)]" format
- **Instructions feature** - Responds to "@instructions" with help text
- **Robust error handling** - Graceful PKI timeout management

### Phase 2 (PLANNED 📋)
- **Internet Bridge System** with 16 detailed tickets in PHASE2-TODO.md
- **Encrypted P2P Discovery** via PHP service on shared hosting
- **RSA + AES Encryption** for zero-knowledge peer discovery
- **Docker Containerization** for development and Raspberry Pi deployment
- **Comprehensive monitoring** with Prometheus/Grafana stack

## Project Architecture

### Core Files
- `voidbridge.ts` - Main application with device detection and initialization
- `package.json` - Dependencies: @meshtastic/core, @meshtastic/protobufs, serialport
- `findPort.ts` - USB device auto-detection with manufacturer scoring
- `PHASE2-TODO.md` - Complete roadmap with Jira-style tickets (MIB-001 through MIB-016)

### Source Structure
```
src/
├── transport.ts      # TransportNodeSerial class for USB communication
├── relayHandler.ts   # Message processing with sender name lookup
├── nodeManager.ts    # Node tracking and known nodes management
└── messageParser.ts  # Command parsing for @{identifier} routing
```

### Docker Architecture (Complete but not implemented)
```
docker-architecture/
├── development/      # Multi-container dev environment with discovery service
├── production/       # Raspberry Pi deployment configurations
├── networking/       # Network topology and P2P protocol documentation
└── monitoring/       # Prometheus/Grafana/Fluent Bit observability stack
```

## Key Features Working Now
1. **Auto USB Detection** - Finds and scores Meshtastic devices automatically
2. **Message Relay** - "@base hello from mobile" → routes to base station via discovery
3. **Node Resolution** - Shows human-readable names: "[From 1234567890 (MobileVan)]"
4. **Instructions** - "@instructions" returns help text with available commands
5. **Error Resilience** - Handles PKI timeouts gracefully without crashing

## Usage Commands
```bash
npm run dev:watch     # Development with auto-restart
npm run voidbridge    # Single run
npm run dev          # TypeScript development mode
```

## Phase 2 Next Steps
The next major milestone is implementing MIB-001 (PHP Discovery Service) to enable internet bridging between distant stations. The architecture is fully planned with:
- Encrypted contact info exchange (AES-256-GCM)
- RSA key exchange for secure P2P connections
- SQLite message queuing for offline storage
- Docker deployment for development and Raspberry Pi production

## Development Context
- **Language**: TypeScript with official Meshtastic libraries
- **Architecture**: Modular, clean separation of concerns
- **Error Handling**: Robust with graceful degradation
- **Logging**: Detailed console output with emojis for status
- **Security**: Designed for zero-knowledge discovery and E2E encryption

## Debugging Notes
- PKI timeouts are expected and handled gracefully
- Node name resolution requires device connection and node discovery
- Message relay works with any @{identifier} format
- Transport layer auto-reconnects on USB issues

Use this context to help with development, debugging, architecture decisions, and implementing Phase 2 features.
```

---

## Quick Commands Reference

```bash
# Development
npm run dev:watch          # Auto-restart development
npm run voidbridge         # Single run

# Docker (when implemented)
docker-compose -f docker-architecture/development/docker-compose.dev.yml up -d

# View roadmap
cat PHASE2-TODO.md | head -50

# Check project structure
tree -I node_modules
```

## Important Files to Review
1. `PHASE2-TODO.md` - Complete feature roadmap
2. `docker-architecture/README.md` - System architecture overview
3. `src/relayHandler.ts` - Core message processing logic
4. `docker-architecture/networking/README.md` - Network design
