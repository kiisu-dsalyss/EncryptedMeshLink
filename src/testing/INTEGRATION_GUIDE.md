# Real Device ↔ Mock Station Integration Guide

This guide shows how to test your actual EncryptedMeshLink service with your Meshtastic device against mock remote stations.

## Quick Setup

### Terminal 1: Start Mock Station Server
```bash
npm run mock:server
```

This starts a mock station with:
- **Station ID**: `remote-test-station`
- **Nodes Available**:
  - `3001` - Remote Alpha (custom response)
  - `3002` - Remote Beta (custom response) 
  - `3003` - Remote Gamma (quick response)

### Terminal 2: Start Your Real EncryptedMeshLink Service
```bash
npm start
# or
npm run dev
```

### Terminal 3: Monitor Your Service (Optional)
You can watch the logs or use another terminal to send commands.

## Testing Flow

### 1. **Mock Station Ready**
When you start the mock server, you'll see:
```
🎭 Starting Mock Station Server
==================================================
Station ID: remote-test-station
Station Name: Remote Test Station
Listen Port: 8900
Nodes Available:
  - Remote Alpha (ID: 3001) - Auto-respond: Yes
  - Remote Beta (ID: 3002) - Auto-respond: Yes  
  - Remote Gamma (ID: 3003) - Auto-respond: Yes
==================================================

✅ Mock station server started successfully

🚀 Mock station is ready for connections!
```

### 2. **Send Message from Your Meshtastic Device**
Use your Meshtastic device to send a message that will be bridged to the mock station:

**Message Format**: `@remote-test-station:3001 Hello from my radio!`

Where:
- `remote-test-station` = Target station ID
- `3001` = Target node ID (Remote Alpha)
- `Hello from my radio!` = Your message

### 3. **Watch the Magic Happen**

**In Mock Station Terminal**, you'll see:
```
📨 [remote-test-station] Received user_message from your-station:1234
   Message: "Hello from my radio!"
   Target Node: 3001
📤 [remote-test-station] Sent response: "Hello from Remote Alpha! You said: Hello from my radio!"
```

**In Your EncryptedMeshLink Terminal**, you should see:
- Bridge message routing
- P2P connection establishment  
- Message delivery confirmation
- Response message received

**On Your Meshtastic Device**, you should receive:
```
Hello from Remote Alpha! You said: Hello from my radio!
```

## Available Test Nodes

### Node 3001 - Remote Alpha
- **Response Pattern**: `Hello from {nodeName}! You said: {originalMessage}`
- **Delay**: 800ms
- **Example**: Send "Test message" → Receive "Hello from Remote Alpha! You said: Test message"

### Node 3002 - Remote Beta  
- **Response Pattern**: `Beta node received: {originalMessage}`
- **Delay**: 1200ms
- **Example**: Send "Hi Beta" → Receive "Beta node received: Hi Beta"

### Node 3003 - Remote Gamma
- **Response Pattern**: `Quick response from Gamma: {originalMessage}` 
- **Delay**: 500ms (fastest)
- **Example**: Send "Speed test" → Receive "Quick response from Gamma: Speed test"

## Test Commands

You can also test bridge commands:

### Ping Test
**Send**: `@remote-test-station:0 ping`
**Expect**: Pong response with station info

### Node Discovery
**Send**: `@remote-test-station:0 nodes`  
**Expect**: List of available nodes (3001, 3002, 3003)

## Troubleshooting

### Mock Station Not Responding
1. Check that mock station server is running (`npm run mock:server`)
2. Verify station ID matches: `remote-test-station`
3. Check node IDs are correct: 3001, 3002, or 3003

### EncryptedMeshLink Not Connecting
1. Ensure your service is running (`npm start`)
2. Check that P2P discovery is working
3. Verify bridge message routing is enabled

### Message Format Issues
- Use format: `@station-id:node-id message`
- Station ID: `remote-test-station`
- Valid node IDs: `3001`, `3002`, `3003`
- For commands use node ID `0`

### Discovery Issues
1. Check that both services can reach each other
2. Verify P2P connection is established
3. Check crypto service is working

## Expected Message Flow

```
[Your Meshtastic] 
    ↓ (radio)
[Your EncryptedMeshLink Service]
    ↓ (discovery service finds mock station)
[P2P Connection Established]
    ↓ (bridge message over P2P)
[Mock Station Server]
    ↓ (auto-response generated)
[Your EncryptedMeshLink Service]
    ↓ (radio)
[Your Meshtastic Device]
```

## Advanced Testing

### Multiple Messages
Send messages to different nodes rapidly:
- `@remote-test-station:3001 Message to Alpha`
- `@remote-test-station:3002 Message to Beta`  
- `@remote-test-station:3003 Message to Gamma`

### Error Testing
Send to invalid node:
- `@remote-test-station:9999 Invalid node test`
- Should receive error response

### Command Testing
- `@remote-test-station:0 ping`
- `@remote-test-station:0 nodes`
- `@remote-test-station:0 status`

This integration test validates your entire P2P bridge system with real Meshtastic hardware! 🎉
