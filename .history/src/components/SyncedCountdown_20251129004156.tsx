"use client";
import React from 'react';

function pad(n: number) { return n < 10 ? `0${n}` : String(n); }

export type SyncedCountdownProps = {
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent' | 'urgent';
};

// Global key for synchronized countdown across all listings
const GLOBAL_COUNTDOWN_KEY = 'global-listing-countdown';
const COUNTDOWN_DURATION = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

function getGlobalCountdownTarget(): number {
  if (typeof window === 'undefined') return Date.now() + COUNTDOWN_DURATION;
  
  const stored = localStorage.getItem(GLOBAL_COUNTDOWN_KEY);
  const now = Date.now();
  
  if (stored) {
    const target = parseInt(stored, 10);
    if (target > now) {
      return target;
    }
  }
  
  // Create new 2-day countdown or renew expired one
  const newTarget = now + COUNTDOWN_DURATION;
  localStorage.setItem(GLOBAL_COUNTDOWN_KEY, newTarget.toString());
  return newTarget;
}

export default function SyncedCountdown({ 
  className = '',
  showIcon = true,
  size = 'md',
  variant = 'default'
}: SyncedCountdownProps) {
  const [now, setNow] = React.useState<number>(() => Date.now());
  const [target, setTarget] = React.useState<number>(0);

  // Initialize and sync target
  React.useEffect(() => {
    const initialTarget = getGlobalCountdownTarget();
    setTarget(initialTarget);
    setNow(Date.now());
    
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const currentTarget = getGlobalCountdownTarget();
      
      // If target changed (auto-renewed), update it
      if (currentTarget !== target) {
        setTarget(currentTarget);
      }
      
      setNow(currentTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [target]);

  const remaining = Math.max(0, target - now);
  const totalSeconds = Math.floor(remaining / 1000);
  
  // If countdown expired, force renewal
  if (remaining === 0) {
    const newTarget = Date.now() + COUNTDOWN_DURATION;
    localStorage.setItem(GLOBAL_COUNTDOWN_KEY, newTarget.toString());
    setTarget(newTarget);
  }
  
  const days = Math.floor(totalSeconds / (24 * 3600));
  const remAfterDays = totalSeconds - days * 24 * 3600;
  const hours = Math.floor(remAfterDays / 3600);
  const remAfterHours = remAfterDays - hours * 3600;
  const minutes = Math.floor(remAfterHours / 60);
  const seconds = remAfterHours - minutes * 60;

  // Styling based on props
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const variantClasses = {
    default: 'text-gray-600',
    accent: 'text-orange-600 font-medium',
    urgent: 'text-red-600 font-bold animate-pulse'
  };

  // Show urgent styling when less than 6 hours remaining
  const isUrgent = remaining < 6 * 60 * 60 * 1000;
  const finalVariant = isUrgent ? 'urgent' : variant;

  // Format the display
  let displayText: string;
  if (days > 0) {
    displayText = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (hours > 0) {
    displayText = `${hours}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    displayText = `${pad(minutes)}:${pad(seconds)}`;
  }

  return (
    <div 
      className={`flex items-center gap-1.5 ${sizeClasses[size]} ${variantClasses[finalVariant]} ${className}`}
      aria-live="polite"
      title={`Pool deadline: ${displayText} remaining`}
    >
      {showIcon && (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`${iconSizes[size]} ${isUrgent ? 'animate-pulse' : ''}`}
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      )}
      <span className="font-mono">{displayText}</span>
      <span className="text-xs opacity-70">left</span>
    </div>
  );
}