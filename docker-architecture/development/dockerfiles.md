# Development Dockerfiles

This directory contains Dockerfiles for the development environment components.

## Dockerfile.discovery

PHP-based discovery service container:

```dockerfile
FROM php:8.2-apache

# Install required extensions
RUN docker-php-ext-install pdo pdo_sqlite

# Enable Apache modules
RUN a2enmod rewrite headers

# Copy discovery service code
COPY discovery/ /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

# Create data directory
RUN mkdir -p /var/www/html/data && chown www-data:www-data /var/www/html/data

EXPOSE 80

CMD ["apache2-foreground"]
```

## Dockerfile.station

Node.js station container:

```dockerfile
FROM node:24-alpine

# Install system dependencies
RUN apk add --no-cache curl sqlite

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Create necessary directories
RUN mkdir -p keys data logs config

# Create non-root user
RUN addgroup -g 1001 -S encryptedmeshlink && \
    adduser -S encryptedmeshlink -u 1001 -G encryptedmeshlink

# Set ownership
RUN chown -R encryptedmeshlink:encryptedmeshlink /app

# Switch to non-root user
USER encryptedmeshlink

# Health check script
COPY healthcheck.js ./

EXPOSE 8081

CMD ["node", "src/station.js"]
```

## Dockerfile.simulator

Meshtastic device simulator:

```dockerfile
FROM node:24-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including simulation libraries
RUN npm ci --only=production

# Copy simulator source
COPY simulator/ ./simulator/
COPY src/shared/ ./src/shared/

# Create directories
RUN mkdir -p data logs

# Create non-root user
RUN addgroup -g 1001 -S simulator && \
    adduser -S simulator -u 1001 -G simulator

# Set ownership
RUN chown -R simulator:simulator /app

# Switch to non-root user
USER simulator

EXPOSE 8083

CMD ["node", "simulator/index.js"]
```

## Dockerfile.dev-tools

Development dashboard and utilities:

```dockerfile
FROM node:24-alpine

# Install system dependencies
RUN apk add --no-cache curl git

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy development tools
COPY dev-tools/ ./dev-tools/
COPY src/ ./src/

# Create directories
RUN mkdir -p data logs

# Create non-root user
RUN addgroup -g 1001 -S devtools && \
    adduser -S devtools -u 1001 -G devtools

# Set ownership
RUN chown -R devtools:devtools /app

# Switch to non-root user
USER devtools

EXPOSE 8084

CMD ["npm", "run", "dev-dashboard"]
```

## Build Instructions

### Build All Images

```bash
# Build discovery service
docker build -f docker-architecture/development/Dockerfile.discovery -t encryptedmeshlink/discovery:dev .

# Build station image
docker build -f docker-architecture/development/Dockerfile.station -t encryptedmeshlink/station:dev .

# Build simulator
docker build -f docker-architecture/development/Dockerfile.simulator -t encryptedmeshlink/simulator:dev .

# Build development tools
docker build -f docker-architecture/development/Dockerfile.dev-tools -t encryptedmeshlink/dev-tools:dev .
```

### Build Script

Create `build-dev.sh`:

```bash
#!/bin/bash

echo "Building development Docker images..."

# Build discovery service
echo "Building discovery service..."
docker build -f docker-architecture/development/Dockerfile.discovery -t encryptedmeshlink/discovery:dev . || exit 1

# Build station image
echo "Building station image..."
docker build -f docker-architecture/development/Dockerfile.station -t encryptedmeshlink/station:dev . || exit 1

# Build simulator
echo "Building simulator..."
docker build -f docker-architecture/development/Dockerfile.simulator -t encryptedmeshlink/simulator:dev . || exit 1

# Build development tools
echo "Building development tools..."
docker build -f docker-architecture/development/Dockerfile.dev-tools -t encryptedmeshlink/dev-tools:dev . || exit 1

echo "All images built successfully!"
docker images | grep encryptedmeshlink
```

## Security Considerations

### Non-Root Users

All containers run as non-root users for security:

- `encryptedmeshlink` user (UID 1001) for station containers
- `simulator` user (UID 1001) for simulator
- `devtools` user (UID 1001) for development tools
- Apache runs as `www-data` in discovery service

### File Permissions

- Application directories: 755
- Configuration files: 644
- Key files: 600 (set at runtime)
- Log directories: 755

### Network Security

- Containers communicate only through defined networks
- No privileged containers
- Minimal attack surface with Alpine Linux

## Volume Mapping

### Development Mounts

For active development, source code is mounted read-only:

```yaml
volumes:
  - ./src:/app/src:ro
```

### Data Persistence

Application data persists in named volumes:

```yaml
volumes:
  - station_a_data:/app/data
  - station_a_keys:/app/keys
  - station_a_logs:/app/logs
```

## Environment Configuration

### Required Environment Variables

Each container requires specific environment variables:

**Station Containers:**
- `NODE_ENV`: development/production
- `STATION_ID`: Unique station identifier
- `STATION_NAME`: Human-readable name
- `DISCOVERY_SERVER`: Discovery service URL

**Discovery Service:**
- `PHP_ENV`: development/production
- `DEBUG`: Enable debug logging

**Simulator:**
- `SIMULATE_NODES`: Number of nodes to simulate
- `MESH_NETWORK_SIZE`: small/medium/large
- `MESSAGE_FREQUENCY`: low/medium/high

## Debugging

### Container Logs

```bash
# View logs from specific container
docker logs mesher_station-a_1 -f

# View logs from all containers
docker-compose logs -f
```

### Container Shell Access

```bash
# Access station container
docker exec -it mesher_station-a_1 /bin/sh

# Access discovery container
docker exec -it mesher_discovery_1 /bin/bash
```

### Development Debugging

Enable debug mode by setting environment variables:

```yaml
environment:
  - DEBUG=true
  - NODE_ENV=development
  - LOG_LEVEL=debug
```
