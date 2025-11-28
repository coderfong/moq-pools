import React from 'react';

export default function Chip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-black text-white ${className}`.trim()}>
      {children}
    </span>
  );
}
