# Real-Time Notifications Setup

This guide explains how to set up and use real-time WebSocket notifications in PoolBuy.

## Overview

The notification system uses WebSocket connections to deliver notifications instantly to users without requiring page refreshes or polling.

## Architecture

- **WebSocket Server** (`websocket-server.js`): Standalone server running on port 8080
- **Client Hook** (`src/hooks/useWebSocket.ts`): React hook for WebSocket connections
- **Authentication**: Uses session tokens (HMAC-signed) for secure connections
- **Broadcast Utility** (`lib/websocket-notify.js`): Helper functions to push notifications

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install js-cookie
```

### 2. Start the WebSocket Server

In a **separate terminal**, run:

```bash
pnpm run ws
```

This starts the WebSocket server on `ws://localhost:8080`. You should see:
```
WebSocket server running on ws://localhost:8080
Health check available at http://localhost:8080/health
```

### 3. Start the Next.js App

In your main terminal:

```bash
pnpm run dev
```

### 4. Test Real-Time Notifications

1. **Log in** to your account at http://localhost:3007
2. **Open the browser console** to see WebSocket connection logs
3. **In another terminal**, send a test notification:

```bash
node test-notifications.mjs your-email@example.com
```

You should see the notification appear **instantly** in the navbar bell icon without refreshing the page!

## How It Works

### Connection Flow

1. **Client connects** to WebSocket server on page load
2. **Authenticates** using session cookie (sent as first message)
3. **Server verifies** session token using HMAC signature
4. **Connection stored** in userConnections Map with userId as key
5. **Heartbeat pings** sent every 30 seconds to keep connection alive

### Notification Flow

1. **Server creates** notification in database (Alert model)
2. **Broadcast function** called with userId and notification data
3. **Server finds** all active WebSocket connections for that user
4. **Notification pushed** to all connected clients
5. **Client receives** and displays notification immediately

### Fallback Behavior

If the WebSocket server is not running:
- Client falls back to **60-second polling**
- Notifications still work but with delay
- Console shows: "🔌 WebSocket disconnected, using polling fallback"

## Production Deployment

For production, you'll want to:

1. **Use Redis Pub/Sub** instead of in-memory storage for multi-server setups
2. **Enable WSS (secure WebSocket)** with proper SSL certificates
3. **Deploy WebSocket server separately** (e.g., separate Node.js process or container)
4. **Update environment variables**:
   ```
   WS_SERVER_URL=wss://ws.yourdomain.com
   NEXT_PUBLIC_WS_PORT=443
   ```

## Environment Variables

- `SESSION_SECRET`: HMAC secret for session verification (must match Next.js app)
- `WS_SERVER_URL`: WebSocket server URL (default: http://localhost:8080)
- `NEXT_PUBLIC_WS_PORT`: WebSocket port for client connections (default: 8080)

## Monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "connections": 2,
  "timestamp": "2025-11-21T10:30:00.000Z"
}
```

### Console Logs

**Client-side** (browser console):
- `✅ WebSocket connected, authenticating...`
- `✅ WebSocket authenticated: user@example.com`
- `📬 Real-time notification received: {...}`

**Server-side** (WebSocket server terminal):
- `New WebSocket connection attempt`
- `User cm123... (user@example.com) authenticated via WebSocket`
- `Broadcasted notification to user cm123... (1 connections)`

## Troubleshooting

### WebSocket Connection Failed

**Problem**: `WebSocket connection to 'ws://localhost:8080/' failed`

**Solution**: Make sure the WebSocket server is running in a separate terminal:
```bash
pnpm run ws
```

### Authentication Failed

**Problem**: `❌ WebSocket authentication failed: Invalid session token`

**Solution**: 
- Ensure `SESSION_SECRET` environment variable matches between Next.js app and WebSocket server
- Check that you're logged in (session cookie exists)
- Try logging out and back in to refresh session

### Notifications Not Appearing

**Problem**: Notifications saved to database but not appearing in real-time

**Solutions**:
1. Check browser console for WebSocket errors
2. Verify WebSocket server is running: `curl http://localhost:8080/health`
3. Check server logs for broadcast messages
4. Ensure you're logged in with the correct user

### Connection Keeps Dropping

**Problem**: WebSocket reconnects frequently

**Solution**:
- Check network/firewall settings
- Verify heartbeat ping/pong messages in console
- Increase heartbeat interval in `useWebSocket.ts` if needed

## Development Tips

### Running Both Servers

Use two terminal windows:

**Terminal 1** (WebSocket):
```bash
pnpm run ws
```

**Terminal 2** (Next.js):
```bash
pnpm run dev
```

### Testing Notifications

Quick test script:
```bash
node test-notifications.mjs your-email@example.com
```

This creates 3 test notifications that should appear immediately if WebSocket is connected.

## Files Modified

- ✅ `websocket-server.js` - WebSocket server implementation
- ✅ `src/hooks/useWebSocket.ts` - Updated with authentication
- ✅ `src/components/Navbar.tsx` - Re-enabled WebSocket for notifications
- ✅ `test-notifications.mjs` - Added WebSocket broadcast support
- ✅ `lib/websocket-notify.js` - Utility for broadcasting notifications
- ✅ `package.json` - Added `ws` script

## Next Steps

- [ ] Set up Redis pub/sub for production multi-server setup
- [ ] Add WebSocket connection status indicator in UI
- [ ] Implement notification categories/filtering via WebSocket
- [ ] Add retry logic with exponential backoff for failed connections
