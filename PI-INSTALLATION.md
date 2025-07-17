# Raspberry Pi Auto-Update Installation

This directory contains the complete auto-update installation system for EncryptedMeshLink on Raspberry Pi devices.

## Quick Install (Recommended)

One-command installation with auto-updates enabled:

```bash
curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-install-pi.sh | bash
```

## Full Installation Options

For more control over the installation:

```bash
# Download the installer
wget https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/install-pi.sh
chmod +x install-pi.sh

# Standard installation with auto-updates
./install-pi.sh

# Custom options
./install-pi.sh --branch develop --update-interval 2
./install-pi.sh --no-auto-update --no-monitoring
```

### Installation Options

| Option | Description | Default |
|--------|-------------|---------|
| `--branch BRANCH` | Git branch to track | `master` |
| `--update-interval HOURS` | Update check interval | `1` hour |
| `--no-auto-update` | Disable automatic updates | Auto-updates enabled |
| `--no-monitoring` | Skip systemd service creation | Monitoring enabled |

## Auto-Update Features

### What Gets Updated Automatically

- ✅ Code updates from the specified Git branch
- ✅ Docker container rebuilds when needed
- ✅ Configuration changes
- ✅ Dependency updates
- ✅ Security patches

### Update Process

1. **Check**: Every hour (configurable), check for new commits
2. **Backup**: Create automatic backup before updating
3. **Pull**: Download latest changes from Git
4. **Build**: Rebuild Docker container if needed
5. **Deploy**: Restart with new version
6. **Verify**: Confirm successful deployment
7. **Log**: Record update status

### Safety Features

- **Zero-downtime updates**: A/B deployment system
- **Automatic rollback**: If update fails, rollback to previous version
- **Health checks**: Verify service health after updates
- **Update logs**: Track all update attempts and results
- **Manual override**: Can disable auto-updates anytime

## Management Commands

After installation, use the management script for control:

```bash
# Check status
~/EncryptedMeshLink/scripts/pi-manager.sh status

# Manual update
~/EncryptedMeshLink/scripts/pi-manager.sh update

# View logs
~/EncryptedMeshLink/scripts/pi-manager.sh logs --follow

# Health check
~/EncryptedMeshLink/scripts/pi-manager.sh health

# Restart service
~/EncryptedMeshLink/scripts/pi-manager.sh restart

# Enable/disable auto-updates
~/EncryptedMeshLink/scripts/pi-manager.sh auto-update off
~/EncryptedMeshLink/scripts/pi-manager.sh auto-update on

# Complete reset
~/EncryptedMeshLink/scripts/pi-manager.sh reset
```

### Quick Status Alias

After installation, restart your shell and use:

```bash
eml-status  # Quick status check
```

## Systemd Integration

The installer creates a systemd service for automatic startup:

```bash
# Service control
sudo systemctl start encryptedmeshlink
sudo systemctl stop encryptedmeshlink
sudo systemctl restart encryptedmeshlink
sudo systemctl status encryptedmeshlink

# Enable/disable auto-start
sudo systemctl enable encryptedmeshlink
sudo systemctl disable encryptedmeshlink
```

## Monitoring & Logs

### Log Locations

- **Container logs**: `docker logs eml-pi-station -f`
- **Update logs**: `~/EncryptedMeshLink/logs/updates/update-status.log`
- **System logs**: `journalctl -u encryptedmeshlink -f`

### Health Monitoring

The system includes comprehensive health monitoring:

- Container health checks every 60 seconds
- Automatic restart on failure
- Resource usage monitoring
- USB device detection
- Network connectivity checks

## Troubleshooting

### Common Issues

1. **Service won't start**: Check USB device permissions

   ```bash
   ls -la /dev/ttyUSB* /dev/ttyACM*
   sudo usermod -aG dialout $USER
   ```

2. **Auto-updates not working**: Check Git permissions

   ```bash
   cd ~/EncryptedMeshLink
   git status
   git pull origin master
   ```

3. **Container build fails**: Clean Docker cache

   ```bash
   docker system prune -f
   ./scripts/pi-manager.sh reset
   ```

4. **High memory usage**: Adjust resource limits

   ```bash
   # Edit docker-compose.pi.yml
   deploy:
     resources:
       limits:
         memory: 256M  # Reduce if needed
   ```

### Recovery Commands

```bash
# Force complete rebuild
cd ~/EncryptedMeshLink
docker-compose -f docker-compose.pi.yml down -v
docker system prune -f
docker-compose -f docker-compose.pi.yml up --build -d

# Reset to fresh install
rm -rf ~/EncryptedMeshLink
curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-install-pi.sh | bash
```

## Advanced Configuration

### Custom Environment Variables

Edit `~/EncryptedMeshLink/.env.pi`:

```bash
# Custom update interval
ENCRYPTEDMESHLINK_UPDATE_INTERVAL_HOURS=6

# Development branch tracking
ENCRYPTEDMESHLINK_UPDATE_BRANCH=develop

# Disable auto-updates
ENCRYPTEDMESHLINK_AUTO_UPDATE=false

# Enable debug logging
ENCRYPTEDMESHLINK_LOG_LEVEL=debug
```

### Branch Switching

```bash
# Switch to development branch
cd ~/EncryptedMeshLink
git checkout develop
./scripts/pi-manager.sh update --force
```

### Manual A/B Deployment

```bash
# Test new version without auto-update
cd ~/EncryptedMeshLink
git fetch origin
npx tsx src/deployment/abDeployment.ts
```

## Security Considerations

### Automatic Updates

- Updates only come from the official GitHub repository
- Git signature verification (if configured)
- Automatic rollback on failure
- No external package managers (only Git and Docker)

### Network Security

- All communication over HTTPS
- No incoming network connections required
- Local discovery service optional
- Encrypted mesh communication

### File Permissions

- Runs as non-root user
- Docker group membership only
- Read-only Git repository access
- Isolated container environment

## Performance Optimization

### Raspberry Pi 3/4 Recommendations

```yaml
# In docker-compose.pi.yml
deploy:
  resources:
    limits:
      memory: 512M      # Adjust based on Pi model
      cpus: '1.0'       # Limit CPU usage
    reservations:
      memory: 256M
      cpus: '0.5'
```

### Storage Management

- Automatic log rotation (50MB max per file, 5 files)
- Docker image cleanup on updates
- Git history pruning (keeps last 100 commits)
- Backup retention (7 days, 5 backups max)

## Migration from Manual Installation

If you have an existing manual installation:

```bash
# Backup current setup
cp -r ~/EncryptedMeshLink ~/EncryptedMeshLink.backup

# Run new installer (will detect and upgrade)
curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-install-pi.sh | bash

# Verify migration
~/EncryptedMeshLink/scripts/pi-manager.sh status
```

The installer automatically detects existing installations and preserves:

- Configuration files
- Data directories  
- Log files
- Git history

## Contributing

To improve the installation system:

1. Test changes on a clean Pi installation
2. Verify auto-update functionality
3. Check systemd integration
4. Test recovery scenarios
5. Update documentation

The installation system is designed to be:

- **Idempotent**: Safe to run multiple times
- **Atomic**: Updates succeed or rollback completely  
- **Monitored**: Full logging and status reporting
- **Recoverable**: Multiple fallback options
