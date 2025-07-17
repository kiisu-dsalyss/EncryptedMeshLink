# Pi Troubleshooting Guide: Heartbeat Failures

## Quick Diagnosis

Run the diagnostic script to check your Pi's status:
```bash
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh status
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh health-check
```

## Common Heartbeat Failure Causes

### 1. Discovery Service HTTP 500 Errors
**Symptoms:** Logs show "HTTP 500: Internal Server Error" from discovery service
**Solution:** This is usually a temporary server issue, not your Pi
```bash
# Check if the discovery service is responding
curl -v https://your-discovery-service/api/health

# Restart container to retry with new settings
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh restart
```

### 2. Resource Constraints
**Symptoms:** Container restarts, memory errors, slow responses
**Solution:** We've optimized the configuration with:
- Memory limit increased to 1GB (was 512MB)
- CPU limit set to 1.0 core (was unlimited)
- Discovery timeout increased to 60s (was 30s)

### 3. Network Connectivity Issues
**Symptoms:** Intermittent timeouts, DNS resolution failures
**Solution:** 
```bash
# Test connectivity to discovery service
ping -c 5 your-discovery-service-domain

# Check DNS resolution
nslookup your-discovery-service-domain

# Check if Pi has internet access
curl -I http://google.com
```

### 4. USB Device Access Issues
**Symptoms:** Meshtastic device not detected, USB permission errors
**Solution:**
```bash
# Check USB devices
lsusb

# Check device permissions
ls -la /dev/ttyUSB0 /dev/ttyACM0

# Add pi user to dialout group (if not already done)
sudo usermod -a -G dialout pi
```

## Optimized Configuration Changes

The latest Pi configuration includes these improvements:

### Resource Allocation
- **Memory Limit:** 1GB (doubled from 512MB)
- **Memory Reservation:** 512MB (doubled from 256MB)
- **CPU Limit:** 1.0 core (added CPU management)
- **CPU Reservation:** 0.5 core (guaranteed minimum)

### Timeout Settings
- **Discovery Timeout:** 60 seconds (doubled from 30s)
- **Discovery Check Interval:** 120 seconds (doubled from 60s)
- **P2P Connection Timeout:** 45 seconds (increased from default)
- **Health Check Timeout:** 60 seconds (doubled from 30s)
- **Health Check Interval:** 120 seconds (doubled from 60s)

### Health Check Improvements
- **Retries:** 3 attempts (increased from 2)
- **Start Period:** 45 seconds (increased from 30s)
- **Test Command:** Uses actual application health check

## Manual Recovery Commands

### Restart Container
```bash
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh restart
```

### Force Update (if auto-update is stuck)
```bash
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh force-update
```

### Check Logs
```bash
# Container logs
sudo docker logs eml-pi-station --tail 100

# System logs
sudo journalctl -u encryptedmeshlink-autoupdate --tail 50
```

### Reset to Clean State
```bash
# Stop services
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh stop

# Clean Docker
sudo docker system prune -f

# Restart services
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh start
```

## Performance Monitoring

### Check Resource Usage
```bash
# Container resource usage
sudo docker stats eml-pi-station --no-stream

# System resource usage
htop
free -h
df -h
```

### Monitor Heartbeat Success Rate
```bash
# Watch live logs for heartbeat status
sudo docker logs eml-pi-station -f | grep -i heartbeat

# Count recent failures
sudo docker logs eml-pi-station --since="1h" | grep -c "heartbeat.*fail"
```

## Configuration Adjustments

### Increase Discovery Timeout Further (if needed)
```bash
# Edit environment variables
sudo nano /opt/encryptedmeshlink/docker-compose.pi.yml

# Change ENCRYPTEDMESHLINK_DISCOVERY_TIMEOUT from 60 to 90
# Then restart:
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh restart
```

### Reduce Discovery Frequency (for unstable connections)
```bash
# Increase ENCRYPTEDMESHLINK_DISCOVERY_CHECK_INTERVAL from 120 to 300
# This checks for peers every 5 minutes instead of 2 minutes
```

## Emergency Contacts

If heartbeat failures persist after trying these solutions:

1. **Check Discovery Service Status:** Contact your network administrator
2. **Hardware Issues:** Verify Pi power supply and cooling
3. **Network Issues:** Check router settings and firewall rules
4. **Logs Analysis:** Collect full logs for developer review:
   ```bash
   sudo docker logs eml-pi-station > ~/eml-logs-$(date +%Y%m%d-%H%M).txt
   ```

## Prevention

### Regular Maintenance
```bash
# Check status weekly
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh status

# Clean logs monthly
sudo docker logs eml-pi-station --tail 1000 > /dev/null

# Update system packages monthly
sudo apt update && sudo apt upgrade -y
```

### Monitoring Setup
The auto-update system includes built-in monitoring. Check the management interface:
```bash
sudo /opt/encryptedmeshlink/scripts/pi-manager.sh health-check
```
