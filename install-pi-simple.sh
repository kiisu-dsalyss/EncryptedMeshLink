#!/bin/bash

# EncryptedMeshLink Simple Pi Installer
# Minimal setup that avoids system-level complications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_BRANCH="master"
INSTALL_DIR="$HOME/EncryptedMeshLink"

echo -e "${BLUE}🍓 EncryptedMeshLink Simple Pi Installer${NC}"
echo "============================================="
echo ""
echo "This installer will:"
echo "  ✅ Clone the repository to your home directory"
echo "  ✅ Install Docker if needed (without system upgrades)"
echo "  ✅ Set up the Pi-optimized configuration"
echo "  ✅ Start the application"
echo ""
echo "⚠️  Note: We skip system updates to avoid interactive prompts"
echo "    You can run 'sudo apt update && sudo apt upgrade' manually later"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root (no sudo)"
    exit 1
fi

# Check architecture
ARCH=$(uname -m)
case $ARCH in
    aarch64|arm64)
        print_status "ARM64 architecture detected"
        ;;
    armv7l)
        print_status "ARMv7 architecture detected"
        ;;
    *)
        print_error "Unsupported architecture: $ARCH"
        echo "   This script is for Raspberry Pi (ARM) devices only"
        exit 1
        ;;
esac

# Parse command line arguments
BRANCH="$DEFAULT_BRANCH"

while [[ $# -gt 0 ]]; do
    case $1 in
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --branch BRANCH    Git branch to use (default: master)"
            echo "  --help, -h         Show this help message"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_info "Installation settings:"
echo "  Branch: $BRANCH"
echo "  Install directory: $INSTALL_DIR"
echo ""

# Remove existing installation if present
if [ -d "$INSTALL_DIR" ]; then
    print_warning "Existing installation found, removing..."
    rm -rf "$INSTALL_DIR"
fi

# Install essential packages only (no upgrades to avoid prompts)
print_info "Installing essential packages..."
sudo apt update -qq
sudo apt install -y git curl wget jq

# Check for Docker
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    
    # Start Docker service
    sudo systemctl enable docker
    sudo systemctl start docker
    
    print_status "Docker installed successfully"
else
    print_status "Docker already installed"
fi

# Check for Docker Compose
print_info "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    print_info "Installing Docker Compose..."
    sudo apt install -y docker-compose
    print_status "Docker Compose installed"
else
    print_status "Docker Compose already installed"
fi

# Clone repository
print_info "Cloning EncryptedMeshLink repository..."
git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ "$BRANCH" != "master" ]; then
    print_info "Switching to branch: $BRANCH"
    git checkout "$BRANCH"
fi

print_status "Repository cloned successfully"

# Set up configuration
print_info "Setting up Pi-optimized configuration..."

# Create .env file with Pi-optimized settings
cat > .env << 'EOF'
# Pi-Optimized EncryptedMeshLink Configuration
NODE_ENV=production

# Memory and Performance Settings
MEMORY_LIMIT=1g
MEMORY_RESERVATION=512m
CPU_LIMIT=1.0
CPU_RESERVATION=0.5

# Timeout Settings (increased for Pi)
DISCOVERY_TIMEOUT=60000
HEARTBEAT_INTERVAL=30000
HEALTH_CHECK_INTERVAL=120000

# Logging
LOG_LEVEL=info

# Auto-restart on failure
RESTART_POLICY=unless-stopped
EOF

print_status "Configuration created"

# Create simple management script
print_info "Creating management script..."
mkdir -p scripts

cat > scripts/pi-control.sh << 'EOF'
#!/bin/bash

# Simple Pi Control Script for EncryptedMeshLink

INSTALL_DIR="$HOME/EncryptedMeshLink"
cd "$INSTALL_DIR"

case "${1:-status}" in
    start)
        echo "🚀 Starting EncryptedMeshLink..."
        docker-compose -f docker-compose.pi.yml up -d
        echo "✅ Started! Check status with: $0 status"
        ;;
    stop)
        echo "🛑 Stopping EncryptedMeshLink..."
        docker-compose -f docker-compose.pi.yml down
        echo "✅ Stopped"
        ;;
    restart)
        echo "🔄 Restarting EncryptedMeshLink..."
        docker-compose -f docker-compose.pi.yml restart
        echo "✅ Restarted"
        ;;
    status)
        echo "📊 EncryptedMeshLink Status:"
        echo "=========================="
        docker-compose -f docker-compose.pi.yml ps
        echo ""
        echo "💾 Memory Usage:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -2
        ;;
    logs)
        echo "📋 Recent logs:"
        docker-compose -f docker-compose.pi.yml logs --tail=50 "${2:-}"
        ;;
    logs-follow)
        echo "📋 Following logs (Ctrl+C to exit):"
        docker-compose -f docker-compose.pi.yml logs --follow "${2:-}"
        ;;
    update)
        echo "🔄 Updating EncryptedMeshLink..."
        git pull
        docker-compose -f docker-compose.pi.yml pull
        docker-compose -f docker-compose.pi.yml up -d
        echo "✅ Updated and restarted"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|logs-follow|update}"
        echo ""
        echo "Commands:"
        echo "  start        - Start the application"
        echo "  stop         - Stop the application"
        echo "  restart      - Restart the application"
        echo "  status       - Show status and resource usage"
        echo "  logs         - Show recent logs"
        echo "  logs-follow  - Follow logs in real-time"
        echo "  update       - Update and restart"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs-follow"
        echo "  $0 update"
        ;;
esac
EOF

chmod +x scripts/pi-control.sh
print_status "Management script created: ~/EncryptedMeshLink/scripts/pi-control.sh"

# Start the application
print_info "Starting EncryptedMeshLink..."

# Give Docker group permission time to take effect if we just installed it
if ! docker ps &> /dev/null; then
    print_warning "Need to refresh group permissions for Docker"
    print_info "Starting application with sudo (first run only)..."
    sudo docker-compose -f docker-compose.pi.yml up -d
else
    docker-compose -f docker-compose.pi.yml up -d
fi

# Wait a moment for startup
sleep 3

print_status "EncryptedMeshLink started successfully!"
echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo "📁 Installation location: $INSTALL_DIR"
echo ""
echo "🔧 Quick commands:"
echo "   cd ~/EncryptedMeshLink"
echo "   ./scripts/pi-control.sh status    # Check status"
echo "   ./scripts/pi-control.sh logs      # View logs"
echo "   ./scripts/pi-control.sh stop      # Stop application"
echo "   ./scripts/pi-control.sh update    # Update application"
echo ""
echo "📊 Check status now:"
echo "   cd ~/EncryptedMeshLink && ./scripts/pi-control.sh status"
echo ""

if ! docker ps &> /dev/null; then
    print_warning "Docker group permissions:"
    echo "   Log out and back in, or run: newgrp docker"
    echo "   Then you can use Docker without sudo"
fi

print_info "Happy meshing! 🌐"
