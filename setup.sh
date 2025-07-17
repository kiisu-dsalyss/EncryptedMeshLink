#!/bin/bash

# EncryptedMeshLink Setup Script
# Primary installation method with pre-built Docker images
# Usage: curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/setup.sh | bash

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

echo -e "${BLUE}🌐 EncryptedMeshLink Setup${NC}"
echo "=========================="
echo ""
echo "This installer will:"
echo "  ✅ Download pre-built Docker images (fast!)"
echo "  ✅ Clone repository for configuration"
echo "  ✅ Install Docker if needed"
echo "  ✅ Start the application immediately"
echo ""
echo -e "${GREEN}⚡ Uses pre-built images - no 20 minute build process!${NC}"
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

# Parse command line arguments
BRANCH="$DEFAULT_BRANCH"
PLATFORM="auto"

while [[ $# -gt 0 ]]; do
    case $1 in
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --branch BRANCH     Git branch to use (default: master)"
            echo "  --platform TYPE     Platform type: pi, linux, auto (default: auto)"
            echo "  --help, -h          Show this help message"
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

# Detect platform if auto
if [ "$PLATFORM" = "auto" ]; then
    ARCH=$(uname -m)
    if [[ "$ARCH" =~ ^(aarch64|arm64|armv7l)$ ]]; then
        PLATFORM="pi"
        print_status "Raspberry Pi detected (ARM architecture)"
    else
        PLATFORM="linux"
        print_status "Linux x86_64 detected"
    fi
fi

print_info "Installation settings:"
echo "  Platform: $PLATFORM"
echo "  Branch: $BRANCH"
echo "  Install directory: $INSTALL_DIR"
echo ""

# Remove existing installation if present
if [ -d "$INSTALL_DIR" ]; then
    print_warning "Existing installation found, removing..."
    rm -rf "$INSTALL_DIR"
fi

# Install essential packages
print_info "Installing essential packages..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y git curl wget jq
elif command -v yum &> /dev/null; then
    sudo yum install -y git curl wget jq
elif command -v pacman &> /dev/null; then
    sudo pacman -S --noconfirm git curl wget jq
else
    print_warning "Unknown package manager. Please install git, curl, wget, jq manually"
fi

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
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    print_info "Installing Docker Compose..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y docker-compose
    else
        # Fallback to binary installation
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
        sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
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

# Set compose file based on platform
if [ "$PLATFORM" = "pi" ]; then
    COMPOSE_FILE="docker-compose.pi-prebuilt.yml"
    print_info "Using Raspberry Pi configuration with prebuilt images"
else
    COMPOSE_FILE="docker-compose.yml"
    print_info "Using standard Linux configuration"
fi

# Pre-pull Docker images
print_info "Downloading pre-built Docker images..."
print_warning "This may take a few minutes depending on your internet connection..."

if ! docker ps &> /dev/null; then
    print_info "Using sudo for Docker commands (first run)..."
    sudo docker-compose -f "$COMPOSE_FILE" pull
else
    docker-compose -f "$COMPOSE_FILE" pull
fi

print_status "Docker images downloaded successfully!"

# Create .env file with optimized settings
print_info "Creating configuration..."
if [ "$PLATFORM" = "pi" ]; then
    cat > .env << 'EOF'
# Pi-Optimized EncryptedMeshLink Configuration
NODE_ENV=production

# Memory and Performance Settings
MEMORY_LIMIT=512m
MEMORY_RESERVATION=256m
CPU_LIMIT=1.0
CPU_RESERVATION=0.5

# Timeout Settings (increased for Pi)
DISCOVERY_TIMEOUT=60000
HEARTBEAT_INTERVAL=30000
HEALTH_CHECK_INTERVAL=60000

# Logging
LOG_LEVEL=info

# Auto-restart on failure
RESTART_POLICY=unless-stopped
EOF
else
    cat > .env << 'EOF'
# EncryptedMeshLink Configuration
NODE_ENV=production

# Performance Settings
MEMORY_LIMIT=1g
MEMORY_RESERVATION=512m

# Standard timeout settings
DISCOVERY_TIMEOUT=30000
HEARTBEAT_INTERVAL=15000
HEALTH_CHECK_INTERVAL=30000

# Logging
LOG_LEVEL=info

# Auto-restart on failure
RESTART_POLICY=unless-stopped
EOF
fi

print_status "Configuration created"

# Create management script
print_info "Creating management script..."
mkdir -p scripts

cat > scripts/eml-control.sh << EOF
#!/bin/bash

# EncryptedMeshLink Control Script

INSTALL_DIR="$INSTALL_DIR"
COMPOSE_FILE="$COMPOSE_FILE"
cd "\$INSTALL_DIR"

case "\${1:-status}" in
    start)
        echo "🚀 Starting EncryptedMeshLink..."
        docker-compose -f "\$COMPOSE_FILE" up -d
        echo "✅ Started! Check status with: \$0 status"
        ;;
    stop)
        echo "🛑 Stopping EncryptedMeshLink..."
        docker-compose -f "\$COMPOSE_FILE" down
        echo "✅ Stopped"
        ;;
    restart)
        echo "🔄 Restarting EncryptedMeshLink..."
        docker-compose -f "\$COMPOSE_FILE" restart
        echo "✅ Restarted"
        ;;
    status)
        echo "📊 EncryptedMeshLink Status:"
        echo "=========================="
        docker-compose -f "\$COMPOSE_FILE" ps
        echo ""
        echo "💾 Resource Usage:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -2
        ;;
    logs)
        echo "📋 Recent logs:"
        docker-compose -f "\$COMPOSE_FILE" logs --tail=50 "\${2:-}"
        ;;
    logs-follow)
        echo "📋 Following logs (Ctrl+C to exit):"
        docker-compose -f "\$COMPOSE_FILE" logs --follow "\${2:-}"
        ;;
    update)
        echo "🔄 Updating EncryptedMeshLink..."
        git pull
        docker-compose -f "\$COMPOSE_FILE" pull
        docker-compose -f "\$COMPOSE_FILE" up -d
        echo "✅ Updated and restarted"
        ;;
    shell)
        echo "🐚 Opening shell in container..."
        docker-compose -f "\$COMPOSE_FILE" exec encryptedmeshlink-${PLATFORM} /bin/bash
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status|logs|logs-follow|update|shell}"
        echo ""
        echo "Commands:"
        echo "  start        - Start the application"
        echo "  stop         - Stop the application"
        echo "  restart      - Restart the application"
        echo "  status       - Show status and resource usage"
        echo "  logs         - Show recent logs"
        echo "  logs-follow  - Follow logs in real-time"
        echo "  update       - Update and restart"
        echo "  shell        - Open shell in container"
        echo ""
        echo "Examples:"
        echo "  \$0 start"
        echo "  \$0 logs-follow"
        echo "  \$0 update"
        ;;
