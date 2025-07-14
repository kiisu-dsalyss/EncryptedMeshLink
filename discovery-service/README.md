# EncryptedMeshLink Discovery Service - Dreamhost Deployment

## Overview
This directory contains the PHP discovery service (MIB-001) designed for deployment on Dreamhost shared hosting.

## Files
- `discovery.php` - Single-file PHP service with all functionality
- `README.md` - This deployment guide
- `test-api.sh` - API testing script (optional)

## Dreamhost Deployment Instructions

### 1. Upload to Dreamhost
1. Log into your Dreamhost panel
2. Navigate to **Files** → **File Manager** or use FTP/SFTP
3. Go to your domain's public directory (usually `yourdomain.com/`)
4. Create a subdirectory: `api/` (recommended)
5. Upload `discovery.php` to `yourdomain.com/api/discovery.php`

### 2. Set File Permissions
```bash
chmod 644 discovery.php
```

### 3. Test the Service
Access: `https://yourdomain.com/api/discovery.php?health=true`

Expected response:
```json
{
    "success": true,
    "data": {
        "status": "healthy",
        "timestamp": 1721000000,
        "version": "1.0.0",
        "active_stations": 0,
        "php_version": "8.1.x",
        "sqlite_version": "3.x.x"
    }
}
```

## API Endpoints

### Health Check
```bash
GET https://yourdomain.com/api/discovery.php?health=true
```

### Register Station
```bash
POST https://yourdomain.com/api/discovery.php
Content-Type: application/json

{
    "station_id": "mobile-van-001",
    "encrypted_contact_info": "AES_ENCRYPTED_DATA_HERE",
    "public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
}
```

### Get Peers
```bash
GET https://yourdomain.com/api/discovery.php?peers=true
```

### Unregister Station
```bash
DELETE https://yourdomain.com/api/discovery.php?station_id=mobile-van-001
```

## Configuration

### Update Your Station Config
Update `encryptedmeshlink-config.json`:
```json
{
    "discovery": {
        "serviceUrl": "https://yourdomain.com/api/discovery.php",
        "checkInterval": 300,
        "timeout": 30
    }
}
```

## Features

### ✅ Dreamhost Compatible
- **Single PHP file** - Easy upload and management
- **SQLite database** - No MySQL setup required
- **PHP 7.4+** - Works with Dreamhost's PHP versions
- **Auto-cleanup** - Removes stale entries automatically

### ✅ Security Features
- **Rate limiting** - 30 requests per minute per IP
- **Input validation** - Station ID and key format validation
- **CORS headers** - Proper cross-origin support
- **No sensitive data storage** - Only encrypted contact info

### ✅ Production Ready
- **Error handling** - Graceful error responses
- **Performance optimized** - SQLite WAL mode, indexes
- **Monitoring ready** - Health check endpoint
- **Auto-cleanup** - Stale entry removal (5 min timeout)

## Database Schema
The service automatically creates:
```sql
-- Station registry
CREATE TABLE stations (
    station_id TEXT PRIMARY KEY,
    encrypted_contact_info TEXT NOT NULL,
    public_key TEXT NOT NULL,
    last_seen INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

-- Rate limiting
CREATE TABLE rate_limits (
    ip_address TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL,
    window_start INTEGER NOT NULL
);
```

## Troubleshooting

### Database Issues
If SQLite errors occur:
1. Check file permissions: `chmod 644 discovery.php`
2. Ensure directory is writable: `chmod 755 api/`
3. Check PHP SQLite3 extension is enabled

### CORS Issues
The service includes proper CORS headers. If you still have issues:
- Ensure you're using HTTPS
- Check browser developer console for specific errors

### Rate Limiting
If you hit rate limits (429 errors):
- Wait 1 minute for the window to reset
- Increase `RATE_LIMIT_REQUESTS` in the PHP file if needed

## Monitoring

### Health Check
```bash
curl -s "https://yourdomain.com/api/discovery.php?health=true" | jq .
```

### Station Count
The health check returns the number of active stations.

### Log Files
Dreamhost automatically logs PHP errors to your domain's error log.

## Security Considerations

1. **No sensitive data** - Only encrypted contact info is stored
2. **Rate limiting** - Prevents abuse
3. **Input validation** - Prevents injection attacks
4. **HTTPS required** - Use SSL for all communications
5. **Auto-cleanup** - Prevents data accumulation

## Next Steps

After deployment:
1. Test all API endpoints
2. Update station configurations with your domain
3. Implement MIB-004 (Discovery Client) in TypeScript
4. Begin P2P connection testing

## Support

For Dreamhost-specific issues:
- Check Dreamhost's PHP documentation
- Ensure your hosting plan supports SQLite3
- Verify file permissions and directory structure
