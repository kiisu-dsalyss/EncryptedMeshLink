# 🍓 Pi Setup Checklist

## SD Card Preparation
- [ ] Download latest Raspberry Pi OS Lite (64-bit recommended)
- [ ] Use Raspberry Pi Imager to flash SD card
- [ ] Enable SSH in imager settings
- [ ] Set username/password in imager settings
- [ ] Configure WiFi in imager settings (if needed)

## Hardware Setup
- [ ] Insert SD card into Pi
- [ ] Connect Meshtastic device via USB
- [ ] Connect Pi to network (Ethernet or WiFi)
- [ ] Power on Pi

## Initial Pi Configuration
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Enable SSH (if not already enabled)
sudo systemctl enable ssh
sudo systemctl start ssh

# Check USB devices
lsusb
ls -la /dev/ttyUSB* /dev/ttyACM*
```

## Deploy EncryptedMeshLink
```bash
# One-command deployment
curl -fsSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/deploy-pi.sh | bash

# Or manual deployment
git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
cd EncryptedMeshLink
./deploy-pi.sh
```

## Verify Deployment
```bash
# Check container status
docker-compose -f docker-compose.pi.yml ps

# Watch logs
docker-compose -f docker-compose.pi.yml logs -f

# Check USB device detection
docker exec eml-pi-station npx tsx findPort.ts

# Test application
docker exec eml-pi-station npx tsx encryptedmeshlink.ts --status
```

## Post-Deployment
- [ ] Verify auto-update system is running
- [ ] Check Meshtastic device connectivity
- [ ] Confirm web interface accessible (port 3000)
- [ ] Set up port forwarding if needed
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerts

## Network Access
- **Web Interface**: `http://PI_IP_ADDRESS:3000`
- **Mesh Bridge**: Port `8447`
- **SSH Access**: Standard port `22`

## Troubleshooting
```bash
# Container not starting
docker-compose -f docker-compose.pi.yml restart

# USB device issues
sudo lsusb
sudo dmesg | grep -i usb

# Reset deployment
docker-compose -f docker-compose.pi.yml down -v
./deploy-pi.sh

# Check resources
docker stats
free -h
df -h
```

## Production Optimizations
- [ ] Set up log rotation
- [ ] Configure system monitoring
- [ ] Set up backup strategy
- [ ] Enable unattended upgrades
- [ ] Configure UFW firewall

---

**🎉 Once deployed, your Pi will automatically:**
- Pull updates every hour from GitHub
- Deploy new versions with zero downtime
- Rollback automatically on failures
- Detect and connect to Meshtastic devices
- Provide web interface for monitoring
