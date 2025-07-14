# Docker Architecture Overview

This folder contains all Docker-related technical specifications, configurations, and documentation for the Meshtastic Internet Bridge System.

## Folder Structure

```
docker-architecture/
├── README.md                    # This file - overview and index
├── development/
│   ├── docker-compose.dev.yml  # Development environment
│   ├── Dockerfile.station       # Station container
│   ├── Dockerfile.discovery     # Discovery service container
│   ├── Dockerfile.simulator     # Meshtastic device simulator
│   └── setup.md                # Development setup guide
├── production/
│   ├── docker-compose.pi.yml   # Raspberry Pi deployment
│   ├── Dockerfile.pi           # Production Pi container
│   ├── deployment.md           # Production deployment guide
│   └── update-strategy.md      # Update and rollback procedures
├── networking/
│   ├── network-simulation.md   # Network testing strategies
│   ├── nat-traversal.md        # NAT and firewall handling
│   └── security.md            # Container security practices
└── monitoring/
    ├── health-checks.md        # Container health monitoring
    ├── logging.md              # Logging strategy and setup
    └── metrics.md              # Performance monitoring
```

## Quick Start

### Development Environment
```bash
# Start multi-station development environment
cd docker-architecture/development
docker-compose -f docker-compose.dev.yml up -d

# View logs from all stations
docker-compose -f docker-compose.dev.yml logs -f
```

### Production Deployment
```bash
# Deploy to Raspberry Pi
cd docker-architecture/production
./deploy.sh station-config.env
```

## Key Concepts

### Multi-Container Development
- **Station Containers**: Simulated Meshtastic bridge stations
- **Discovery Service**: PHP-based encrypted peer discovery
- **Network Simulation**: Controlled network conditions for testing
- **Device Simulation**: Mock Meshtastic devices for testing

### Production Deployment
- **Single Container per Pi**: One bridge station per Raspberry Pi
- **Hardware Integration**: USB device access for Meshtastic radios
- **Persistent Storage**: Volumes for configuration, keys, and message queues
- **Network Integration**: Host networking for P2P connections

### Security Features
- **Non-root execution**: All containers run as unprivileged users
- **Encrypted volumes**: Sensitive data encryption at rest
- **Network isolation**: Controlled inter-container communication
- **Secret management**: Secure key and credential handling

## Related Documentation

- [PHASE2-TODO.md](../PHASE2-TODO.md) - Main project tickets and roadmap
- [development/setup.md](development/setup.md) - Detailed development setup
- [production/deployment.md](production/deployment.md) - Production deployment guide
- [networking/security.md](networking/security.md) - Security best practices

## Architecture Benefits

### Development
- **Consistent Environment**: Identical setup across all developers
- **Easy Testing**: Multi-station scenarios in isolated containers
- **Rapid Iteration**: Hot reload and instant container rebuilds
- **Network Simulation**: Test failure scenarios and edge cases

### Production
- **Simple Deployment**: Single container per Raspberry Pi
- **Easy Updates**: Pull new images and restart containers
- **Reliable Operation**: Automatic restarts and health monitoring
- **Portable Configuration**: Environment-based configuration management

## Getting Started

1. **Development Setup**: Follow [development/setup.md](development/setup.md)
2. **Review Architecture**: Read through the technical specifications
3. **Start Development**: Use the multi-container development environment
4. **Deploy Production**: Follow [production/deployment.md](production/deployment.md)

For questions or issues, see the troubleshooting sections in each guide or refer to the main project documentation.
