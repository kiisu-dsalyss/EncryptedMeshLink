#!/bin/bash

# EncryptedMeshLink Pi Update Manager
# Manual update control and troubleshooting tools

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

INSTALL_DIR="$HOME/EncryptedMeshLink"
SERVICE_NAME="encryptedmeshlink"

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

show_help() {
    echo "EncryptedMeshLink Pi Update Manager"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status                    Show current status and version"
    echo "  update [--force]          Check and apply updates"
    echo "  restart                   Restart the service"
    echo "  logs [--follow]           Show logs"
    echo "  health                    Detailed health check"
    echo "  reset                     Complete reset and rebuild"
    echo "  auto-update [on|off]      Enable/disable auto-updates"
    echo "  backup                    Create backup of current setup"
    echo "  restore [backup-name]     Restore from backup"
    echo ""
    echo "Options:"
    echo "  --force                   Force update even if up-to-date"
    echo "  --follow                  Follow logs in real-time"
    echo "  --branch BRANCH           Switch to different branch"
    echo ""
    echo "Examples:"
    echo "  $0 status                 # Show current status"
    echo "  $0 update --force         # Force update"
    echo "  $0 logs --follow          # Watch logs live"
    echo "  $0 auto-update off        # Disable auto-updates"
}

check_installation() {
    if [ ! -d "$INSTALL_DIR" ]; then
        print_error "EncryptedMeshLink not found at $INSTALL_DIR"
        echo "Run the installer first: curl -sSL https://github.com/kiisu-dsalyss/EncryptedMeshLink/raw/master/install-pi.sh | bash"
        exit 1
    fi
    cd "$INSTALL_DIR"
}

show_status() {
    print_info "EncryptedMeshLink Status Report"
    echo "================================"
    
    # Service status
    if docker ps | grep -q "eml-pi-station"; then
        print_status "Service: Running"
        
        # Container health
        HEALTH=$(docker inspect eml-pi-station --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        if [ "$HEALTH" = "healthy" ]; then
            print_status "Health: $HEALTH"
        else
            print_warning "Health: $HEALTH"
        fi
        
        # Uptime
        STARTED=$(docker inspect eml-pi-station --format='{{.State.StartedAt}}' 2>/dev/null)
        echo "🕒 Started: $STARTED"
        
    else
        print_error "Service: Not Running"
    fi
    
    # Version info
    CURRENT_COMMIT=$(git rev-parse HEAD | cut -c1-7)
    CURRENT_BRANCH=$(git branch --show-current)
    echo "📍 Version: $CURRENT_COMMIT ($CURRENT_BRANCH)"
    
    # Update status
    git fetch origin >/dev/null 2>&1
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$CURRENT_BRANCH)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        print_status "Updates: Up to date"
    else
        BEHIND=$(git rev-list --count HEAD..origin/$CURRENT_BRANCH)
        print_warning "Updates: $BEHIND commit(s) behind"
    fi
    
    # Auto-update status
    if docker exec eml-pi-station env | grep -q "ENCRYPTEDMESHLINK_AUTO_UPDATE=true" 2>/dev/null; then
        INTERVAL=$(docker exec eml-pi-station env | grep "ENCRYPTEDMESHLINK_UPDATE_INTERVAL_HOURS" | cut -d'=' -f2 2>/dev/null || echo "1")
        print_status "Auto-Updates: Enabled (every ${INTERVAL}h)"
    else
        print_warning "Auto-Updates: Disabled"
    fi
    
    # Resource usage
    if command -v docker >/dev/null && docker ps | grep -q "eml-pi-station"; then
        echo ""
        print_info "Resource Usage:"
        docker stats eml-pi-station --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | tail -1 | while read cpu mem net; do
            echo "💻 CPU: $cpu"
            echo "🧠 Memory: $mem"
            echo "🌐 Network: $net"
        done
    fi
}

perform_update() {
    local force_update=false
    
    if [ "$1" = "--force" ]; then
        force_update=true
        shift
    fi
    
    print_info "Checking for updates..."
    
    # Fetch latest changes
    git fetch origin
    
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$(git branch --show-current))
    
    if [ "$LOCAL" = "$REMOTE" ] && [ "$force_update" = false ]; then
        print_status "Already up to date"
        return 0
    fi
    
    if [ "$force_update" = true ]; then
        print_info "Force update requested"
    else
        BEHIND=$(git rev-list --count HEAD..origin/$(git branch --show-current))
        print_info "Found $BEHIND new commit(s)"
    fi
    
    # Create backup before update
    print_info "Creating backup..."
    BACKUP_NAME="auto-$(date +%Y%m%d-%H%M%S)"
    docker-compose -f docker-compose.pi.yml down
    
    # Pull latest changes
    print_info "Pulling latest changes..."
    git pull origin $(git branch --show-current)
    
    # Rebuild and restart
    print_info "Rebuilding and restarting..."
    docker-compose -f docker-compose.pi.yml up --build -d
    
    # Wait for startup
    print_info "Waiting for service to start..."
    sleep 15
    
    # Verify update
    if docker ps | grep -q "eml-pi-station"; then
        NEW_COMMIT=$(git rev-parse HEAD | cut -c1-7)
        print_status "Update successful! New version: $NEW_COMMIT"
        
        # Log the successful update
        mkdir -p logs/updates
        echo "$(date): SUCCESS - Updated to $NEW_COMMIT" >> logs/updates/update-status.log
    else
        print_error "Update failed - service not running"
        echo "Check logs with: docker-compose -f docker-compose.pi.yml logs"
        return 1
    fi
}

