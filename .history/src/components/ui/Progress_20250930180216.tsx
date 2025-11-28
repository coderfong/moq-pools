import React from 'react';

export default function Progress({ value, min = 0, max = 100, className = '', label = 'Progress' }: { value: number; min?: number; max?: number; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  let gradient = 'from-[hsl(var(--primary))] to-[hsl(var(--primary-2))]';
  if (pct < 40) gradient = 'from-[hsl(var(--warning))] to-[hsl(var(--warning))]';
  else if (pct > 80) gradient = 'from-[hsl(var(--success))] to-[hsl(var(--success))]';
  // Map percent to nearest twelfth to avoid inline styles
  const steps = Math.round(pct / (100 / 12));
  const wClass = steps <= 0 ? 'w-0' : steps >= 12 ? 'w-full' : `w-${steps}/12`;
  return (
    <div className={`h-2 w-full rounded-full bg-gray-200 overflow-hidden ${className}`.trim()} role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out ${wClass}`} />
    </div>
  );
}
