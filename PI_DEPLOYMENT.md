# Raspberry Pi Deployment Guide

## Quick Setup for Testing

### 1. Prepare the Pi
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Reboot to apply docker group
sudo reboot
```

### 2. Clone and Deploy
```bash
# Clone the repo
git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
cd EncryptedMeshLink

# Use Pi-specific docker compose
docker-compose -f docker-compose.pi.yml up --build -d
```

### 3. Monitor Deployment
```bash
# Watch logs
docker-compose -f docker-compose.pi.yml logs -f

# Check auto-update system
docker exec eml-pi-station npx tsx encryptedmeshlink.ts --status

# View deployment status
docker exec eml-pi-station ls -la /app/deployment/
```

## Production Features

✅ **A/B Deployment**: Zero-downtime updates with automatic rollback  
✅ **Auto-Update**: Hourly git pulls with health checks  
✅ **Hardware Detection**: Full USB device scanning and selection  
✅ **Health Monitoring**: Automatic restart on failures  
✅ **Persistent Storage**: Data, config, and logs preserved across updates  

## Troubleshooting

### Check USB Devices
```bash
# On Pi - list USB devices
lsusb
ls -la /dev/ttyUSB* /dev/ttyACM*

# Inside container - verify device access
docker exec eml-pi-station ls -la /dev/tty*
```

### Manual Deployment Test
```bash
# Force an update cycle
docker exec eml-pi-station npx tsx src/deployment/updateScheduler.ts

# Check git status
docker exec eml-pi-station git status
docker exec eml-pi-station git log --oneline -5
```

### Reset Deployment
```bash
# Clean slate
docker-compose -f docker-compose.pi.yml down -v
docker system prune -f
docker-compose -f docker-compose.pi.yml up --build -d
```