show_logs() {
    local follow_logs=false
    
    if [ "$1" = "--follow" ]; then
        follow_logs=true
    fi
    
    if [ "$follow_logs" = true ]; then
        print_info "Following logs (Ctrl+C to stop)..."
        docker logs eml-pi-station -f
    else
        print_info "Recent logs:"
        docker logs eml-pi-station --tail 50
    fi
}

health_check() {
    print_info "Detailed Health Check"
    echo "====================="
    
    # Docker status
    if command -v docker >/dev/null; then
        print_status "Docker: Available"
    else
        print_error "Docker: Not installed"
        return 1
    fi
    
    # Container status
    if docker ps | grep -q "eml-pi-station"; then
        print_status "Container: Running"
        
        # Health check
        HEALTH=$(docker inspect eml-pi-station --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        case $HEALTH in
            healthy)
                print_status "Health: $HEALTH"
                ;;
            unhealthy)
                print_error "Health: $HEALTH"
                docker inspect eml-pi-station --format='{{range .State.Health.Log}}{{.Output}}{{end}}' | tail -1
                ;;
            *)
                print_warning "Health: $HEALTH"
                ;;
        esac
    else
        print_error "Container: Not running"
    fi
    
    # USB devices
    print_info "USB Devices:"
    if ls /dev/ttyUSB* /dev/ttyACM* 1> /dev/null 2>&1; then
        ls -la /dev/ttyUSB* /dev/ttyACM* 2>/dev/null | head -5
    else
        print_warning "No USB serial devices found"
    fi
    
    # Disk space
    print_info "Disk Space:"
    df -h . | tail -1 | awk '{print "💾 Available: " $4 " (Used: " $5 ")"}'
    
    # Memory
    print_info "Memory:"
    free -h | grep Mem | awk '{print "🧠 Available: " $7 " (Used: " $3 ")"}'
}

restart_service() {
    print_info "Restarting EncryptedMeshLink..."
    
    docker-compose -f docker-compose.pi.yml restart
    
    print_info "Waiting for service to start..."
    sleep 10
    
    if docker ps | grep -q "eml-pi-station"; then
        print_status "Service restarted successfully"
    else
        print_error "Service failed to restart"
        return 1
    fi
}

reset_service() {
    print_warning "This will completely reset the installation"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        return 0
    fi
    
    print_info "Stopping services..."
    docker-compose -f docker-compose.pi.yml down -v
    
    print_info "Removing old images..."
    docker image prune -f
    
    print_info "Rebuilding from scratch..."
    docker-compose -f docker-compose.pi.yml up --build -d
    
    print_status "Reset complete"
}

toggle_auto_update() {
    local action="$1"
    
    case $action in
        on|enable)
            print_info "Enabling auto-updates..."
            sed -i 's/ENCRYPTEDMESHLINK_AUTO_UPDATE=false/ENCRYPTEDMESHLINK_AUTO_UPDATE=true/' .env.pi 2>/dev/null || true
            docker-compose -f docker-compose.pi.yml up -d
            print_status "Auto-updates enabled"
            ;;
        off|disable)
            print_info "Disabling auto-updates..."
            sed -i 's/ENCRYPTEDMESHLINK_AUTO_UPDATE=true/ENCRYPTEDMESHLINK_AUTO_UPDATE=false/' .env.pi 2>/dev/null || true
            docker-compose -f docker-compose.pi.yml up -d
            print_status "Auto-updates disabled"
            ;;
        *)
            print_error "Usage: $0 auto-update [on|off]"
            return 1
            ;;
    esac
}

# Main script logic
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Check installation first
check_installation

case "$1" in
    status)
        show_status
        ;;
    update)
        shift
        perform_update "$@"
        ;;
    restart)
        restart_service
        ;;
    logs)
        shift
        show_logs "$@"
        ;;
    health)
        health_check
        ;;
    reset)
        reset_service
        ;;
    auto-update)
        shift
        toggle_auto_update "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
