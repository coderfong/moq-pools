import React from 'react';

export default function Progress({ value, min = 0, max = 100, className = '' }: { value: number; min?: number; max?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={`h-2 w-full rounded-full bg-gray-200 overflow-hidden ${className}`.trim()} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full w-0 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-2))] animate-[progress_1.2s_ease-out_forwards]"
        style={{ width: `${pct}%` }}
      />
      <style jsx>{`
        @keyframes progress { from { width: 0 } to { width: ${pct}% } }
      `}</style>
    </div>
  );
}
