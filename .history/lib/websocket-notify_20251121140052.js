/**
 * Utility to broadcast real-time notifications via WebSocket
 * 
 * This can be used from API routes or server-side code to push
 * notifications to connected users instantly.
 */

const http = require('http');

const WS_SERVER_URL = process.env.WS_SERVER_URL || 'http://localhost:8080';

/**
 * Send a notification to a specific user via WebSocket
 * 
 * @param {string} userId - The user ID to send the notification to
 * @param {object} notification - The notification data
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendRealtimeNotification(userId, notification) {
  try {
    // In a production setup, you might use Redis pub/sub or a message queue
    // For now, we'll use a simple HTTP API call to the WebSocket server
    
    // Note: The WebSocket server would need an HTTP endpoint to receive this
    // For the initial implementation, we'll directly use the broadcast function
    // if running in the same process, or use an HTTP endpoint
    
    console.log(`Attempting to send real-time notification to user ${userId}`);
    
    // Check if we're in the same process (for development)
    if (global.broadcastNotification) {
      const sent = global.broadcastNotification(userId, notification);
      return sent;
    }
    
    // Otherwise, we'd need to implement an HTTP endpoint or use Redis
    console.warn('WebSocket server not in same process. Consider using Redis pub/sub for production.');
    return false;
  } catch (error) {
    console.error('Error sending real-time notification:', error);
    return false;
  }
}

/**
 * Broadcast notification when creating new alerts in the database
 * Call this after inserting a new Alert record
 */
async function notifyUser(userId, alertData) {
  return sendRealtimeNotification(userId, {
    id: alertData.id,
    type: alertData.type,
    message: alertData.message,
    status: alertData.status,
    createdAt: alertData.createdAt,
    metadata: alertData.metadata ? JSON.parse(alertData.metadata) : null
  });
}

module.exports = {
  sendRealtimeNotification,
  notifyUser
};
