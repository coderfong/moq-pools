import React from 'react';

export default function Progress({ value, min = 0, max = 100, className = '', label = 'Progress' }: { value: number; min?: number; max?: number; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={`h-2 w-full rounded-full bg-gray-200 overflow-hidden ${className}`.trim()} role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-2))] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
