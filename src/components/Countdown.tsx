"use client";
import React from 'react';

function pad(n: number) { return n < 10 ? `0${n}` : String(n); }

export type CountdownProps = {
  durationMs?: number; // If provided, counts down from this duration starting at mount
  deadline?: string | number | Date; // Alternative: a fixed target time
  className?: string;
  storageKey?: string; // Optional key for localStorage persistence
};

export default function Countdown({ durationMs, deadline, className, storageKey = 'countdown-target' }: CountdownProps) {
  const [now, setNow] = React.useState<number>(() => Date.now());
  const targetRef = React.useRef<number>(0);

  // Initialize target once on mount with localStorage persistence
  React.useEffect(() => {
    const base = Date.now();
    let target: number;

    // Check if we have a persisted target in localStorage
    const storedTarget = storageKey ? localStorage.getItem(storageKey) : null;
    
    if (storedTarget) {
      const parsedTarget = parseInt(storedTarget, 10);
      // Check if the stored target is still in the future
      if (parsedTarget > base) {
        target = parsedTarget;
      } else {
        // Countdown expired, reset to a new duration
        if (deadline) {
          target = new Date(deadline).getTime();
        } else if (typeof durationMs === 'number' && durationMs > 0) {
          target = base + durationMs;
        } else {
          // Default to 5 days
          target = base + 5 * 24 * 60 * 60 * 1000;
        }
        if (storageKey) {
          localStorage.setItem(storageKey, target.toString());
        }
      }
    } else {
      // No stored target, create a new one
      if (deadline) {
        target = new Date(deadline).getTime();
      } else if (typeof durationMs === 'number' && durationMs > 0) {
        target = base + durationMs;
      } else {
        // Default to 5 days
        target = base + 5 * 24 * 60 * 60 * 1000;
      }
      if (storageKey) {
        localStorage.setItem(storageKey, target.toString());
      }
    }

    targetRef.current = target;
    setNow(base);
    
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadline, durationMs, storageKey]);

  const remaining = Math.max(0, targetRef.current - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const remAfterDays = totalSeconds - days * 24 * 3600;
  const hours = Math.floor(remAfterDays / 3600);
  const remAfterHours = remAfterDays - hours * 3600;
  const minutes = Math.floor(remAfterHours / 60);
  const seconds = remAfterHours - minutes * 60;

  const label = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)} left`;

  return (
    <div className={"flex items-center gap-1 text-sm text-muted-foreground " + (className || "")} aria-live="polite">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span>{label}</span>
    </div>
  );
}
