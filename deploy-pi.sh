#!/bin/bash

# EncryptedMeshLink Raspberry Pi Deployment Script
# Run this on your Pi to set up the complete deployment system

set -e

echo "🍓 EncryptedMeshLink Pi Deployment Starting..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root (no sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🔧 Installing Docker Compose..."
    sudo apt install docker-compose -y
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Clone or update repo
if [ -d "EncryptedMeshLink" ]; then
    echo "🔄 Updating existing repository..."
    cd EncryptedMeshLink
    git pull origin master
else
    echo "📥 Cloning repository..."
    git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
    cd EncryptedMeshLink
fi

# Check for USB devices
echo "🔍 Checking for Meshtastic devices..."
if ls /dev/ttyUSB* /dev/ttyACM* 1> /dev/null 2>&1; then
    echo "✅ USB devices found:"
    ls -la /dev/ttyUSB* /dev/ttyACM* 2>/dev/null | head -5
else
    echo "⚠️  No USB devices found - make sure your Meshtastic device is connected"
    echo "   You can still deploy and add devices later"
fi

# Build and deploy
echo "🚀 Building and deploying EncryptedMeshLink..."
docker-compose -f docker-compose.pi.yml down 2>/dev/null || true
docker-compose -f docker-compose.pi.yml up --build -d

# Wait for startup
echo "⏳ Waiting for service to start..."
sleep 10

# Check status
echo "📊 Deployment Status:"
docker-compose -f docker-compose.pi.yml ps

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📍 Next Steps:"
echo "   • Monitor logs: docker-compose -f docker-compose.pi.yml logs -f"
echo "   • Check status: docker exec eml-pi-station npx tsx encryptedmeshlink.ts --status"
echo "   • Web interface: http://$(hostname -I | awk '{print $1}'):3000"
echo "   • Auto-updates: Every hour from master branch"
echo ""
echo "🔧 Troubleshooting:"
echo "   • USB devices: docker exec eml-pi-station ls -la /dev/tty*"
echo "   • Force update: docker exec eml-pi-station npx tsx src/deployment/updateScheduler.ts"
echo "   • Reset: docker-compose -f docker-compose.pi.yml down -v && ./deploy-pi.sh"
echo ""

# Check if reboot needed (for docker group)
if ! docker ps &> /dev/null; then
    echo "⚠️  Reboot required to activate Docker group membership"
    echo "   Run: sudo reboot"
    echo "   Then re-run this script"
fi
