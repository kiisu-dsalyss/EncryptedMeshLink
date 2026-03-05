# Standard deployment Dockerfile
# Multi-stage build for efficient caching

FROM node:23-alpine AS installer

# Install git, bash, and udev for auto-updates and hardware detection
RUN apk add --no-cache git bash udev

# Set working directory
WORKDIR /app

# Copy package files and npm configuration
COPY package*.json .npmrc ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create A/B deployment structure
RUN mkdir -p /app/deployment/staging /app/deployment/production /app/deployment/backup

# Expose port
EXPOSE 3000

# Health check — just verify the main process is running (no device access)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=2 \
    CMD pgrep -f "tsx encryptedmeshlink" > /dev/null || exit 1

# Default command
CMD ["npx", "tsx", "encryptedmeshlink.ts"]
