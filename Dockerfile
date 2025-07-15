# Standard deployment Dockerfile
# Multi-stage build for efficient caching

FROM node:20-alpine AS installer

# Install git, bash, and udev for auto-updates and hardware detection
RUN apk add --no-cache git bash udev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Create A/B deployment structure
RUN mkdir -p /app/deployment/staging /app/deployment/production /app/deployment/backup

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD npx tsx encryptedmeshlink.ts --health-check || exit 1

# Default command
CMD ["npx", "tsx", "encryptedmeshlink.ts"]
