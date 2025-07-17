# EncryptedMeshLink - Raspberry Pi Quick Start

## 🚀 One-Command Install

For Raspberry Pi users, just run this single command:

```bash
curl -fsSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/scripts/quick-deploy-pi.sh | bash
```

That's it! The script will:
- ✅ Install Docker (if needed)
- 📦 Download the pre-built image (~100MB)  
- 🔧 Set up the configuration
- 🚀 Start the service
- 📋 Show you the status

**No 20-minute build times!** 🎉

## 📋 Requirements

- Raspberry Pi (3B+ or newer recommended)
- Raspberry Pi OS (Bullseye or newer)
- Meshtastic device connected via USB
- Internet connection for initial setup

## 🔧 Manual Installation

If you prefer manual control:

```bash
# 1. Create project directory
mkdir ~/encryptedmeshlink && cd ~/encryptedmeshlink

# 2. Download configuration
curl -O https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/docker-compose.pi.yml

# 3. Pull and start
docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest
docker-compose -f docker-compose.pi.yml up -d
```

## 📊 Useful Commands

```bash
cd ~/encryptedmeshlink

# View live logs
docker-compose logs -f

# Check status
docker-compose ps

# Restart service
docker-compose restart

# Stop service
docker-compose down

# Update to latest version
docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest
docker-compose up -d
```

## 🔍 Troubleshooting

### No Meshtastic Device Found
```bash
# Check if device is detected
ls /dev/ttyUSB* /dev/ttyACM*

# Check Docker logs
docker-compose logs -f
```

### Service Won't Start
```bash
# Check system resources
free -h
df -h

# Restart Docker service
sudo systemctl restart docker

# Try manual container run
docker run --rm -it --privileged ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest
```

## 🆕 Updates

Updates are automatic! Just pull the latest image:

```bash
cd ~/encryptedmeshlink
docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest
docker-compose up -d
```

The GitHub Actions automatically build new images when code is updated.

## 🐛 Beta Testing Notes

This is beta software! Please report issues with:
- 📋 Docker logs: `docker-compose logs`
- 🖥️ System info: `uname -a && free -h`
- 📡 Device info: `ls -la /dev/tty*`

## 📚 More Info

- [Full Documentation](../README.md)
- [Configuration Guide](../docs/configuration.md)
- [Troubleshooting](../docs/troubleshooting.md)
