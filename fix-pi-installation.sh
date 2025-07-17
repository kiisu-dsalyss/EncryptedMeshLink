#!/bin/bash

# Fix Pi Installation - Switch to Optimized Docker Compose
# Run this on your Pi to switch from docker-compose.yml to docker-compose.pi.yml

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Fixing Pi Installation: Switching to Optimized Configuration${NC}"
echo ""

# Find the installation directory
INSTALL_DIR=""
if [ -d "/home/admin/encryptedmeshlink" ]; then
    INSTALL_DIR="/home/admin/encryptedmeshlink"
elif [ -d "/opt/encryptedmeshlink" ]; then
    INSTALL_DIR="/opt/encryptedmeshlink"
elif [ -d "$(pwd)/encryptedmeshlink" ]; then
    INSTALL_DIR="$(pwd)/encryptedmeshlink"
else
    echo -e "${RED}❌ Could not find EncryptedMeshLink installation directory${NC}"
    echo "Please run this script from your installation directory or specify the path:"
    echo "  cd /path/to/encryptedmeshlink && bash fix-pi-installation.sh"
    exit 1
fi

echo -e "${BLUE}📁 Found installation: $INSTALL_DIR${NC}"
cd "$INSTALL_DIR"

# Check for Pi compose file
if [ ! -f "docker-compose.pi.yml" ]; then
    echo -e "${YELLOW}⚠️  docker-compose.pi.yml not found, pulling latest version...${NC}"
    git pull origin master || {
        echo -e "${RED}❌ Failed to pull latest changes. Please update manually.${NC}"
        exit 1
    }
fi

# Stop current service (using any compose file)
echo -e "${BLUE}🛑 Stopping current service...${NC}"
docker-compose down 2>/dev/null || true
docker compose down 2>/dev/null || true

# Clean up any orphaned containers
echo -e "${BLUE}🧹 Cleaning up...${NC}"
docker system prune -f >/dev/null 2>&1 || true

# Start with Pi-optimized configuration
echo -e "${BLUE}🚀 Starting with Pi-optimized configuration...${NC}"
docker-compose -f docker-compose.pi.yml up --build -d

# Wait for startup
echo -e "${BLUE}⏳ Waiting for service to initialize...${NC}"
sleep 20

# Check status
echo -e "${BLUE}🔍 Checking service status...${NC}"
if docker ps | grep -q "eml-pi-station"; then
    echo -e "${GREEN}✅ Service is running with Pi-optimized configuration${NC}"
    
    # Show resource usage
    echo -e "${BLUE}📊 Resource allocation:${NC}"
    docker stats eml-pi-station --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    # Show configuration
    echo ""
    echo -e "${GREEN}🎯 Pi Optimizations Active:${NC}"
    echo "   • Memory limit: 1GB (was 512MB)"
    echo "   • CPU limit: 1.0 core with 0.5 core reserved"
    echo "   • Discovery timeout: 60s (was 30s)"
    echo "   • Health check interval: 120s (was 60s)"
    echo "   • Health check timeout: 60s (was 30s)"
    echo ""
    
    # Check recent logs for heartbeat issues
    echo -e "${BLUE}💓 Checking for recent heartbeat failures...${NC}"
    recent_failures=$(docker logs eml-pi-station --since="10m" 2>/dev/null | grep -c "heartbeat.*fail\|HTTP 5[0-9][0-9]\|timeout" || echo "0")
    if [ "$recent_failures" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $recent_failures heartbeat-related issues in last 10 minutes${NC}"
        echo "   This is normal during startup - monitor for improvements"
    else
        echo -e "${GREEN}✅ No recent heartbeat failures detected${NC}"
    fi
    
else
    echo -e "${RED}❌ Service failed to start${NC}"
    echo ""
    echo "Check logs with:"
    echo "  docker logs eml-pi-station"
    echo "  docker-compose -f docker-compose.pi.yml logs"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Pi installation fixed!${NC}"
echo ""
echo -e "${BLUE}📋 Useful commands:${NC}"
echo "   View logs:        docker logs eml-pi-station -f"
echo "   Check status:     docker ps"
echo "   Monitor health:   $INSTALL_DIR/scripts/pi-manager.sh health"
echo "   Monitor heartbeat: $INSTALL_DIR/scripts/pi-manager.sh heartbeat-monitor"
echo "   Restart service:  docker-compose -f docker-compose.pi.yml restart"
echo ""
echo -e "${BLUE}🌐 Web interface:${NC} http://$(hostname -I | awk '{print $1}'):3000"
