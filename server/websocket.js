/**
 * WebSocket Server for Real-time Updates
 * Run this separately: node server/websocket.js
 */

const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.WS_PORT || 8080;

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running\n');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients with metadata
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = generateClientId();
  const clientInfo = {
    id: clientId,
    ws,
    subscribedPools: new Set(),
    connectedAt: new Date(),
  };
  
  clients.set(clientId, clientInfo);
  console.log(`✅ Client connected: ${clientId} (Total: ${clients.size})`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'NOTIFICATION',
    data: {
      title: 'Connected to Live Updates',
      message: 'You will now receive real-time notifications',
    },
    timestamp: Date.now(),
  }));

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleClientMessage(clientId, data);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`❌ Client disconnected: ${clientId} (Total: ${clients.size})`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`Error for client ${clientId}:`, error);
  });
});

// Handle different message types from clients
function handleClientMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case 'SUBSCRIBE_POOL':
      client.subscribedPools.add(data.poolId);
      console.log(`📢 Client ${clientId} subscribed to pool ${data.poolId}`);
      break;
    
    case 'UNSUBSCRIBE_POOL':
      client.subscribedPools.delete(data.poolId);
      console.log(`🔕 Client ${clientId} unsubscribed from pool ${data.poolId}`);
      break;
    
    case 'PING':
      client.ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      break;
    
    default:
      console.log(`Unknown message type: ${data.type}`);
  }
}

// Broadcast to all connected clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  let successCount = 0;
  
  clients.forEach((client) => {
    if (client.ws.readyState === 1) { // 1 = OPEN
      client.ws.send(messageStr);
      successCount++;
    }
  });
  
  console.log(`📡 Broadcast to ${successCount}/${clients.size} clients`);
}

// Broadcast to clients subscribed to a specific pool
function broadcastToPool(poolId, message) {
  const messageStr = JSON.stringify(message);
  let successCount = 0;
  
  clients.forEach((client) => {
    if (client.subscribedPools.has(poolId) && client.ws.readyState === 1) {
      client.ws.send(messageStr);
      successCount++;
    }
  });
  
  console.log(`📡 Broadcast to pool ${poolId}: ${successCount} clients`);
}

// Utility function to generate client IDs
function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
  console.log(`📊 HTTP endpoint: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing WebSocket server...');
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

// Export functions for external use
module.exports = {
  broadcast,
  broadcastToPool,
  wss,
};
