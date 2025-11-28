"use client";

import { useState, useEffect } from 'react';
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket';
import { X, TrendingUp, AlertCircle, CheckCircle, Bell, Package } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'POOL_UPDATE' | 'POOL_CLOSED' | 'NEW_ORDER' | 'NOTIFICATION';
  title: string;
  message: string;
  icon: 'trending' | 'alert' | 'check' | 'bell' | 'package';
  poolId?: string;
  timestamp: number;
  read: boolean;
}

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { status, lastMessage } = useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      const notification = convertMessageToNotification(message);
      if (notification) {
        setNotifications((prev) => [notification, ...prev].slice(0, 10)); // Keep last 10
        setUnreadCount((prev) => prev + 1);
        
        // Auto-show notification toast
        showToast(notification);
      }
    },
  });

  const convertMessageToNotification = (message: WebSocketMessage): Notification | null => {
    const id = `${message.timestamp}-${Math.random()}`;
    
    switch (message.type) {
      case 'POOL_UPDATE':
        return {
          id,
          type: message.type,
          title: 'Pool Progress Update',
          message: `Pool ${message.poolId} has new orders! ${message.data?.pledgedQty}/${message.data?.targetQty}`,
          icon: 'trending',
          poolId: message.poolId,
          timestamp: message.timestamp,
          read: false,
        };
      
      case 'POOL_CLOSED':
        return {
          id,
          type: message.type,
          title: 'Pool Completed! 🎉',
          message: `Pool ${message.poolId} has reached its goal and is now ready for ordering!`,
          icon: 'check',
          poolId: message.poolId,
          timestamp: message.timestamp,
          read: false,
        };
      
      case 'NEW_ORDER':
        return {
          id,
          type: message.type,
          title: 'New Order in Your Pool',
          message: message.data?.message || 'Someone just joined your pool!',
          icon: 'package',
          poolId: message.poolId,
          timestamp: message.timestamp,
          read: false,
        };
      
      case 'NOTIFICATION':
        return {
          id,
          type: message.type,
          title: message.data?.title || 'New Notification',
          message: message.data?.message || '',
          icon: 'bell',
          timestamp: message.timestamp,
          read: false,
        };
      
      default:
        return null;
    }
  };

  const showToast = (notification: Notification) => {
    // This would integrate with a toast library like react-hot-toast or sonner
    console.log('🔔 New notification:', notification.title);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'trending':
        return <TrendingUp className="w-5 h-5 text-orange-600" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'check':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'package':
        return <Package className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="relative">
      {/* Notification bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-orange-600 rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Connection status indicator */}
        {status === 'connected' && (
          <span className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
        )}
      </button>

      {/* Notifications dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Dropdown panel */}
          <div className="absolute right-0 mt-2 w-96 max-h-[32rem] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm text-orange-600">
                    ({unreadCount} new)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Mark all read
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={clearAll}
                      className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Clear all
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-600">No notifications yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    You'll see updates here when pools you're in have activity
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-orange-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.icon)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-orange-600 rounded-full flex-shrink-0 mt-1.5"></span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </span>
                            
                            {notification.poolId && (
                              <Link
                                href={`/pools/${notification.poolId}`}
                                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                                onClick={() => setIsOpen(false)}
                              >
                                View Pool →
                              </Link>
                            )}
                            
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-gray-600 hover:text-gray-700"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - connection status */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-center gap-2 text-xs">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status === 'connected'
                      ? 'bg-green-500'
                      : status === 'connecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                ></div>
                <span className="text-gray-600">
                  {status === 'connected'
                    ? 'Connected to live updates'
                    : status === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
