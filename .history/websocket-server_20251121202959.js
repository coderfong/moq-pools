const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.WS_PORT || 8081;
const SECRET = process.env.SESSION_SECRET;
const MAX_CONNECTIONS = parseInt(process.env.WS_MAX_CONNECTIONS || '1000', 10);

// Production validation
if (!SECRET || SECRET === 'your-secret-key-here') {
  console.error('❌ SESSION_SECRET must be set in production!');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Store user connections: userId -> Set of WebSocket connections
const userConnections = new Map();

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      connections: userConnections.size,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Verify session token (same HMAC logic as getSession)
function verifySessionToken(token) {
  if (!token) return null;
  
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // Check expiration
    if (decoded.exp && decoded.exp < Date.now()) return null;

    return decoded;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

wss.on('connection', (ws, req) => {
  let userId = null;
  let sessionData = null;

  // Check connection limit
  if (userConnections.size >= MAX_CONNECTIONS) {
    ws.close(1008, 'Server at capacity');
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('New WebSocket connection attempt');
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Handle authentication
      if (data.type === 'auth') {
        const session = verifySessionToken(data.token);
        
        if (session && session.userId) {
          userId = session.userId;
          sessionData = session;

          // Add connection to user's connection set
          if (!userConnections.has(userId)) {
            userConnections.set(userId, new Set());
          }
          userConnections.get(userId).add(ws);

          console.log(`User ${userId} (${session.email}) authenticated via WebSocket`);

          // Send confirmation
          ws.send(JSON.stringify({
            type: 'auth_success',
            userId: userId,
            email: session.email
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'auth_error',
            message: 'Invalid session token'
          }));
          ws.close();
        }
      }

      // Handle ping for keep-alive
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (userId && userConnections.has(userId)) {
      userConnections.get(userId).delete(ws);
      if (userConnections.get(userId).size === 0) {
        userConnections.delete(userId);
      }
      console.log(`User ${userId} disconnected`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast notification to specific user
function broadcastToUser(userId, notification) {
  if (userConnections.has(userId)) {
    const connections = userConnections.get(userId);
    const message = JSON.stringify({
      type: 'notification',
      data: notification
    });

    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });

    console.log(`Broadcasted notification to user ${userId} (${connections.size} connections)`);
    return true;
  }
  return false;
}

// Export broadcast function for use in other modules
global.broadcastNotification = broadcastToUser;

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  wss.clients.forEach((client) => {
    client.close();
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
