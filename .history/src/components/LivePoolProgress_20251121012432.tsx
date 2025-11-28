"use client";

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TrendingUp, Users, Clock } from 'lucide-react';

interface LivePoolProgressProps {
  poolId: string;
  initialPledgedQty: number;
  targetQty: number;
  initialProgress: number;
  className?: string;
}

export default function LivePoolProgress({
  poolId,
  initialPledgedQty,
  targetQty,
  initialProgress,
  className = '',
}: LivePoolProgressProps) {
  const [pledgedQty, setPledgedQty] = useState(initialPledgedQty);
  const [progress, setProgress] = useState(initialProgress);
  const [recentOrders, setRecentOrders] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const { status, lastMessage } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'POOL_UPDATE' && message.poolId === poolId) {
        const { pledgedQty: newPledged, targetQty: newTarget } = message.data;
        
        // Trigger animation
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
        
        // Update values
        setPledgedQty(newPledged);
        const newProgress = Math.round((newPledged / newTarget) * 100);
        setProgress(newProgress);
        
        // Show recent order indicator
        setRecentOrders((prev) => prev + 1);
        setTimeout(() => setRecentOrders((prev) => Math.max(0, prev - 1)), 3000);
      }
    },
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress header */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-600" />
          <span className="font-semibold text-gray-900">
            {pledgedQty} / {targetQty} orders
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          )}
          
          <span className={`font-bold text-orange-600 transition-all duration-300 ${
            isAnimating ? 'scale-110' : 'scale-100'
          }`}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500 ease-out ${
            isAnimating ? 'shadow-lg shadow-orange-500/50' : ''
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          {isAnimating && (
            <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
          )}
        </div>
      </div>

      {/* Recent activity indicator */}
      {recentOrders > 0 && (
        <div className="flex items-center gap-2 text-xs text-green-600 animate-fadeIn">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="font-medium">
            {recentOrders} new {recentOrders === 1 ? 'order' : 'orders'} just joined!
          </span>
        </div>
      )}
    </div>
  );
}
