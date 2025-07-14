# Simple Monitoring for Pi Deployments

## Overview

Basic monitoring and logging for Raspberry Pi deployments of EncryptedMeshLink stations. Keeping it simple and lightweight!

## Monitoring Approach

**Simple and Practical:**

- Basic health checks and status logging
- Local log files with rotation
- Simple dashboard (maybe just a web page)
- Essential alerts for station down/connectivity issues

## Planned Components

1. **Health Check Endpoint** - Simple HTTP endpoint returning station status
2. **Log Rotation** - Basic logrotate configuration for Pi storage
3. **System Stats** - CPU, memory, disk usage logging
4. **Message Stats** - Basic throughput and relay success rates

## Implementation Ideas

- Simple Node.js health check server
- JSON log format for easy parsing
- Maybe a basic HTML status page
- Log shipping to central location (optional)

**Note:** The previous monitoring architecture was way overkill for Pi devices. This is a much more reasonable approach focused on practical operational needs rather than enterprise-grade observability.

## Health Check Example

```javascript
// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    station: stationConfig.stationId,
    mesh: {
      connected: meshDevice.isConnected(),
      nodesCount: knownNodes.size,
      lastMessage: lastMessageTime
    }
  });
});
```

That's much better than a full Prometheus/Grafana/AlertManager stack! 😄

## Future Considerations

If the network grows to many stations, we could consider:

- Simple centralized log aggregation
- Basic alerting via email/SMS
- Web dashboard showing station statuses
- But let's start simple and see what's actually needed!
