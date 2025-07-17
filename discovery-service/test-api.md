# Discovery Service API Tests

Simple cURL test collection for the EncryptedMeshLink Discovery Service.

## Base URL
```
https://definitelynotamoose.com/discovery.php
```

## Test Commands

### 1. Health Check ✅
```bash
curl -X GET "https://definitelynotamoose.com/discovery.php?health=true"
```

### 2. Register Station 📡
```bash
curl -X POST "https://definitelynotamoose.com/discovery.php" \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "test-station-001",
    "encrypted_contact_info": "AES_ENCRYPTED_DATA_BASE64",
    "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890...\n-----END PUBLIC KEY-----"
  }'
```

### 3. Get All Peers 👥
```bash
curl -X GET "https://definitelynotamoose.com/discovery.php?peers=true"
```

### 4. Register Another Station 🏢
```bash
curl -X POST "https://definitelynotamoose.com/discovery.php" \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "alpha-station",
    "encrypted_contact_info": "ENCRYPTED_ALPHA_CONTACT",
    "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA9876543210...\n-----END PUBLIC KEY-----"
  }'
```

### 5. Delete Station ❌
```bash
curl -X DELETE "https://definitelynotamoose.com/discovery.php?station_id=test-station-001"
```

### 6. Test Error Cases 🚨

#### Missing fields
```bash
curl -X POST "https://definitelynotamoose.com/discovery.php" \
  -H "Content-Type: application/json" \
  -d '{"station_id": "incomplete"}'
```

#### Invalid station ID
```bash
curl -X POST "https://definitelynotamoose.com/discovery.php" \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "invalid@station!",
    "encrypted_contact_info": "DATA",
    "public_key": "INVALID_KEY"
  }'
```

#### Rate limit test (run multiple times quickly)
```bash
curl -X GET "https://definitelynotamoose.com/discovery.php?health=true"
```

## Expected Responses

### Success Response Format
```json
{
  "success": true,
  "data": {
    // endpoint-specific data
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": 1642123456
}
```

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `?health=true` | Health check |
| GET | `?peers=true` | Get all active stations |
| POST | `/` | Register/update station |
| DELETE | `?station_id=X` | Unregister station |

## Rate Limits
- 30 requests per minute per IP address
- Stale stations cleaned up after 5 minutes
- Maximum 1000 stations total