esac
EOF

chmod +x scripts/eml-control.sh
print_status "Management script created: scripts/eml-control.sh"

# Start the application
print_info "Starting EncryptedMeshLink..."

if ! docker ps &> /dev/null; then
    print_warning "Need to refresh group permissions for Docker"
    print_info "Starting application with sudo (first run only)..."
    sudo docker-compose -f "$COMPOSE_FILE" up -d
else
    docker-compose -f "$COMPOSE_FILE" up -d
fi

# Wait a moment for startup
sleep 5

print_status "EncryptedMeshLink started successfully!"
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📁 Installation: $INSTALL_DIR"
echo "⚙️  Platform: $PLATFORM"
echo "🐳 Using prebuilt images (no build time!)"
echo ""
echo "🔧 Quick commands:"
echo "   cd $INSTALL_DIR"
echo "   ./scripts/eml-control.sh status      # Check status"
echo "   ./scripts/eml-control.sh logs        # View logs"
echo "   ./scripts/eml-control.sh logs-follow # Follow logs"
echo "   ./scripts/eml-control.sh restart     # Restart"
echo "   ./scripts/eml-control.sh update      # Update"
echo ""
echo "📊 Check status now:"
cd "$INSTALL_DIR" && ./scripts/eml-control.sh status
echo ""

if ! docker ps &> /dev/null; then
    print_warning "Docker group permissions:"
    echo "   Log out and back in, or run: newgrp docker"
    echo "   Then you can use Docker without sudo"
fi

print_info "Happy meshing! 🌐"
print_info "For support: https://github.com/kiisu-dsalyss/EncryptedMeshLink/issues"
