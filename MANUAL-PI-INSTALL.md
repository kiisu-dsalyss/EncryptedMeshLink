# Manual Pi Installation Guide

For users who prefer full control or want to avoid any automated scripts.

## Quick Start (Manual)

1. **Clone the repository:**
   ```bash
   cd ~
   git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git
   cd EncryptedMeshLink
   ```

2. **Start the application:**
   ```bash
   docker-compose -f docker-compose.pi.yml up -d
   ```

3. **Check status:**
   ```bash
   docker-compose -f docker-compose.pi.yml ps
   ```

That's it! No system modifications, no interactive prompts.

## Prerequisites

You'll need Docker and Docker Compose installed. If you don't have them:

```bash
# Install Docker (one-time setup)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Install Docker Compose
sudo apt install docker-compose
```

## Management Commands

```bash
# Start
docker-compose -f docker-compose.pi.yml up -d

# Stop
docker-compose -f docker-compose.pi.yml down

# View logs
docker-compose -f docker-compose.pi.yml logs -f

# Restart
docker-compose -f docker-compose.pi.yml restart

# Update
git pull
docker-compose -f docker-compose.pi.yml pull
docker-compose -f docker-compose.pi.yml up -d
```

## Why This Approach?

- **No system upgrades** that cause interactive prompts
- **No automated package installation** that might conflict with your setup
- **Full user control** over what gets installed
- **Works perfectly over SSH** without getting stuck on dialogs
- **Simple and predictable** - just Docker containers

## If You Want the Automated Installer

We have two installer options:

1. **Simple installer** (recommended for most users):
   ```bash
   curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-install-pi.sh | bash
   ```

2. **Full installer** (with auto-updates, but may prompt for system upgrades):
   ```bash
   curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/install-pi.sh | bash
   ```

The simple installer avoids system upgrades to prevent interactive prompts.
