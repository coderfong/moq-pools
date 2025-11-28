"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Cookies from 'js-cookie';

export type WebSocketMessage = {
  type: 'notification' | 'auth_success' | 'auth_error' | 'pong' | 'POOL_UPDATE' | 'POOL_CLOSED' | 'NEW_ORDER' | 'NOTIFICATION';
  poolId?: string;
  data?: any;
  timestamp?: number;
  message?: string;
  userId?: string;
  email?: string;
};

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      // Use ws:// for development, wss:// for production
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Connect to WebSocket server on port 8080 (or WS_PORT env variable)
      const wsPort = process.env.NEXT_PUBLIC_WS_PORT || '8080';
      const wsHost = window.location.hostname;
      const wsUrl = `${protocol}//${wsHost}:${wsPort}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected, authenticating...');
        
        // Send authentication message with session token
        const sessionToken = Cookies.get('session');
        if (sessionToken) {
          ws.send(JSON.stringify({
            type: 'auth',
            token: sessionToken
          }));
        } else {
          console.warn('No session token found for WebSocket authentication');
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle authentication response
          if (message.type === 'auth_success') {
            console.log('✅ WebSocket authenticated:', message.email);
            setStatus('connected');
            reconnectAttemptsRef.current = 0;
            
            // Start heartbeat
            if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current);
            }
            heartbeatIntervalRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
              }
            }, 30000); // Send ping every 30 seconds
            
            onConnect?.();
            return;
          }
          
          if (message.type === 'auth_error') {
            console.error('❌ WebSocket authentication failed:', message.message);
            ws.close();
            return;
          }
          
          // Handle regular messages
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setStatus('disconnected');
        onDisconnect?.();
        wsRef.current = null;
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.log('❌ Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setStatus('error');
    }
  }, [onConnect, onDisconnect, onMessage, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    lastMessage,
    send,
    connect,
    disconnect,
  };
}
