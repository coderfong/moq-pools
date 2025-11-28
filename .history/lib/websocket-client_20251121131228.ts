/**
 * WebSocket client utilities for triggering server-side events
 */

type WebSocketMessage = {
  type: 'POOL_UPDATE' | 'POOL_CLOSED' | 'NEW_ORDER' | 'NOTIFICATION';
  poolId?: string;
  data?: any;
  timestamp: number;
};

// This would be imported on the server side to send WebSocket messages
export async function notifyPoolUpdate(poolId: string, data: { pledgedQty: number; targetQty: number }) {
  try {
    // In production, you would send this to your WebSocket server
    // For now, we'll use a simple HTTP endpoint
    const message: WebSocketMessage = {
      type: 'POOL_UPDATE',
      poolId,
      data,
      timestamp: Date.now(),
    };

    // Send to WebSocket server API
    await fetch(`http://localhost:${process.env.WS_PORT || 8080}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poolId, message }),
    });

    console.log('✅ Pool update notification sent:', poolId);
  } catch (error) {
    console.error('❌ Failed to send pool update:', error);
  }
}

export async function notifyPoolClosed(poolId: string) {
  try {
    const message: WebSocketMessage = {
      type: 'POOL_CLOSED',
      poolId,
      data: { message: 'This pool has reached its goal!' },
      timestamp: Date.now(),
    };

    await fetch(`http://localhost:${process.env.WS_PORT || 8080}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poolId, message }),
    });

    console.log('✅ Pool closed notification sent:', poolId);
  } catch (error) {
    console.error('❌ Failed to send pool closed notification:', error);
  }
}

export async function notifyNewOrder(poolId: string, orderData: any) {
  try {
    const message: WebSocketMessage = {
      type: 'NEW_ORDER',
      poolId,
      data: orderData,
      timestamp: Date.now(),
    };

    await fetch(`http://localhost:${process.env.WS_PORT || 8080}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poolId, message }),
    });

    console.log('✅ New order notification sent:', poolId);
  } catch (error) {
    console.error('❌ Failed to send new order notification:', error);
  }
}

export async function broadcastNotification(title: string, message: string) {
  try {
    const wsMessage: WebSocketMessage = {
      type: 'NOTIFICATION',
      data: { title, message },
      timestamp: Date.now(),
    };

    await fetch(`http://localhost:${process.env.WS_PORT || 8080}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: wsMessage }),
    });

    console.log('✅ Broadcast notification sent');
  } catch (error) {
    console.error('❌ Failed to send broadcast notification:', error);
  }
}
