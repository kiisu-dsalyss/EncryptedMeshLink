# 🐳 EncryptedMeshLink Docker Deployment

Production-ready Docker deployment system with A/B updates and hardware integration.

## 🚀 Quick Start

### Raspberry Pi (Recommended)
```bash
# One-command deployment
curl -fsSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/deploy-pi.sh | bash
```

### Manual Pi Deployment
```bash
git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
cd EncryptedMeshLink
./deploy-pi.sh
```

### Linux Server
```bash
git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
cd EncryptedMeshLink
docker-compose up --build -d
```

## 🏗️ System Architecture

### A/B Deployment
- **Zero-downtime updates** with automatic rollback
- **Health checks** validate deployments before switching
- **Staging/Production isolation** prevents corrupted updates

### Auto-Update System
- **Hourly git pulls** from master branch
- **Automatic testing** before deployment
- **Rollback protection** on health check failures

### Hardware Integration
- **USB device detection** for Meshtastic hardware
- **Cross-platform support** (Pi, Linux)
- **Device scoring system** for automatic selection

## 📁 File Structure

```
├── Dockerfile              # Standard Linux deployment
├── Dockerfile.pi           # Raspberry Pi optimized
├── docker-compose.yml      # Standard deployment config
├── docker-compose.pi.yml   # Pi-specific config
├── deploy-pi.sh            # Pi deployment script
├── src/deployment/         # A/B deployment modules
│   ├── abDeployment.ts     # Core A/B switching logic
│   ├── updateScheduler.ts  # Hourly update scheduler
│   ├── gitPull.ts          # Git operations
│   ├── healthCheck.ts      # Health validation
│   └── execPromise.ts      # Shell command wrapper
└── src/hardware/           # Hardware detection
    └── deviceDetection.ts  # USB device scanning
```

## ⚙️ Configuration

### Environment Variables
```bash
NODE_ENV=production                          # Production mode
ENCRYPTEDMESHLINK_AUTO_UPDATE=true          # Enable auto-updates
ENCRYPTEDMESHLINK_UPDATE_INTERVAL_HOURS=1   # Update frequency
ENCRYPTEDMESHLINK_UPDATE_BRANCH=master      # Git branch to track
EML_LOCAL_TESTING=false                     # Disable test mode
```

### Volume Mounts
```yaml
volumes:
  - ./config:/app/config                              # Configuration files
  - ./data:/app/data                                  # Application data
  - ./logs:/app/logs                                  # Log files
  - ./.git:/app/.git:ro                               # Git repo (read-only)
  - deployment-staging:/app/deployment/staging        # A/B staging
  - deployment-production:/app/deployment/production  # A/B production
  - deployment-backup:/app/deployment/backup          # A/B backup
```

### Device Access
```yaml
# Pi/Linux USB device mapping
devices:
  - /dev/ttyUSB0:/dev/ttyUSB0
  - /dev/ttyACM0:/dev/ttyACM0

# Privileged mode for hardware access
privileged: true
```

## 📊 Monitoring

### Check Status
```bash
# Container status
docker-compose -f docker-compose.pi.yml ps

# Application status
docker exec eml-pi-station npx tsx encryptedmeshlink.ts --status

# Auto-update status
docker exec eml-pi-station npx tsx src/deployment/updateScheduler.ts
```

### View Logs
```bash
# Real-time logs
docker-compose -f docker-compose.pi.yml logs -f

# Deployment logs
docker exec eml-pi-station cat /app/logs/deployment.log

# Application logs
docker exec eml-pi-station cat /app/logs/application.log
```

### Force Operations
```bash
# Force update check
docker exec eml-pi-station npx tsx src/deployment/updateScheduler.ts

# Manual A/B deployment
docker exec eml-pi-station npx tsx src/deployment/abDeployment.ts

# Check git status
docker exec eml-pi-station git status
```

## 🔧 Troubleshooting

### USB Device Issues
```bash
# Check host devices
ls -la /dev/ttyUSB* /dev/ttyACM*

# Check container devices
docker exec eml-pi-station ls -la /dev/tty*

# Test device access
docker exec eml-pi-station npx tsx findPort.ts
```

### Deployment Issues
```bash
# Reset deployment state
docker exec eml-pi-station rm -rf /app/deployment/*

# Force clean deployment
docker-compose -f docker-compose.pi.yml down -v
docker-compose -f docker-compose.pi.yml up --build -d

# Check deployment directories
docker exec eml-pi-station ls -la /app/deployment/
```

### Performance Issues
```bash
# Check resource usage
docker stats eml-pi-station

# Check memory limits
docker exec eml-pi-station cat /proc/meminfo

# Restart with clean state
docker-compose -f docker-compose.pi.yml restart
```

## 🛠️ Development

### Local Testing
```bash
# Build without cache
docker-compose build --no-cache

# Run with debug output
docker-compose up --build

# Interactive shell
docker exec -it eml-pi-station /bin/bash
```

### Health Check Testing
```bash
# Manual health check
docker exec eml-pi-station npx tsx encryptedmeshlink.ts --health-check

# Test deployment health validation
docker exec eml-pi-station npx tsx src/deployment/healthCheck.ts
```

## 🔒 Security

- **Read-only git mount** prevents container modifications
- **Isolated deployment directories** protect production code
- **Health check validation** prevents bad deployments
- **Automatic rollback** on failure detection
- **Limited container privileges** where possible

## ⚡ Performance

### Raspberry Pi Optimizations
- **Memory limits**: 512MB max allocation
- **Longer timeouts**: 60s health checks
- **ARM-optimized** base images
- **Reduced dependency** installations

### Resource Limits
```yaml
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

## 🎯 Production Checklist

- ✅ **Pi OS Setup**: Fresh Raspberry Pi OS installation
- ✅ **SSH Access**: Remote management capability
- ✅ **USB Devices**: Meshtastic hardware connected
- ✅ **Network**: Stable internet connection
- ✅ **Storage**: Adequate SD card space (16GB+)
- ✅ **Auto-Updates**: Enabled for security patches
