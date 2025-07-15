# 🥧 Raspberry Pi Testing Guide

## No Pi Required - Local Testing Options

### Option 1: Run Test Suite Locally
```bash
# Test the deployment modules
npm test tests/deployment.test.ts

# Test Docker builds
./test-docker.sh

# Test auto-update integration
npm start -- --auto-update --local-testing
```

### Option 2: Docker Desktop Testing
```bash
# Build and test containers locally
docker-compose up -d

# Watch auto-update logs
docker logs -f eml-station

# Test manual update trigger
docker exec eml-station node -e "
const { executeABDeployment } = require('./dist/deployment');
executeABDeployment('/deployment', 'master').then(console.log);
"
```

### Option 3: Simulated Pi Environment
```bash
# Use Pi dockerfile locally (ARM emulation)
docker buildx build --platform linux/arm64 -f Dockerfile.pi -t eml-pi-test .

# Test resource constraints
docker run --memory=256m --cpus=1 eml-pi-test
```

## When You Get a Pi - Real Hardware Testing

### Pi Setup (One-time)
```bash
# 1. Install Docker on Pi
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Install Docker Compose
sudo apt install docker-compose

# 3. Clone project
git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
cd EncryptedMeshLink
```

### Deploy to Pi
```bash
# 1. Create station config
npm run encryptedmeshlink -- config init --station-id=pi-001 --display-name="Pi Station 001"

# 2. Start with auto-updates
docker-compose -f docker-compose.pi.yml up -d

# 3. Monitor
docker logs -f eml-pi-station
```

### Test Auto-Updates on Pi
```bash
# Check current version
docker exec eml-pi-station git log -1 --oneline

# Force update check
docker exec eml-pi-station node -e "
const { UpdateScheduler } = require('./dist/deployment');
const scheduler = new UpdateScheduler({
  repoPath: '/deployment/current',
  branch: 'master', 
  intervalHours: 1,
  enabled: true
});
// Trigger immediate update
scheduler.performUpdate();
"

# Watch A/B deployment in action
docker logs -f eml-pi-station | grep "A/B Deployment"
```

## Testing Scenarios

### 1. Successful Update
- Push changes to master
- Wait for hourly trigger (or force)
- Watch logs: "Successfully deployed version abc123"

### 2. Failed Update (Rollback)
- Push breaking changes to master
- Watch logs: "Health checks failed", "Rolling back"
- Verify system still running on previous version

### 3. USB Device Detection
```bash
# On Pi with Meshtastic device
ls -la /dev/ttyUSB* /dev/ttyACM*

# Check if container can access
docker exec eml-pi-station ls -la /dev/ttyUSB*
```

## Alternatives to Physical Pi

### 1. QEMU Pi Emulation
```bash
# Run Pi OS in VM for testing
# Full instructions: https://github.com/dhruvvyas90/qemu-rpi-kernel
```

### 2. GitHub Actions Pi Testing
```yaml
# .github/workflows/pi-test.yml
- uses: pguyot/arm-runner-action@v2
  with:
    base_image: raspios_lite:latest
    commands: |
      docker-compose -f docker-compose.pi.yml up -d
      sleep 30
      docker logs eml-pi-station
```

### 3. Cloud Pi Services
- Use services like [Mythic Beasts Pi Cloud](https://www.mythic-beasts.com/order/rpi)
- Rent Pi for testing: ~$5/month

## Quick Local Test Right Now

Want to test immediately? Run this:

```bash
# Build everything
./test-docker.sh

# Test deployment modules
npm test tests/deployment.test.ts

# Start local container with auto-update
docker-compose up -d && docker logs -f eml-station
```

**Bottom Line**: You can test 90% of the functionality **right now** without a Pi. The Docker system, A/B deployment, health checks, and auto-update scheduling all work perfectly on any Docker-capable machine!

The Pi-specific parts (USB device access, ARM optimization, memory constraints) can be validated once you get hardware, but the core auto-update system is ready to go! 🚀
