"use client";

import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface PoolCountdownProps {
  expiresAt: Date | string;
  onExpire?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export default function PoolCountdown({
  expiresAt,
  onExpire,
  className = '',
  variant = 'default',
}: PoolCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        onExpire?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const isUrgent = timeLeft.total > 0 && timeLeft.total < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isCritical = timeLeft.total > 0 && timeLeft.total < 1 * 60 * 60 * 1000; // Less than 1 hour

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Clock className={`w-4 h-4 ${isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-600'}`} />
        <span className={`text-sm font-medium ${isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-700'}`}>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours}h {timeLeft.minutes}m
        </span>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className={`rounded-xl p-4 ${
        isCritical 
          ? 'bg-red-50 border border-red-200' 
          : isUrgent 
          ? 'bg-orange-50 border border-orange-200' 
          : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {isCritical ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <Clock className="w-5 h-5 text-orange-600" />
          )}
          <span className={`text-sm font-semibold ${
            isCritical ? 'text-red-900' : isUrgent ? 'text-orange-900' : 'text-gray-900'
          }`}>
            {isCritical ? 'Ending Soon!' : isUrgent ? 'Limited Time' : 'Time Remaining'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-900'
            }`}>
              {timeLeft.days}
            </div>
            <div className="text-xs text-gray-600 font-medium">Days</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-900'
            }`}>
              {timeLeft.hours}
            </div>
            <div className="text-xs text-gray-600 font-medium">Hours</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-900'
            }`}>
              {timeLeft.minutes}
            </div>
            <div className="text-xs text-gray-600 font-medium">Minutes</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-900'
            } ${isCritical ? 'animate-pulse' : ''}`}>
              {timeLeft.seconds}
            </div>
            <div className="text-xs text-gray-600 font-medium">Seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
}
